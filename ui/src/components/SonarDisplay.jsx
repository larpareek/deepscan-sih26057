// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { FileUp, Grid3x3, Tag } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STATUS } from "../lib/hazard";
import { fmtLat, fmtLon } from "../lib/geo";
import { paletteGradient } from "../lib/sonarSynth";
import { playPing } from "../lib/sound";
import { Term } from "./ui";

const AXIS_LEFT = 44; // px gutter for the along-track axis
const AXIS_TOP = 20; // px gutter for the range axis

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** 1-2-5 step so ticks land roughly every `targetPx` pixels. */
function niceStep(range, px, targetPx) {
  const raw = (range / Math.max(px, 1)) * targetPx;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
}

function Axes({ geo, w, h, part }) {
  const half = geo.swathM / 2;
  const rStep = niceStep(half, w / 2, 70);
  const rTicks = [];
  for (let r = 0; r <= half + 1e-6; r += rStep) {
    rTicks.push(r);
    if (r > 0) rTicks.push(-r);
  }
  const aStep = niceStep(geo.lengthM, h, 60);
  const aTicks = [];
  for (let a = 0; a <= geo.lengthM + 1e-6; a += aStep) aTicks.push(a);
  const xOf = (r) => w / 2 + (r / half) * (w / 2);
  const yOf = (a) => (a / geo.lengthM) * h;

  if (part === "grid") {
    return (
      <svg className="pointer-events-none absolute inset-0 z-[1] overflow-visible" width={w} height={h} aria-hidden="true">
        {rTicks.map((r) => (
          <line key={`r${r}`} x1={xOf(r)} x2={xOf(r)} y1={0} y2={h} stroke="#F2F4F8" strokeOpacity={r === 0 ? 0.28 : 0.09} strokeDasharray={r === 0 ? "4 4" : undefined} />
        ))}
        {aTicks.map((a) => (
          <line key={`a${a}`} x1={0} x2={w} y1={yOf(a)} y2={yOf(a)} stroke="#F2F4F8" strokeOpacity={0.07} />
        ))}
      </svg>
    );
  }

  return (
    <>
      {/* Axis units: both axes in metres */}
      <span className="pointer-events-none absolute font-mono text-[10px] text-ink-3" style={{ left: -AXIS_LEFT + 4, top: -AXIS_TOP + 2 }} aria-hidden="true">
        m
      </span>
      {/* Range axis (slant range, metres per channel) */}
      <div className="pointer-events-none absolute left-0 right-0" style={{ top: -AXIS_TOP, height: AXIS_TOP }} aria-hidden="true">
        {rTicks.map((r) => (
          <span key={r} className="absolute -translate-x-1/2 font-mono text-[10px] text-ink-3" style={{ left: xOf(r), top: 2 }}>
            {Math.abs(r).toFixed(0)}
          </span>
        ))}
      </div>
      {/* Along-track axis (metres from scan start) */}
      <div className="pointer-events-none absolute top-0 bottom-0" style={{ left: -AXIS_LEFT, width: AXIS_LEFT - 6 }} aria-hidden="true">
        {aTicks.map((a) => (
          <span key={a} className="absolute right-0 -translate-y-1/2 font-mono text-[10px] text-ink-3" style={{ top: yOf(a) }}>
            {a.toFixed(0)}
          </span>
        ))}
      </div>
    </>
  );
}

