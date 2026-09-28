// Per-class display config ("Bioluminescent Deep Sea").
//  rgb / hex: glow colour for chips, rings and map markers.
//  text:      colour for class-name text; all are >= 4.5:1 on every surface.
//  glyph:     letter marker so class is never conveyed by colour alone.
export const CLASS_STYLES = {
  shipwreck: { label: "Shipwreck", rgb: "244 114 182", hex: "#F472B6", text: "#F472B6", glyph: "W" },
  pipe: { label: "Pipeline", rgb: "251 191 36", hex: "#FBBF24", text: "#FBBF24", glyph: "P" },
  ghost_net: { label: "Ghost Net", rgb: "167 139 250", hex: "#A78BFA", text: "#C4B5FD", glyph: "N" },
  anomaly: { label: "Anomaly", rgb: "34 211 238", hex: "#22D3EE", text: "#22D3EE", glyph: "A" },
};

const FALLBACK = { rgb: "94 234 212", hex: "#5EEAD4", text: "#5EEAD4" };

export function classStyle(cls) {
  const s = CLASS_STYLES[cls];
  if (s) return s;
  const label = String(cls).replace(/_/g, " ");
  return { ...FALLBACK, label: label.charAt(0).toUpperCase() + label.slice(1), glyph: label.charAt(0).toUpperCase() };
}

/** Confidence band with a text label and icon, so it never relies on colour alone. */
export function confidenceLevel(confidence) {
  if (confidence >= 85) return { level: "High", icon: "check", cls: "text-neon", ring: "#22D3EE" };
  if (confidence >= 70) return { level: "Medium", icon: "half", cls: "text-slate-100", ring: "#A5F3FC" };
  return { level: "Low", icon: "alert", cls: "text-hazard", ring: "#F472B6" };
}
