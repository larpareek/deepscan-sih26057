// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Survey analytics. "This session" is computed from the scans run on the dashboard; the
// sample campaign is simulated and labelled as such everywhere it appears.
import { Download, FlaskConical, Radar } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { reportUrl } from "../lib/api";
import { useScan } from "../lib/scanContext";

const TYPES = [
  { cls: "ghost_net", name: "Ghost Nets", color: "#FB923C" },
  { cls: "shipwreck", name: "Shipwrecks", color: "#5EEAD4" },
  { cls: "pipe", name: "Pipelines", color: "#22D3EE" },
  { cls: "anomaly", name: "Anomalies", color: "#E8DDB5" },
];

// Simulated eight-day campaign off the Tamil Nadu coast (illustrative numbers, not survey results)
const SAMPLE = [
  ["2026-09-21", "Ennore approach, legs 1-6", [3, 1, 2, 5], 1],
  ["2026-09-22", "Ennore approach, legs 7-12", [5, 0, 2, 4], 2],
  ["2026-09-23", "Chennai port, north", [2, 2, 3, 6], 1],
  ["2026-09-24", "Chennai port, south", [6, 1, 1, 3], 3],
  ["2026-09-25", "Marina offshore, legs 1-5", [4, 1, 2, 7], 2],
  ["2026-09-26", "Marina offshore, legs 6-10", [7, 0, 3, 4], 4],
  ["2026-09-27", "Besant Nagar reef edge", [5, 2, 1, 5], 3],
  ["2026-09-28", "Kovalam shelf", [8, 1, 2, 6], 4],
].map(([date, area, counts, critical], i) => ({
  id: `SAMPLE-${String(i + 1).padStart(2, "0")}`,
  date,
  label: date.slice(5),
  area,
  counts: Object.fromEntries(TYPES.map((t, j) => [t.cls, counts[j]])),
  total: counts.reduce((a, b) => a + b, 0),
  critical,
  avgConf: 78 + ((i * 7) % 11),
}));

function fromSession(scans) {
  return scans.map((s) => {
    const counts = Object.fromEntries(TYPES.map((t) => [t.cls, s.detections.filter((d) => d.cls === t.cls).length]));
    const confs = s.detections.map((d) => d.confidence);
    return {
      id: s.id,
      date: s.time,
      label: new Date(s.time).toISOString().slice(11, 16),
      area: s.source,
      counts,
      total: s.detections.length,
      critical: s.detections.filter((d) => d.status.key === "critical").length,
      avgConf: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0,
      scan: s,
    };
  });
}

function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

/** Client-side report for scans without a backend job (demo) and for sample rows. */
function downloadRow(row) {
  if (row.scan?.jobId) {
    window.location.href = reportUrl(row.scan.jobId, "csv");
    return;
  }
  if (row.scan) {
    const header = "id,class,status,confidence,latitude,longitude";
    const lines = row.scan.detections.map((d) => [d.id, d.cls, d.status.label, d.confidence, d.lat?.toFixed(7) ?? "", d.lon?.toFixed(7) ?? ""].join(","));
    download([header, ...lines].join("\n"), `seascan_report_${row.id.toLowerCase()}.csv`, "text/csv");
    return;
  }
  const summary = { sample: true, note: "Simulated campaign data for demonstration", ...row };
  download(JSON.stringify(summary, null, 2), `seascan_sample_${row.date}.json`, "application/json");
}

