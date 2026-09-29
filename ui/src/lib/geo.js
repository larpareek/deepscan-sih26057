// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
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

export function distanceM([lat1, lon1], [lat2, lon2]) {
  const mean = (((lat1 + lat2) / 2) * Math.PI) / 180;
  const dn = (lat2 - lat1) * M_PER_DEG_LAT;
  const de = (lon2 - lon1) * M_PER_DEG_LAT * Math.cos(mean);
  return Math.hypot(dn, de);
}

function bearingDeg([lat1, lon1], [lat2, lon2]) {
  const mean = (((lat1 + lat2) / 2) * Math.PI) / 180;
  return ((Math.atan2((lon2 - lon1) * Math.cos(mean), lat2 - lat1) * 180) / Math.PI + 360) % 360;
}

/**
 * Scan geometry for either mode, mirroring src/geotagging.py:
 *  - live scans use the recorded ping positions (one [lat, lon] per image row)
 *  - the demo leg is a straight track from `start` at `headingDeg`
 * Returns helpers in metres and degrees for axes, cursor readouts and detection metadata.
 */
export function makeScanGeometry({ widthPx, heightPx, swathM, altitudeM, pingCoords, start, headingDeg = 0, pingSpacingM }) {
  const legacy = { image_width_px: widthPx, swath_width_m: swathM, altitude_m: altitudeM };
  const across = (x) => acrossTrackM(x, legacy);

  if (pingCoords && pingCoords.length > 1) {
    let total = 0;
    for (let i = 1; i < pingCoords.length; i++) total += distanceM(pingCoords[i - 1], pingCoords[i]);
    const spacing = total / (pingCoords.length - 1);
    const at = (y) => {
      const n = pingCoords.length;
      const yy = Math.min(Math.max(y, 0), n - 1);
      const i0 = Math.floor(yy);
      const i1 = Math.min(i0 + 1, n - 1);
      const t = yy - i0;
      const [a, b] = [pingCoords[i0], pingCoords[i1]];
      const heading = bearingDeg(pingCoords[Math.max(0, i1 - 1)], pingCoords[Math.max(1, i1)]);
      return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), heading];
    };
    return {
      widthPx, heightPx, swathM, pingSpacingM: spacing, lengthM: total,
      acrossM: across,
      alongM: (y) => y * spacing,
      pixelToGps(x, y) {
        const [lat, lon, h] = at(y);
        const d = across(x);
        const b = ((h + 90) * Math.PI) / 180;
        return offsetLatLon([lat, lon], d * Math.cos(b), d * Math.sin(b));
      },
    };
  }

  const meta = { ...legacy, start, heading_deg: headingDeg, ping_spacing_m: pingSpacingM };
  return {
    widthPx, heightPx, swathM, pingSpacingM, lengthM: heightPx * pingSpacingM,
    acrossM: across,
    alongM: (y) => y * pingSpacingM,
    pixelToGps: (x, y) => pixelToGps(x, y, meta),
  };
}

/** Format a coordinate as degrees with hemisphere, e.g. 13.04944° N. */
export function fmtLat(v) {
  return `${Math.abs(v).toFixed(5)}° ${v >= 0 ? "N" : "S"}`;
}
export function fmtLon(v) {
  return `${Math.abs(v).toFixed(5)}° ${v >= 0 ? "E" : "W"}`;
}