function HoverCard({ d, flip, alignRight }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${alignRight ? "right-0" : "left-0"} z-20 w-max rounded border border-line-strong bg-surface-3 px-2.5 py-1.5 text-left font-mono text-[11px] leading-5 text-ink-2 shadow-lg shadow-black/40 ${
        flip ? "top-full mt-2" : "bottom-full mb-6"
      }`}
    >
      <div className="text-ink">
        {d.id} · {d.label.toUpperCase()}
      </div>
      <div>
        CONF <span className="text-ink">{d.confidence.toFixed(1)}%</span> · {d.dims.length}×{d.dims.width} m
      </div>
      <div className={d.status.text}>{d.status.label}</div>
    </div>
  );
}

function EmptyDisplay({ onImport, onLoadDemo, onFiles }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`absolute inset-0 grid place-items-center border border-dashed transition-colors duration-150 ${drag ? "border-accent bg-accent/5" : "border-transparent"}`}
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
      {/* Faint waterfall grid behind the message */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(242,244,248,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(242,244,248,0.05)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div aria-hidden="true" className="absolute inset-y-0 left-1/2 border-l border-dashed border-ink/15" />
      <div className="relative max-w-sm px-6 text-center">
        <p className="caps mb-2">No scan loaded</p>
        <p className="mb-5 text-[15px] leading-relaxed text-ink">
          Import side-scan sonar data to begin hazard analysis, or open the demo survey.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={onImport}>
            <FileUp size={15} aria-hidden="true" />
            Import scan…
          </button>
          <button type="button" className="btn" onClick={onLoadDemo}>
            Load demo survey
          </button>
        </div>
        <p className="mt-4 text-xs text-ink-3">
          Waterfall image (PNG/JPG) + <Term term="ping header">ping header</Term> metadata (JSON). Drop files here.
        </p>
      </div>
    </div>
  );
}

export default function SonarDisplay({
  src, sceneKey, geo, detections, activeId, onHover, onSelect, busy, busyStage, soundOn,
  onImport, onLoadDemo, onFiles, showColorbar, palette, onPalette,
}) {
  const areaRef = useRef(null);
  const area = useSize(areaRef);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [cursor, setCursor] = useState(null);

  // Fit the image (with axis gutters) inside the available area, preserving aspect ratio.
  const aspect = geo ? geo.widthPx / geo.heightPx : 1.6;
  const availW = Math.max(area.w - AXIS_LEFT - 8, 0);
  const availH = Math.max(area.h - AXIS_TOP - 8, 0);
  const w = Math.min(availW, availH * aspect);
  const h = w / aspect;

  // Draw large boxes first so smaller (often nested) ones stay on top and clickable.
  const drawOrder = [...detections].sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h);

  // Loading a scan removes the focused empty-state button; move focus to the display heading.
  const headingRef = useRef(null);
  const hadSrc = useRef(Boolean(src));
  useEffect(() => {
    if (src && !hadSrc.current && (document.activeElement === document.body || !document.activeElement)) headingRef.current?.focus();
    hadSrc.current = Boolean(src);
  }, [src]);

  // Hover card follows pointer/focus on the display itself only (not table or map
  // highlights), so it never covers the image unasked on small screens.
  const [localHover, setLocalHover] = useState(null);
  const hover = (id) => {
    setLocalHover(id);
    onHover(id);
    if (id && soundOn) playPing();
  };

  const onMove = (e) => {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * geo.widthPx;
    const y = ((e.clientY - r.top) / r.height) * geo.heightPx;
    const [lat, lon] = geo.pixelToGps(x, y);
    setCursor({ across: geo.acrossM(x), along: geo.alongM(y), lat, lon });
  };

  return (
    <section className="pane h-full" aria-labelledby="sonar-h">
      <div className="pane-head">
        <h1 id="sonar-h" ref={headingRef} tabIndex={-1} className="pane-title focus:outline-none">
          Sonar display
        </h1>
        {geo && (
          <>
            <span className="hidden font-mono text-2xs text-ink-3 md:inline" aria-label="Port on the left, starboard on the right">
              PORT <span className="text-ink-2">◂ ▸</span> STBD
            </span>
            <dl className="hidden items-center gap-4 font-mono text-2xs text-ink-3 md:flex">
              <div className="flex gap-1.5"><dt><Term term="swath width">SWATH</Term></dt><dd className="text-ink-2">{geo.swathM} m</dd></div>
              <div className="flex gap-1.5"><dt><Term term="ping">PINGS</Term></dt><dd className="text-ink-2">{geo.heightPx}</dd></div>
              <div className="hidden gap-1.5 lg:flex"><dt>Δ PING</dt><dd className="text-ink-2">{geo.pingSpacingM.toFixed(2)} m</dd></div>
            </dl>
          </>
        )}
        {/* Display controls only once there is something to display */}
        <div className={`ml-auto flex items-center gap-1 ${src ? "" : "invisible"}`}>
          {showColorbar && (
            <div className="seg mr-2" role="group" aria-label="Display palette">
              {[["gray", "Gray"], ["bronze", "Bronze"]].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={palette === key} onClick={() => onPalette(key)} className="!h-6">
                  {label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn btn-ghost h-7 px-2 text-xs" aria-pressed={showGrid} onClick={() => setShowGrid((v) => !v)}>
            <Grid3x3 size={14} aria-hidden="true" />
            Grid
          </button>
          <button type="button" className="btn btn-ghost h-7 px-2 text-xs" aria-pressed={showLabels} onClick={() => setShowLabels((v) => !v)}>
            <Tag size={14} aria-hidden="true" />
            Labels
          </button>
        </div>
      </div>

      <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden bg-bg-1">
        {!src && <EmptyDisplay onImport={onImport} onLoadDemo={onLoadDemo} onFiles={onFiles} />}

        {src && geo && w > 0 && (
          <div
            key={sceneKey}
            className="absolute"
            style={{ width: w, height: h, left: AXIS_LEFT + (availW - w) / 2, top: AXIS_TOP + (availH - h) / 2 }}
            // On the container (not the <img>) so the readout also tracks over detection markers
            onMouseMove={onMove}
            onMouseLeave={() => setCursor(null)}
          >
            <Axes geo={geo} w={w} h={h} part="labels" />
            <img
              src={src}
              alt={`Side-scan sonar waterfall, port left, starboard right, ${detections.length} detections marked`}
              draggable={false}
              className="relative h-full w-full select-none border border-line object-fill"
              style={{ zIndex: 0 }}
            />
            {showGrid && <Axes geo={geo} w={w} h={h} part="grid" />}

            {/* Restrained sweep: the current ping line */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
              <div
                className={`absolute inset-x-0 -top-px h-px ${busy ? "bg-accent/80" : "bg-accent/35"} animate-sweep`}
                style={{ "--sweep-h": `${h}px`, animationDuration: busy ? "1.6s" : "7s" }}
              />
            </div>

            {busy ? (
              <div className="absolute inset-0 z-10 bg-bg/60">
                <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-line">
                  <span className="absolute inset-y-0 w-2/5 animate-indeterminate bg-accent" />
                </div>
                <p className="absolute left-3 top-3 font-mono text-xs text-ink" aria-hidden="true">
                  PROCESSING · {busyStage}
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 z-10" role="group" aria-label="Detections on the sonar display">
                {drawOrder.map((d) => {
                  const active = d.id === activeId;
                  const top = (d.bbox.y / geo.heightPx) * 100;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-label={`${d.id} ${d.label}, ${d.status.label.toLowerCase()}, confidence ${d.confidence.toFixed(0)}%. Show details.`}
                      aria-pressed={active}
                      className={`marker ${active ? "is-active z-10" : ""} ${d.shadowPenalized ? "is-dim" : ""}`}
                      style={{
                        "--status": d.status.color,
                        left: `${(d.bbox.x / geo.widthPx) * 100}%`,
                        top: `${top}%`,
                        width: `${(d.bbox.w / geo.widthPx) * 100}%`,
                        height: `${(d.bbox.h / geo.heightPx) * 100}%`,
                      }}
                      onMouseEnter={() => hover(d.id)}
                      onMouseLeave={() => hover(null)}
                      onFocus={() => hover(d.id)}
                      onBlur={() => hover(null)}
                      onClick={() => onSelect(d.id)}
                    >
                      {(showLabels || active) && (
                        <span className="marker-tag" aria-hidden="true">
                          {d.id}
                        </span>
                      )}
                      {/* Hover/focus only: the selection itself is shown in the Object detail panel */}
                      {d.id === localHover && <HoverCard d={d} flip={top < 22} alignRight={d.bbox.x / geo.widthPx > 0.6} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: legend, colour scale, cursor readout */}
      <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-3 py-1.5 font-mono text-2xs text-ink-3">
        <span className={`flex items-center gap-3 ${src ? "" : "invisible"}`} aria-label="Legend">
          {[STATUS.critical, STATUS.warning, STATUS.review].map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 border-[1.5px]" style={{ borderColor: s.color }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </span>
        {showColorbar && (
          <span className="hidden items-center gap-1.5 md:flex">
            LOW
            <span aria-hidden="true" className="h-2 w-20 border border-line" style={{ background: paletteGradient(palette) }} />
            HIGH <span className="text-ink-3">RETURN</span>
          </span>
        )}
        <span className="ml-auto text-ink-2" aria-live="off">
          {cursor ? (
            <>
              RNG {Math.abs(cursor.across).toFixed(1)} m {cursor.across >= 0 ? "STBD" : "PORT"} · ALONG {cursor.along.toFixed(1)} m
              {geo.georeferenced ? ` · ${fmtLat(cursor.lat)} ${fmtLon(cursor.lon)}` : " · NOT GEOREFERENCED"}
            </>
          ) : geo ? (
            "CURSOR —"
          ) : null}
        </span>
      </div>
    </section>
  );
}
