"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Generate a labelled *synthetic* side-scan sonar dataset in YOLO format.

The simulator is a Python port of the demo renderer (ui/src/lib/sonarSynth.js) with
randomised seabed, geometry and targets. Each image is passed through the same
preprocessing the API applies before inference (src.preprocessing.preprocess), so the
detector trains on exactly what it will see in production.

Classes: 0 shipwreck, 1 pipe, 2 ghost_net, 3 anomaly

Usage:
    python scripts/generate_synthetic.py --out data/synthetic --train 800 --val 160
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.preprocessing import preprocess  # noqa: E402

CLASSES = ["shipwreck", "pipe", "ghost_net", "anomaly"]
W, H = 1024, 640


def seabed(rng: np.random.Generator, w: int, h: int) -> np.ndarray:
    """Noise-free seabed return: nadir gap, first-bottom ramp, range falloff, patches, ripples."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    half = w / 2
    ax = np.abs(x - half)
    p = rng.uniform(0, 2 * math.pi, 6)
    f = rng.uniform(0.6, 1.6, 4)
    nadir = (rng.uniform(24, 48) + rng.uniform(3, 8) * np.sin(y * 0.02 * f[0] + p[0])
             + 3 * np.sin(y * 0.11 + p[1]))
    patch = (0.5 * np.sin(x * 0.006 * f[1] + p[2]) * np.cos(y * 0.009 * f[2] + p[3])
             + 0.5 * np.sin((x + y) * 0.004 * f[3]))
    ripple_amp = rng.uniform(0.0, 0.14)
    ky, kx = rng.uniform(0.12, 0.26), rng.uniform(0.02, 0.07)  # same draw order as before
    ripple = ripple_amp * np.sin(y * ky + x * kx + 2 * np.sin(x * 0.012 + p[4]))
    r = ax / half
    onset = 1 - np.exp(-np.clip(ax - nadir, 0, None) / rng.uniform(12, 24))
    falloff = rng.uniform(0.85, 0.98) - rng.uniform(0.35, 0.6) * r**2
    base = rng.uniform(0.6, 0.8)
    clean = np.clip(onset * falloff * (base + rng.uniform(0.08, 0.18) * patch + ripple), 0, None)
    if rng.random() < 0.6:  # faint surface-return band
        surface = rng.uniform(200, 320) + 15 * np.sin(y * 0.013 + p[5])
        clean += np.where(np.abs(ax - surface) < 3, 0.06, 0.0)
    clean[ax < nadir] = 0.035
    return clean.astype(np.float32)


def shape_mask(kind: str, rng: np.random.Generator, xx: np.ndarray, yy: np.ndarray, s: dict) -> np.ndarray:
    """Intensity (0 = no object) of a target over a local grid."""
    if kind == "shipwreck":
        c, sn = math.cos(s["angle"]), math.sin(s["angle"])
        dx, dy = xx - s["cx"], yy - s["cy"]
        u = (dx * c + dy * sn) / s["rx"]
        v = (-dx * sn + dy * c) / s["ry"]
        d = u * u + v * v
        ribs = 0.75 + 0.25 * np.sin(u * s["ribs"])
        deck = np.where(np.abs(u - s["deck"]) < 0.12, 0.35, 0.0)
        val = (0.55 + 0.45 * (1 - d)) * ribs + deck + 0.15 * rng.random(xx.shape)
        return np.where(d <= 1, val, 0.0)
    if kind == "pipe":
        vx, vy = s["x2"] - s["x1"], s["y2"] - s["y1"]
        t = np.clip(((xx - s["x1"]) * vx + (yy - s["y1"]) * vy) / (vx * vx + vy * vy), 0, 1)
        dist = np.hypot(xx - (s["x1"] + t * vx), yy - (s["y1"] + t * vy))
        return np.where(dist < s["r"], 0.95 - dist * 0.08, 0.0)
    if kind == "ghost_net":
        u, v = (xx - s["cx"]) / s["rx"], (yy - s["cy"]) / s["ry"]
        edge = u * u + v * v + 0.25 * np.sin(np.arctan2(v, u) * s["lobes"] + s["phase"])
        mesh = np.abs(np.sin(xx * s["fx"] + yy * 0.35)) * np.abs(np.sin(yy * s["fy"] - xx * 0.3))
        val = np.where(mesh > 0.35, 0.75 + 0.2 * rng.random(xx.shape), 0.12 * rng.random(xx.shape))
        return np.where(edge <= 1, val, 0.0)
    # anomaly: boulder, drum or small box
    if s["box"]:
        inside = (np.abs(xx - s["cx"]) < s["r"] * 1.3) & (np.abs(yy - s["cy"]) < s["r"])
        return np.where(inside, 0.9, 0.0)
    d = np.hypot(xx - s["cx"], (yy - s["cy"]) * s["squash"]) / s["r"]
    return np.where(d < 1, 1.0 - 0.4 * d, 0.0)


def random_target(kind: str, rng: np.random.Generator, w: int, h: int) -> tuple[dict, float]:
    """Random parameters for a target and its rough radius (for placement)."""
    side = rng.choice([-1, 1])
    if kind == "shipwreck":
        rx, ry = rng.uniform(40, 110), rng.uniform(12, 34)
        s = dict(rx=rx, ry=ry, angle=rng.uniform(-0.7, 0.7), ribs=rng.uniform(14, 28), deck=rng.uniform(-0.5, 0.5))
        rad = rx
    elif kind == "pipe":
        L, ang = rng.uniform(120, 420), rng.uniform(-math.pi / 2, math.pi / 2)
        s = dict(dx=L / 2 * math.cos(ang), dy=L / 2 * math.sin(ang), r=rng.uniform(2.5, 6))
        rad = L / 2
    elif kind == "ghost_net":
        s = dict(rx=rng.uniform(18, 50), ry=rng.uniform(15, 40), lobes=int(rng.integers(3, 8)),
                 phase=rng.uniform(0, 6.3), fx=rng.uniform(0.55, 0.95), fy=rng.uniform(0.55, 0.95))
        rad = max(s["rx"], s["ry"]) * 1.2
    else:
        s = dict(r=rng.uniform(5, 16), squash=rng.uniform(0.7, 1.4), box=bool(rng.random() < 0.3))
        rad = s["r"] * 1.5
    return s | {"side": side}, rad


def place(s: dict, kind: str, rad: float, rng, w, h, taken):
    """Pick a centre on one channel away from nadir and other targets; returns False if none fits."""
    half = w / 2
    for _ in range(40):
        off = rng.uniform(60 + rad * 0.6, half - rad - 10)
        cx = half + s["side"] * off
        cy = rng.uniform(rad * 0.6 + 8, h - rad * 0.6 - 8)
        if all(math.hypot(cx - tx, cy - ty) > rad + tr + 20 for tx, ty, tr in taken):
            taken.append((cx, cy, rad))
            s["cx"], s["cy"] = cx, cy
            if kind == "pipe":
                s.update(x1=cx - s["dx"], y1=cy - s["dy"], x2=cx + s["dx"], y2=cy + s["dy"])
            return True
    return False


def render_scene(rng: np.random.Generator, w: int = W, h: int = H):
    clean = seabed(rng, w, h)
    half = w / 2
    labels = []
    n = int(rng.choice([0, 1, 2, 3, 4, 5, 6], p=[0.08, 0.14, 0.2, 0.22, 0.18, 0.1, 0.08]))
    taken: list = []
    for _ in range(n):
        cls = int(rng.choice(4, p=[0.25, 0.22, 0.25, 0.28]))
        kind = CLASSES[cls]
        s, rad = random_target(kind, rng, w, h)
        if not place(s, kind, rad, rng, w, h, taken):
            continue
        pad = int(rad * 1.3) + 12
        x0, x1 = max(0, int(s["cx"] - pad)), min(w, int(s["cx"] + pad))
        y0, y1 = max(0, int(s["cy"] - pad)), min(h, int(s["cy"] + pad))
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        val = shape_mask(kind, rng, xx, yy, s)
        mask = val > 0
        if mask.sum() < 20:
            continue
        region = clean[y0:y1, x0:x1]
        region[mask] = np.minimum(1.25, region[mask] * 0.35 + val[mask])
        # Acoustic shadow behind the object, away from nadir, with a soft tail
        starboard = s["cx"] > half
        bh = mask.any(axis=1).sum()
        shadow_len = 14 if kind == "pipe" else 30 if kind == "anomaly" else int(bh * rng.uniform(1.2, 2.0))
        cols = np.arange(x0, x1)
        for ri, row in enumerate(mask):
            if not row.any():
                continue
            outer = cols[row].max() if starboard else cols[row].min()
            k = np.arange(1, shadow_len + 1)
            xs = outer + k if starboard else outer - k
            ok = (xs >= 0) & (xs < w)
            soft = np.where(k > shadow_len * 0.8, (k - shadow_len * 0.8) / (shadow_len * 0.2), 0)
            clean[y0 + ri, xs[ok]] *= (0.05 + 0.95 * soft)[ok]
        ys, xs_ = np.nonzero(mask)
        bx0, bx1 = x0 + xs_.min() - 3, x0 + xs_.max() + 3
        by0, by1 = y0 + ys.min() - 3, y0 + ys.max() + 3
        bx0, by0, bx1, by1 = max(0, bx0), max(0, by0), min(w - 1, bx1), min(h - 1, by1)
        labels.append((cls, (bx0 + bx1) / 2 / w, (by0 + by1) / 2 / h, (bx1 - bx0) / w, (by1 - by0) / h))

    # Multiplicative gamma speckle (mean 1), at a random despeckle strength
    speckle = rng.gamma(4, 1 / 4, size=(h, w)).astype(np.float32)
    keep = rng.uniform(0.1, 0.9)
    v = clean * (1 + (speckle - 1) * keep) * rng.uniform(0.85, 1.15)
    img = (np.power(np.clip(v, 0, 1), 0.85) * 255).astype(np.float32)
    # Occasional dropped pings (AUV motion); the preprocessor repairs them
    if rng.random() < 0.25:
        for _ in range(int(rng.integers(1, 4))):
            r0 = int(rng.integers(0, h - 3))
            img[r0 : r0 + int(rng.integers(1, 3))] = 0
    enhanced, _ = preprocess(img, despeckle_method=str(rng.choice(["lee", "median"])))
    return enhanced, labels


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="data/synthetic")
    ap.add_argument("--train", type=int, default=800)
    ap.add_argument("--val", type=int, default=160)
    ap.add_argument("--seed", type=int, default=26057)
    args = ap.parse_args()

    out = Path(args.out)
    rng = np.random.default_rng(args.seed)
    counts = np.zeros(len(CLASSES), int)
    for split, n in (("train", args.train), ("val", args.val)):
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)
        for i in range(n):
            img, labels = render_scene(rng)
            cv2.imwrite(str(out / "images" / split / f"{split}_{i:04d}.png"), img)
            with open(out / "labels" / split / f"{split}_{i:04d}.txt", "w") as f:
                for c, *box in labels:
                    f.write(f"{c} " + " ".join(f"{b:.6f}" for b in box) + "\n")
                    counts[c] += 1
        print(f"{split}: {n} images")
    (out / "seascan.yaml").write_text(
        f"path: {out.resolve()}\ntrain: images/train\nval: images/val\nnames:\n"
        + "".join(f"  {i}: {c}\n" for i, c in enumerate(CLASSES))
    )
    print("objects per class:", dict(zip(CLASSES, counts.tolist(), strict=True)))


if __name__ == "__main__":
    main()
