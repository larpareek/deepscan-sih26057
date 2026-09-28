import { lazy, Suspense, useEffect, useMemo, useState } from "react";

// Leaflet is only needed once the map is expanded: load it on demand to keep the first paint light.
const MissionMap = lazy(() => import("./MissionMap"));
import { Collapse, Icon, MagneticButton, Term } from "./ui";

/** Tiny equirectangular sketch of the track for the collapsed bar. */
function MiniTrack({ plannedTrack, doneTrack, auvPos }) {
  const geom = useMemo(() => {
    const all = [...plannedTrack, ...doneTrack];
    if (all.length < 2) return null;
    const k = Math.cos((all[0][0] * Math.PI) / 180);
    const xy = ([lat, lon]) => [lon * k, -lat];
    const pts = all.map(xy);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = Math.max(maxX - minX, maxY - minY) * 0.08 || 1e-5;
    const toPath = (track) => track.map(xy).map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    return {
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`,
      planned: plannedTrack.length > 1 ? toPath(plannedTrack) : null,
      done: toPath(doneTrack),
      auv: auvPos ? xy(auvPos) : null,
      r: pad * 0.6,
    };
  }, [plannedTrack, doneTrack, auvPos]);

  if (!geom) return <span className="muted">No track yet</span>;
  return (
    <svg viewBox={geom.viewBox} preserveAspectRatio="xMidYMid meet" className="h-10 w-28 shrink-0" role="img" aria-label="AUV track overview">
      {geom.planned && (
        <path d={geom.planned} fill="none" stroke="#22D3EE" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      )}
      <path d={geom.done} fill="none" stroke="#22D3EE" strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 3px #22D3EE)" }} />
      {geom.auv && <circle cx={geom.auv[0]} cy={geom.auv[1]} r={geom.r} fill="#22D3EE" />}
    </svg>
  );
}

export default function MapBar({ open, onToggle, plannedTrack, doneTrack, auvPos, detections, activeId, selected, onHover, onSelect }) {
  // Mount Leaflet on first expand, then keep it so collapsing can animate.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  return (
    <section aria-labelledby="map-h" className="card shrink-0 !p-0">
      <div className="flex min-h-[64px] items-center gap-3 px-5 py-2 sm:gap-4">
        <h2 id="map-h" className="shrink-0 font-display text-xl font-bold tracking-tighter text-white">
          Mission map
        </h2>
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <MiniTrack plannedTrack={plannedTrack} doneTrack={doneTrack} auvPos={auvPos} />
          {doneTrack.length > 1 && (
            <span className="hidden shrink-0 text-base text-slate-300 lg:inline">
              <Term term="AUV track" />
            </span>
          )}
        </div>
        <MagneticButton type="button" className="btn-quiet shrink-0" aria-expanded={open} aria-controls="mission-map-body" onClick={onToggle}>
          <span className="sr-only sm:not-sr-only">{open ? "Collapse map" : "Expand map"}</span>
          <Icon name="chevron" className={`h-5 w-5 transition-transform duration-300 ${open ? "" : "rotate-180"}`} />
        </MagneticButton>
      </div>

      <Collapse open={open} id="mission-map-body">
        <div className="px-2 pb-2">
          <p className="px-3 pb-2 text-base text-slate-300">
            <span className="font-mono">{detections.length}</span> <Term term="geotagged">geotagged</Term> hazards
          </p>
          <div className="h-[320px] lg:h-[30vh]">
            {mounted && (
              <Suspense fallback={<div className="h-full animate-pulse rounded-2xl bg-white/[0.04]" />}>
                <MissionMap
                  plannedTrack={plannedTrack}
                  doneTrack={doneTrack}
                  auvPos={auvPos}
                  detections={detections}
                  activeId={activeId}
                  selected={selected}
                  onHover={onHover}
                  onSelect={onSelect}
                />
              </Suspense>
            )}
          </div>
        </div>
      </Collapse>
    </section>
  );
}
