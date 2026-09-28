"""DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

YOLOv8 inference for debris/anomaly detection on preprocessed SSS imagery."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from src.preprocessing import to_uint8

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DEFAULT_WEIGHTS = MODELS_DIR / "yolov8n.pt"

# Target classes for the fine-tuned model. The stock yolov8n.pt is trained on
# COCO (person, car, ...) and must be fine-tuned on labelled SSS data before
# these labels mean anything; until then the model's own names are used.
SSS_CLASSES = ["shipwreck", "pipe", "ghost_net", "anomaly"]


@dataclass
class Detection:
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2 in pixels
    label: str
    confidence: float  # 0-100 %
    class_id: int
    shadow_fraction: float = 0.0  # share of the box lying in acoustic shadow
    shadow_penalized: bool = False

    def to_dict(self) -> dict:
        return asdict(self)


class MarineDebrisDetector:
    def __init__(
        self,
        weights: str | Path = DEFAULT_WEIGHTS,
        confidence_threshold: float = 75.0,
        imgsz: int = 640,
        device: str | None = None,
        shadow_intensity: int = 30,
        shadow_overlap: float = 0.6,
        shadow_penalty: float = 0.5,
    ):
        """
        Args:
            weights: .pt (or exported .onnx) weights. Official names like models/yolov8n.pt
                are auto-downloaded to that path if missing.
            confidence_threshold: default minimum confidence, in percent (0-100).
            shadow_intensity: pixels in the original image at or below this uint8 value count as shadow.
            shadow_overlap: a detection is penalised when at least this fraction of its box is shadow.
            shadow_penalty: multiplier applied to penalised detections (0.5 = reduce by 50%).
        """
        self.model = YOLO(str(weights))
        self.imgsz = imgsz
        self.device = device
        self.shadow_intensity = shadow_intensity
        self.shadow_overlap = shadow_overlap
        self.shadow_penalty = shadow_penalty
        self.set_confidence_threshold(confidence_threshold)

    @property
    def class_names(self) -> dict[int, str]:
        return self.model.names

    def set_confidence_threshold(self, threshold: float) -> None:
        """Set the minimum confidence (percent, 0-100) for returned detections."""
        if not 0.0 <= threshold <= 100.0:
            raise ValueError("confidence threshold must be between 0 and 100")
        self.confidence_threshold = float(threshold)

    @staticmethod
    def filter_by_confidence(detections: list[Detection], threshold: float) -> list[Detection]:
        """Keep only detections with confidence strictly above `threshold` percent."""
        return [d for d in detections if d.confidence > threshold]

    def shadow_mask(self, original: np.ndarray) -> np.ndarray:
        """Boolean mask of acoustic shadow (very dark regions) in the original image.

        Smoothed first so isolated dark speckle doesn't register as shadow, then
        cleaned with a morphological opening.
        """
        img = to_uint8(original)
        if img.ndim == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img = cv2.GaussianBlur(img, (5, 5), 0)
        mask = (img <= self.shadow_intensity).astype(np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        return mask.astype(bool)

    def apply_shadow_penalty(self, detections: list[Detection], shadow: np.ndarray) -> list[Detection]:
        """Reduce confidence of detections that lie mostly inside acoustic shadow.

        A real target produces a bright highlight *next to* its shadow, so its box
        is only partly dark. A box that is mostly shadow has no return behind it
        and is likely a false positive.
        """
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            region = shadow[y1:y2, x1:x2]
            det.shadow_fraction = float(region.mean()) if region.size else 0.0
            if det.shadow_fraction >= self.shadow_overlap:
                det.confidence = round(det.confidence * self.shadow_penalty, 2)
                det.shadow_penalized = True
        return detections

    def predict(
        self,
        image: np.ndarray,
        original: np.ndarray | None = None,
        confidence_threshold: float | None = None,
    ) -> list[Detection]:
        """Run detection on a preprocessed image.

        Args:
            image: preprocessed image (e.g. output of preprocessing.preprocess), grayscale or BGR.
            original: raw image before enhancement, used to find acoustic shadows.
                CLAHE brightens shadows, so they must be measured on the original.
                If None, the shadow penalty is skipped.
            confidence_threshold: overrides the instance default (percent).

        Returns detections sorted by confidence, highest first.
        """
        img = to_uint8(image)
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        # Run with a low floor so detections the shadow penalty would push below
        # the threshold are still seen; the real threshold is applied afterwards.
        result = self.model.predict(img, imgsz=self.imgsz, conf=0.05, device=self.device, verbose=False)[0]

        h, w = img.shape[:2]
        detections = []
        for xyxy, conf, cls in zip(
            result.boxes.xyxy.cpu().numpy(),
            result.boxes.conf.cpu().numpy(),
            result.boxes.cls.cpu().numpy().astype(int),
            strict=True,
        ):
            x1, y1, x2, y2 = np.clip(np.round(xyxy), 0, [w, h, w, h]).astype(int)
            detections.append(Detection(
                bbox=(int(x1), int(y1), int(x2), int(y2)),
                label=self.class_names.get(int(cls), str(cls)),
                confidence=round(float(conf) * 100.0, 2),
                class_id=int(cls),
            ))

        if original is not None:
            if original.shape[:2] != (h, w):
                raise ValueError("original and preprocessed images must have the same size")
            self.apply_shadow_penalty(detections, self.shadow_mask(original))

        threshold = self.confidence_threshold if confidence_threshold is None else confidence_threshold
        detections = self.filter_by_confidence(detections, threshold)
        return sorted(detections, key=lambda d: d.confidence, reverse=True)

    @staticmethod
    def draw(image: np.ndarray, detections: list[Detection]) -> np.ndarray:
        """Return a BGR copy of `image` with boxes and labels drawn (red = shadow-penalised)."""
        img = to_uint8(image)
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR) if img.ndim == 2 else img.copy()
        for d in detections:
            color = (0, 0, 255) if d.shadow_penalized else (0, 255, 0)
            x1, y1, x2, y2 = d.bbox
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(img, f"{d.label} {d.confidence:.0f}%", (x1, max(y1 - 5, 12)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
        return img
