// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ConsolePanel from "./components/ConsolePanel";
import DetectionsTable from "./components/DetectionsTable";
import ObjectDetail from "./components/ObjectDetail";
import SonarDisplay from "./components/SonarDisplay";
import SpatialPanel from "./components/SpatialPanel";
import TopBar from "./components/TopBar";
import { TooltipProvider } from "./components/ui";
import {
  DEMO_AUV_POS,
  DEMO_DETECTIONS,
  DEMO_LOG,
  DEMO_META,
  DEMO_TARGETS,
  DEMO_TRACK,
  DEMO_TRACK_DONE,
  IMAGE_H,
  IMAGE_W,
} from "./data/dummy";
import { checkHealth, despeckleMethod, reportUrl, runDetection, uploadScan } from "./lib/api";
import { classStyle } from "./lib/classes";
import { makeScanGeometry } from "./lib/geo";
import { hazardStatus } from "./lib/hazard";
import { buildSonarLayers, renderSonar } from "./lib/sonarSynth";
import { enableAudio, playPing } from "./lib/sound";

const stamp = () => new Date().toISOString().slice(11, 19);
const utc = (d = new Date()) => `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
// The backend can answer in ~60 ms; keep the processing state visible long enough to read.
const MIN_PROCESSING_MS = 1200;
const SOUND_KEY = "seascan.sound";
// Despeckle method -> strength used to render the synthetic demo waterfall
const DEMO_STRENGTH = { median: 30, lee: 60, nlm: 90 };

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

/** Sort dropped/picked files into the image and metadata slots. */
function sortFiles(list, current) {
  const next = { ...current };
  for (const f of list) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".json")) next.metadata = f;
    else if (/\.(png|jpe?g)$/.test(name)) next.image = f;
  }
  return next;
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** Same shape as GeotaggingEngine.generate_report in the backend. */
function buildDemoReport(detections) {
  const mid = DEMO_TRACK_DONE[DEMO_TRACK_DONE.length - 2];
  const report = {
    timestamp: DEMO_META.timestamp,
    location: { latitude: +mid[0].toFixed(7), longitude: +mid[1].toFixed(7) },
    detections: detections.map((d) => ({
      class: d.cls,
      confidence: +(d.confidence / 100).toFixed(4),
      location: { latitude: +d.lat.toFixed(7), longitude: +d.lon.toFixed(7) },
      dimensions_meters: d.dims,
      bbox_px: { x: d.bbox.x, y: d.bbox.y, width: d.bbox.w, height: d.bbox.h },
    })),
  };
  const header = "timestamp,class,confidence,latitude,longitude,length_m,width_m,bbox_x,bbox_y,bbox_w,bbox_h";
  const rows = report.detections.map((d) =>
    [report.timestamp, d.class, d.confidence, d.location.latitude, d.location.longitude,
      d.dimensions_meters.length, d.dimensions_meters.width, d.bbox_px.x, d.bbox_px.y, d.bbox_px.width, d.bbox_px.height].join(",")
  );
  return { json: JSON.stringify(report, null, 2), csv: [header, ...rows].join("\n") };
}

const EMPTY_LIVE = { src: null, size: null, fileName: null, detections: [], track: [], pingCoords: null, meta: null, jobId: null, detectedAt: null };

export default function App() {
  // "empty" (no data) -> "demo" (synthetic survey) or "live" (imported scan + backend)
  const [mode, setMode] = useState("empty");
  const [backend, setBackend] = useState({ online: false, pending: true });
  const [files, setFiles] = useState({ image: null, metadata: null });
  const [threshold, setThreshold] = useState(50);
  const [method, setMethod] = useState("lee");
  const [palette, setPalette] = useState("gray"); // demo waterfall display palette
  const [classFilter, setClassFilter] = useState(() => new Set());
  const [includeShadow, setIncludeShadow] = useState(true);
  const [hoverId, setHoverId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [phase, setPhase] = useState(null); // null | "upload" | "detect"
  const [timings, setTimings] = useState(null);
  const [error, setError] = useState(null);
  const [log, setLog] = useState(() => [{ t: stamp(), lvl: "ok", msg: "Console ready" }]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [live, setLive] = useState(EMPTY_LIVE);
  const busy = phase !== null;

  const addLog = useCallback((lvl, msg) => setLog((l) => [...l.slice(-60), { t: stamp(), lvl, msg }]), []);
  const touch = () => setLastUpdate(stamp());

  // ---- Audible contact ping (off by default; the toggle click satisfies the gesture rule)
  const [soundOn, setSoundOn] = useState(false);
  const onToggleSound = () => {
    const next = !soundOn;
    if (next && enableAudio()) setTimeout(playPing, 60);
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* storage unavailable: preference just won't persist */
    }
  };
  useEffect(() => {
    if (!readSoundPref()) return;
    setSoundOn(true);
    const arm = () => enableAudio();
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);

  // ---- Processing API health
  useEffect(() => {
    const ctl = new AbortController();
    const poll = async () => setBackend(await checkHealth(ctl.signal));
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      ctl.abort();
      clearInterval(id);
    };
  }, []);

  // ---- File import (hidden input shared by the console and the empty display)
  const fileInputRef = useRef(null);
  const openPicker = () => fileInputRef.current?.click();
  const onFiles = (list) => setFiles((cur) => sortFiles(list, cur));

  useEffect(() => {
    if (!files.image) return;
    // Object URLs are kept (not revoked) so scan history can restore earlier images.
    const url = URL.createObjectURL(files.image);
    const img = new Image();
    img.onload = () => {
      setLive((s) => ({ ...s, src: url, size: { w: img.naturalWidth, h: img.naturalHeight }, fileName: files.image.name, detections: [], jobId: null, detectedAt: null }));
      setMode("live");
      setSelectedId(null);
      setTimings(null);
      setCurrentScanId(null);
      touch();
      addLog("info", `Loaded ${files.image.name} (${img.naturalWidth}×${img.naturalHeight})`);
    };
    img.src = url;
  }, [files.image, addLog]);

  useEffect(() => {
    if (!files.metadata) return;
    files.metadata.text().then((txt) => {
      try {
        const meta = JSON.parse(txt);
        const pts = meta.ping_coords ?? [];
        const step = Math.max(1, Math.floor(pts.length / 500));
        setLive((s) => ({
          ...s,
          pingCoords: pts,
          track: pts.filter((_, i) => i % step === 0),
          meta: { swath: meta.swath_width_m ?? 100, altitude: meta.altitude_m ?? 10, timestamp: meta.timestamp ?? null },
        }));
        addLog("info", `Metadata: ${pts.length} pings, ${meta.swath_width_m ?? "?"} m swath`);
      } catch {
        setError("Metadata file is not valid JSON");
      }
    });
  }, [files.metadata, addLog]);

  // Client-side import validation (the backend enforces the same rule)
  const fileChecks = useMemo(() => {
    const img = files.image && live.size ? { ok: true, text: `${live.size.w}×${live.size.h}` } : files.image ? { text: "reading" } : null;
    let md = null;
    if (files.metadata) {
      const n = live.pingCoords?.length;
      if (n == null) md = { text: "reading" };
      else if (live.size && n !== live.size.h) md = { warn: true, text: `${n} ≠ ${live.size.h} rows` };
      else md = { ok: true, text: `${n} pings` };
    }
    return { image: img, metadata: md };
  }, [files, live.size, live.pingCoords]);

  // ---- Demo waterfall: build clean + speckle layers once, remix per despeckle method
  const layersRef = useRef(null);
  const demoStrength = useDeferredValue(DEMO_STRENGTH[method]);
  const demoSrc = useMemo(() => {
    if (mode !== "demo") return null;
    layersRef.current ??= buildSonarLayers(IMAGE_W, IMAGE_H, DEMO_TARGETS);
    return renderSonar(layersRef.current, demoStrength, palette);
  }, [mode, demoStrength, palette]);

  // ---- Scan geometry (axes, range, along-track, cursor coordinates)
  const isDemo = mode === "demo";
  const isLive = mode === "live";
  const geo = useMemo(() => {
    if (isDemo) {
      return {
        ...makeScanGeometry({
          widthPx: IMAGE_W, heightPx: IMAGE_H, swathM: DEMO_META.swath_width_m, altitudeM: DEMO_META.altitude_m,
          start: DEMO_META.start, headingDeg: DEMO_META.heading_deg, pingSpacingM: DEMO_META.ping_spacing_m,
        }),
        georeferenced: true,
      };
    }
    if (isLive && live.size) {
      const ok = Boolean(live.pingCoords && live.pingCoords.length === live.size.h);
      return {
        ...makeScanGeometry({
          widthPx: live.size.w, heightPx: live.size.h,
          swathM: live.meta?.swath ?? 100, altitudeM: live.meta?.altitude ?? 10,
          pingCoords: ok ? live.pingCoords : null,
          // No usable metadata yet: nominal 0.2 m ping spacing so the axes still read in metres
          start: ok ? undefined : [0, 0], pingSpacingM: 0.2,
        }),
        georeferenced: ok,
      };
    }
    return null;
  }, [isDemo, isLive, live.size, live.pingCoords, live.meta]);

  // ---- Detections: enrich with status + position along/across track, then filter
  const allDetections = useMemo(() => {
    const raw = isDemo ? DEMO_DETECTIONS : isLive ? live.detections : [];
    if (!geo) return [];
    return raw.map((d) => ({
      ...d,
      label: classStyle(d.cls).label,
      status: hazardStatus(d),
      rangeM: geo.acrossM(d.bbox.x + d.bbox.w / 2),
      alongM: geo.alongM(d.bbox.y + d.bbox.h / 2),
    }));
  }, [isDemo, isLive, live.detections, geo]);

  const classCounts = useMemo(() => {
    const c = {};
    for (const d of allDetections) c[d.cls] = (c[d.cls] ?? 0) + 1;
    return c;
  }, [allDetections]);

  const detections = useMemo(
    () =>
      allDetections.filter((d) => d.confidence > threshold && !classFilter.has(d.cls) && (includeShadow || !d.shadowPenalized)),
    [allDetections, threshold, classFilter, includeShadow],
  );
  const activeId = hoverId ?? selectedId;
  const selected = detections.find((d) => d.id === selectedId) ?? null;

  const toggleClass = (cls) =>
    setClassFilter((s) => {
      const n = new Set(s);
      n.has(cls) ? n.delete(cls) : n.add(cls);
      return n;
    });
  const select = (id) => setSelectedId((cur) => (cur === id ? null : id));

  // ---- Scan history (this session)
  const pushHistory = (entry) => {
    setHistory((h) => [...h.slice(-19), entry]);
    setCurrentScanId(entry.id);
  };
  const onRestore = (id) => {
    const h = history.find((x) => x.id === id);
    if (!h) return;
    setSelectedId(null);
    setCurrentScanId(id);
    if (h.kind === "demo") setMode("demo");
    else {
      setLive(h.snapshot);
      setTimings(h.timings);
      setMode("live");
    }
    touch();
    addLog("info", `Restored ${h.name}`);
  };

  const onLoadDemo = () => {
    setMode("demo");
    setFiles({ image: null, metadata: null });
    setSelectedId(null);
    setError(null);
    setTimings(null);
    setLog((l) => [...l, ...DEMO_LOG]);
    touch();
    pushHistory({ id: `demo-${Date.now()}`, kind: "demo", time: stamp(), name: "DEMO-L03", count: DEMO_DETECTIONS.length });
  };

  // ---- Processing pipeline: POST /upload -> POST /detect
  const onRun = async () => {
    setPhase("upload");
    setError(null);
    const minDisplay = new Promise((r) => setTimeout(r, MIN_PROCESSING_MS));
    try {
      addLog("info", "Uploading scan to processing API");
      const t0 = performance.now();
      const { job_id } = await uploadScan(files.image, files.metadata);
      const uploadMs = performance.now() - t0;
      addLog("ok", `Job ${job_id.slice(0, 8)} accepted`);
      setPhase("detect");
      const [res] = await Promise.all([runDetection(job_id, DEMO_STRENGTH[method]), minDisplay]);
      const detectedAt = utc();
      const nextLive = { ...live, detections: res.detections, jobId: job_id, detectedAt };
      setLive(nextLive);
      const t = { upload: uploadMs, ...res.timing_ms };
      setTimings(t);
      touch();
      addLog("info", `Processed in ${Math.round(Object.values(res.timing_ms).reduce((a, b) => a + b, 0))} ms (${despeckleMethod(DEMO_STRENGTH[method]).toUpperCase()})`);
      addLog(res.count ? "alert" : "ok", `${res.count} objects classified and geotagged`);
      pushHistory({ id: job_id, kind: "live", time: stamp(), name: `JOB-${job_id.slice(0, 6).toUpperCase()}`, count: res.count, snapshot: nextLive, timings: t });
    } catch (e) {
      setError(e.message);
      addLog("warn", `Processing failed: ${e.message}`);
    } finally {
      setPhase(null);
    }
  };

  const onDownload = (format) => {
    if (isDemo) {
      const r = buildDemoReport(detections);
      downloadBlob(r[format], `seascan_report_demo.${format}`, format === "json" ? "application/json" : "text/csv");
    } else if (live.jobId) {
      window.location.href = reportUrl(live.jobId, format);
    }
  };

  // ---- Derived presentation
  const scanId = isDemo ? "DEMO-L03" : isLive ? (live.jobId ? `JOB-${live.jobId.slice(0, 6).toUpperCase()}` : `${live.fileName ?? "scan"} · unprocessed`) : null;
  const scan = isDemo
    ? { id: scanId, source: "Demo survey · leg 3/5 (synthetic)", width: IMAGE_W, height: IMAGE_H, altitude: DEMO_META.altitude_m }
    : isLive && live.size
      ? { id: scanId, source: live.fileName, width: live.size.w, height: live.size.h, altitude: live.meta?.altitude ?? "—" }
      : null;
  const detectedAt = isDemo ? DEMO_META.timestamp.replace("T", " ").replace("Z", " UTC") : live.detectedAt ?? "—";
  const canRun = backend.online && files.image && files.metadata && fileChecks.metadata?.ok;
  const runReason = !backend.online
    ? "Processing API offline. The demo survey is available."
    : !files.image || !files.metadata
      ? "Import a waterfall image and its metadata."
      : fileChecks.metadata?.warn
        ? "Metadata ping count must match the image height."
        : "";
  const busyStage = phase === "upload" ? "UPLOADING SCAN" : "PREPROCESS → YOLOv8n → GEOTAG";

  return (
    <TooltipProvider>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex min-h-screen flex-col xl:h-screen">
        <TopBar
          scanId={scanId}
          mode={mode}
          backendOnline={backend.online}
          backendPending={backend.pending}
          busy={busy}
          lastUpdate={lastUpdate}
          onDownload={onDownload}
          reportReady={isDemo || Boolean(live.jobId)}
          soundOn={soundOn}
          onToggleSound={onToggleSound}
        />

        {/* Announces processing results to screen readers */}
        <p className="sr-only" role="status" aria-live="polite">
          {busy ? "Processing scan…" : scan ? `${detections.length} objects shown above ${threshold}% confidence.` : ""}
        </p>

        <main className="grid flex-1 grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)] xl:min-h-0 xl:grid-cols-[288px_minmax(0,1fr)_340px]">
          <div className="order-last border-t border-line lg:order-none lg:row-span-2 lg:border-r lg:border-t-0 xl:row-span-1 xl:min-h-0 xl:overflow-y-auto">
            <ConsolePanel
              scanProps={{
                scan, files, fileChecks, onImport: openPicker, onFiles, onRun, canRun, runReason, busy, error,
                onLoadDemo, history, currentScanId, onRestore,
              }}
              detectionProps={{
                threshold, onThreshold: setThreshold, method, onMethod: setMethod,
                classCounts, classFilter, onToggleClass: toggleClass, includeShadow, onIncludeShadow: setIncludeShadow,
              }}
              systemProps={{ backend, mode, phase, timings, log }}
            />
          </div>

          <div className="flex min-w-0 flex-col xl:min-h-0">
            <div className="h-[min(80vh,calc(100vw*0.68+80px))] min-h-[340px] border-b border-line lg:h-[min(76vh,calc((100vw-288px)*0.68+80px))] xl:h-auto xl:min-h-0 xl:flex-1">
              <SonarDisplay
                src={isDemo ? demoSrc : isLive ? live.src : null}
                sceneKey={isDemo ? "demo" : `${live.src}-${live.jobId}`}
                geo={geo}
                detections={detections}
                activeId={activeId}
                onHover={setHoverId}
                onSelect={select}
                busy={busy}
                busyStage={busyStage}
                soundOn={soundOn}
                onImport={openPicker}
                onLoadDemo={onLoadDemo}
                onFiles={onFiles}
                showColorbar={isDemo}
                palette={palette}
                onPalette={setPalette}
              />
            </div>
            <div className="h-[280px] shrink-0 border-b border-line xl:h-[236px] xl:border-b-0">
              <DetectionsTable
                detections={detections}
                hiddenCount={allDetections.length - detections.length}
                activeId={activeId}
                selectedId={selectedId}
                onHover={setHoverId}
                onSelect={select}
                hasScan={Boolean(scan)}
                busy={busy}
              />
            </div>
          </div>

          <div className="flex flex-col border-line bg-surface lg:col-start-2 xl:col-start-auto xl:min-h-0 xl:border-l">
            <ObjectDetail d={selected} detectedAt={detectedAt} threshold={threshold} />
            <div className="flex min-h-[320px] flex-1 flex-col border-t border-line">
              <SpatialPanel
                plannedTrack={isDemo ? DEMO_TRACK : []}
                doneTrack={isDemo ? DEMO_TRACK_DONE : isLive ? live.track : []}
                auvPos={isDemo ? DEMO_AUV_POS : isLive ? live.track[live.track.length - 1] ?? null : null}
                detections={detections}
                activeId={activeId}
                selected={selected}
                onHover={setHoverId}
                onSelect={select}
                hasScan={Boolean(scan)}
                busy={busy}
              />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
