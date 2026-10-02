// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Analytics from measured data only: "This session" is computed from the scans run on the
// dashboard; "Model validation" shows the detector's evaluation results (synthetic validation
// set, plus the qualitative check on real AI4Shipwrecks sonar).
import { AlertTriangle, BadgeCheck, Download, Radar } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { reportUrl } from "../lib/api";
import { useScan } from "../lib/scanContext";

const TYPES = [
  { cls: "ghost_net", name: "Ghost Nets", color: "#FB923C" },
  { cls: "shipwreck", name: "Shipwrecks", color: "#5EEAD4" },
  { cls: "pipe", name: "Pipelines", color: "#22D3EE" },
  { cls: "anomaly", name: "Anomalies", color: "#E8DDB5" },
];

// Measured by scripts/train_detector.py on the SEASCAN-Synth validation split (seed 26057)
const VALIDATION = {
  images: 240,
  objects: 656,
  overall: { precision: 0.999, recall: 0.999, map50: 0.995, map: 0.94 },
  perClass: {
    shipwreck: { images: 122, objects: 183, precision: 0.998, recall: 1.0, map50: 0.995, map: 0.975 },
    pipe: { images: 108, objects: 128, precision: 0.999, recall: 1.0, map50: 0.995, map: 0.96 },
    ghost_net: { images: 122, objects: 168, precision: 0.998, recall: 1.0, map50: 0.995, map: 0.951 },
    anomaly: { images: 126, objects: 177, precision: 0.999, recall: 0.994, map50: 0.995, map: 0.873 },
  },
};

