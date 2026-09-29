// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { bboxDimensionsM, offsetLatLon, pixelToGps } from "../lib/geo";

export const IMAGE_W = 1024;
export const IMAGE_H = 640;

// Survey leg shown in the sonar view: heading north, 0.2 m between pings, 100 m swath.
export const DEMO_META = {
  start: [13.0492, 80.2952], // offshore Chennai, Bay of Bengal
  heading_deg: 0,
  ping_spacing_m: 0.2,
  swath_width_m: 100,
  altitude_m: 10,
  image_width_px: IMAGE_W,
  timestamp: "2026-09-28T10:42:17Z",
};

// Lawnmower survey pattern: 5 north/south legs, 90 m apart. Leg index 2 is the imaged one.
const LEG_LEN_M = IMAGE_H * DEMO_META.ping_spacing_m;
const LEG_SPACING_M = 90;
export const ACTIVE_LEG = 2;

function buildTrack() {
  const origin = offsetLatLon(DEMO_META.start, 0, -ACTIVE_LEG * LEG_SPACING_M);
  const pts = [];
  for (let leg = 0; leg < 5; leg++) {
    const east = leg * LEG_SPACING_M;
    const [a, b] = leg % 2 === 0 ? [0, LEG_LEN_M] : [LEG_LEN_M, 0];
    pts.push(offsetLatLon(origin, a, east), offsetLatLon(origin, b, east));
  }
  return pts;
}

export const DEMO_TRACK = buildTrack();
export const DEMO_TRACK_DONE = DEMO_TRACK.slice(0, (ACTIVE_LEG + 1) * 2);
export const DEMO_AUV_POS = DEMO_TRACK[ACTIVE_LEG * 2 + 1];

// Synthetic targets rendered into the sonar image. bbox is in image pixels.
export const DEMO_TARGETS = [
  { id: "T1", cls: "shipwreck", confidence: 94.2, bbox: { x: 690, y: 95, w: 170, h: 80 },
    shape: { kind: "hull", cx: 775, cy: 135, rx: 78, ry: 26, angle: 0.22 } },
  { id: "T2", cls: "pipe", confidence: 88.7, bbox: { x: 140, y: 290, w: 280, h: 44 },
    shape: { kind: "line", x1: 150, y1: 325, x2: 410, y2: 300, r: 4 } },
  { id: "T3", cls: "ghost_net", confidence: 81.3, bbox: { x: 612, y: 405, w: 84, h: 70 },
    shape: { kind: "net", cx: 654, cy: 440, rx: 36, ry: 28 } },
  { id: "T4", cls: "anomaly", confidence: 77.9, bbox: { x: 290, y: 508, w: 34, h: 30 },
    shape: { kind: "blob", cx: 307, cy: 523, r: 10 } },
  { id: "T5", cls: "ghost_net", confidence: 71.6, bbox: { x: 170, y: 72, w: 70, h: 60 },
    shape: { kind: "net", cx: 205, cy: 102, rx: 28, ry: 22 } },
  { id: "T6", cls: "anomaly", confidence: 58.4, bbox: { x: 868, y: 520, w: 40, h: 34 },
    shape: { kind: "blob", cx: 888, cy: 537, r: 8 } },
  // Sits in a dark region; the backend's shadow rule halved its score.
  { id: "T7", cls: "anomaly", confidence: 36.1, shadowPenalized: true, bbox: { x: 930, y: 140, w: 44, h: 40 },
    shape: null },
];

export const DEMO_DETECTIONS = DEMO_TARGETS.map((t) => {
  const [lat, lon] = pixelToGps(t.bbox.x + t.bbox.w / 2, t.bbox.y + t.bbox.h / 2, DEMO_META);
  return {
    id: t.id,
    cls: t.cls,
    confidence: t.confidence,
    bbox: t.bbox,
    lat,
    lon,
    dims: bboxDimensionsM(t.bbox, DEMO_META),
    shadowPenalized: Boolean(t.shadowPenalized),
  };
});

export const DEMO_LOG = [
  { t: "10:41:02", lvl: "ok", msg: "AUV-07 SEASCAN link established" },
  { t: "10:41:05", lvl: "ok", msg: "SSS 900 kHz dual-channel online" },
  { t: "10:41:40", lvl: "info", msg: "Leg 3/5 started, hdg 000°" },
  { t: "10:42:11", lvl: "info", msg: "Preprocess: dropout fill, Lee, CLAHE" },
  { t: "10:42:12", lvl: "info", msg: "YOLOv8n inference 16.5 ms" },
  { t: "10:42:12", lvl: "warn", msg: "T7 in acoustic shadow, conf ×0.5" },
  { t: "10:42:17", lvl: "alert", msg: "7 hazards geotagged" },
];
