"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Preprocessing for Side-Scan Sonar (SSS) waterfall imagery.

Convention: images are 2D arrays of shape (pings, range_bins), i.e. each row is
one acoustic ping (along-track) and each column is a slant-range sample
(across-track). Port and starboard channels can be passed together or separately.

Recommended order (see `preprocess`):
    1. fill_dropouts  - so blank pings don't skew noise/contrast statistics
    2. despeckle      - remove multiplicative speckle before it gets amplified
    3. apply_clahe    - enhance local contrast of the cleaned image
"""

from __future__ import annotations

import cv2
import numpy as np


def to_uint8(image: np.ndarray) -> np.ndarray:
    """Normalise any numeric image to uint8 [0, 255], ignoring NaNs."""
    if image.dtype == np.uint8:
        return image
    img = image.astype(np.float32)
    finite = np.isfinite(img)
    if not finite.any():
        return np.zeros(img.shape, dtype=np.uint8)
    lo, hi = np.percentile(img[finite], (0.5, 99.5))
    img = np.where(finite, img, lo)
    img = np.clip((img - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    return (img * 255.0).astype(np.uint8)


# --------------------------------------------------------------------------- #
# 1. Contrast enhancement
# --------------------------------------------------------------------------- #
def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Contrast Limited Adaptive Histogram Equalization.

    SSS returns fall off strongly with range and vary with seabed type, so a
    global stretch washes out targets. CLAHE equalises per tile, with
    `clip_limit` capping how much residual noise gets amplified.
    """
    img = to_uint8(image)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(img)


# --------------------------------------------------------------------------- #
# 2. Speckle reduction
# --------------------------------------------------------------------------- #
def lee_filter(
    image: np.ndarray,
    window_size: int = 7,
    noise_variance: float | None = None,
) -> np.ndarray:
    """Classic Lee filter for multiplicative speckle noise.

    out = mean + W * (pixel - mean),  W = var_signal / (var_signal + var_noise)

    Homogeneous areas (low local variance) get smoothed toward the local mean,
    while edges and strong reflectors (high local variance) are preserved.
    If `noise_variance` is None it is estimated as the mean local variance.
    """
    img = image.astype(np.float32)
    ksize = (window_size, window_size)
    mean = cv2.boxFilter(img, -1, ksize, borderType=cv2.BORDER_REFLECT)
    sq_mean = cv2.boxFilter(img * img, -1, ksize, borderType=cv2.BORDER_REFLECT)
    variance = np.maximum(sq_mean - mean * mean, 0.0)

    if noise_variance is None:
        noise_variance = float(np.mean(variance))

    weights = variance / (variance + noise_variance + 1e-8)
    out = mean + weights * (img - mean)

    if image.dtype == np.uint8:
        return np.clip(out, 0, 255).astype(np.uint8)
    return out.astype(image.dtype, copy=False)


def nlm_denoise(
    image: np.ndarray,
    h: float = 10.0,
    template_window: int = 7,
    search_window: int = 21,
) -> np.ndarray:
    """Non-Local Means denoising (slower than Lee, usually better texture preservation)."""
    return cv2.fastNlMeansDenoising(to_uint8(image), None, h, template_window, search_window)


def despeckle(image: np.ndarray, method: str = "lee", **kwargs) -> np.ndarray:
    """Dispatch to a speckle filter: 'lee', 'nlm', or 'median'."""
    if method == "lee":
        return lee_filter(image, **kwargs)
    if method == "nlm":
        return nlm_denoise(image, **kwargs)
    if method == "median":
        return cv2.medianBlur(to_uint8(image), kwargs.get("ksize", 5))
    raise ValueError(f"Unknown despeckle method: {method!r}")


# --------------------------------------------------------------------------- #
# 3. Dropout handling (AUV motion artifacts / lost pings)
# --------------------------------------------------------------------------- #
def detect_dropouts(
    image: np.ndarray,
    dropout_value: float = 0.0,
    row_fraction: float = 0.9,
    pixel_tol: float = 1e-6,
) -> tuple[np.ndarray, np.ndarray]:
    """Find missing data.

    Returns:
        pixel_mask: bool (H, W), True where a sample is missing (NaN or == dropout_value).
        bad_rows:   bool (H,),  True for pings where >= `row_fraction` of samples are missing
                    (whole-ping dropouts from pitch/roll spikes, surfacing, or comms loss).

    Note: the nadir/water-column gap at the centre of a combined port+starboard
    image is *not* a dropout; slant-range correct or crop it before calling this.
    """
    img = image.astype(np.float32)
    pixel_mask = ~np.isfinite(img) | (np.abs(img - dropout_value) <= pixel_tol)
    bad_rows = pixel_mask.mean(axis=1) >= row_fraction
    return pixel_mask, bad_rows


