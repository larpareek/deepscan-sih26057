"""DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Convert SSS pixel detections into geographic positions and survey reports.

Image convention (same as preprocessing.py): rows are pings (along-track), columns
are range samples across-track. For a combined port+starboard waterfall the centre
column is nadir (directly under the AUV); port is on the left, starboard on the right.

Prototype assumptions:
  * columns map linearly to slant range across the swath;
  * vehicle position between pings is linearly interpolated;
  * flat-earth (equirectangular) conversion from metres to degrees, fine for swaths
    of a few hundred metres.
"""

from __future__ import annotations

import csv
import json
import math
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

METERS_PER_DEG_LAT = 111_320.0


@dataclass
class SonarMetadata:
    ping_coords: list[tuple[float, float]]  # (lat, lon) of the AUV for each image row
    altitude_m: float  # height of the sonar above the seabed
    swath_width_m: float  # total slant-range swath covered by the image width (port + starboard)
    image_width_px: int
    headings_deg: list[float] | None = None  # per-ping heading; derived from track if None
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    dual_channel: bool = True  # False = single-sided image with nadir at column 0
    slant_range_correction: bool = True  # project slant range onto the seabed using altitude

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> SonarMetadata:
        return cls(
            ping_coords=[tuple(p) for p in d["ping_coords"]],
            altitude_m=float(d["altitude_m"]),
            swath_width_m=float(d["swath_width_m"]),
            image_width_px=int(d["image_width_px"]),
            headings_deg=d.get("headings_deg"),
            timestamp=d.get("timestamp") or datetime.now(UTC).isoformat(),
            dual_channel=d.get("dual_channel", True),
            slant_range_correction=d.get("slant_range_correction", True),
        )

    @property
    def num_pings(self) -> int:
        return len(self.ping_coords)


