// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Display names for detector classes. Colour comes from hazard status (lib/hazard.js),
// not from class, so the palette stays restrained.
export const CLASS_STYLES = {
  shipwreck: { label: "Shipwreck" },
  pipe: { label: "Pipeline" },
  ghost_net: { label: "Ghost net" },
  anomaly: { label: "Anomaly" },
};

export function classStyle(cls) {
  if (CLASS_STYLES[cls]) return CLASS_STYLES[cls];
  const label = String(cls).replace(/_/g, " ");
  return { label: label.charAt(0).toUpperCase() + label.slice(1) };
}