const tooltipStyle = {
  contentStyle: { background: "#111A30", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#FEF3C7", fontFamily: "Inter" },
  labelStyle: { color: "#FEF3C7", fontWeight: 600 },
  itemStyle: { color: "#FEF3C7" },
};
const axis = { stroke: "rgba(254,243,199,.25)", tick: { fill: "rgba(254,243,199,.65)", fontSize: 12, fontFamily: "Inter" } };

function Kpi({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-abyss-2 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-cream/55">{label}</p>
      <p className={`mt-2 font-display text-4xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { sessionScans } = useScan();
  const [source, setSource] = useState(sessionScans.length ? "session" : "sample");
  const rows = useMemo(() => (source === "session" ? fromSession(sessionScans) : SAMPLE), [source, sessionScans]);
  const isSample = source === "sample";

  const totals = useMemo(() => {
    const byType = Object.fromEntries(TYPES.map((t) => [t.cls, 0]));
    let total = 0;
    let critical = 0;
    let confSum = 0;
    for (const r of rows) {
      for (const t of TYPES) byType[t.cls] += r.counts[t.cls];
      total += r.total;
      critical += r.critical;
      confSum += r.avgConf * r.total;
    }
    return { byType, total, critical, avgConf: total ? confSum / total : 0 };
  }, [rows]);

  const pieData = TYPES.map((t) => ({ name: t.name, value: totals.byType[t.cls], color: t.color })).filter((d) => d.value > 0);
  const lineData = rows.map((r) => ({ name: r.label, Detections: r.total, Critical: r.critical }));

  return (
    <div className="min-h-screen bg-abyss px-6 pb-24 pt-28 font-inter text-cream">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sunset">Analytics</p>
            <h1 className="mt-3 font-display text-5xl font-bold">Survey insights</h1>
          </div>
          <div className="inline-flex rounded-full border border-white/15 bg-abyss-2 p-1" role="group" aria-label="Data source">
            {[
              ["session", `This session (${sessionScans.length})`, Radar],
              ["sample", "Sample campaign", FlaskConical],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={source === key}
                onClick={() => setSource(key)}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${source === key ? "bg-cream text-abyss" : "text-cream/70 hover:text-cream"}`}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {isSample ? (
          <p className="mt-6 flex items-start gap-2 rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-sm text-cream/85">
            <FlaskConical size={16} className="mt-0.5 shrink-0 text-sunset" aria-hidden="true" />
            Simulated eight-day campaign, for illustration only. These are not real survey results. Switch to “This session” to
            see scans you ran on the dashboard.
          </p>
        ) : (
          rows.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-white/20 p-12 text-center">
              <p className="font-display text-2xl">No scans yet this session.</p>
              <p className="mt-2 text-cream/60">Load the demo survey or process a scan on the dashboard, then come back.</p>
              <Link to="/dashboard" className="mt-6 inline-block rounded-full bg-gradient-to-r from-biolum to-seafoam px-6 py-3 font-semibold text-abyss">
                Open dashboard
              </Link>
            </div>
          )
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi label="Detections" value={totals.total} accent="text-cream" />
              <Kpi label="Critical hazards" value={totals.critical} accent="text-[#FF8389]" />
              <Kpi label="Ghost nets" value={totals.byType.ghost_net} accent="text-sunset" />
              <Kpi label="Avg confidence" value={`${totals.avgConf.toFixed(0)}%`} accent="text-seafoam" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <figure className="rounded-2xl border border-white/10 bg-abyss-2 p-6">
                <figcaption className="font-display text-xl font-bold">Detections over time</figcaption>
                <p className="text-xs text-cream/55">
                  {isSample ? "Per survey day" : lineData.length < 2 ? "Per scan (UTC). Each scan you run adds a point to the trend." : "Per scan (UTC time)"}
                </p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(254,243,199,.08)" vertical={false} />
                      <XAxis dataKey="name" {...axis} />
                      <YAxis allowDecimals={false} {...axis} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 13, color: "#FEF3C7" }} />
                      <Line type="monotone" dataKey="Detections" stroke="#22D3EE" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Critical" stroke="#FB923C" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </figure>

              <figure className="rounded-2xl border border-white/10 bg-abyss-2 p-6">
                <figcaption className="font-display text-xl font-bold">Debris Type Distribution</figcaption>
                <p className="text-xs text-cream/55">All detections {isSample ? "in the campaign" : "this session"}</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} stroke="#0B1224" strokeWidth={2}>
                        {pieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </figure>
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-abyss-2" aria-labelledby="reports-title">
              <h2 id="reports-title" className="px-6 pt-6 font-display text-xl font-bold">
                Recent Reports
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y border-white/10 text-xs uppercase tracking-wider text-cream/55">
                    <tr>
                      <th className="px-6 py-3 font-medium">Report</th>
                      <th className="px-6 py-3 font-medium">{isSample ? "Survey area" : "Source"}</th>
                      <th className="px-6 py-3 text-right font-medium">Objects</th>
                      <th className="px-6 py-3 text-right font-medium">Critical</th>
                      <th className="px-6 py-3 text-right font-medium">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...rows].reverse().map((r) => (
                      <tr key={`${r.id}-${r.date}`} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-3">
                          <span className="font-medium">{r.id}</span>
                          <span className="block text-xs text-cream/50">{isSample ? r.date : new Date(r.date).toUTCString().slice(5, 22)}</span>
                        </td>
                        <td className="max-w-[260px] truncate px-6 py-3 text-cream/75">{r.area}</td>
                        <td className="px-6 py-3 text-right font-mono">{r.total}</td>
                        <td className="px-6 py-3 text-right font-mono text-[#FF8389]">{r.critical}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => downloadRow(r)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium hover:border-biolum/60 hover:text-biolum"
                            aria-label={`Download ${r.id} ${isSample ? "sample summary (JSON)" : "report (CSV)"}`}
                          >
                            <Download size={14} aria-hidden="true" />
                            {isSample ? "JSON" : "CSV"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
