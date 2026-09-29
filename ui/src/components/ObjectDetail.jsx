// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { AlertTriangle } from "lucide-react";
import { fmtLat, fmtLon } from "../lib/geo";
import { Field, StatusTag, Term } from "./ui";

export default function ObjectDetail({ d, detectedAt, threshold, georeferenced = true }) {
  return (
    <section className="pane shrink-0" aria-labelledby="obj-h">
      <div className="pane-head">
        <h2 id="obj-h" className="pane-title">Object detail</h2>
        {d && <span className="ml-auto font-mono text-xs text-ink">{d.id}</span>}
      </div>

      {!d ? (
        <p className="px-3 py-4 text-[13px] leading-relaxed text-ink-3">
          Select an object on the sonar display or in the detections table.
        </p>
      ) : (
        <div className="px-3 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[15px] font-medium text-ink">{d.label}</p>
            <StatusTag status={d.status} />
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="label">Detection confidence</span>
              <span className="readout text-[13px]">{d.confidence.toFixed(1)}%</span>
            </div>
            {/* Certainty, not severity: neutral fill; tick marks the current threshold */}
            <div className="meter" aria-hidden="true">
              <span className="bg-ink-2" style={{ width: `${d.confidence}%` }} />
              <i className="absolute inset-y-[-2px] w-px bg-accent" style={{ left: `${threshold}%` }} />
            </div>
            <div className="mt-1 text-right font-mono text-[10px] text-ink-3">threshold {threshold}%</div>
          </div>

          <dl className="divide-y divide-line/60">
            <Field label="Range">
              {Math.abs(d.rangeM).toFixed(1)} m {d.rangeM >= 0 ? "STBD" : "PORT"}
            </Field>
            <Field label="Along-track">{d.alongM.toFixed(1)} m</Field>
            <Field label="Size (L × W)">
              {d.dims.length.toFixed(2)} × {d.dims.width.toFixed(2)} m
            </Field>
            {georeferenced ? (
              <>
                <Field label="Latitude">{fmtLat(d.lat)}</Field>
                <Field label="Longitude">{fmtLon(d.lon)}</Field>
              </>
            ) : (
              <Field label="Position">not georeferenced</Field>
            )}
            <Field label="Bounding box">
              {d.bbox.w}×{d.bbox.h} px @ {d.bbox.x},{d.bbox.y}
            </Field>
            <Field label="Detected">{detectedAt}</Field>
          </dl>

          {d.unverifiedInput && (
            <p className="mt-3 flex items-start gap-2 border-l-2 border-warn bg-warn/5 px-2 py-1.5 text-xs leading-relaxed text-ink-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
              <span>The uploaded image doesn't look like side-scan sonar, so this detection is unreliable.</span>
            </p>
          )}
          {d.shadowPenalized && (
            <p className="mt-3 flex items-start gap-2 border-l-2 border-warn bg-warn/5 px-2 py-1.5 text-xs leading-relaxed text-ink-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
              <span>
                Box lies mostly in an <Term term="acoustic shadow" />; confidence was halved. Manual review advised.
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