def _offset_latlon(lat: float, lon: float, north_m: float, east_m: float) -> tuple[float, float]:
    """Move (lat, lon) by a local north/east offset in metres."""
    dlat = north_m / METERS_PER_DEG_LAT
    dlon = east_m / (METERS_PER_DEG_LAT * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def _distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    mean_lat = math.radians((a[0] + b[0]) / 2)
    dn = (b[0] - a[0]) * METERS_PER_DEG_LAT
    de = (b[1] - a[1]) * METERS_PER_DEG_LAT * math.cos(mean_lat)
    return math.hypot(dn, de)


def _bearing_deg(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Heading from a to b, degrees clockwise from north."""
    mean_lat = math.radians((a[0] + b[0]) / 2)
    dn = b[0] - a[0]
    de = (b[1] - a[1]) * math.cos(mean_lat)
    return math.degrees(math.atan2(de, dn)) % 360.0


class GeotaggingEngine:
    def _ping_state(self, y: float, meta: SonarMetadata) -> tuple[float, float, float]:
        """Interpolated (lat, lon, heading) of the AUV at fractional row `y`."""
        n = meta.num_pings
        if n == 0:
            raise ValueError("metadata has no ping coordinates")
        y = min(max(y, 0.0), n - 1)
        i0 = int(math.floor(y))
        i1 = min(i0 + 1, n - 1)
        t = y - i0
        (lat0, lon0), (lat1, lon1) = meta.ping_coords[i0], meta.ping_coords[i1]
        lat, lon = lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0)

        if meta.headings_deg is not None:
            heading = meta.headings_deg[i0]
        elif n > 1:
            a, b = (i0, i1) if i1 != i0 else (i0 - 1, i0)
            heading = _bearing_deg(meta.ping_coords[a], meta.ping_coords[b])
        else:
            heading = 0.0
        return lat, lon, heading

    def across_track_m(self, x: float, meta: SonarMetadata) -> float:
        """Signed horizontal distance from the track for column `x` (+ starboard, - port)."""
        if meta.dual_channel:
            half_px = meta.image_width_px / 2
            slant = (x - half_px) / half_px * (meta.swath_width_m / 2)
        else:
            slant = x / meta.image_width_px * meta.swath_width_m
        if not meta.slant_range_correction:
            return slant
        # Ground range = sqrt(slant^2 - altitude^2); returns inside the water column map to nadir.
        ground = math.sqrt(max(slant * slant - meta.altitude_m ** 2, 0.0))
        return math.copysign(ground, slant)

    def along_track_resolution_m(self, meta: SonarMetadata) -> float:
        """Average distance travelled between consecutive pings."""
        if meta.num_pings < 2:
            return 0.0
        total = sum(_distance_m(a, b) for a, b in zip(meta.ping_coords, meta.ping_coords[1:], strict=False))
        return total / (meta.num_pings - 1)

    def pixel_to_gps(self, x: float, y: float, metadata: SonarMetadata | dict) -> tuple[float, float]:
        """Convert image pixel (x=column, y=row) to (latitude, longitude)."""
        meta = metadata if isinstance(metadata, SonarMetadata) else SonarMetadata.from_dict(metadata)
        lat, lon, heading = self._ping_state(y, meta)
        offset = self.across_track_m(x, meta)
        # Starboard is 90 deg clockwise from heading.
        bearing = math.radians(heading + 90.0)
        return _offset_latlon(lat, lon, offset * math.cos(bearing), offset * math.sin(bearing))

    def bbox_dimensions_m(self, bbox: tuple[float, float, float, float], meta: SonarMetadata) -> dict:
        """Physical size of an (x, y, w, h) box: along-track and across-track extent in metres."""
        x, y, w, h = bbox
        across = abs(self.across_track_m(x + w, meta) - self.across_track_m(x, meta))
        along = h * self.along_track_resolution_m(meta)
        return {"length": round(max(along, across), 2), "width": round(min(along, across), 2)}

    def geotag(self, detection: Any, metadata: SonarMetadata | dict) -> dict:
        """Geotag one detection (inference.Detection or dict with bbox (x, y, w, h))."""
        meta = metadata if isinstance(metadata, SonarMetadata) else SonarMetadata.from_dict(metadata)
        label, conf, bbox = _normalize_detection(detection)
        x, y, w, h = bbox
        lat, lon = self.pixel_to_gps(x + w / 2, y + h / 2, meta)
        return {
            "class": label,
            "confidence": round(conf, 4),
            "location": {"latitude": round(lat, 7), "longitude": round(lon, 7)},
            "dimensions_meters": self.bbox_dimensions_m(bbox, meta),
            "bbox_px": {"x": x, "y": y, "width": w, "height": h},
        }

    def generate_report(
        self,
        detections: Iterable[Any],
        metadata: SonarMetadata | dict,
        output_dir: str | Path = "data/processed",
        basename: str = "report",
    ) -> dict:
        """Write `<basename>.json` and `<basename>.csv` to `output_dir` and return the report dict.

        Top-level `location` is the AUV position at the middle of the image; each
        detection carries its own geotagged position.
        """
        meta = metadata if isinstance(metadata, SonarMetadata) else SonarMetadata.from_dict(metadata)
        tagged = [self.geotag(d, meta) for d in detections]
        center_lat, center_lon, _ = self._ping_state((meta.num_pings - 1) / 2, meta)

        report = {
            "timestamp": meta.timestamp,
            "location": {"latitude": round(center_lat, 7), "longitude": round(center_lon, 7)},
            "detections": tagged,
        }

        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        (out / f"{basename}.json").write_text(json.dumps(report, indent=2))

        with open(out / f"{basename}.csv", "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "class", "confidence", "latitude", "longitude",
                             "length_m", "width_m", "bbox_x", "bbox_y", "bbox_w", "bbox_h"])
            for d in tagged:
                b = d["bbox_px"]
                writer.writerow([meta.timestamp, d["class"], d["confidence"],
                                 d["location"]["latitude"], d["location"]["longitude"],
                                 d["dimensions_meters"]["length"], d["dimensions_meters"]["width"],
                                 b["x"], b["y"], b["width"], b["height"]])
        return report


def _normalize_detection(det: Any) -> tuple[str, float, tuple[float, float, float, float]]:
    """Return (label, confidence 0-1, (x, y, w, h)) from a Detection or a dict.

    inference.Detection uses bbox=(x1, y1, x2, y2) and confidence in percent; dicts
    are expected to use bbox=(x, y, w, h) and may give confidence as 0-1 or 0-100.
    """
    if hasattr(det, "bbox") and hasattr(det, "label"):
        x1, y1, x2, y2 = det.bbox
        return det.label, det.confidence / 100.0, (x1, y1, x2 - x1, y2 - y1)
    label = det.get("class", det.get("label"))
    conf = float(det.get("confidence", 0.0))
    if conf > 1.0:
        conf /= 100.0
    return label, conf, tuple(det["bbox"])


def pixel_to_gps(x: float, y: float, metadata: SonarMetadata | dict) -> tuple[float, float]:
    """Module-level convenience wrapper around GeotaggingEngine.pixel_to_gps."""
    return GeotaggingEngine().pixel_to_gps(x, y, metadata)
