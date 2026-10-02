"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Fetch the trained SEASCAN detector into models/ and verify its checksum.

The weights (models/seascan-yolov8n.pt, 6.2 MB) are committed to the repository, so a normal
`git clone` already has them. Use this script if they are missing, e.g. after downloading a
partial archive or cloning with Git LFS filters.

Usage:
    python scripts/download_weights.py          # skip if already present and valid
    python scripts/download_weights.py --force  # re-download
"""

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "models" / "seascan-yolov8n.pt"
URL = "https://raw.githubusercontent.com/larpareek/deepscan-sih26057/main/models/seascan-yolov8n.pt"
SHA256 = "0cecfe26005ea31a34ae52bb759b65246e62e0b713aa477cdc37e9883dbe253e"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="download even if a valid file exists")
    args = ap.parse_args()

    if TARGET.is_file() and not args.force and sha256(TARGET) == SHA256:
        print(f"{TARGET.relative_to(ROOT)} already present and verified.")
        return 0

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    tmp = TARGET.with_suffix(".part")
    print(f"Downloading {URL}")
    urllib.request.urlretrieve(URL, tmp)
    digest = sha256(tmp)
    if digest != SHA256:
        tmp.unlink()
        print(f"Checksum mismatch ({digest}); file discarded.", file=sys.stderr)
        return 1
    tmp.replace(TARGET)
    print(f"Saved and verified {TARGET.relative_to(ROOT)} ({TARGET.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
