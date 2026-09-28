// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { useEffect, useState } from "react";

const BASE = { depth: 42.6, altitude: 10.2, speed: 3.1, heading: 2, pitch: -1.4, roll: 0.8, battery: 78, temp: 18.4 };

const jitter = (v, amp) => v + (Math.random() - 0.5) * amp;
const pull = (v, base, k) => v * (1 - k) + base * k;

/** Dummy AUV telemetry that drifts slightly every second. */
export function useTelemetry() {
  const [t, setT] = useState(BASE);
  useEffect(() => {
    const id = setInterval(() => {
      setT((p) => ({
        depth: jitter(pull(p.depth, BASE.depth, 0.1), 0.4),
        altitude: jitter(pull(p.altitude, BASE.altitude, 0.2), 0.3),
        speed: jitter(pull(p.speed, BASE.speed, 0.2), 0.12),
        heading: (Math.round(jitter(pull(p.heading, BASE.heading, 0.3), 3)) + 360) % 360,
        pitch: jitter(pull(p.pitch, BASE.pitch, 0.3), 0.6),
        roll: jitter(pull(p.roll, BASE.roll, 0.3), 0.6),
        battery: p.battery,
        temp: jitter(pull(p.temp, BASE.temp, 0.1), 0.05),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}
