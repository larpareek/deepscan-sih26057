"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Deploy the backend to a free Hugging Face Space (Docker SDK).

Usage:
    pip install huggingface_hub
    export HF_TOKEN=<token with write access>
    python scripts/deploy_hf_space.py --space <username>/seascan-api \
        --cors https://deepscan-sih26057-lilac.vercel.app

The Gemini key is read from the GEMINI_API_KEY environment variable or src/.env and stored
as a Space secret; it is never uploaded as a file.
"""

import argparse
import os
from pathlib import Path

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent.parent


def gemini_key() -> str | None:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    env = ROOT / "src" / ".env"
    if env.is_file():
        for line in env.read_text().splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip() or None
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--space", required=True, help="<username>/<space-name>")
    ap.add_argument("--cors", default="*", help="Allowed origin(s) for the API, comma-separated")
    args = ap.parse_args()

    api = HfApi(token=os.environ["HF_TOKEN"])
    api.create_repo(args.space, repo_type="space", space_sdk="docker", exist_ok=True)

    api.add_space_variable(args.space, "SSS_CORS_ORIGINS", args.cors)
    key = gemini_key()
    if key:
        api.add_space_secret(args.space, "GEMINI_API_KEY", key)
    else:
        print("No GEMINI_API_KEY found: /chat will answer with the offline summary.")

    api.upload_file(
        path_or_fileobj=str(ROOT / "deploy" / "huggingface" / "README.md"),
        path_in_repo="README.md",
        repo_id=args.space,
        repo_type="space",
    )
    api.upload_folder(
        folder_path=str(ROOT),
        repo_id=args.space,
        repo_type="space",
        allow_patterns=["Dockerfile", "requirements.txt", "src/**", "scripts/**", "models/seascan-yolov8n.pt"],
        ignore_patterns=["**/.env", "**/.env.*", "**/__pycache__/**", "**/*.pyc"],
        commit_message="Deploy SEASCAN API",
    )
    owner, name = args.space.split("/")
    print(f"Space: https://huggingface.co/spaces/{args.space}")
    print(f"API:   https://{owner}-{name}.hf.space".lower().replace("_", "-"))


if __name__ == "__main__":
    main()
