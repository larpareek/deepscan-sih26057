// Thin client for the FastAPI backend (proxied at /api by vite.config.js).
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function checkHealth(signal) {
  try {
    const r = await fetch(`${BASE}/health`, { signal });
    return r.ok;
  } catch {
    return false;
  }
}

async function jsonOrThrow(r) {
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof body.detail === "string" ? body.detail : `HTTP ${r.status}`);
  return body;
}

/** Speckle strength slider (0-100) -> backend despeckle method. */
export function despeckleMethod(strength) {
  if (strength < 34) return "median";
  if (strength < 67) return "lee";
  return "nlm";
}

export async function uploadScan(imageFile, metadataFile) {
  const fd = new FormData();
  fd.append("image", imageFile);
  fd.append("metadata", metadataFile);
  return jsonOrThrow(await fetch(`${BASE}/upload`, { method: "POST", body: fd }));
}

/** Detect with threshold 0 so the UI slider can filter client-side without re-running inference. */
export async function runDetection(jobId, strength) {
  const r = await fetch(`${BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, confidence_threshold: 0, despeckle_method: despeckleMethod(strength) }),
  });
  const body = await jsonOrThrow(r);
  return {
    ...body,
    detections: body.detections.map((d, i) => ({
      id: `D${i + 1}`,
      cls: d.class,
      confidence: d.confidence_percent ?? d.confidence * 100,
      bbox: { x: d.bbox_px.x, y: d.bbox_px.y, w: d.bbox_px.width, h: d.bbox_px.height },
      lat: d.location.latitude,
      lon: d.location.longitude,
      dims: d.dimensions_meters,
      shadowPenalized: Boolean(d.shadow_penalized),
    })),
  };
}

export const reportUrl = (jobId, format) => `${BASE}/report/${jobId}?format=${format}`;
