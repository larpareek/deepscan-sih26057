// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Full-page SEASCAN AI: conversation on the left, the scan it is grounded in on the right.
import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import { fmtLat, fmtLon } from "../lib/geo";
import { useScan } from "../lib/scanContext";

export function StatusPill({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider" style={{ borderColor: `${status.color}66`, color: status.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function ContextSidebar() {
  const { scan, isDemoFallback, backend } = useScan();
  const sorted = [...scan.detections].sort((a, b) => b.status.rank - a.status.rank || b.confidence - a.confidence);
  return (
    <aside className="flex min-h-0 flex-col border-t border-white/10 bg-abyss-2 lg:border-l lg:border-t-0" aria-label="Scan context">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sunset">Context</p>
        <h2 className="mt-1 font-display text-xl font-bold">{scan.name}</h2>
        <p className="mt-1 text-xs text-cream/55">{scan.source}</p>
        {isDemoFallback && (
          <p className="mt-3 flex gap-2 rounded-lg bg-white/[0.04] p-2.5 text-xs leading-relaxed text-cream/70">
            <Info size={14} className="mt-0.5 shrink-0 text-biolum" aria-hidden="true" />
            Showing the demo survey. Run a scan on the dashboard and SEASCAN AI will talk about that instead.
          </p>
        )}
        {!backend.online && !backend.pending && (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-cream/80">
            Backend offline: answers will be unavailable until it reconnects.
          </p>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
        {sorted.map((d) => (
          <li key={d.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                <span className="mr-2 font-mono text-xs text-cream/50">{d.id}</span>
                {d.label}
              </span>
              <StatusPill status={d.status} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-cream/55">
              {d.confidence.toFixed(1)}%{scan.georeferenced && Number.isFinite(d.lat) ? ` · ${fmtLat(d.lat)} ${fmtLon(d.lon)}` : " · not georeferenced"}
            </p>
          </li>
        ))}
        {sorted.length === 0 && <li className="px-5 py-6 text-sm text-cream/60">No detections above the current threshold.</li>}
      </ul>
      <Link to="/dashboard" className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-sm font-medium text-biolum hover:bg-white/[0.03]">
        Change scan on the dashboard <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </aside>
  );
}

export default function ChatPage() {
  return (
    <div className="grid bg-abyss pt-14 font-inter text-cream lg:h-screen lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col lg:h-auto" aria-label="Conversation">
        <ChatPanel />
      </section>
      <div className="flex max-h-[70vh] min-h-0 flex-col lg:max-h-none">
        <ContextSidebar />
      </div>
    </div>
  );
}
