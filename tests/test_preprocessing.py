"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Tests for the side-scan sonar preprocessing chain.
"""

import numpy as np
import pytest

from src.preprocessing import (
    apply_clahe,
    despeckle,
    detect_dropouts,
    fill_dropouts,
    lee_filter,
    preprocess,
    to_uint8,
)

RNG = np.random.default_rng(0)


def speckled_seabed(h=200, w=256):
    """Range-dependent seabed intensity with multiplicative gamma speckle (mean 1)."""
    seabed = np.tile(np.linspace(200, 60, w), (h, 1)).astype(np.float32)
    return seabed * RNG.gamma(4, 1 / 4, size=(h, w)).astype(np.float32)


def test_to_uint8_scales_and_handles_nan():
    img = np.array([[0.0, np.nan], [50.0, 100.0]], dtype=np.float32)
    out = to_uint8(img)
    assert out.dtype == np.uint8
    assert not np.isnan(out.astype(float)).any()
    assert out[1, 1] == 255


def test_clahe_preserves_shape_and_type():
    out = apply_clahe(speckled_seabed())
    assert out.shape == (200, 256)
    assert out.dtype == np.uint8


def test_lee_filter_reduces_speckle_in_flat_region():
    img = speckled_seabed()
    flat_before = img[50:150, 200:250].std()
    flat_after = lee_filter(img)[50:150, 200:250].std()
    assert flat_after < flat_before * 0.6


@pytest.mark.parametrize("method", ["lee", "nlm", "median"])
def test_despeckle_methods(method):
    out = despeckle(to_uint8(speckled_seabed()), method=method)
    assert out.shape == (200, 256)


def test_despeckle_rejects_unknown_method():
    with pytest.raises(ValueError):
        despeckle(speckled_seabed(), method="gaussian")


def test_detect_dropouts_flags_blank_and_nan_pings():
    img = speckled_seabed()
    img[10] = 0
    img[20] = np.nan
    mask, bad_rows = detect_dropouts(img)
    assert bad_rows[10] and bad_rows[20]
    assert bad_rows.sum() == 2
    assert mask[10].all()


def test_fill_dropouts_interpolates_missing_ping():
    img = np.tile(np.linspace(50, 150, 64), (32, 1)).astype(np.float32)
    img[16] = 0  # one dropped ping
    filled, mask = fill_dropouts(img)
    # The repaired ping should match its neighbours, not stay black
    assert abs(float(filled[16].mean()) - float(filled[15].mean())) < 3
    assert mask[16].all()


def test_preprocess_pipeline_end_to_end():
    img = speckled_seabed()
    img[5:8] = 0
    img[100] = np.nan
    enhanced, mask = preprocess(img)
    assert enhanced.dtype == np.uint8
    assert enhanced.shape == img.shape
    assert enhanced[6].mean() > 10  # dropped pings were filled
    assert mask.shape == img.shape


def test_preprocess_accepts_colour_images():
    rgb = np.dstack([to_uint8(speckled_seabed())] * 3)
    enhanced, _ = preprocess(rgb)
    assert enhanced.ndim == 2
