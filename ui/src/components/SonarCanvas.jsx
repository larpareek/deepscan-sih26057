import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { classStyle, confidenceLevel } from "../lib/classes";
import { playPing } from "../lib/sound";
import EmptyState from "./EmptyState";
import ScanOverlay from "./ScanOverlay";
import { ConfidenceLabel, ConfidenceRing, Icon, Term } from "./ui";

function useFitSize(ref, aspect) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const w = Math.min(width, height * aspect);
      setSize({ w, h: w / aspect });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, aspect]);
  return size;
}

/** Scope-style corner brackets that draw themselves in (pathLength = stroke-dashoffset). */
function Brackets({ w, h, delay }) {
  const L = Math.max(6, Math.min(22, Math.min(w, h) * 0.32));
  const corners = [
    `M0 ${L} V0 H${L}`,
    `M${w - L} 0 H${w} V${L}`,
    `M${w} ${h - L} V${h} H${w - L}`,
    `M${L} ${h} H0 V${h - L}`,
  ];
  return (
    <svg className="bracket-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {corners.map((d, k) => (
        <motion.path
          key={k}
          d={d}
          fill="none"
          stroke="#22D3EE"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: delay + k * 0.07, ease: [0.65, 0, 0.35, 1] }}
        />
      ))}
    </svg>
  );
}

function BoxTooltip({ det, flip }) {
  const s = classStyle(det.cls);
  const level = confidenceLevel(det.confidence);
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 z-20 flex w-max min-w-[250px] -translate-x-1/2 items-center gap-4 rounded-2xl bg-abyss-900/95 px-4 py-3 text-left shadow-2xl shadow-black/70 ring-1 ring-white/15 backdrop-blur-xl ${
        // Above the box, clear the class chip that sits 24px over its top edge
        flip ? "top-full mt-4" : "bottom-full mb-9"
      }`}
    >
      <ConfidenceRing value={det.confidence} color={level.ring} size={48}>
        <span className="font-display text-sm font-bold" style={{ color: s.text }}>{s.glyph}</span>
      </ConfidenceRing>
      <div>
        <div className="font-display text-lg font-bold tracking-tight" style={{ color: s.text }}>{s.label}</div>
        <ConfidenceLabel level={level} confidence={det.confidence} className="text-base" />
        <div className="font-mono text-sm text-slate-300">
          {det.dims.length} × {det.dims.width} m
        </div>
        {det.shadowPenalized && (
          <div className="mt-1 flex items-center gap-2 text-sm text-hazard">
            <Icon name="alert" className="h-4 w-4" /> In acoustic shadow, score halved
          </div>
        )}
      </div>
    </div>
  );
}

export default function SonarCanvas({ src, sceneKey, imageSize, detections, activeId, onHover, onSelect, busy, soundOn, onUpload, onLoadDemo, onFiles }) {
  const wrapRef = useRef(null);
  const aspect = imageSize.w / imageSize.h;
  const fit = useFitSize(wrapRef, aspect);
  // Draw large boxes first so smaller (often nested) ones stay on top and hoverable.
  const drawOrder = [...detections].sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h);

  // Loading a scan removes the empty-state button that had focus; hand focus to the heading
  // so keyboard users aren't dropped back at the top of the page.
  const headingRef = useRef(null);
  const hadSrc = useRef(Boolean(src));
  useEffect(() => {
    if (src && !hadSrc.current && (document.activeElement === document.body || !document.activeElement)) {
      headingRef.current?.focus();
    }
    hadSrc.current = Boolean(src);
  }, [src]);

  const hover = (id) => {
    onHover(id);
    if (id && soundOn) playPing();
  };

  return (
    <section
      className="card relative flex h-full min-h-0 flex-col gap-6"
      aria-labelledby="sonar-h"
      // Very slight tilt so the panel reads as floating
      style={{ transform: "perspective(1000px) rotateX(1deg)", transformOrigin: "50% 0%" }}
    >
      <div className="sonar-ping" aria-hidden="true" />

      <h1 id="sonar-h" ref={headingRef} tabIndex={-1} className="heading relative focus:outline-none">
        <Term term="sonar waterfall">Sonar waterfall</Term>
      </h1>

      <div ref={wrapRef} className="relative grid min-h-0 flex-1 place-items-center">
        {!src && <EmptyState onUpload={onUpload} onLoadDemo={onLoadDemo} onFiles={onFiles} />}

        {src && fit.w > 0 && (
          <motion.div
            // Re-keyed per scene (mode / upload / finished run), not per src, so dragging the
            // speckle slider doesn't replay the entrance; a fresh result fades in and redraws.
            key={`${sceneKey}-${busy}`}
            className="relative"
            style={{ width: fit.w, height: fit.h }}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={src}
              alt={`Side-scan sonar waterfall, port on the left, starboard on the right, ${detections.length} detections marked`}
              draggable={false}
              className="h-full w-full select-none rounded-xl object-fill shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_20px_60px_-20px_rgba(34,211,238,0.35)]"
            />

            {busy ? (
              <ScanOverlay />
            ) : (
              <div className="absolute inset-0" role="group" aria-label="Detections on the sonar image">
                {drawOrder.map((d, i) => {
                  const s = classStyle(d.cls);
                  const level = confidenceLevel(d.confidence);
                  const active = d.id === activeId;
                  const top = (d.bbox.y / imageSize.h) * 100;
                  const pw = (d.bbox.w / imageSize.w) * fit.w;
                  const ph = (d.bbox.h / imageSize.h) * fit.h;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-label={`${s.label}, ${level.level.toLowerCase()} confidence ${d.confidence.toFixed(0)}%${d.shadowPenalized ? ", in acoustic shadow" : ""}. Show details.`}
                      className={`detect-box ${active ? "is-active z-10" : ""} ${d.shadowPenalized ? "is-dimmed" : ""}`}
                      style={{
                        left: `${(d.bbox.x / imageSize.w) * 100}%`,
                        top: `${top}%`,
                        width: `${(d.bbox.w / imageSize.w) * 100}%`,
                        height: `${(d.bbox.h / imageSize.h) * 100}%`,
                      }}
                      onMouseEnter={() => hover(d.id)}
                      onMouseLeave={() => onHover(null)}
                      onFocus={() => hover(d.id)}
                      onBlur={() => onHover(null)}
                      onClick={() => onSelect(d.id)}
                    >
                      <Brackets w={pw} h={ph} delay={0.25 + i * 0.12} />
                      <motion.span
                        aria-hidden="true"
                        className="absolute -left-1 -top-6 grid h-5 min-w-5 place-items-center rounded-md px-1 font-display text-[11px] font-bold leading-none text-abyss"
                        style={{ background: d.shadowPenalized ? "#F472B6" : s.hex }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 + i * 0.12 }}
                      >
                        {d.shadowPenalized ? "!" : s.glyph}
                      </motion.span>
                      {active && <BoxTooltip det={d} flip={top < 25} />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
