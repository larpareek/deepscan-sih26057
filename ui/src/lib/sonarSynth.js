// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Procedural side-scan sonar waterfall for demo mode.
// Row = ping (along-track), column = range; the centre column is nadir.
// Produces: dark water-column gap at nadir, range-dependent gain falloff, sand
// ripples, multiplicative speckle, and targets with bright highlights followed
// by acoustic shadows cast away from the vehicle.

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Operator-selectable return palettes (dark = weak echo, bright = strong echo)
const PALETTES = {
  gray: [
    [0.0, [8, 8, 8]],
    [0.3, [52, 52, 52]],
    [0.55, [110, 110, 110]],
    [0.8, [190, 190, 190]],
    [0.93, [228, 228, 228]],
    [1.0, [245, 245, 245]],
  ],
  bronze: [
    [0.0, [10, 7, 4]],
    [0.3, [64, 38, 14]],
    [0.55, [140, 88, 34]],
    [0.8, [214, 160, 86]],
    [0.93, [242, 214, 160]],
    [1.0, [252, 240, 215]],
  ],
};

function buildLut(stops) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k];
    const [t1, c1] = stops[k + 1];
    const f = (t - t0) / (t1 - t0);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * f;
  }
  return lut;
}
const LUTS = Object.fromEntries(Object.entries(PALETTES).map(([k, v]) => [k, buildLut(v)]));

/** CSS gradient matching a palette, for the colour-scale legend. */
export function paletteGradient(name) {
  const stops = PALETTES[name] ?? PALETTES.gray;
  return `linear-gradient(90deg, ${stops.map(([t, c]) => `rgb(${c.join(",")}) ${Math.round(t * 100)}%`).join(", ")})`;
}

function shapeIntensity(s, x, y, rand) {
  switch (s.kind) {
    case "hull": {
      const dx = x - s.cx, dy = y - s.cy;
      const c = Math.cos(s.angle), sn = Math.sin(s.angle);
      const u = (dx * c + dy * sn) / s.rx, v = (-dx * sn + dy * c) / s.ry;
      const d = u * u + v * v;
      if (d > 1) return 0;
      const ribs = 0.75 + 0.25 * Math.sin(u * 22);
      const deck = Math.abs(u + 0.25) < 0.12 ? 0.35 : 0; // superstructure
      return (0.55 + 0.45 * (1 - d)) * ribs + deck + 0.15 * rand();
    }
    case "line": {
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (vx * vx + vy * vy)));
      const px = s.x1 + t * vx, py = s.y1 + t * vy;
      const dist = Math.hypot(x - px, y - py);
      return dist < s.r ? 0.95 - dist * 0.08 : 0;
    }
    case "net": {
      const u = (x - s.cx) / s.rx, v = (y - s.cy) / s.ry;
      const edge = u * u + v * v + 0.25 * Math.sin(Math.atan2(v, u) * 5);
      if (edge > 1) return 0;
      const mesh = Math.abs(Math.sin(x * 0.75 + y * 0.35)) * Math.abs(Math.sin(y * 0.75 - x * 0.3));
      return mesh > 0.35 ? 0.75 + 0.2 * rand() : 0.12 * rand();
    }
    case "blob": {
      const d = Math.hypot(x - s.cx, y - s.cy) / s.r;
      return d < 1 ? 1.0 - 0.4 * d : 0;
    }
    default:
      return 0;
  }
}

/**
 * Build the noise-free image and an independent speckle field once, so the
 * "speckle filter strength" slider can re-mix them cheaply.
 */