function ValidationView() {
  const bars = TYPES.map((t) => ({ name: t.name, "mAP@50-95": VALIDATION.perClass[t.cls].map, color: t.color }));
  const pie = TYPES.map((t) => ({ name: t.name, value: VALIDATION.perClass[t.cls].objects, color: t.color }));
  return (
    <>
      <p className="mt-6 flex items-start gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-cream/85">
        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-seafoam" aria-hidden="true" />
        Measured results of the shipped detector on {VALIDATION.images} held-out images ({VALIDATION.objects} labelled objects) from
        SEASCAN-Synth, our simulated side-scan dataset. Synthetic sonar is cleaner than real surveys, so treat these as an upper bound.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="mAP@50" value={VALIDATION.overall.map50.toFixed(3)} accent="text-seafoam" />
        <Kpi label="mAP@50-95" value={VALIDATION.overall.map.toFixed(3)} accent="text-cream" />
        <Kpi label="Precision" value={VALIDATION.overall.precision.toFixed(3)} accent="text-biolum" />
        <Kpi label="Recall" value={VALIDATION.overall.recall.toFixed(3)} accent="text-sunset" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <figure className="rounded-2xl border border-white/10 bg-abyss-2 p-6">
          <figcaption className="font-display text-xl font-bold">Accuracy by class</figcaption>
          <p className="text-xs text-cream/55">mAP@50-95 on the validation split (higher is better, 1.0 is perfect)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(254,243,199,.08)" vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis domain={[0.8, 1]} {...axis} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(254,243,199,.05)" }} />
                <Bar dataKey="mAP@50-95" radius={[6, 6, 0, 0]}>
                  {bars.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
        <figure className="rounded-2xl border border-white/10 bg-abyss-2 p-6">
          <figcaption className="font-display text-xl font-bold">Validation objects by type</figcaption>
          <p className="text-xs text-cream/55">{VALIDATION.objects} labelled objects</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} stroke="#0B1224" strokeWidth={2}>
                  {pie.map((d) => (
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

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-abyss-2" aria-labelledby="val-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
          <h2 id="val-title" className="font-display text-xl font-bold">
            Per-class results
          </h2>
          <button
            type="button"
            onClick={() => download(JSON.stringify({ dataset: "SEASCAN-Synth validation split", ...VALIDATION }, null, 2), "seascan_validation_metrics.json", "application/json")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium hover:border-biolum/60 hover:text-biolum"
          >
            <Download size={14} aria-hidden="true" />
            Metrics JSON
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-white/10 text-xs uppercase tracking-wider text-cream/55">
              <tr>
                <th className="px-6 py-3 font-medium">Class</th>
                <th className="px-6 py-3 text-right font-medium">Images</th>
                <th className="px-6 py-3 text-right font-medium">Objects</th>
                <th className="px-6 py-3 text-right font-medium">Precision</th>
                <th className="px-6 py-3 text-right font-medium">Recall</th>
                <th className="px-6 py-3 text-right font-medium">mAP@50</th>
                <th className="px-6 py-3 text-right font-medium">mAP@50-95</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {TYPES.map((t) => {
                const r = VALIDATION.perClass[t.cls];
                return (
                  <tr key={t.cls}>
                    <td className="px-6 py-3 font-inter font-medium">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                      {t.name}
                    </td>
                    <td className="px-6 py-3 text-right">{r.images}</td>
                    <td className="px-6 py-3 text-right">{r.objects}</td>
                    <td className="px-6 py-3 text-right">{r.precision.toFixed(3)}</td>
                    <td className="px-6 py-3 text-right">{r.recall.toFixed(3)}</td>
                    <td className="px-6 py-3 text-right">{r.map50.toFixed(3)}</td>
                    <td className="px-6 py-3 text-right">{r.map.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 flex gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-6" aria-labelledby="real-title">
        <AlertTriangle size={22} className="mt-1 shrink-0 text-amber-300" aria-hidden="true" />
        <div>
          <h2 id="real-title" className="font-display text-xl font-bold">
            Real-sonar check (AI4Shipwrecks)
          </h2>
          <p className="mt-2 leading-relaxed text-cream/80">
            We also ran the detector on 9 real side-scan tiles of Great Lakes shipwrecks published by the University of Michigan&apos;s
            AI4Shipwrecks project. It located the wreck in <strong className="text-cream">2 of 9</strong> tiles (one labelled as a
            pipeline), missed the rest and raised false alarms on bright seabed. The synthetic-trained model does not yet transfer to
            real surveys; fine-tuning on labelled real data (AI4Shipwrecks, NIOT surveys) is our next step, and the pipeline is ready
            for it.
          </p>
          <a
            href="https://github.com/larpareek/deepscan-sih26057#real-sonar-check"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-biolum underline underline-offset-2"
          >
            See the tiles and detections
          </a>
        </div>
      </section>
    </>
  );
}

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

/** Client-side report for scans without a backend job (the demo survey). */
function downloadRow(row) {
  if (row.scan?.jobId) {
    window.location.href = reportUrl(row.scan.jobId, "csv");
    return;
  }
  if (row.scan) {
    const header = "id,class,status,confidence,latitude,longitude";
    const lines = row.scan.detections.map((d) => [d.id, d.cls, d.status.label, d.confidence, d.lat?.toFixed(7) ?? "", d.lon?.toFixed(7) ?? ""].join(","));
    download([header, ...lines].join("\n"), `seascan_report_${row.id.toLowerCase()}.csv`, "text/csv");
  }
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
  const [source, setSource] = useState(sessionScans.length ? "session" : "validation");
  const rows = useMemo(() => fromSession(sessionScans), [sessionScans]);
  const isValidation = source === "validation";

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
              ["validation", "Model validation", BadgeCheck],
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

        {isValidation ? (
          <ValidationView />
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

        {!isValidation && rows.length > 0 && (
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
                  {lineData.length < 2 ? "Per scan (UTC). Each scan you run adds a point to the trend." : "Per scan (UTC time)"}
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
                <p className="text-xs text-cream/55">All detections this session</p>
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
                      <th className="px-6 py-3 font-medium">Source</th>
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
                          <span className="block text-xs text-cream/50">{new Date(r.date).toUTCString().slice(5, 22)}</span>
                        </td>
                        <td className="max-w-[260px] truncate px-6 py-3 text-cream/75">{r.area}</td>
                        <td className="px-6 py-3 text-right font-mono">{r.total}</td>
                        <td className="px-6 py-3 text-right font-mono text-[#FF8389]">{r.critical}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => downloadRow(r)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium hover:border-biolum/60 hover:text-biolum"
                            aria-label={`Download ${r.id} report (CSV)`}
                          >
                            <Download size={14} aria-hidden="true" />
                            CSV
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
