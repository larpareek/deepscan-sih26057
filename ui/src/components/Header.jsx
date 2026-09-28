import * as Popover from "@radix-ui/react-popover";
import { useEffect, useState } from "react";
import { CLASS_STYLES } from "../lib/classes";
import { useTelemetry } from "../lib/useTelemetry";
import { ConfidenceRing, Icon, MagneticButton, Term, Tip } from "./ui";

const POPOVER_CLASS =
  "z-[1100] w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-abyss-800 p-5 shadow-2xl shadow-black/70 ring-1 ring-white/15 focus:outline-none " +
  "origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out";

function systemStatus(mode, backendOnline) {
  return mode === "live" ? ["bg-hazard-green", "Live: results from backend"]
    : mode === "empty" ? [backendOnline ? "bg-hazard-green" : "bg-hazard-amber", backendOnline ? "Backend online, awaiting data" : "Backend offline, demo available"]
    : backendOnline ? ["bg-hazard-green", "Backend online, showing demo scan"]
      : ["bg-hazard-amber", "Demo mode: backend offline"];
}

function StatusDot({ mode, backendOnline }) {
  const [color, text] = systemStatus(mode, backendOnline);
  return (
    <Tip align="start" content={<span className="text-white">{text}</span>}>
      <MagneticButton type="button" className="hidden h-[44px] w-[44px] place-items-center rounded-full sm:grid" aria-label={`System status: ${text}`}>
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color} shadow-[0_0_10px_currentColor]`} />
      </MagneticButton>
    </Tip>
  );
}

/** Mounted only while the popover is open, so the live values don't tick in the background. */
function TelemetryReadout() {
  const t = useTelemetry();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const primary = [
    ["depth", "Depth", t.depth.toFixed(1), "m"],
    ["knots", "Speed", t.speed.toFixed(1), "kn"],
    ["heading", "Heading", String(t.heading).padStart(3, "0"), "°"],
  ];
  const secondary = [
    ["altitude", "Altitude", `${t.altitude.toFixed(1)} m`],
    ["pitch / roll", "Pitch / roll", `${t.pitch.toFixed(1)}° / ${t.roll.toFixed(1)}°`],
    [null, "Water temp", `${t.temp.toFixed(1)} °C`],
    ["frequency", "Frequency", "900 kHz"],
    ["swath width", "Swath width", "100 m"],
  ];
  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tighter text-white">
          <Term term="AUV">AUV</Term>-07 telemetry
        </h2>
        <span className="font-mono text-sm text-slate-300">{now.toISOString().slice(11, 19)} UTC</span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {primary.map(([term, label, value, unit]) => (
          <div key={label} className="rounded-xl bg-abyss-900/60 px-3 py-2">
            <dt className="text-sm text-slate-300"><Term term={term}>{label}</Term></dt>
            <dd className="font-mono text-2xl text-neon">
              {value}
              <span className="ml-0.5 text-sm text-slate-300">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-start gap-5">
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-base">
          {secondary.map(([term, label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-300">{term ? <Term term={term}>{label}</Term> : label}</dt>
              <dd className="text-right font-mono text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center gap-1">
          <ConfidenceRing value={t.battery} color="#5EEAD4" size={64} stroke={4}>
            <span className="font-mono text-sm text-slate-100">{t.battery}%</span>
          </ConfidenceRing>
          <span className="text-sm text-slate-300">Battery</span>
        </div>
      </div>
    </>
  );
}

function TelemetryMenu() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <MagneticButton type="button" className="btn-quiet" aria-label="Telemetry">
          <Icon name="gauge" />
          <span className="hidden md:inline" aria-hidden="true">Telemetry</span>
          <Icon name="chevron" className="hidden h-4 w-4 md:block" />
        </MagneticButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={16}
          tabIndex={-1}
          aria-label="AUV telemetry"
          // Focus the panel, not its first glossary term (which would pop its tooltip open)
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            e.currentTarget.focus();
          }}
          className={POPOVER_CLASS}
        >
          <TelemetryReadout />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const LOG_LEVELS = {
  ok: ["text-hazard-green", "OK"],
  info: ["text-slate-200", "Info"],
  warn: ["text-hazard-amber", "Warning"],
  alert: ["text-hazard", "Alert"],
};

function MoreMenu({ onLoadDemo, onDownload, reportReady, log, status, soundOn, onToggleSound }) {
  const [open, setOpen] = useState(false);
  const item =
    "flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-base text-slate-200 transition-all duration-300 ease-in-out " +
    "hover:bg-white/[0.08] hover:pl-4 hover:text-white active:bg-white/[0.12] " +
    "disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:pl-3";
  const act = (fn) => () => {
    fn();
    setOpen(false);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <MagneticButton type="button" className="btn-quiet" aria-label="More options">
          <Icon name="more" />
        </MagneticButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} collisionPadding={16} className={`${POPOVER_CLASS} !p-3`}>
          {/* The header status dot is hidden on phones; show it here instead */}
          <p className="flex min-h-[44px] items-center gap-3 px-3 text-base text-slate-200 sm:hidden">
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${status[0]}`} />
            {status[1]}
          </p>
          <button type="button" className={item} onClick={act(onLoadDemo)}>
            Load demo scan
          </button>
          <button type="button" className={`${item} sm:hidden`} disabled={!reportReady} onClick={act(() => onDownload("json"))}>
            Download report (JSON)
          </button>
          <button type="button" className={item} disabled={!reportReady} onClick={act(() => onDownload("csv"))}>
            Export report as CSV
          </button>
          {/* Optional hover "ping" on detections; off by default */}
          <button type="button" role="switch" aria-checked={soundOn} className={`${item} justify-between`} onClick={onToggleSound}>
            <span className="inline-flex items-center gap-3">
              <Icon name={soundOn ? "sound" : "mute"} />
              Sonar ping sounds
            </span>
            <span
              aria-hidden="true"
              className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${soundOn ? "bg-neon" : "bg-slate-600"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${soundOn ? "left-6" : "left-1"}`} />
            </span>
          </button>

          <section aria-labelledby="legend-h" className="mt-2 border-t border-white/10 px-3 pt-3">
            <h3 id="legend-h" className="mb-2 font-display text-sm font-bold tracking-tight text-slate-200">Legend</h3>
            <ul className="grid grid-cols-2 gap-y-1.5 text-sm">
              {Object.values(CLASS_STYLES).map((s) => (
                <li key={s.label} className="inline-flex items-center gap-2 text-slate-200">
                  <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded border-2 text-[10px] font-bold" style={{ borderColor: s.hex, color: s.text }}>
                    {s.glyph}
                  </span>
                  {s.label}
                </li>
              ))}
              <li className="col-span-2 mt-1 inline-flex items-center gap-2 text-slate-200">
                <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded bg-hazard text-[11px] font-bold text-abyss">!</span>
                <span>
                  Faded brackets: in <Term term="acoustic shadow" />
                </span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="activity-h" className="mt-3 border-t border-white/10 px-3 pt-3">
            <h3 id="activity-h" className="mb-2 font-display text-sm font-bold tracking-tight text-slate-200">Activity</h3>
            <ol className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs leading-relaxed" tabIndex={0} aria-label="Activity log, newest first">
              {[...log].reverse().map((l, i) => {
                const [cls, lvl] = LOG_LEVELS[l.lvl] ?? LOG_LEVELS.info;
                return (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 text-slate-300">{l.t}</span>
                    <span className={cls}>
                      <span className="sr-only">{lvl}: </span>
                      {l.msg}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function Header({
  mode, backendOnline, hazardCount,
  leftOpen, rightOpen, onToggleLeft, onToggleRight,
  leftToggleRef, rightToggleRef,
  onDownload, reportReady, onLoadDemo, log, soundOn, onToggleSound,
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 sm:gap-4">
        <MagneticButton
          ref={leftToggleRef}
          type="button"
          className="btn-quiet"
          aria-label={leftOpen ? "Hide scan controls" : "Show scan controls"}
          aria-expanded={leftOpen}
          aria-controls="controls-drawer"
          onClick={onToggleLeft}
        >
          <Icon name="sliders" />
          <span className="hidden sm:inline" aria-hidden="true">Controls</span>
        </MagneticButton>
        <div className="flex items-center gap-1">
          <span className="font-display text-xl font-bold tracking-tighter text-white sm:text-3xl">
            DEEP<span className="neon-text">SCAN</span>
          </span>
          <StatusDot mode={mode} backendOnline={backendOnline} />
        </div>
      </div>

      <nav aria-label="Dashboard" className="flex items-center sm:gap-2">
        <MagneticButton
          ref={rightToggleRef}
          type="button"
          className="btn-quiet"
          aria-label={`${rightOpen ? "Hide" : "Show"} detected hazards (${hazardCount})`}
          aria-expanded={rightOpen}
          aria-controls="hazards-drawer"
          onClick={onToggleRight}
        >
          <Icon name="target" />
          <span className="hidden md:inline" aria-hidden="true">Hazards</span>
          <span aria-hidden="true" className="rounded-full bg-hazard px-1.5 font-mono text-sm font-medium text-abyss sm:px-2">
            {hazardCount}
          </span>
        </MagneticButton>
        <TelemetryMenu />
        <MagneticButton
          type="button"
          className="btn-primary btn-export ml-2 hidden sm:inline-flex"
          aria-label="Download report (JSON)"
          onClick={() => onDownload("json")}
          disabled={!reportReady}
          whileHover={{ scale: 1.05 }}
        >
          <Icon name="download" />
          <span aria-hidden="true">Report</span>
        </MagneticButton>
        <MoreMenu onLoadDemo={onLoadDemo} onDownload={onDownload} reportReady={reportReady} log={log} status={systemStatus(mode, backendOnline)} soundOn={soundOn} onToggleSound={onToggleSound} />
      </nav>
    </header>
  );
}
