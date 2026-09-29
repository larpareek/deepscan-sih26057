"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Tests for the synthetic side-scan training-data generator.
"""

import numpy as np

from scripts.generate_synthetic import CLASSES, H, W, render_scene


def test_scene_is_preprocessed_uint8_waterfall():
    img, _ = render_scene(np.random.default_rng(1))
    assert img.shape == (H, W) and img.dtype == np.uint8


def test_labels_are_valid_yolo_boxes():
    rng = np.random.default_rng(7)
    seen = set()
    for _ in range(12):
        _, labels = render_scene(rng)
        for cls, x, y, w, h in labels:
            seen.add(cls)
            assert 0 <= cls < len(CLASSES)
            assert 0 < w <= 1 and 0 < h <= 1
            assert 0 <= x - w / 2 and x + w / 2 <= 1 and 0 <= y - h / 2 and y + h / 2 <= 1
    assert seen == set(range(len(CLASSES)))  # every class is generated


def test_targets_avoid_the_nadir_gap():
    rng = np.random.default_rng(3)
    for _ in range(8):
        _, labels = render_scene(rng)
        for _cls, x, _y, _w, _h in labels:
            assert abs(x - 0.5) > 0.03  # object centres lie off the vehicle track


def test_generation_is_reproducible():
    a, la = render_scene(np.random.default_rng(42))
    b, lb = render_scene(np.random.default_rng(42))
    assert np.array_equal(a, b) and la == lb
