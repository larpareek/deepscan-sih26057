// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Full-screen map of the current scan's detections, a slide-in list, and geographic
// questions to SEASCAN AI with every marker as context.
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import { ArrowUp, List, MapPinOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, ScaleControl, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { RichText, Thinking, useSeascanChat } from "../components/ChatPanel";
import { DEMO_TRACK, DEMO_TRACK_DONE } from "../data/dummy";
import { fmtLat, fmtLon } from "../lib/geo";
import { CHENNAI, haversineKm, useScan } from "../lib/scanContext";
import { StatusPill } from "./ChatPage";

// One glyph per class (shape = what it is); ring colour = hazard status
const GLYPHS = {
  shipwreck: '<path d="M4 13h16l-2.5 4h-11z M8 13V9h6v4 M11 9V6" />',
  ghost_net: '<path d="M5 7l14 10M5 12l10 7M9 5l10 7M5 17L17 5M9 19l10-10M5 9l6-4" />',
  pipe: '<rect x="3" y="10" width="18" height="4" rx="2" /><path d="M7 10v4M17 10v4" />',
  anomaly: '<path d="M12 4l7 8-7 8-7-8z" />',
};

const iconCache = new Map();
function pinIcon(d, active) {
  const key = `${d.cls}:${d.status.key}:${active}`;
  if (!iconCache.has(key)) {
    const glyph = GLYPHS[d.cls] ?? GLYPHS.anomaly;
    const size = active ? 44 : 36;
    iconCache.set(
      key,
      L.divIcon({
        className: "sea-pin-wrap",
        html: `<div class="sea-pin${active ? " is-active" : ""}" style="--c:${d.status.color};width:${size}px;height:${size}px">
          <svg viewBox="0 0 24 24" width="${size * 0.55}" height="${size * 0.55}" fill="none" stroke="#FEF3C7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph}</svg></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      }),
    );
  }
  return iconCache.get(key);
}

const chennaiIcon = L.divIcon({
  className: "sea-pin-wrap",
  html: '<div class="sea-ref"><i></i><span>Chennai</span></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitView({ points }) {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [60, 60], maxZoom: 18 });
  }, [map, points]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 18), { duration: 0.6 });
  }, [map, target]);
  return null;
}

const MAP_PROMPTS = ["What is the closest ghost net to Chennai?", "Which hazards are clustered together?", "Where should a dive team go first?"];

export default function MapPage() {
  const { scan } = useScan();
  const { messages, busy, send } = useSeascanChat();
  const [drawer, setDrawer] = useState(() => window.innerWidth >= 1024);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState(false);

  const markers = useMemo(() => (scan.georeferenced ? scan.detections.filter((d) => Number.isFinite(d.lat)) : []), [scan]);
  const sorted = useMemo(() => [...markers].sort((a, b) => b.status.rank - a.status.rank || b.confidence - a.confidence), [markers]);
  const selected = markers.find((d) => d.id === selectedId) ?? null;
  const track = scan.kind === "demo" ? DEMO_TRACK : [];
  const [showCoast, setShowCoast] = useState(false);
  const fitPoints = useMemo(
    () => [...markers.map((d) => [d.lat, d.lon]), ...(showCoast ? [[CHENNAI.lat, CHENNAI.lon]] : [])],
    [markers, showCoast],
  );
  const answer = asked ? [...messages].reverse().find((m) => m.role === "assistant") : null;

  const ask = (q) => {
    if (!q.trim()) return;
    setAsked(true);
    send(q, {
      view: "map",
      map_markers: markers.map((d) => ({ id: d.id, label: d.label, status: d.status.label, lat: +d.lat.toFixed(6), lon: +d.lon.toFixed(6), distance_to_chennai_km: +haversineKm(CHENNAI, d).toFixed(2) })),
    });
    setDraft("");
  };

  return (
    <div className="flex h-[100svh] flex-col bg-abyss pt-14 font-inter text-cream">
      <div className="seamap relative min-h-0 flex-1">
        {markers.length ? (
          <MapContainer center={[markers[0].lat, markers[0].lon]} zoom={17} zoomSnap={0.25} className="h-full w-full" zoomControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
              maxNativeZoom={18}
              maxZoom={20}
            />
            <ScaleControl position="bottomleft" imperial={false} />
            <FitView points={fitPoints} />
            <FlyTo target={selected} />
            {track.length > 1 && <Polyline positions={track} pathOptions={{ color: "#FEF3C7", weight: 1.5, opacity: 0.35, dashArray: "4 6" }} />}
            {track.length > 1 && <Polyline positions={DEMO_TRACK_DONE} pathOptions={{ color: "#22D3EE", weight: 2.5, opacity: 0.8 }} />}
            <Marker position={[CHENNAI.lat, CHENNAI.lon]} icon={chennaiIcon} interactive={false} keyboard={false} />
            {markers.map((d) => (
              <Marker
                key={d.id}
                position={[d.lat, d.lon]}
                icon={pinIcon(d, d.id === selectedId)}
                title={`${d.id} ${d.label}, ${d.status.label}`}
                eventHandlers={{ click: () => setSelectedId(d.id) }}
              >
                <Popup>
                  <strong>
                    {d.id} · {d.label}
                  </strong>
                  <br />
                  {d.status.label} · {d.confidence.toFixed(1)}%
                  <br />
                  {fmtLat(d.lat)} {fmtLon(d.lon)}
                  <br />
                  {haversineKm(CHENNAI, d).toFixed(1)} km from Chennai
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <MapPinOff className="mx-auto text-cream/40" size={40} aria-hidden="true" />
              <p className="mt-4 font-display text-2xl">This scan has no coordinates.</p>
              <p className="mt-2 max-w-md text-cream/60">
                {scan.detections.length
                  ? "It was imported without ping metadata, so objects can't be placed on a map."
                  : "No detections above the dashboard's confidence threshold."}
              </p>
              <Link to="/dashboard" className="mt-6 inline-block rounded-full border border-cream/30 px-5 py-2.5 font-medium hover:bg-white/10">
                Back to the dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Scan title card */}
        <div className="pointer-events-none absolute left-4 top-4 z-[500] max-w-[70%] rounded-xl border border-white/10 bg-abyss/85 px-4 py-3 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sunset">Survey map</p>
          <p className="font-display text-lg font-bold">{scan.name}</p>
          <p className="text-xs text-cream/60">{markers.length} geotagged objects</p>
        </div>

        {markers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCoast((v) => !v)}
            aria-pressed={showCoast}
            className="absolute bottom-10 left-4 z-[500] h-10 rounded-full border border-white/15 bg-abyss/90 px-4 text-sm font-medium backdrop-blur hover:bg-abyss"
          >
            {showCoast ? "Zoom to detections" : "Show Chennai coast"}
          </button>
        )}
        {markers.length > 0 && (
          <button
            type="button"
            onClick={() => setDrawer((o) => !o)}
            aria-expanded={drawer}
            aria-controls="map-drawer"
            className="absolute right-4 top-4 z-[600] flex h-11 items-center gap-2 rounded-full border border-white/15 bg-abyss/90 px-4 text-sm font-medium backdrop-blur hover:bg-abyss"
          >
            {drawer ? <X size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
            {drawer ? "Hide list" : `Detections (${markers.length})`}
          </button>
        )}

        <AnimatePresence>
          {drawer && markers.length > 0 && (
            <motion.aside
              id="map-drawer"
              aria-label="Detections"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="absolute bottom-0 right-0 top-0 z-[550] flex w-[min(340px,88vw)] flex-col border-l border-white/10 bg-abyss/95 pt-[4.5rem] backdrop-blur-md"
            >
              <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto">
                {sorted.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      aria-pressed={d.id === selectedId}
                      className={`w-full px-5 py-3 text-left transition-colors hover:bg-white/[0.04] ${d.id === selectedId ? "bg-biolum/10 shadow-[inset_3px_0_0_#22D3EE]" : ""}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          <span className="mr-2 font-mono text-xs text-cream/50">{d.id}</span>
                          {d.label}
                        </span>
                        <StatusPill status={d.status} />
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full" style={{ width: `${d.confidence}%`, background: d.status.color }} />
                        </span>
                        <span className="w-12 text-right font-mono text-xs text-cream/70">{d.confidence.toFixed(1)}%</span>
                      </span>
                      <span className="mt-1 block font-mono text-[11px] text-cream/50">
                        {fmtLat(d.lat)} {fmtLon(d.lon)} · {haversineKm(CHENNAI, d).toFixed(1)} km to Chennai
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Ask about this map */}
      <section className="border-t border-white/10 bg-abyss-2 px-4 py-3 sm:px-6" aria-label="Ask about this map">
        {asked && (busy || answer) && (
          <div className="mx-auto mb-3 max-h-[28vh] max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-abyss-3 px-4 py-3 text-[15px] leading-relaxed text-cream/90" aria-live="polite">
            {busy ? <Thinking /> : <RichText text={answer.text} />}
          </div>
        )}
        <form
          className="mx-auto flex max-w-4xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <label htmlFor="map-ask" className="sr-only">
            Ask about this map
          </label>
          <input
            id="map-ask"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Ask about this map, e.g. What is the closest ghost net to Chennai?"
            className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-abyss-3 px-5 text-[15px] text-cream placeholder:text-cream/40 focus:border-biolum/60 focus:outline-none"
          />
          <button type="submit" disabled={!draft.trim() || busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-biolum text-abyss disabled:opacity-30" aria-label="Ask">
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </form>
        {!asked && markers.length > 0 && (
          <div className="mx-auto mt-2 flex max-w-4xl flex-wrap gap-2">
            {MAP_PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => ask(p)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-cream/75 hover:border-biolum/50 hover:text-cream">
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
