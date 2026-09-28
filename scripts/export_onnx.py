"""DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Export YOLOv8 weights to ONNX for edge deployment (Jetson, Raspberry Pi, AUV compute).

Usage:
    python scripts/export_onnx.py --weights models/best.pt --imgsz 640
    python scripts/export_onnx.py --weights models/best.pt --half --device 0   # FP16 needs a GPU

The exported .onnx is written next to the weights and can be loaded directly by
MarineDebrisDetector(weights="models/best.onnx") or by onnxruntime / TensorRT.
"""

import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"


def export(weights: str, imgsz: int, opset: int, dynamic: bool, half: bool, simplify: bool, device: str) -> Path:
    model = YOLO(weights)
    onnx_path = Path(model.export(
        format="onnx",
        imgsz=imgsz,
        opset=opset,
        dynamic=dynamic,
        half=half,
        simplify=simplify,
        device=device,
    ))
    # Weights given as a bare name live in the CWD; keep the export in models/.
    if onnx_path.parent.resolve() != MODELS_DIR:
        MODELS_DIR.mkdir(exist_ok=True)
        onnx_path = Path(shutil.move(str(onnx_path), MODELS_DIR / onnx_path.name))
    return onnx_path


def verify(onnx_path: Path, imgsz: int) -> None:
    """Run one dummy forward pass with onnxruntime to confirm the export loads and executes."""
    import onnxruntime as ort

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inp = session.get_inputs()[0]
    dtype = np.float16 if "float16" in inp.type else np.float32
    dummy = np.random.rand(1, 3, imgsz, imgsz).astype(dtype)
    outputs = session.run(None, {inp.name: dummy})
    print(f"onnxruntime OK: input {inp.name} {inp.shape} -> output {[o.shape for o in outputs]}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--weights", default=str(MODELS_DIR / "yolov8n.pt"))
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--opset", type=int, default=12, help="12 is broadly supported by edge runtimes")
    parser.add_argument("--dynamic", action="store_true", help="dynamic batch/image size")
    parser.add_argument("--half", action="store_true", help="FP16 weights (requires GPU export)")
    parser.add_argument("--no-simplify", action="store_true")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--no-verify", action="store_true")
    args = parser.parse_args()

    onnx_path = export(args.weights, args.imgsz, args.opset, args.dynamic, args.half,
                       not args.no_simplify, args.device)
    print(f"Exported: {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB)")
    if not args.no_verify:
        verify(onnx_path, args.imgsz)
    return 0


if __name__ == "__main__":
    sys.exit(main())
