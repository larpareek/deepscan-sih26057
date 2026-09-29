// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// How side-scan sonar works, and the AI that reads it.
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Radio, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DEMO_TARGETS, IMAGE_H, IMAGE_W } from "../data/dummy";
import { buildSonarLayers, renderSonar } from "../lib/sonarSynth";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const FISH = { x: 600, y: 250 };
const SEABED_Y = 448;

/** Ship towing a side-scan towfish; two acoustic fans ping the seabed and objects cast shadows. */
function SonarScene() {
  return (
    <svg viewBox="0 0 1200 520" className="h-auto w-full" role="img" aria-labelledby="scene-title scene-desc">
      <title id="scene-title">A survey ship towing a side-scan sonar</title>
      <desc id="scene-desc">
        The towfish sends fan-shaped acoustic pings to both sides. Objects on the seabed return strong echoes and cast
        acoustic shadows behind them, away from the sonar.
      </desc>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#FB923C" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e3a52" />
          <stop offset="0.5" stopColor="#071d33" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="fan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22D3EE" stopOpacity="0.45" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6f47" />
          <stop offset="1" stopColor="#3b2f22" />
        </linearGradient>
        <clipPath id="fans">
          <path d={`M${FISH.x},${FISH.y} L140,${SEABED_Y} L${FISH.x - 70},${SEABED_Y} Z M${FISH.x},${FISH.y} L${FISH.x + 70},${SEABED_Y} L1060,${SEABED_Y} Z`} />
        </clipPath>
      </defs>

      <rect width="1200" height="120" fill="url(#sky)" />
      <rect y="120" width="1200" height="400" fill="url(#sea)" />

      {/* Surface waves */}
      <motion.path
        d="M-200,120 Q-150,110 -100,120 T0,120 T100,120 T200,120 T300,120 T400,120 T500,120 T600,120 T700,120 T800,120 T900,120 T1000,120 T1100,120 T1200,120 T1300,120 T1400,120 V130 H-200 Z"
        fill="#0e3a52"
        animate={{ x: [0, -200] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Ship, gently riding the swell */}
      <motion.g animate={{ y: [0, -4, 0], rotate: [0, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "260px", originY: "118px" }}>
        <path d="M150,104 L380,104 L352,130 L178,130 Z" fill="#FEF3C7" />
        <rect x="200" y="80" width="95" height="24" rx="3" fill="#E8DDB5" />
        <rect x="225" y="60" width="40" height="22" rx="2" fill="#FB923C" />
        <rect x="286" y="50" width="4" height="30" fill="#FEF3C7" />
        <rect x="210" y="88" width="10" height="7" fill="#020617" opacity="0.6" />
        <rect x="228" y="88" width="10" height="7" fill="#020617" opacity="0.6" />
        <rect x="246" y="88" width="10" height="7" fill="#020617" opacity="0.6" />
      </motion.g>

      {/* Tow cable and towfish */}
      <path d={`M362,122 C450,160 520,230 ${FISH.x - 30},${FISH.y}`} stroke="#E8DDB5" strokeWidth="2" fill="none" strokeDasharray="6 5" />
      <g>
        <ellipse cx={FISH.x} cy={FISH.y} rx="34" ry="9" fill="#FEF3C7" />
        <path d={`M${FISH.x + 26},${FISH.y} l16,-10 v20 z`} fill="#FB923C" />
      </g>

      {/* Acoustic fans + expanding pings */}
      <g clipPath="url(#fans)">
        <rect x="0" y={FISH.y} width="1200" height={SEABED_Y - FISH.y} fill="url(#fan)" />
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={FISH.x}
            cy={FISH.y}
            fill="none"
            stroke="#5EEAD4"
            strokeWidth="2.5"
            initial={{ r: 10, opacity: 0.9 }}
            animate={{ r: [10, 520], opacity: [0.9, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
          />
        ))}
      </g>

      {/* Seabed */}
      <path d={`M0,${SEABED_Y} Q150,${SEABED_Y - 8} 300,${SEABED_Y} T600,${SEABED_Y} T900,${SEABED_Y} T1200,${SEABED_Y} V520 H0 Z`} fill="url(#sand)" />

      {/* Wreck to starboard. Its acoustic shadow is the wedge the sound can't reach: from the
          top of the hull along the ray from the towfish down to the seabed. */}
      <path d={`M905,398 L1003,${SEABED_Y} L920,${SEABED_Y} Z`} fill="#020617" opacity="0.92" />
      <rect x="920" y={SEABED_Y} width="83" height="6" fill="#020617" opacity="0.6" />
      <path d={`M836,${SEABED_Y} L848,402 L905,398 L920,${SEABED_Y} Z`} fill="#b45309" />
      <path d="M848,414 H905 M852,428 H910" stroke="#7c2d12" strokeWidth="2" />
      <rect x="866" y="380" width="6" height="20" fill="#b45309" />
      <motion.circle cx="878" cy="404" r="6" fill="#FB923C" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} />

      {/* Ghost net to port, with its shadow on the far (left) side */}
      <path d={`M300,418 L256,${SEABED_Y} L300,${SEABED_Y} Z`} fill="#020617" opacity="0.9" />
      <rect x="256" y={SEABED_Y} width="44" height="6" fill="#020617" opacity="0.6" />
      <path d={`M300,${SEABED_Y} L300,418 Q318,404 336,414 Q352,402 364,418 Q376,424 378,${SEABED_Y} Z`} fill="#5EEAD4" fillOpacity="0.12" stroke="#5EEAD4" strokeWidth="2" />
      <path d="M306,422 L372,444 M306,440 L370,420 M322,412 L330,446 M346,410 L352,446" stroke="#5EEAD4" strokeOpacity="0.6" strokeWidth="1.2" />
      <motion.circle cx="338" cy="428" r="6" fill="#5EEAD4" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay: 1.3 }} />

      {/* Labels */}
      <g fontFamily="Inter, sans-serif" fontSize="15" fill="#FEF3C7">
        <text x={FISH.x - 40} y={FISH.y - 24}>Towfish</text>
        <text x="760" y="300">Acoustic swath</text>
        <text x="410" y="300" textAnchor="end">Acoustic swath</text>
        <text x={FISH.x} y={SEABED_Y + 34} textAnchor="middle" fill="#E8DDB5">Nadir gap</text>
        <text x="990" y={SEABED_Y + 34} textAnchor="middle" fill="#E8DDB5">Acoustic shadow</text>
        <text x="262" y={SEABED_Y + 34} textAnchor="middle" fill="#E8DDB5">Shadow</text>
        <text x="870" y="368" textAnchor="middle" fill="#FB923C">Wreck echo</text>
        <text x="340" y="392" textAnchor="middle" fill="#5EEAD4">Ghost net</text>
      </g>
    </svg>
  );
}

