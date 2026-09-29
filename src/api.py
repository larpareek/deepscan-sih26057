"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

FastAPI service exposing the SSS preprocessing -> detection -> geotagging pipeline.

Run:
    uvicorn src.api:app --host 0.0.0.0 --port 8000

Flow:
    POST /upload            (image + metadata.json)  -> {"job_id": ...}
    POST /detect            {"job_id": ...}          -> detections + geotags
    GET  /report/{job_id}?format=json|csv            -> report file download

Latency notes:
  * The model is loaded and warmed up once at startup, not per request.
  * Uploaded images are decoded once and cached in memory for /detect.
  * CPU/GPU-bound work (decode, preprocessing, inference, file IO) runs in the
    threadpool so the event loop keeps serving other requests.
  * Inference is serialised with a lock: a single YOLO model is not thread-safe,
    and one batch-of-one at a time is fastest on a single device anyway.
"""

from __future__ import annotations

import asyncio
import json
import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from src.geotagging import GeotaggingEngine, SonarMetadata
from src.inference import DEFAULT_WEIGHTS, MarineDebrisDetector
from src.preprocessing import preprocess

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

WEIGHTS = os.environ.get("SSS_WEIGHTS", str(DEFAULT_WEIGHTS))
DEVICE = os.environ.get("SSS_DEVICE")  # e.g. "cpu", "0" for first GPU; None = auto
MAX_UPLOAD_BYTES = int(os.environ.get("SSS_MAX_UPLOAD_MB", "50")) * 1024 * 1024
# Comma-separated allowed origins, e.g. "https://deepscan-sih26057-lilac.vercel.app". "*" allows any (dev default).
CORS_ORIGINS = [o.strip() for o in os.environ.get("SSS_CORS_ORIGINS", "*").split(",") if o.strip()]
ALLOWED_IMAGE_TYPES = {".png", ".jpg", ".jpeg"}


@dataclass
class Job:
    job_id: str
    image: np.ndarray
    metadata: dict
    created: float = field(default_factory=time.time)
    status: Literal["uploaded", "done"] = "uploaded"
    report_dir: Path | None = None


class DetectRequest(BaseModel):
    job_id: str
    confidence_threshold: float = Field(75.0, ge=0, le=100, description="Minimum confidence, percent")
    despeckle_method: Literal["lee", "nlm", "median"] = "lee"
    include_shadow_penalized: bool = True


class _State:
    detector: MarineDebrisDetector
    geotagger: GeotaggingEngine
    infer_lock: threading.Lock
    jobs: dict[str, Job]


state = _State()
_background_tasks: set[asyncio.Task] = set()  # keep references so tasks aren't GC'd mid-flight


@asynccontextmanager
async def lifespan(app: FastAPI):
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    state.detector = await run_in_threadpool(MarineDebrisDetector, WEIGHTS, device=DEVICE)
    state.geotagger = GeotaggingEngine()
    state.infer_lock = threading.Lock()
    state.jobs = {}
    # Warm-up pass so the first real request doesn't pay for lazy init / kernel compilation.
    await run_in_threadpool(state.detector.predict, np.zeros((640, 640), np.uint8))
    yield


app = FastAPI(title="SEASCAN API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


# --------------------------------------------------------------------------- #
# Helpers (sync; called via the threadpool)
# --------------------------------------------------------------------------- #
def _decode_image(data: bytes) -> np.ndarray:
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("could not decode image")
    return image


def _save_upload(job_dir: Path, image_name: str, image_bytes: bytes, metadata: dict) -> None:
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / image_name).write_bytes(image_bytes)
    (job_dir / "metadata.json").write_text(json.dumps(metadata))


def _run_pipeline(job: Job, req: DetectRequest) -> dict:
    t0 = time.perf_counter()
    enhanced, _dropout_mask = preprocess(job.image, despeckle_method=req.despeckle_method)
    t1 = time.perf_counter()

    with state.infer_lock:
        detections = state.detector.predict(
            enhanced, original=job.image, confidence_threshold=req.confidence_threshold
        )
    if not req.include_shadow_penalized:
        detections = [d for d in detections if not d.shadow_penalized]
    t2 = time.perf_counter()

    meta = SonarMetadata.from_dict(job.metadata)
    report_dir = PROCESSED_DIR / job.job_id
    report = state.geotagger.generate_report(detections, meta, output_dir=report_dir)
    cv2.imwrite(str(report_dir / "enhanced.png"), enhanced)
    t3 = time.perf_counter()

    job.status, job.report_dir = "done", report_dir
    # Merge raw detector output (percent confidence, shadow info) with geotags.
    for tagged, det in zip(report["detections"], detections, strict=True):
        tagged["confidence_percent"] = det.confidence
        tagged["shadow_fraction"] = round(det.shadow_fraction, 3)
        tagged["shadow_penalized"] = det.shadow_penalized
    return {
        "job_id": job.job_id,
        **report,
        "count": len(detections),
        "timing_ms": {
            "preprocess": round((t1 - t0) * 1000, 1),
            "inference": round((t2 - t1) * 1000, 1),
            "geotag_report": round((t3 - t2) * 1000, 1),
        },
    }


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.get("/health")
async def health():
    return {"status": "ok", "weights": WEIGHTS, "jobs": len(state.jobs)}


@app.post("/upload")
async def upload(
    image: UploadFile = File(..., description="Side-scan sonar image (.png/.jpg)"),
    metadata: UploadFile = File(..., description="Sonar metadata JSON"),
):
    ext = Path(image.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(415, f"image must be one of {sorted(ALLOWED_IMAGE_TYPES)}")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "image too large")
    try:
        meta = json.loads(await metadata.read())
    except json.JSONDecodeError as e:
        raise HTTPException(422, f"metadata is not valid JSON: {e}") from e

    try:
        decoded = await run_in_threadpool(_decode_image, image_bytes)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e

    h, w = decoded.shape[:2]
    meta.setdefault("image_width_px", w)
    try:
        parsed = SonarMetadata.from_dict(meta)
    except (KeyError, TypeError, ValueError) as e:
        raise HTTPException(422, f"invalid metadata: {e!r}") from e
    if parsed.num_pings != h:
        raise HTTPException(422, f"metadata has {parsed.num_pings} ping_coords but image has {h} rows")

    job_id = uuid.uuid4().hex
    state.jobs[job_id] = Job(job_id, decoded, meta)
    # Persist raw inputs without blocking the response.
    task = asyncio.create_task(run_in_threadpool(_save_upload, RAW_DIR / job_id, f"image{ext}", image_bytes, meta))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"job_id": job_id, "image_shape": [h, w], "num_pings": parsed.num_pings}


@app.post("/detect")
async def detect(req: DetectRequest):
    job = state.jobs.get(req.job_id)
    if job is None:
        raise HTTPException(404, f"unknown job_id {req.job_id}")
    return await run_in_threadpool(_run_pipeline, job, req)


@app.get("/report/{job_id}")
async def report(job_id: str, format: Literal["json", "csv"] = Query("json")):
    path = PROCESSED_DIR / job_id / f"report.{format}"
    if not path.is_file():
        job = state.jobs.get(job_id)
        detail = "report not generated yet; call POST /detect first" if job else f"unknown job_id {job_id}"
        raise HTTPException(404, detail)
    media = "application/json" if format == "json" else "text/csv"
    return FileResponse(path, media_type=media, filename=f"sss_report_{job_id}.{format}")
