// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// The processing pipeline as an animated flowchart. Each card shows the demo scan at that stage.
import { motion } from "framer-motion";
import { ArrowRight, Crosshair, FileJson, Filter, Image as ImageIcon, MapPin, Wand2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DEMO_DETECTIONS, DEMO_TARGETS, IMAGE_H, IMAGE_W } from "../data/dummy";
import { classStyle } from "../lib/classes";
import { fmtLat, fmtLon } from "../lib/geo";
import { hazardStatus } from "../lib/hazard";
import { buildSonarLayers, renderSonar } from "../lib/sonarSynth";

function Boxes({ shadowOnly = false }) {
  return DEMO_DETECTIONS.filter((d) => (shadowOnly ? true : !d.shadowPenalized)).map((d) => {
    const s = hazardStatus(d);
    const rejected = d.shadowPenalized;
    return (
      <span
        key={d.id}
        className={`absolute rounded-[2px] border-[1.5px] ${rejected ? "border-dashed" : ""}`}
        style={{
          left: `${(d.bbox.x / IMAGE_W) * 100}%`,
          top: `${(d.bbox.y / IMAGE_H) * 100}%`,
          width: `${(d.bbox.w / IMAGE_W) * 100}%`,
          height: `${(d.bbox.h / IMAGE_H) * 100}%`,
          borderColor: shadowOnly && !rejected ? "rgba(94,234,212,.55)" : s.color,
        }}
      />
    );
  });
}

function Thumb({ src, children }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <img src={src} alt="" className="block aspect-[16/10] w-full object-cover" />
      {children}
    </div>
  );
}

