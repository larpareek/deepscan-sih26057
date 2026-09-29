// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { AlertTriangle, Check, Circle, FileUp, Loader2, Play } from "lucide-react";
import { useId } from "react";
import { classStyle } from "../lib/classes";
import { useTelemetry } from "../lib/useTelemetry";
import { Field, Term } from "./ui";

const fmtBytes = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} kB`);

/* ------------------------------------------------------------------ SCAN */

function FileRow({ label, file, status }) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-1.5 pr-2 align-top">
        <div className="label">{label}</div>
        <div className="max-w-[120px] truncate text-xs text-ink" title={file?.name}>{file ? file.name : "—"}</div>
      </td>
      <td className="py-1.5 pr-2 text-right align-top font-mono text-2xs text-ink-2">{file ? fmtBytes(file.size) : ""}</td>
      <td className="py-1.5 text-right align-top">
        {status && (
          <span className={`inline-flex items-center gap-1 font-mono text-2xs ${status.ok ? "text-ok" : status.warn ? "text-warn" : "text-ink-3"}`}>
            {status.ok ? <Check size={12} aria-hidden="true" /> : status.warn ? <AlertTriangle size={12} aria-hidden="true" /> : null}
            {status.text}
          </span>
        )}
      </td>
    </tr>
  );
}

function ScanSection({ scan, files, fileChecks, onImport, onFiles, onRun, canRun, runReason, busy, error, onLoadDemo, history, currentScanId, onRestore }) {
  const hintId = useId();
  return (
    <section className="section" aria-labelledby="sec-scan">
      <h2 id="sec-scan" className="section-title">Scan</h2>

      <dl className="mb-3">
        <Field label="Current">{scan ? scan.id : "—"}</Field>
        <Field label="Source" mono={false}>
          <span className="text-ink-2">{scan ? scan.source : "No data"}</span>
        </Field>
        {scan && (
          <>
            <Field label="Waterfall">{scan.width} × {scan.height} px</Field>
            <Field label="Altitude">{scan.altitude} m</Field>
          </>
        )}
      </dl>

      <div
        className="rounded border border-dashed border-line-strong bg-bg-1 px-3 py-2.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-ink">Import sonar scan</div>
            <div id={hintId} className="text-2xs text-ink-3">PNG/JPG waterfall + JSON <Term term="ping header">ping metadata</Term></div>
          </div>
          <button type="button" className="btn h-7 px-2 text-xs" onClick={onImport} aria-describedby={hintId}>
            <FileUp size={14} aria-hidden="true" />
            Browse
          </button>
        </div>
        {(files.image || files.metadata) && (
          <table className="mt-2 w-full border-t border-line/60" aria-label="Import status">
            <tbody>
              <FileRow label="Image" file={files.image} status={fileChecks.image} />
              <FileRow label="Metadata" file={files.metadata} status={fileChecks.metadata} />
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary flex-1" onClick={onRun} disabled={!canRun || busy} aria-describedby={canRun ? undefined : `${hintId}-why`} aria-busy={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {busy ? "Processing…" : "Run detection"}
        </button>
        <button type="button" className="btn" onClick={onLoadDemo}>
          Load demo
        </button>
      </div>
      {!canRun && !busy && (
        <p id={`${hintId}-why`} className="mt-1.5 text-2xs text-ink-3">{runReason}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 border-l-2 border-crit bg-crit/5 px-2 py-1.5 text-xs text-crit-text">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-4">
          <h3 className="subhead mb-1.5">Scan history</h3>
          <ul className="max-h-32 overflow-y-auto" aria-label="Scan history, newest first">
            {[...history].reverse().map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  aria-current={h.id === currentScanId ? "true" : undefined}
                  onClick={() => onRestore(h.id)}
                  className={`hit flex w-full items-center gap-2 rounded px-1.5 py-1 text-left font-mono text-2xs transition-colors hover:bg-surface-2 ${h.id === currentScanId ? "text-ink" : "text-ink-2"}`}
                >
                  <span className="text-ink-3">{h.time}</span>
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                  <span>{h.count} obj</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- DETECTION */

const METHODS = [
  ["median", "Median"],
  ["lee", "Lee"],
  ["nlm", "NLM"],
];

function DetectionSection({ threshold, onThreshold, method, onMethod, classCounts, classFilter, onToggleClass, includeShadow, onIncludeShadow }) {
  const tid = useId();
  return (
    <section className="section" aria-labelledby="sec-det">
      <h2 id="sec-det" className="section-title">Detection</h2>

      <div className="mb-3">
        <div className="mb-1 flex items-baseline justify-between">
          {/* Not a <label>: the glossary term is its own button, so name the slider via aria-labelledby */}
          <span id={`${tid}-l`} className="label">
            <Term term="confidence threshold">Confidence threshold</Term>
          </span>
          <output htmlFor={tid} className="readout text-[13px]">{threshold}%</output>
        </div>
        <input
          id={tid}
          aria-labelledby={`${tid}-l`}
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => onThreshold(Number(e.target.value))}
          aria-valuetext={`${threshold} percent`}
          className="range"
          style={{ "--pct": `${threshold}%` }}
        />
      </div>

      <div className="mb-3">
        <div className="label mb-1.5" id={`${tid}-m`}>
          <Term term="speckle">Despeckle filter</Term>
        </div>
        <div className="seg w-full" role="group" aria-labelledby={`${tid}-m`}>
          {METHODS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={method === key} onClick={() => onMethod(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="subhead mb-1.5">Object classes</legend>
        {Object.keys(classCounts).length === 0 ? (
          <p className="text-2xs text-ink-3">No objects yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {Object.entries(classCounts).map(([cls, n]) => (
              <li key={cls}>
                <label className="hit flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-surface-2">
                  <input type="checkbox" className="check" checked={!classFilter.has(cls)} onChange={() => onToggleClass(cls)} />
                  <span className="flex-1 text-ink">{classStyle(cls).label}</span>
                  <span className="font-mono text-2xs text-ink-3">{n}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <label className="hit mt-1 flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] hover:bg-surface-2">
          <input type="checkbox" className="check" checked={includeShadow} onChange={(e) => onIncludeShadow(e.target.checked)} />
          <span className="flex-1 text-ink-2">
            Include shadowed returns
          </span>
        </label>
      </fieldset>
    </section>
  );
}

/* ---------------------------------------------------------------- SYSTEM */

function StatusRow({ label, state, detail }) {
  const color = { ok: "#4BAF7A", warn: "#E4A83A", off: "#8DA2AD", busy: "#38B6C9" }[state];
  return (
    <div className="flex items-center gap-2 py-[3px] text-[13px]">
      <span className="dot" style={{ background: color }} aria-hidden="true" />
      <span className="flex-1 text-ink-2">{label}</span>
      <span className="font-mono text-2xs text-ink">{detail}</span>
    </div>
  );
}

const PIPELINE = [
  ["upload", "Upload"],
  ["preprocess", "Preprocess"],
  ["inference", "Inference + filter"],
  ["geotag_report", "Geotag + report"],
];

function Pipeline({ phase, timings, mode }) {
  const stateOf = (key) => {
    if (phase === "upload") return key === "upload" ? "run" : "wait";
    if (phase === "detect") return key === "upload" ? "done" : "run";
    return timings ? "done" : "idle";
  };
  return (
    <ol className="space-y-0.5" aria-label="Processing pipeline">
      {PIPELINE.map(([key, label]) => {
        const st = stateOf(key);
        return (
          <li key={key} className="flex items-center gap-2 text-[13px]">
            {st === "done" ? (
              <Check size={13} className="text-ok" aria-label="done" />
            ) : st === "run" ? (
              <Loader2 size={13} className="animate-spin text-accent" aria-label="running" />
            ) : (
              <Circle size={9} className="mx-[2px] text-ink-3" aria-label={st === "wait" ? "waiting" : "idle"} />
            )}
            <span className={`flex-1 ${st === "idle" ? "text-ink-3" : "text-ink-2"}`}>{label}</span>
            <span className="font-mono text-2xs text-ink">
              {st === "done" && timings?.[key] != null ? `${Math.round(timings[key])} ms` : mode === "demo" && !phase ? "—" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Vehicle() {
  const t = useTelemetry();
  return (
    <dl>
      <Field label={<Term term="depth">Depth</Term>}>{t.depth.toFixed(1)} m</Field>
      <Field label="Altitude">{t.altitude.toFixed(1)} m</Field>
      <Field label={<Term term="knots">Speed</Term>}>{t.speed.toFixed(2)} kn</Field>
      <Field label={<Term term="heading">Heading</Term>}>{String(t.heading).padStart(3, "0")}°</Field>
      <Field label={<Term term="pitch / roll">Pitch / roll</Term>}>
        {t.pitch.toFixed(1)}° / {t.roll.toFixed(1)}°
      </Field>
    </dl>
  );
}

// Red is reserved for critical hazard status, so log "alerts" are emphasised, not red
const LOG_COLORS = { ok: "text-ink-2", info: "text-ink-2", warn: "text-warn", alert: "text-ink" };

function SystemSection({ backend, mode, phase, timings, log }) {
  return (
    <section className="section border-b-0" aria-labelledby="sec-sys">
      <h2 id="sec-sys" className="section-title">System</h2>

      <h3 className="subhead mb-1.5">Sensor status</h3>
      <div className="mb-3">
        <StatusRow label="Processing API" state={backend.online ? "ok" : "off"} detail={backend.online ? `${backend.latency} ms` : "OFFLINE"} />
        <StatusRow label="Detector" state={backend.online ? "ok" : "off"} detail={backend.model ?? "—"} />
        <StatusRow label="Side-scan sonar" state={mode === "empty" ? "off" : "ok"} detail={mode === "live" ? "FILE" : mode === "demo" ? "SIM · 900 kHz" : "NO DATA"} />
      </div>

      <h3 className="subhead mb-1.5">Processing</h3>
      <div className="mb-1.5 meter" aria-hidden="true">
        {phase ? <span className="w-2/5 animate-indeterminate bg-accent" /> : <span style={{ width: timings ? "100%" : "0%", background: "#4BAF7A" }} />}
      </div>
      <div className="mb-3">
        <Pipeline phase={phase} timings={timings} mode={mode} />
      </div>

      <h3 className="subhead mb-1.5">Vehicle</h3>
      <div className="mb-3">
        {mode === "demo" ? (
          <>
            <Vehicle />
            <p className="mt-1 text-2xs text-ink-3">Simulated for the demo survey</p>
          </>
        ) : (
          <p className="text-xs text-ink-3">No vehicle telemetry feed{mode === "live" ? " (imported file)" : ""}.</p>
        )}
      </div>

      <h3 className="subhead mb-1.5">Log</h3>
      <ol className="max-h-28 overflow-y-auto font-mono text-2xs leading-5" tabIndex={0} aria-label="System log, newest first">
        {[...log].reverse().map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 text-ink-3">{l.t}</span>
            <span className={LOG_COLORS[l.lvl] ?? "text-ink-2"}>{l.msg}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ConsolePanel(props) {
  return (
    <aside aria-label="Operator console" className="bg-surface">
      <ScanSection {...props.scanProps} />
      <DetectionSection {...props.detectionProps} />
      <SystemSection {...props.systemProps} />
    </aside>
  );
}
