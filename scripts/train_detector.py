"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Fine-tune YOLOv8n on the synthetic side-scan dataset and copy the best weights to
models/seascan-yolov8n.pt (the API's default detector).

Usage:
    python scripts/generate_synthetic.py --out data/synthetic
    python scripts/train_detector.py --data data/synthetic/seascan.yaml --epochs 40
"""

import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=str(ROOT / "data/synthetic/seascan.yaml"))
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--project", default=str(ROOT / "runs"))
    args = ap.parse_args()

    model = YOLO("yolov8n.pt")  # COCO-pretrained starting point
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name="seascan",
        exist_ok=True,
        patience=15,
        # Sonar is single-channel: colour augmentation is meaningless; flips are physical
        hsv_h=0.0,
        hsv_s=0.0,
        hsv_v=0.25,
        fliplr=0.5,
        flipud=0.5,
        degrees=0.0,
        seed=26057,
        plots=True,
    )
    best = Path(args.project) / "seascan" / "weights" / "best.pt"
    target = ROOT / "models" / "seascan-yolov8n.pt"
    shutil.copy(best, target)
    metrics = YOLO(str(target)).val(data=args.data, imgsz=args.imgsz, device=args.device, plots=False)
    print(f"Saved {target}")
    b = metrics.box
    print(f"mAP@50={b.map50:.3f} mAP@50-95={b.map:.3f} precision={b.mp:.3f} recall={b.mr:.3f}")


if __name__ == "__main__":
    main()
