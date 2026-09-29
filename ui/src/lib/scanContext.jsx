// SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
// Shared state across pages: backend health, the scan currently on the dashboard (what the
// chat, map and analytics pages talk about) and every scan run this session.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_DETECTIONS, DEMO_META } from "../data/dummy";
import { checkHealth } from "./api";
import { classStyle } from "./classes";
import { hazardStatus } from "./hazard";

export const CHENNAI = { name: "Chennai (Marina Beach)", lat: 13.0500, lon: 80.2824 };

/** Great-circle distance in km. */
export function haversineKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Detection as produced by the dashboard (demo or backend) -> shared, display-ready record. */
export function toRecordDetection(d) {
  return {
    id: d.id,
    cls: d.cls,
    label: classStyle(d.cls).label,
    status: d.status ?? hazardStatus(d),
    confidence: d.confidence,
    lat: d.lat,
    lon: d.lon,
    dims: d.dims ?? null,
    shadowPenalized: Boolean(d.shadowPenalized),
    unverifiedInput: Boolean(d.unverifiedInput),
  };
}

export const DEMO_SCAN = {
  id: "DEMO-L03",
  name: "Demo survey · leg 3",
  source: "Synthetic survey off Chennai (Bay of Bengal)",
  kind: "demo",
  georeferenced: true,
  time: DEMO_META.timestamp,
  detections: DEMO_DETECTIONS.map(toRecordDetection),
};

/** Compact JSON context for SEASCAN AI (the backend forwards it to Gemini). */
export function chatContext(scan) {
  if (!scan) return { scan: null, detections: [] };
  const dets = scan.detections.slice(0, 80).map((d) => ({
    id: d.id,
    class: d.cls,
    label: d.label,
    status: d.status.label,
    confidence: Math.round(d.confidence * 10) / 10,
    ...(scan.georeferenced && Number.isFinite(d.lat)
      ? {
          lat: +d.lat.toFixed(6),
          lon: +d.lon.toFixed(6),
          distance_to_chennai_km: +haversineKm(CHENNAI, d).toFixed(2),
        }
      : {}),
    ...(d.dims ? { size_m: `${d.dims.length} x ${d.dims.width}` } : {}),
    ...(d.shadowPenalized ? { note: "in acoustic shadow, confidence halved" } : {}),
    ...(d.unverifiedInput ? { note: "input image not recognised as sonar" } : {}),
  }));
  return {
    scan: { id: scan.id, name: scan.name, source: scan.source, time: scan.time, georeferenced: scan.georeferenced },
    reference_points: [CHENNAI],
    status_rules: "CRITICAL: wreck or ghost net >= 80%; WARNING: wreck/ghost net < 80% or exposed pipeline; REVIEW: < 60%, shadowed, unclassified",
    detections: dets,
  };
}

const ScanCtx = createContext(null);

export function ScanProvider({ children }) {
  const [backend, setBackend] = useState({ online: false, pending: true });
  const [current, setCurrent] = useState(null); // null -> the demo survey
  const [sessionScans, setSessionScans] = useState([]);
  // SEASCAN AI conversation, shared by the chat page and the floating widget
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const ctl = new AbortController();
    const poll = async () => setBackend(await checkHealth(ctl.signal));
    // The first request includes DNS/TLS setup; re-measure once the connection is warm
    poll().then(() => setTimeout(poll, 800));
    const id = setInterval(poll, 10000);
    return () => {
      ctl.abort();
      clearInterval(id);
    };
  }, []);

  const recordScan = useCallback((scan) => {
    setSessionScans((s) => [...s.filter((x) => x.id !== scan.id).slice(-49), scan]);
  }, []);

  const value = useMemo(
    () => ({ backend, scan: current ?? DEMO_SCAN, isDemoFallback: !current, setCurrentScan: setCurrent, sessionScans, recordScan, messages, setMessages }),
    [backend, current, sessionScans, recordScan, messages],
  );
  return <ScanCtx.Provider value={value}>{children}</ScanCtx.Provider>;
}

export function useScan() {
  const ctx = useContext(ScanCtx);
  if (!ctx) throw new Error("useScan must be used inside <ScanProvider>");
  return ctx;
}
