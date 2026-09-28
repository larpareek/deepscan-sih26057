import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Icon, MagneticButton, Term } from "./ui";

const W = 800;
const H = 360;
const CX = W / 2;
const CY = H / 2;

/** Side-scan sonar illustration: acoustic wavefronts sweep out across both swaths. */
function SonarSweep() {
  const reduce = useReducedMotion();
  const wave = (side, i) => {
    const r = 70;
    // Half-circle facing port (left) or starboard (right), centred on the AUV
    const d = side === "port" ? `M${CX} ${CY - r} A${r} ${r} 0 0 0 ${CX} ${CY + r}` : `M${CX} ${CY - r} A${r} ${r} 0 0 1 ${CX} ${CY + r}`;
    return (
      <motion.path
        key={`${side}${i}`}
        d={d}
        fill="none"
        stroke="#22D3EE"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: "view-box" }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={reduce ? { scale: 1.6, opacity: 0.5 } : { scale: [0.2, 5.2], opacity: [0, 0.9, 0] }}
        transition={reduce ? { duration: 0 } : { duration: 3.6, delay: i * 1.2, repeat: Infinity, ease: "easeOut", times: [0, 0.15, 1] }}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="beam-l" x1="1" x2="0">
          <stop offset="0" stopColor="#22D3EE" stopOpacity=".18" />
          <stop offset="1" stopColor="#0E7490" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="beam-r" x1="0" x2="1">
          <stop offset="0" stopColor="#22D3EE" stopOpacity=".18" />
          <stop offset="1" stopColor="#0E7490" stopOpacity="0" />
        </linearGradient>
        <pattern id="seabed" width="800" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 12 Q 100 6 200 12 T 400 12 T 600 12 T 800 12" fill="none" stroke="#0E7490" strokeOpacity=".35" />
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="60%">
          <stop offset="0.5" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="vignette">
          <rect width={W} height={H} fill="url(#fade)" />
        </mask>
      </defs>

      <g mask="url(#vignette)">
        {/* Seabed ripples scroll down like a waterfall display */}
        <motion.rect
          x="0"
          y={-24}
          width={W}
          height={H + 48}
          fill="url(#seabed)"
          animate={reduce ? undefined : { y: [-24, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        {/* Fan-shaped beams to port and starboard */}
        <motion.path
          d={`M${CX} ${CY} L0 ${CY - 150} L0 ${CY + 150} Z`}
          fill="url(#beam-l)"
          animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3.6, repeat: Infinity }}
        />
        <motion.path
          d={`M${CX} ${CY} L${W} ${CY - 150} L${W} ${CY + 150} Z`}
          fill="url(#beam-r)"
          animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3.6, repeat: Infinity }}
        />
        {[0, 1, 2].map((i) => wave("port", i))}
        {[0, 1, 2].map((i) => wave("stbd", i))}
        {/* Track and vehicle */}
        <line x1={CX} y1="0" x2={CX} y2={H} stroke="#22D3EE" strokeOpacity=".25" strokeDasharray="4 8" />
      </g>
      <rect x={CX - 7} y={CY - 22} width="14" height="44" rx="7" fill="#020617" stroke="#22D3EE" strokeWidth="2" />
      <circle cx={CX} cy={CY - 10} r="3" fill="#22D3EE" style={{ filter: "drop-shadow(0 0 6px #22D3EE)" }} />
    </svg>
  );
}

export default function EmptyState({ onUpload, onLoadDemo, onFiles }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl transition-colors duration-300 ${
        drag ? "bg-neon/[0.06] ring-2 ring-neon/60" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <div className="absolute inset-0">
        <SonarSweep />
      </div>

      <motion.div
        className="relative mt-auto flex flex-col items-center gap-3 rounded-2xl bg-abyss/70 px-6 py-5 text-center backdrop-blur-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="font-display text-2xl font-bold tracking-tighter text-white sm:text-3xl">
          Awaiting Acoustic Data
        </h2>
        <p className="max-w-md text-base font-light text-slate-300">
          Drop a sonar image and its <Term term="ping header">ping header</Term> metadata here, or explore the demo survey.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <MagneticButton type="button" className="btn-primary btn-shimmer" onClick={onUpload}>
            <Icon name="upload" />
            Upload scan
          </MagneticButton>
          <MagneticButton type="button" className="btn-quiet ring-1 ring-white/15" onClick={onLoadDemo}>
            Load demo scan
          </MagneticButton>
        </div>
      </motion.div>
    </div>
  );
}
