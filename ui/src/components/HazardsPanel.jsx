import { motion } from "framer-motion";
import { classStyle, confidenceLevel } from "../lib/classes";
import { Collapse, ConfidenceLabel, ConfidenceRing, Icon, MagneticButton, Term } from "./ui";

function HazardCard({ d, index, active, expanded, onHover, onToggle, onViewOnMap }) {
  const s = classStyle(d.cls);
  const level = confidenceLevel(d.confidence);
  const panelId = `hazard-${d.id}-details`;
  return (
    <motion.li
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-xl transition-[background-color,box-shadow] duration-300 ease-in-out ${expanded ? "bg-white/[0.06] ring-1 ring-white/10" : active ? "bg-white/[0.05]" : ""}`}
      onMouseEnter={() => onHover(d.id)}
      onMouseLeave={() => onHover(null)}
    >
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onFocus={() => onHover(d.id)}
          onBlur={() => onHover(null)}
          onClick={() => onToggle(d.id)}
          className="flex min-h-[44px] w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-[background-color] duration-300 ease-in-out hover:bg-white/[0.04]"
        >
          <ConfidenceRing value={d.confidence} color={level.ring} size={48} delay={index * 0.06}>
            <span
              className="font-display text-sm font-bold transition-[text-shadow] duration-300"
              style={{ color: s.text, textShadow: active || expanded ? `0 0 10px rgb(${s.rgb})` : "none" }}
            >
              {s.glyph}
            </span>
          </ConfidenceRing>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold tracking-tight text-white">{s.label}</span>
            <ConfidenceLabel level={level} confidence={d.confidence} className="text-base" />
          </span>
          <Icon name="chevron" className={`h-5 w-5 shrink-0 text-slate-300 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>
      </h3>

      <Collapse open={expanded} id={panelId}>
        <div className="space-y-4 px-3 pb-4 pt-1">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
            <dt className="text-slate-300">Size</dt>
            <dd className="font-mono text-sm leading-7 text-slate-100">{d.dims.length} × {d.dims.width} m</dd>
            <dt className="text-slate-300">
              <Term term="bounding box">Bounding box</Term>
            </dt>
            <dd className="font-mono text-sm leading-7 text-slate-100">
              {d.bbox.w} × {d.bbox.h} px at ({d.bbox.x}, {d.bbox.y})
            </dd>
            <dt className="text-slate-300">Lat / Long</dt>
            <dd className="font-mono text-sm leading-7 text-slate-100">
              {d.lat.toFixed(5)}, {d.lon.toFixed(5)}
            </dd>
          </dl>
          {d.shadowPenalized && (
            <p className="flex items-start gap-2 text-base text-hazard">
              <Icon name="alert" className="mt-1 h-4 w-4 shrink-0" />
              <span>
                Sits in an <Term term="acoustic shadow" className="text-hazard" />, so its score was halved.
              </span>
            </p>
          )}
          <MagneticButton type="button" className="btn-quiet w-full bg-white/[0.06] text-neon" onClick={() => onViewOnMap(d.id)}>
            <Icon name="pin" />
            View on map
          </MagneticButton>
        </div>
      </Collapse>
    </motion.li>
  );
}

export default function HazardsPanel({ detections, hiddenCount, activeId, selectedId, onHover, onToggle, onViewOnMap, onClose }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="heading">
          Hazards <span className="font-mono text-2xl font-normal text-slate-300">{detections.length}</span>
        </h2>
        <MagneticButton type="button" className="btn-quiet lg:hidden" onClick={onClose} aria-label="Close hazards">
          <Icon name="close" />
        </MagneticButton>
      </div>

      {detections.length === 0 ? (
        <p className="muted">
          Nothing above the <Term term="confidence threshold" />.
        </p>
      ) : (
        <ul className="-mx-3 min-h-0 flex-1 space-y-2 overflow-y-auto p-1" aria-label="Detected hazards, highest confidence first">
          {detections.map((d, i) => (
            <HazardCard
              key={d.id}
              d={d}
              index={i}
              active={d.id === activeId}
              expanded={d.id === selectedId}
              onHover={onHover}
              onToggle={onToggle}
              onViewOnMap={onViewOnMap}
            />
          ))}
        </ul>
      )}

      {hiddenCount > 0 && <p className="muted">{hiddenCount} more below threshold</p>}
    </div>
  );
}
