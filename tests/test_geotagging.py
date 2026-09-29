"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Tests for pixel -> latitude/longitude conversion and report generation.
"""

import csv
import json
from dataclasses import dataclass

import pytest

from src.geotagging import METERS_PER_DEG_LAT, GeotaggingEngine, SonarMetadata, _distance_m, pixel_to_gps

START = (13.0492, 80.2952)
SPACING = 0.2  # metres between pings


def north_track(n=400):
    return [(START[0] + i * SPACING / METERS_PER_DEG_LAT, START[1]) for i in range(n)]


@pytest.fixture
def meta():
    return SonarMetadata(
        ping_coords=north_track(), altitude_m=10, swath_width_m=100, image_width_px=1000,
        timestamp="2026-09-28T10:00:00Z",
    )


def test_starboard_edge_uses_slant_range_correction(meta):
    # Column 1000 = 50 m slant range; ground range = sqrt(50^2 - 10^2) = 48.99 m, east of a northbound track
    lat, lon = GeotaggingEngine().pixel_to_gps(1000, 0, meta)
    assert _distance_m(meta.ping_coords[0], (lat, lon)) == pytest.approx(48.99, abs=0.05)
    assert lon > START[1]


def test_port_side_is_west_of_track(meta):
    _, lon = pixel_to_gps(0, 0, meta)
    assert lon < START[1]


def test_linear_mapping_without_slant_correction(meta):
    meta.slant_range_correction = False
    lat, lon = GeotaggingEngine().pixel_to_gps(1000, 0, meta)
    assert _distance_m(meta.ping_coords[0], (lat, lon)) == pytest.approx(50.0, abs=0.05)


def test_water_column_maps_onto_track(meta):
    # Returns closer than the altitude are inside the water column: no horizontal offset
    lat, lon = GeotaggingEngine().pixel_to_gps(505, 0, meta)
    assert lon == pytest.approx(START[1], abs=1e-9)


def test_along_track_interpolates_between_pings(meta):
    lat_a, _ = pixel_to_gps(500, 10, meta)
    lat_b, _ = pixel_to_gps(500, 11, meta)
    lat_mid, _ = pixel_to_gps(500, 10.5, meta)
    assert lat_mid == pytest.approx((lat_a + lat_b) / 2, abs=1e-9)


def test_accepts_metadata_dict(meta):
    d = {
        "ping_coords": [list(p) for p in meta.ping_coords],
        "altitude_m": 10, "swath_width_m": 100, "image_width_px": 1000,
    }
    assert pixel_to_gps(800, 50, d) == pytest.approx(pixel_to_gps(800, 50, meta))


def test_bbox_dimensions_in_metres(meta):
    dims = GeotaggingEngine().bbox_dimensions_m((800, 100, 40, 26), meta)
    assert dims["length"] == pytest.approx(5.2, abs=0.01)  # 26 pings x 0.2 m
    assert dims["length"] >= dims["width"]


@dataclass
class FakeDetection:  # same shape as inference.Detection
    bbox: tuple
    label: str
    confidence: float  # percent


def test_generate_report_writes_json_and_csv(meta, tmp_path):
    dets = [
        FakeDetection((800, 100, 840, 126), "ghost_net", 92.0),
        {"class": "pipe", "confidence": 0.81, "bbox": (200, 50, 20, 300)},
    ]
    report = GeotaggingEngine().generate_report(dets, meta, output_dir=tmp_path)

    assert report["timestamp"] == "2026-09-28T10:00:00Z"
    assert [d["class"] for d in report["detections"]] == ["ghost_net", "pipe"]
    assert report["detections"][0]["confidence"] == pytest.approx(0.92)  # percent -> fraction
    assert set(report["detections"][0]["dimensions_meters"]) == {"length", "width"}

    assert json.loads((tmp_path / "report.json").read_text()) == report
    rows = list(csv.DictReader((tmp_path / "report.csv").open()))
    assert len(rows) == 2 and rows[1]["class"] == "pipe"


def test_metadata_requires_core_fields():
    with pytest.raises(KeyError):
        SonarMetadata.from_dict({"ping_coords": [[1, 2]]})
