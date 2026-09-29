// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import * as Popover from "@radix-ui/react-popover";
import { Download, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { STATUS_RULES } from "../lib/hazard";

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="readout text-xs">{now.toISOString().slice(11, 19)}</span>;
}

function systemState(mode, online, busy, pending) {
  if (busy) return ["#78A9FF", "PROCESSING"];
  if (pending) return ["#979DA5", "CONNECTING"];
  if (online) return ["#42BE65", "SYSTEM ONLINE"];
  return ["#F1C21B", mode === "demo" ? "OFFLINE · DEMO DATA" : "API OFFLINE"];
}

function SettingsMenu({ soundOn, onToggleSound }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Settings">
          <Settings size={16} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[1100] w-72 rounded border border-line-strong bg-surface-3 p-3 text-[13px] shadow-lg shadow-black/40 data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out"
        >
          <h2 className="caps mb-2">Settings</h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
            <span className="text-ink">Audible contact ping</span>
            <input type="checkbox" role="switch" className="check" checked={soundOn} onChange={onToggleSound} />
          </label>
          <p className="mb-3 text-2xs text-ink-3">Plays a short tone when the cursor enters a detection.</p>

          <h2 className="caps mb-1.5 border-t border-line pt-3">Hazard status rules</h2>
          <ul className="space-y-1">
            {STATUS_RULES.map(([s, rule]) => (
              <li key={s.key} className="flex items-start gap-2 text-xs">
                <span className={`w-16 shrink-0 font-mono text-2xs ${s.text}`}>{s.label}</span>
                <span className="text-ink-2">{rule}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2 font-mono text-2xs text-ink-3">SEASCAN · SIH26057 · MoES / NIOT</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function TopBar({ scanId, mode, backendOnline, backendPending, busy, lastUpdate, onDownload, reportReady, soundOn, onToggleSound }) {
  const [color, label] = systemState(mode, backendOnline, busy, backendPending);
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-bg px-3 sm:px-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[15px] font-semibold tracking-[0.18em] text-ink">SEASCAN</span>
        <span className="hidden whitespace-nowrap text-2xs font-medium uppercase tracking-[0.14em] text-ink-3 xl:inline">
          Sonar hazard detection system
        </span>
      </div>

      <dl className="ml-auto hidden items-center divide-x divide-line whitespace-nowrap lg:flex">
        <div className="flex items-baseline gap-2 px-4">
          <dt className="label">Scan</dt>
          <dd className="readout max-w-[220px] truncate text-xs">{scanId ?? "—"}</dd>
        </div>
        <div className="flex items-center gap-2 px-4">
          <dt className="sr-only">System status</dt>
          <dd className="flex items-center gap-2 font-mono text-2xs font-medium tracking-wider text-ink">
            <span className={`dot ${busy ? "animate-pulse" : ""}`} style={{ background: color }} aria-hidden="true" />
            <span role="status">{label}</span>
          </dd>
        </div>
        <div className="flex items-baseline gap-2 px-4">
          <dt className="label">Last update</dt>
          <dd className="readout text-xs">{lastUpdate ?? "—"}</dd>
        </div>
        <div className="hidden items-baseline gap-2 px-4 xl:flex">
          <dt className="label">UTC</dt>
          <dd>
            <UtcClock />
          </dd>
        </div>
      </dl>

      {/* Compact status for small screens */}
      <span className="ml-auto flex items-center gap-1.5 font-mono text-2xs text-ink lg:hidden">
        <span className="dot" style={{ background: color }} aria-hidden="true" />
        <span className="sr-only">System status: {label}</span>
        <span aria-hidden="true">{busy ? "BUSY" : backendPending ? "…" : backendOnline ? "ONLINE" : "OFFLINE"}</span>
      </span>

      <div className="flex items-center gap-1 border-l border-line pl-3">
        {/* One export control: format choice, not two unrelated buttons */}
        <div className="flex items-center" role="group" aria-label="Export report">
          <span className="label mr-2 hidden sm:inline" aria-hidden="true">
            Export
          </span>
          <div className="flex overflow-hidden rounded-md border border-line">
            {["json", "csv"].map((fmt, i) => (
              <button
                key={fmt}
                type="button"
                onClick={() => onDownload(fmt)}
                disabled={!reportReady}
                aria-label={`Export report as ${fmt.toUpperCase()}`}
                title={reportReady ? `Download detection report (${fmt.toUpperCase()})` : "No results to export yet"}
                className={`hit flex h-8 items-center gap-1.5 bg-surface-2 px-2.5 font-mono text-2xs font-medium text-ink transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-3 ${i ? "border-l border-line" : ""}`}
              >
                {i === 0 && <Download size={13} aria-hidden="true" />}
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <SettingsMenu soundOn={soundOn} onToggleSound={onToggleSound} />
      </div>
    </header>
  );
}
