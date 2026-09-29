// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import * as Popover from "@radix-ui/react-popover";
import { Download, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { STATUS_RULES } from "../lib/hazard";
import { Tip } from "./ui";

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="readout text-xs">{now.toISOString().slice(11, 19)}</span>;
}

function systemState(mode, online, busy, pending) {
  if (busy) return ["#38B6C9", "PROCESSING"];
  if (pending) return ["#8DA2AD", "CONNECTING"];
  if (online) return ["#4BAF7A", "SYSTEM ONLINE"];
  return ["#E4A83A", mode === "demo" ? "OFFLINE · DEMO DATA" : "API OFFLINE"];
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
          <h2 className="label mb-2">Settings</h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
            <span className="text-ink">Audible contact ping</span>
            <input type="checkbox" role="switch" className="check" checked={soundOn} onChange={onToggleSound} />
          </label>
          <p className="mb-3 text-2xs text-ink-3">Plays a short tone when the cursor enters a detection.</p>

          <h2 className="label mb-1.5 border-t border-line pt-3">Hazard status rules</h2>
          <ul className="space-y-1">
            {STATUS_RULES.map(([s, rule]) => (
              <li key={s.key} className="flex items-start gap-2 text-xs">
                <span className={`w-16 shrink-0 font-mono text-2xs ${s.text}`}>{s.label}</span>
                <span className="text-ink-2">{rule}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2 font-mono text-2xs text-ink-3">DeepScan · SIH26057 · MoES / NIOT</p>
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
        <span className="text-[15px] font-semibold tracking-[0.18em] text-ink">DEEPSCAN</span>
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
        <Tip content={reportReady ? "Download detection report (JSON)" : "No results to export yet"}>
          <button type="button" className="btn h-8 px-2.5" onClick={() => onDownload("json")} disabled={!reportReady} aria-label="Export report as JSON">
            <Download size={14} className="hidden sm:block" aria-hidden="true" />
            <span aria-hidden="true">JSON</span>
          </button>
        </Tip>
        <Tip content={reportReady ? "Download detection report (CSV)" : "No results to export yet"}>
          <button type="button" className="btn h-8 px-2.5" onClick={() => onDownload("csv")} disabled={!reportReady} aria-label="Export report as CSV">
            CSV
          </button>
        </Tip>
        <SettingsMenu soundOn={soundOn} onToggleSound={onToggleSound} />
      </div>
    </header>
  );
}
