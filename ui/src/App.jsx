import { MotionConfig } from "framer-motion";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ControlsPanel from "./components/ControlsPanel";
import HazardsPanel from "./components/HazardsPanel";
import Header from "./components/Header";
import MapBar from "./components/MapBar";
import SonarCanvas from "./components/SonarCanvas";
import { Drawer, TooltipProvider } from "./components/ui";
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
import { checkHealth, reportUrl, runDetection, uploadScan } from "./lib/api";
import { buildSonarLayers, renderSonar } from "./lib/sonarSynth";
import { enableAudio, playPing } from "./lib/sound";

const stamp = () => new Date().toISOString().slice(11, 19);
const MIN_LOADER_MS = 1500;
const SOUND_KEY = "deepscan.sound";

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

export default function App() {
  // "empty" (awaiting data) -> "demo" (synthetic survey) or "live" (uploaded scan + backend)
  const [mode, setMode] = useState("empty");
  const [backendOnline, setBackendOnline] = useState(false);
  const [files, setFiles] = useState({ image: null, metadata: null });
  const [threshold, setThreshold] = useState(50);
  const [strength, setStrength] = useState(60);
  const [hoverId, setHoverId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState(() => [{ t: stamp(), lvl: "ok", msg: "Console ready, awaiting acoustic data" }]);
  // Hover "ping" sound: muted by default; the toggle click satisfies the browser's gesture rule.
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
  // A remembered "on" can't start audio before a gesture; arm it on the first interaction.
  useEffect(() => {
    if (!readSoundPref()) return;
    setSoundOn(true);
    const arm = () => enableAudio();
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  // Canvas is the focus: side panels and map start closed.
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const leftToggleRef = useRef(null);
  const rightToggleRef = useRef(null);
  const closeLeft = useCallback(() => setLeftOpen(false), []);
  const closeRight = useCallback(() => setRightOpen(false), []);

  // Live-mode state
  const [live, setLive] = useState({ src: null, size: null, detections: [], track: [], jobId: null });

  const addLog = useCallback((lvl, msg) => setLog((l) => [...l.slice(-40), { t: stamp(), lvl, msg }]), []);

  useEffect(() => {
    const ctl = new AbortController();
    const poll = async () => setBackendOnline(await checkHealth(ctl.signal));
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      ctl.abort();
      clearInterval(id);
    };
  }, []);

  // Demo sonar image: build clean + speckle layers once (only when the demo is first
  // opened), then remix them cheaply when the slider moves.
  const layersRef = useRef(null);
  const deferredStrength = useDeferredValue(strength);
  const demoSrc = useMemo(() => {
    if (mode !== "demo") return null;
    layersRef.current ??= buildSonarLayers(IMAGE_W, IMAGE_H, DEMO_TARGETS);
    return renderSonar(layersRef.current, deferredStrength);
  }, [mode, deferredStrength]);

  // When files are dropped, preview the image and read the track from metadata.
  useEffect(() => {
    if (!files.image) return;
    const url = URL.createObjectURL(files.image);
    const img = new Image();
    img.onload = () => {
      setLive((s) => ({ ...s, src: url, size: { w: img.naturalWidth, h: img.naturalHeight }, detections: [], jobId: null }));
      setMode("live");
      addLog("info", `Loaded ${files.image.name} (${img.naturalWidth}×${img.naturalHeight})`);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [files.image, addLog]);

  useEffect(() => {
    if (!files.metadata) return;
    files.metadata.text().then((txt) => {
      try {
        const meta = JSON.parse(txt);
        const pts = meta.ping_coords ?? [];
        const step = Math.max(1, Math.floor(pts.length / 500));
        setLive((s) => ({ ...s, track: pts.filter((_, i) => i % step === 0) }));
        addLog("info", `Metadata: ${pts.length} pings, ${meta.swath_width_m ?? "?"} m swath`);
      } catch {
        setError("Metadata file is not valid JSON");
      }
    });
  }, [files.metadata, addLog]);

  const onRun = async () => {
    setBusy(true);
    setError(null);
    // The backend can answer in ~60 ms; keep the radar up long enough to read as a
    // deliberate state rather than a flicker.
    const minDisplay = new Promise((r) => setTimeout(r, MIN_LOADER_MS));
    try {
      addLog("info", "Uplinking scan to backend…");
      const { job_id } = await uploadScan(files.image, files.metadata);
      addLog("ok", `Job ${job_id.slice(0, 8)} accepted`);
      const [res] = await Promise.all([runDetection(job_id, strength), minDisplay]);
      setLive((s) => ({ ...s, detections: res.detections, jobId: job_id }));
      addLog("info", `Inference ${res.timing_ms.inference} ms, total ${Object.values(res.timing_ms).reduce((a, b) => a + b, 0).toFixed(0)} ms`);
      addLog(res.count ? "alert" : "ok", `${res.count} objects geotagged`);
      if (res.count) setRightOpen(true);
    } catch (e) {
      setError(e.message);
      addLog("warn", `Detection failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onLoadDemo = () => {
    setMode("demo");
    setFiles({ image: null, metadata: null });
    setSelectedId(null);
    setError(null);
    setLog((l) => [...l, ...DEMO_LOG]);
  };

  const onDropFiles = (list) => setFiles((cur) => sortFiles(list, cur));

  const isDemo = mode === "demo";
  const isLive = mode === "live";
  const allDetections = isDemo ? DEMO_DETECTIONS : isLive ? live.detections : [];
  const detections = useMemo(
    () => allDetections.filter((d) => d.confidence > threshold).sort((a, b) => b.confidence - a.confidence),
    [allDetections, threshold]
  );
  const activeId = hoverId ?? selectedId;
  const selected = detections.find((d) => d.id === selectedId) ?? null;

  const doneTrack = isDemo ? DEMO_TRACK_DONE : isLive ? live.track : [];
  const auvPos = isDemo ? DEMO_AUV_POS : isLive ? live.track[live.track.length - 1] ?? null : null;

  const onDownload = (format) => {
    if (isDemo) {
      const r = buildDemoReport(detections);
      downloadBlob(r[format], `sss_report_demo.${format}`, format === "json" ? "application/json" : "text/csv");
    } else if (live.jobId) {
      window.location.href = reportUrl(live.jobId, format);
    }
  };

  const select = (id) => setSelectedId((cur) => (cur === id ? null : id));

  const viewOnMap = (id) => {
    setSelectedId(id);
    setMapOpen(true);
    // On phones the hazards drawer covers the page; close it so the map is visible.
    if (!window.matchMedia("(min-width: 1024px)").matches) setRightOpen(false);
    setTimeout(() => document.getElementById("mission-map-body")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 320);
  };

  return (
    <MotionConfig reducedMotion="user">
    <TooltipProvider>
      {/* Slow aurora drift + faint sonar grid behind everything (static under reduced motion) */}
      <div className="app-bg" aria-hidden="true">
        <div className="aurora" />
        <div className="grid-lines" />
        <div className="noise" />
      </div>
      <div className="flex min-h-screen flex-col gap-8 p-6 lg:h-screen lg:p-8">
        <Header
          mode={mode}
          backendOnline={backendOnline}
          hazardCount={detections.length}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onToggleLeft={() => setLeftOpen((o) => !o)}
          onToggleRight={() => setRightOpen((o) => !o)}
          leftToggleRef={leftToggleRef}
          rightToggleRef={rightToggleRef}
          onDownload={onDownload}
          reportReady={isDemo || Boolean(live.jobId)}
          onLoadDemo={onLoadDemo}
          log={log}
          soundOn={soundOn}
          onToggleSound={onToggleSound}
        />

        {/* Announces detection results to screen readers */}
        <p className="sr-only" role="status" aria-live="polite">
          {busy ? "Analysing scan…" : `${detections.length} hazards above ${threshold}% confidence.`}
        </p>

        <main className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          <Drawer id="controls-drawer" side="left" open={leftOpen} onClose={closeLeft} label="Scan controls" returnFocusTo={leftToggleRef}>
            <ControlsPanel
              files={files}
              onFiles={setFiles}
              threshold={threshold}
              onThreshold={setThreshold}
              strength={strength}
              onStrength={setStrength}
              onRun={onRun}
              busy={busy}
              canRun={backendOnline && files.image && files.metadata}
              error={error}
              onClose={closeLeft}
            />
          </Drawer>

          <div
            className={`min-w-0 flex-none lg:h-auto lg:min-h-0 lg:flex-1 ${
              // Phones: size to the image; the empty state needs room for its message and buttons
              mode === "empty" ? "h-[min(640px,85vh)] min-h-[520px]" : "h-[calc((100vw-96px)/1.6+120px)] min-h-[300px]"
            }`}
          >
            <SonarCanvas
              src={isDemo ? demoSrc : isLive ? live.src : null}
              sceneKey={isDemo ? "demo" : isLive ? `live-${live.src}` : "empty"}
              soundOn={soundOn}
              onUpload={() => setLeftOpen(true)}
              onLoadDemo={onLoadDemo}
              onFiles={onDropFiles}
              imageSize={isDemo ? { w: IMAGE_W, h: IMAGE_H } : live.size ?? { w: IMAGE_W, h: IMAGE_H }}
              detections={detections}
              activeId={activeId}
              onHover={setHoverId}
              onSelect={select}
              busy={busy}
            />
          </div>

          <Drawer id="hazards-drawer" side="right" open={rightOpen} onClose={closeRight} label="Detected hazards" returnFocusTo={rightToggleRef}>
            <HazardsPanel
              // Remount on open so the rings, count-ups and staggered entrance play when visible
              key={rightOpen ? "open" : "closed"}
              detections={detections}
              hiddenCount={allDetections.length - detections.length}
              activeId={activeId}
              selectedId={selectedId}
              onHover={setHoverId}
              onToggle={select}
              onViewOnMap={viewOnMap}
              onClose={closeRight}
            />
          </Drawer>
        </main>

        <MapBar
          open={mapOpen}
          onToggle={() => setMapOpen((o) => !o)}
          plannedTrack={isDemo ? DEMO_TRACK : []}
          doneTrack={doneTrack}
          auvPos={auvPos}
          detections={detections}
          activeId={activeId}
          selected={selected}
          onHover={setHoverId}
          onSelect={select}
        />
      </div>
    </TooltipProvider>
    </MotionConfig>
  );
}