const SONAR_101 = [
  {
    title: "Pings",
    text: "The towfish fires a thin fan of sound to each side, hundreds of times a minute. Each echo is written as one line of the image, and the lines stack up as the ship moves, so the picture grows like a waterfall.",
  },
  {
    title: "Acoustic shadows",
    text: "Anything that stands off the seabed blocks the sound behind it, leaving a dark shadow on the far side. The length of the shadow tells us its height, and a real object always has one. SEASCAN uses that rule to reject false alarms.",
  },
  {
    title: "Reflectivity",
    text: "Hard, rough surfaces (steel hulls, rock, tangled nylon) send back strong echoes and appear bright. Soft mud absorbs sound and stays dark. Brightness is texture and material, not colour.",
  },
];

const AI = [
  {
    icon: Sparkles,
    title: "Cleaning the signal",
    stat: "Lee + CLAHE",
    text: "Sonar is covered in speckle, a grainy multiplicative noise. We first repair dropped pings, then smooth speckle with a Lee filter, and finally apply CLAHE, which lifts contrast region by region so faint far-range echoes become readable without blowing out the near field.",
  },
  {
    icon: Cpu,
    title: "YOLOv8 detection",
    stat: "mAP@50 0.995*",
    text: "A YOLOv8n detector, fine-tuned by us, finds shipwrecks, pipelines, ghost nets and unknown anomalies in one pass. A physics check then halves the confidence of any box sitting in an acoustic shadow. *Measured on our synthetic sonar validation set; real-survey evaluation is next.",
  },
  {
    icon: Radio,
    title: "Built for the edge",
    stat: "≈ 13 ms · 12 MB",
    text: "The model exports to ONNX with one command and runs on ONNX Runtime with no internet connection, fast enough to process pings on a vessel or an AUV's onboard computer while the survey is still under way.",
  },
];

export default function TechnologyPage() {
  const waterfall = useMemo(() => renderSonar(buildSonarLayers(IMAGE_W, IMAGE_H, DEMO_TARGETS), 60, "bronze"), []);

  return (
    <div className="bg-abyss font-inter text-cream">
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-32">
        <motion.p {...reveal} className="text-xs font-semibold uppercase tracking-[0.28em] text-sunset">
          The technology
        </motion.p>
        <motion.h1 {...reveal} className="mt-4 max-w-4xl font-display text-5xl font-bold leading-[1.08] sm:text-6xl">
          Seeing the seafloor <span className="italic font-normal text-seafoam">with sound.</span>
        </motion.h1>
        <motion.p {...reveal} className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-cream/75">
          Light fades within a few metres underwater. Sound travels for hundreds. Side-scan sonar turns those echoes into a
          photograph-like picture of the seabed, and SEASCAN teaches a computer to read it.
        </motion.p>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <motion.figure {...reveal} className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
          <SonarScene />
        </motion.figure>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <motion.h2 {...reveal} className="font-display text-4xl font-bold">Sonar 101</motion.h2>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
          <ol className="space-y-8">
            {SONAR_101.map((s, i) => (
              <motion.li key={s.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="flex gap-5">
                <span className="font-display text-3xl font-black text-sunset">0{i + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-cream/70">{s.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
          <motion.figure {...reveal} className="lg:sticky lg:top-24">
            <img src={waterfall} alt="Side-scan sonar waterfall: a bright shipwreck, a pipeline and tangled nets, each with a dark shadow" className="w-full rounded-xl border border-white/10" />
            <figcaption className="mt-3 text-sm text-cream/55">
              A SEASCAN demo waterfall. The dark band down the middle is the nadir gap directly below the towfish; the ship&apos;s
              track runs top to bottom. Note the shadow next to every real object.
            </figcaption>
          </motion.figure>
        </div>
      </section>

      <section className="border-t border-white/10 bg-abyss-2 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.h2 {...reveal} className="font-display text-4xl font-bold">
            The AI that reads it
          </motion.h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AI.map(({ icon: Icon, title, stat, text }, i) => (
              <motion.article key={title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="rounded-2xl border border-white/10 bg-abyss p-7">
                <Icon className="text-biolum" size={24} aria-hidden="true" />
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-1 font-display text-2xl font-bold text-sunset">{stat}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-cream/70">{text}</p>
              </motion.article>
            ))}
          </div>
          <motion.div {...reveal} className="mt-12 flex flex-wrap gap-4">
            <Link to="/pipeline" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-biolum to-seafoam px-6 py-3 font-semibold text-abyss">
              See the full pipeline <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-cream/40 px-6 py-3 font-medium hover:bg-white/10">
              Try it on the dashboard
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