def interpolate_dropout_rows(image: np.ndarray, bad_rows: np.ndarray) -> np.ndarray:
    """Linearly interpolate missing pings along-track from the nearest valid pings.

    Each column (range bin) is interpolated independently, which is appropriate
    because adjacent pings image nearly the same seabed strip.
    """
    img = image.astype(np.float32).copy()
    good = np.flatnonzero(~bad_rows)
    bad = np.flatnonzero(bad_rows)
    if bad.size == 0 or good.size == 0:
        return img
    for col in range(img.shape[1]):
        img[bad, col] = np.interp(bad, good, img[good, col])
    return img


def fill_dropouts(
    image: np.ndarray,
    dropout_value: float = 0.0,
    row_fraction: float = 0.9,
    inpaint_radius: int = 3,
) -> tuple[np.ndarray, np.ndarray]:
    """Repair data dropouts caused by AUV motion artifacts.

    Two passes:
      1. Whole missing pings -> linear interpolation along-track.
      2. Remaining scattered holes -> OpenCV Telea inpainting.

    Returns (filled_uint8_image, original_pixel_mask). Keep the mask: detections
    over interpolated regions should be down-weighted or flagged.
    """
    pixel_mask, bad_rows = detect_dropouts(image, dropout_value, row_fraction)

    img = image.astype(np.float32)
    img[~np.isfinite(img)] = dropout_value
    img = interpolate_dropout_rows(img, bad_rows)

    img_u8 = to_uint8(img)
    residual = pixel_mask.copy()
    residual[bad_rows] = False
    if residual.any():
        img_u8 = cv2.inpaint(img_u8, residual.astype(np.uint8) * 255, inpaint_radius, cv2.INPAINT_TELEA)

    return img_u8, pixel_mask


# --------------------------------------------------------------------------- #
# Full pipeline
# --------------------------------------------------------------------------- #
def preprocess(
    image: np.ndarray,
    despeckle_method: str = "lee",
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
    dropout_value: float = 0.0,
) -> tuple[np.ndarray, np.ndarray]:
    """Run the full SSS preprocessing chain.

    Returns (enhanced_uint8_image, dropout_mask).
    """
    if image.ndim == 3:
        image = cv2.cvtColor(to_uint8(image), cv2.COLOR_BGR2GRAY)
    filled, mask = fill_dropouts(image, dropout_value=dropout_value)
    clean = despeckle(filled, method=despeckle_method)
    enhanced = apply_clahe(clean, clip_limit=clip_limit, tile_grid_size=tile_grid_size)
    return enhanced, mask


def sonar_input_warning(image: np.ndarray) -> str | None:
    """Flag inputs that are clearly not side-scan sonar (e.g. a colour photograph).

    SSS waterfalls are single-channel, or rendered with a one-hue palette (bronze/copper).
    Many saturated pixels spread across many hues means a natural colour image, on which
    the detector's output is meaningless. Returns a human-readable warning or None.
    """
    if image.ndim != 3 or image.shape[2] < 3:
        return None
    hsv = cv2.cvtColor(to_uint8(image[..., :3]), cv2.COLOR_BGR2HSV)
    saturated = hsv[..., 1] > 60
    if saturated.mean() < 0.1:
        return None
    hue = hsv[..., 0][saturated].astype(np.float32) * (np.pi / 90)  # OpenCV hue is 0-179
    coherence = float(np.hypot(np.cos(hue).mean(), np.sin(hue).mean()))  # 1 = single hue
    if coherence >= 0.8:
        return None
    return (
        "input is a multi-colour image (photo or false-colour render), not a sonar waterfall; "
        "detections are unreliable"
    )


def preprocess_file(src_path: str, dst_path: str, **kwargs) -> np.ndarray:
    """Load an image from disk (e.g. data/raw), preprocess it, and save (e.g. data/processed)."""
    image = cv2.imread(src_path, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(src_path)
    enhanced, _ = preprocess(image, **kwargs)
    cv2.imwrite(dst_path, enhanced)
    return enhanced


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Preprocess a side-scan sonar image.")
    parser.add_argument("src")
    parser.add_argument("dst")
    parser.add_argument("--method", default="lee", choices=["lee", "nlm", "median"])
    parser.add_argument("--clip-limit", type=float, default=2.0)
    args = parser.parse_args()
    preprocess_file(args.src, args.dst, despeckle_method=args.method, clip_limit=args.clip_limit)