export function buildSonarLayers(width, height, targets, seed = 7) {
  const rand = mulberry32(seed);
  const clean = new Float32Array(width * height);
  const speckle = new Float32Array(width * height);
  const half = width / 2;

  // Low-frequency seabed variation (patches of mud/sand)
  const patch = (x, y) =>
    0.5 * Math.sin(x * 0.006 + 1.3) * Math.cos(y * 0.009 + 0.4) + 0.5 * Math.sin((x + y) * 0.004);

  for (let y = 0; y < height; y++) {
    const nadir = 34 + 6 * Math.sin(y * 0.02) + 3 * Math.sin(y * 0.11); // altitude wobble
    const surface = 250 + 15 * Math.sin(y * 0.013); // faint surface return band
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const ax = Math.abs(x - half);
      // Gamma(4)-distributed speckle (mean 1): average of 4 exponentials
      speckle[i] =
        -(Math.log(rand() + 1e-9) + Math.log(rand() + 1e-9) + Math.log(rand() + 1e-9) + Math.log(rand() + 1e-9)) / 4;

      if (ax < nadir) {
        clean[i] = 0.035;
        continue;
      }
      const r = ax / half;
      const onset = 1 - Math.exp(-(ax - nadir) / 18); // first-bottom-return ramp
      const falloff = 0.92 - 0.5 * r * r;
      const ripple = 0.1 * Math.sin(y * 0.19 + x * 0.045 + 2 * Math.sin(x * 0.012));
      const surf = Math.abs(ax - surface) < 3 ? 0.06 : 0;
      clean[i] = Math.max(0, onset * falloff * (0.72 + 0.14 * patch(x, y) + ripple) + surf);
    }
  }

  for (const t of targets) {
    const s = t.shape;
    if (!s) continue;
    const { x: bx, y: by, w: bw, h: bh } = t.bbox;
    const starboard = bx + bw / 2 > half;
    const shadowLen = s.kind === "line" ? 14 : s.kind === "blob" ? 30 : Math.round(bh * 1.6);
    for (let y = by; y < by + bh; y++) {
      let outer = -1;
      for (let x = bx; x < bx + bw; x++) {
        const v = shapeIntensity(s, x, y, rand);
        if (v > 0) {
          const i = y * width + x;
          clean[i] = Math.min(1.25, clean[i] * 0.35 + v);
          if (outer < 0 || (starboard ? x > outer : x < outer)) outer = x;
        }
      }
      if (outer < 0) continue;
      // Acoustic shadow extends away from nadir behind the object, with a soft tail.
      for (let k = 1; k <= shadowLen; k++) {
        const x = starboard ? outer + k : outer - k;
        if (x < 0 || x >= width) break;
        const i = y * width + x;
        const soft = k > shadowLen * 0.8 ? (k - shadowLen * 0.8) / (shadowLen * 0.2) : 0;
        clean[i] *= 0.05 + 0.95 * soft;
      }
    }
  }
  return { width, height, clean, speckle };
}

/** Render layers to a data URL. strength 0 = raw speckle, 100 = fully despeckled. */
export function renderSonar({ width, height, clean, speckle }, strength = 50, palette = "gray") {
  const LUT = LUTS[palette] ?? LUTS.gray;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  const keep = 1 - Math.min(Math.max(strength, 0), 100) / 100;
  const px = img.data;
  for (let i = 0; i < clean.length; i++) {
    const v = clean[i] * (1 + (speckle[i] - 1) * keep);
    const idx = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(v, 1), 0.85) * 255))) * 3;
    const o = i * 4;
    px[o] = LUT[idx];
    px[o + 1] = LUT[idx + 1];
    px[o + 2] = LUT[idx + 2];
    px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Raw return intensity (no display palette) as a PNG Blob: the same signal the backend
 * receives from a real sonar export, and what the Python training generator produces.
 */
export function renderSonarPng({ width, height, clean, speckle }, strength = 50) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(width, height);
  const keep = 1 - Math.min(Math.max(strength, 0), 100) / 100;
  const px = img.data;
  for (let i = 0; i < clean.length; i++) {
    const v = clean[i] * (1 + (speckle[i] - 1) * keep);
    const g = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(v, 1), 0.85) * 255)));
    const o = i * 4;
    px[o] = px[o + 1] = px[o + 2] = g;
    px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
