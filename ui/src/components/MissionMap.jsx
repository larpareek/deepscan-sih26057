// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { classStyle, confidenceLevel } from "../lib/classes";
import { ConfidenceLabel } from "./ui";

const auvIcon = L.divIcon({
  className: "auv-marker",
  html: '<span class="ring"></span><span class="core"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Custom SVG glyphs for geotagged hazards (24x24, stroked in the class colour)
const GLYPHS = {
  ghost_net: '<path d="M12 3 21 12 12 21 3 12Z"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9M12 3v18M3 12h18" stroke-opacity=".7"/>',
  shipwreck: '<path d="M3 13h18l-3 5H6l-3-5Z"/><path d="M8 13V8h5l2 5M11 8V5"/>',
  pipe: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M8 9v6M16 9v6"/>',
  ping: '<circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
};

const iconCache = new Map();
function hazardIcon(cls, active) {
  const key = `${cls}:${active}`;
  if (!iconCache.has(key)) {
    const s = classStyle(cls);
    iconCache.set(
      key,
      L.divIcon({
        className: "hz-icon", // replaces Leaflet's default white box
        html: `<div class="hz-marker${active ? " is-active" : ""}" style="--marker-color:${s.hex};width:44px;height:44px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[cls] ?? GLYPHS.ping}</svg></div>`,
        iconSize: [44, 44], // 44px touch target
        iconAnchor: [22, 22],
        popupAnchor: [0, -18],
      }),
    );
  }
  return iconCache.get(key);
}

// Leaflet caches its container size, so re-measure whenever the layout resizes (the map
// mounts inside a sliding panel). While resizing, frame the selected hazard if there is
// one, otherwise the whole track; when the selection changes, fly to it.
function Viewport({ track, target }) {
  const map = useMap();
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const frame = () => {
      map.invalidateSize();
      const t = targetRef.current;
      if (t) map.setView([t.lat, t.lon], Math.max(map.getZoom(), 18), { animate: false });
      else if (track.length > 1) map.fitBounds(track, { padding: [24, 24] });
    };
    frame();
    const ro = new ResizeObserver(frame);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, track]);

  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 18), { duration: 0.8 });
  }, [map, target]);
  return null;
}

export default function MissionMap({ plannedTrack, doneTrack, auvPos, detections, activeId, selected, onHover, onSelect }) {
  const center = useMemo(() => doneTrack[doneTrack.length - 1] ?? [0, 0], [doneTrack]);

  return (
    <div className="relative h-full overflow-hidden rounded-2xl">
      <MapContainer center={center} zoom={17} className="h-full w-full" zoomControl attributionControl>
        {/* OSM tiles need no API key; index.css inverts them into a dark basemap. */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={19}
          maxZoom={20}
        />
        <Viewport track={plannedTrack.length ? plannedTrack : doneTrack} target={selected} />

        {plannedTrack.length > 1 && (
          <Polyline positions={plannedTrack} pathOptions={{ color: "#22D3EE", weight: 1.5, opacity: 0.35, dashArray: "4 6" }} />
        )}
        {/* Glow underlay + bright core for the completed track */}
        <Polyline positions={doneTrack} pathOptions={{ color: "#0E7490", weight: 9, opacity: 0.35 }} />
        <Polyline positions={doneTrack} pathOptions={{ color: "#22D3EE", weight: 2.5, opacity: 0.95 }} />

        {detections.map((d) => {
          const s = classStyle(d.cls);
          const level = confidenceLevel(d.confidence);
          return (
            // Keyboard-focusable (Leaflet sets role=button + tabindex); Enter opens the popup
            <Marker
              key={d.id}
              position={[d.lat, d.lon]}
              icon={hazardIcon(d.cls, d.id === activeId)}
              title={`${s.label}, ${level.level.toLowerCase()} confidence ${d.confidence.toFixed(0)}%`}
              riseOnHover
              eventHandlers={{
                mouseover: () => onHover(d.id),
                mouseout: () => onHover(null),
                click: () => onSelect(d.id),
              }}
            >
              <Popup>
                <div className="font-display text-base font-bold tracking-tight" style={{ color: s.text }}>{s.label}</div>
                <ConfidenceLabel level={level} confidence={d.confidence} />
                <div className="font-mono text-slate-200">{d.dims.length} × {d.dims.width} m</div>
                <div className="font-mono text-xs text-slate-300">{d.lat.toFixed(6)}, {d.lon.toFixed(6)}</div>
              </Popup>
            </Marker>
          );
        })}

        {/* Decorative marker, not a control: keep it out of the tab order */}
        {auvPos && <Marker position={auvPos} icon={auvIcon} interactive={false} keyboard={false} alt="" />}
      </MapContainer>
    </div>
  );
}
