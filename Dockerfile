# DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
# Backend image (FastAPI + YOLOv8, CPU). Works on Railway, Render, Fly.io or any Docker host.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    SSS_DEVICE=cpu \
    YOLO_CONFIG_DIR=/tmp/ultralytics

# OpenCV runtime libraries
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only PyTorch first (the default wheel bundles CUDA and is several GB larger)
COPY requirements.txt .
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt

COPY src ./src
COPY scripts ./scripts

# Bake the weights into the image so cold starts don't download them
RUN mkdir -p models data/raw data/processed \
    && python -c "from ultralytics import YOLO; YOLO('models/yolov8n.pt')"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/health')"
CMD ["sh", "-c", "uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
