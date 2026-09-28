import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const STAGES = ["Filling dropouts", "Removing speckle", "Enhancing contrast", "Running YOLOv8", "Geotagging hazards"];

// A sonar-return-like waveform: bursts of oscillation that repeat every PERIOD px,
// so translating the path by one period loops seamlessly.
const PERIOD = 160;
const WAVE_W = 320;
function wavePath(width) {
  const pts = [];
  for (let x = 0; x <= width + PERIOD; x += 3) {
    const p = x % PERIOD;
    const env = 0.12 + Math.exp(-((p - 55) ** 2) / 260) + 0.45 * Math.exp(-((p - 115) ** 2) / 120);
    pts.push(`${x},${(20 - Math.sin(x * 0.55) * 16 * Math.min(env, 1)).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}
const WAVE_D = wavePath(WAVE_W);

/** Laid over the sonar image while inference runs. */
export default function ScanOverlay() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
      <div className="absolute inset-0 bg-abyss/55" />

      {/* Scan line sweeping top -> bottom, trailing a cyan wake (transform-only, GPU friendly) */}
      <motion.div
        className="absolute inset-0"
        initial={{ y: "-100%" }}
        animate={reduce ? { y: "-50%" } : { y: ["-100%", "0%"] }}
        transition={reduce ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
      >
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent via-neon/[0.07] to-neon/25" />
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neon-soft shadow-[0_0_14px_3px_rgba(34,211,238,0.8)]" />
      </motion.div>

      {/* Horizontal radar waveform + status */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-abyss/90 to-transparent px-6 pb-6 pt-16">
        <svg viewBox={`0 0 ${WAVE_W} 40`} className="h-10 w-full max-w-sm overflow-hidden">
          <motion.path
            d={WAVE_D}
            fill="none"
            stroke="#22D3EE"
            strokeWidth="1.8"
            style={{ filter: "drop-shadow(0 0 4px #22D3EE)" }}
            animate={reduce ? undefined : { x: [0, -PERIOD] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <p className="font-display text-xl font-bold tracking-tighter text-white">Analyzing seabed acoustics…</p>
        <p className="font-mono text-sm text-slate-200">{STAGES[stage]}</p>
      </div>
    </div>
  );
}
