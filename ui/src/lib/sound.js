// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Soft synthesized sonar "ping" (Web Audio, no asset). Muted until the user turns it on;
// browsers only allow audio after a user gesture, so the toggle click creates the context.
let ctx = null;
let last = 0;

export function enableAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx ??= new AC();
  if (ctx.state === "suspended") ctx.resume();
  return true;
}

export function playPing() {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  if (now - last < 0.15) return; // don't machine-gun when sweeping across boxes
  last = now;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.65);
}
