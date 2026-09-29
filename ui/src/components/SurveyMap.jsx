// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, ScaleControl, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { fmtLat, fmtLon } from "../lib/geo";

const auvIcon = L.divIcon({ className: "auv-marker", html: "<i></i>", iconSize: [20, 20], iconAnchor: [10, 10] });

const iconCache = new Map();
function objectIcon(d, active) {
  const key = `${d.id}:${d.status.key}:${active}`;
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: "map-icon", // replaces Leaflet's default white box
        html: `<div class="map-marker${active ? " is-active" : ""}" style="--status:${d.status.color};width:24px;height:24px"><i></i><b>${d.id}</b></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10],
      }),
    );
  }
  return iconCache.get(key);
}

// Leaflet caches its container size: re-measure on layout changes. Frame the selected
// object if there is one, otherwise the whole track; fly to a new selection.
function Viewport({ track, target }) {
  const map = useMap();
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const frame = () => {
      map.invalidateSize();
      const t = targetRef.current;
      if (t) map.setView([t.lat, t.lon], Math.max(map.getZoom(), 18), { animate: false });
      else if (track.length > 1) map.fitBounds(track, { padding: [20, 20] });
    };
    frame();
    const ro = new ResizeObserver(frame);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, track]);

  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 18), { duration: 0.6 });
  }, [map, target]);
  return null;
}

function CursorReadout({ onCursor }) {
  useMapEvents({
    mousemove: (e) => onCursor([e.latlng.lat, e.latlng.lng]),
    mouseout: () => onCursor(null),
  });
  return null;
}

export default function SurveyMap({ plannedTrack, doneTrack, auvPos, detections, activeId, selected, onHover, onSelect, onCursor }) {
  const center = useMemo(() => doneTrack[doneTrack.length - 1] ?? [0, 0], [doneTrack]);

  return (
    <div className="absolute inset-0">
      <MapContainer center={center} zoom={17} className="h-full w-full" zoomControl attributionControl>
        {/* OSM tiles need no API key; index.css tones them into a muted dark basemap. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={19}
          maxZoom={20}
        />
        <ScaleControl position="bottomleft" imperial={false} />
        <Viewport track={plannedTrack.length ? plannedTrack : doneTrack} target={selected} />
        <CursorReadout onCursor={onCursor} />

        {plannedTrack.length > 1 && (
          <Polyline positions={plannedTrack} pathOptions={{ color: "#8DA2AD", weight: 1, opacity: 0.6, dashArray: "3 5" }} />
        )}
        <Polyline positions={doneTrack} pathOptions={{ color: "#38B6C9", weight: 2, opacity: 0.9 }} />

        {detections.map((d) => (
          // Keyboard-focusable (Leaflet sets role=button + tabindex); Enter opens the popup
          <Marker
            key={d.id}
            position={[d.lat, d.lon]}
            icon={objectIcon(d, d.id === activeId)}
            title={`${d.id} ${d.label}, ${d.status.label.toLowerCase()}`}
            eventHandlers={{
              mouseover: () => onHover(d.id),
              mouseout: () => onHover(null),
              click: () => onSelect(d.id),
            }}
          >
            <Popup>
              <div className="font-mono text-[11px] leading-5">
                <div className="text-ink">
                  {d.id} · {d.label.toUpperCase()}
                </div>
                <div className="text-ink-2">
                  {d.confidence.toFixed(1)}% · {d.dims.length}×{d.dims.width} m
                </div>
                <div className="text-ink-2">
                  {fmtLat(d.lat)} {fmtLon(d.lon)}
                </div>
                <div className={d.status.text}>{d.status.label}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {auvPos && <Marker position={auvPos} icon={auvIcon} interactive={false} keyboard={false} alt="" />}
      </MapContainer>

      {/* North indicator (map is always north-up) */}
      <div
        aria-label="North up"
        role="img"
        className="pointer-events-none absolute right-2 top-2 z-[500] grid h-8 w-8 place-items-center rounded border border-line-strong bg-bg/85 font-mono text-[10px] text-ink"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path d="M8 1 12 14 8 11 4 14Z" fill="#E6EEF2" />
        </svg>
        N
      </div>
    </div>
  );
}
