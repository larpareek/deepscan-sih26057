// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Operator-facing hazard status. Colour is driven by status, never by class, and every
// status also has a text label (colour is never the only cue).

export const STATUS = {
  critical: { key: "critical", label: "CRITICAL", color: "#FA4D56", text: "text-crit-text", rank: 3 },
  warning: { key: "warning", label: "WARNING", color: "#F1C21B", text: "text-warn", rank: 2 },
  review: { key: "review", label: "REVIEW", color: "#A2A9B0", text: "text-review", rank: 1 },
  safe: { key: "safe", label: "SAFE", color: "#42BE65", text: "text-ok", rank: 0 },
};

// Navigation / ecological hazards vs. known infrastructure vs. unclassified returns.
const HAZARD_CLASSES = new Set(["shipwreck", "ghost_net"]);
const INFRASTRUCTURE = new Set(["pipe"]);

/**
 * - REVIEW   low evidence: in an acoustic shadow, below 60% confidence, or an unknown class
 * - CRITICAL wreck / ghost net at >= 80% confidence
 * - WARNING  wreck / ghost net below 80%, or exposed infrastructure (pipeline)
 */
export function hazardStatus(d) {
  if (d.shadowPenalized || d.confidence < 60) return STATUS.review;
  if (HAZARD_CLASSES.has(d.cls)) return d.confidence >= 80 ? STATUS.critical : STATUS.warning;
  if (INFRASTRUCTURE.has(d.cls)) return STATUS.warning;
  return STATUS.review;
}

export const STATUS_RULES = [
  [STATUS.critical, "Wreck or ghost net, confidence ≥ 80%"],
  [STATUS.warning, "Wreck / ghost net < 80%, or exposed pipeline"],
  [STATUS.review, "Unclassified, < 60%, or in acoustic shadow"],
];
