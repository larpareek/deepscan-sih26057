// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// JS mirror of src/geotagging.py (linear mapping + slant-range correction, flat-earth offsets).
const M_PER_DEG_LAT = 111_320;

export function offsetLatLon([lat, lon], northM, eastM) {
  return [
    lat + northM / M_PER_DEG_LAT,
    lon + eastM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)),
  ];
}

export function acrossTrackM(x, meta) {
  const half = meta.image_width_px / 2;
  const slant = ((x - half) / half) * (meta.swath_width_m / 2);
  const ground = Math.sqrt(Math.max(slant * slant - meta.altitude_m ** 2, 0));
  return Math.sign(slant) * ground;
}

/** Pixel -> [lat, lon] for a north-up leg starting at meta.start with fixed ping spacing. */
export function pixelToGps(x, y, meta) {
  const headingRad = (meta.heading_deg * Math.PI) / 180;
  const along = y * meta.ping_spacing_m;
  const [lat0, lon0] = offsetLatLon(meta.start, along * Math.cos(headingRad), along * Math.sin(headingRad));
  const across = acrossTrackM(x, meta);
  const starboard = headingRad + Math.PI / 2;
  return offsetLatLon([lat0, lon0], across * Math.cos(starboard), across * Math.sin(starboard));
}

export function bboxDimensionsM({ x, y, w, h }, meta) {
  const across = Math.abs(acrossTrackM(x + w, meta) - acrossTrackM(x, meta));
  const along = h * meta.ping_spacing_m;
  return { length: +Math.max(along, across).toFixed(2), width: +Math.min(along, across).toFixed(2) };
}