function stages(raw, clean) {
  const top = DEMO_DETECTIONS.filter((d) => !d.shadowPenalized).slice(0, 3);
  return [
    {
      icon: ImageIcon,
      title: "Raw Sonar",
      text: "Pings from the towfish stacked into a waterfall: speckled, dim at long range, with a nadir gap down the middle.",
      metric: "1024 × 640 px",
      visual: <Thumb src={raw} />,
    },
    {
      icon: Wand2,
      title: "CLAHE Preprocessing",
      text: "Dropped pings repaired, speckle smoothed with a Lee filter, then contrast lifted tile by tile with CLAHE.",
      metric: "≈ 22 ms",
      visual: <Thumb src={clean} />,
    },
    {
      icon: Crosshair,
      title: "YOLOv8 Inference",
      text: "One pass of our fine-tuned YOLOv8n finds wrecks, pipelines, ghost nets and anomalies, each with a confidence score.",
      metric: "≈ 15 ms",
      visual: (
        <Thumb src={clean}>
          <Boxes />
        </Thumb>
      ),
    },
    {
      icon: Filter,
      title: "Shadow Filter",
      text: "A real object sits next to its shadow. Boxes that are mostly shadow have their confidence halved and go to review.",
      metric: "× 0.5 in shadow",
      visual: (
        <Thumb src={clean}>
          <Boxes shadowOnly />
        </Thumb>
      ),
    },
    {
      icon: MapPin,
      title: "Geotagging Engine",
      text: "Pixel positions become latitude and longitude from the ping track, with slant-range correction for the towfish's altitude.",
      metric: "≈ 9 ms",
      visual: (
        <ul className="space-y-1.5 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-cream/80">
          {top.map((d) => (
            <li key={d.id} className="flex justify-between gap-2">
              <span className="text-seafoam">{classStyle(d.cls).label}</span>
              <span>
                {fmtLat(d.lat)} {fmtLon(d.lon)}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      icon: FileJson,
      title: "JSON/CSV Report",
      text: "Every hazard, ranked, with coordinates, size and confidence: ready for a survey team, NIOT or a GIS.",
      metric: "JSON · CSV",
      visual: (
        <pre className="overflow-hidden rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-cream/80">
          {`{ "class": "${top[0].cls}",
  "confidence": ${(top[0].confidence / 100).toFixed(3)},
  "location": {
    "latitude": ${top[0].lat.toFixed(5)},
    "longitude": ${top[0].lon.toFixed(5)} } }`}
        </pre>
      ),
    },
  ];
}

/** Animated connector: a dashed line with a pulse travelling along it. */
function Connector({ vertical, delay }) {
  const len = 56;
  return vertical ? (
    <svg width="24" height={len} viewBox={`0 0 24 ${len}`} className="mx-auto my-1 block md:hidden" aria-hidden="true">
      <motion.line x1="12" y1="0" x2="12" y2={len} stroke="#5EEAD4" strokeOpacity=".5" strokeWidth="2" strokeDasharray="4 5" animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      <motion.circle cx="12" r="4" fill="#22D3EE" animate={{ cy: [0, len] }} transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeInOut" }} />
    </svg>
  ) : (
    <svg width={len + 8} height="24" viewBox={`0 0 ${len + 8} 24`} className="hidden shrink-0 self-center md:block" aria-hidden="true">
      <motion.line x1="0" y1="12" x2={len} y2="12" stroke="#5EEAD4" strokeOpacity=".5" strokeWidth="2" strokeDasharray="4 5" animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      <path d={`M${len},6 l8,6 l-8,6`} fill="none" stroke="#5EEAD4" strokeWidth="2" />
      <motion.circle cy="12" r="4" fill="#22D3EE" animate={{ cx: [0, len] }} transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeInOut" }} />
    </svg>
  );
}

export default function PipelinePage() {
  const [raw, clean] = useMemo(() => {
    const layers = buildSonarLayers(IMAGE_W, IMAGE_H, DEMO_TARGETS);
    return [renderSonar(layers, 0, "gray"), renderSonar(layers, 90, "gray")];
  }, []);
  const steps = useMemo(() => stages(raw, clean), [raw, clean]);

  return (
    <div className="bg-abyss font-inter text-cream">
      <section className="relative overflow-hidden px-6 pb-12 pt-32">
        <div className="absolute inset-0 bg-[url('/img/light-shafts.webp')] bg-cover bg-top opacity-25" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-abyss/40 to-abyss" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sunset">The pipeline</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[1.08] sm:text-6xl">
            From echo to evidence <span className="italic font-normal text-seafoam">in under 50 ms.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-light leading-relaxed text-cream/75">
            Follow the demo survey leg through each stage, exactly as the SEASCAN backend processes it.
          </p>
        </div>
      </section>

      <section className="pb-8" aria-label="Processing stages">
        <ol className="flex flex-col px-6 md:flex-row md:overflow-x-auto md:scroll-px-10 md:px-10 md:pb-8 md:pt-2 md:[scrollbar-color:#5EEAD4_transparent] md:snap-x md:after:block md:after:w-4 md:after:shrink-0 md:after:content-['']">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col md:flex-row md:snap-start">
              <motion.article
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-xl shadow-black/30 backdrop-blur-md md:w-[290px]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-biolum/15 text-biolum">
                    <s.icon size={20} aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl font-black text-white/15">0{i + 1}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm md:min-h-[92px] leading-relaxed text-cream/70">{s.text}</p>
                <div className="mt-4">{s.visual}</div>
                <p className="mt-4 border-t border-white/10 pt-3 font-mono text-xs text-sunset">{s.metric}</p>
              </motion.article>
              {i < steps.length - 1 && (
                <>
                  <Connector delay={i * 0.25} />
                  <Connector vertical delay={i * 0.25} />
                </>
              )}
            </li>
          ))}
        </ol>
        <p className="hidden px-10 text-xs text-cream/45 md:block">Scroll sideways to follow all six stages →</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-abyss-2 p-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold">Run it on a real request</h2>
            <p className="mt-3 leading-relaxed text-cream/70">
              Timings above are measured on a laptop CPU for a 1080 × 810 scan. On the dashboard, the System panel shows the
              live time of every stage for your own upload.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-biolum to-seafoam px-6 py-3 font-semibold text-abyss">
              Open dashboard <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/technology" className="inline-flex items-center rounded-full border border-cream/40 px-6 py-3 font-medium hover:bg-white/10">
              How the sonar works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
