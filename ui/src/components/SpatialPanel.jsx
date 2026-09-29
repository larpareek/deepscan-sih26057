// DeepScan: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057)
import { lazy, Suspense, useState } from "react";
import { fmtLat, fmtLon } from "../lib/geo";
import { Term } from "./ui";

// Leaflet is loaded on demand, only once there is a track to show.
const SurveyMap = lazy(() => import("./SurveyMap"));

export default function SpatialPanel(props) {
  const { doneTrack } = props;
  const [cursor, setCursor] = useState(null);
  const hasTrack = doneTrack.length > 1;

  return (
    <section className="pane min-h-[280px] flex-1" aria-labelledby="map-h">
      <div className="pane-head">
        <h2 id="map-h" className="pane-title">Survey map</h2>
        <span className="ml-auto truncate font-mono text-2xs text-ink-3" aria-live="off">
          {cursor ? `${fmtLat(cursor[0])} ${fmtLon(cursor[1])}` : hasTrack ? <Term term="auv track">AUV track</Term> : null}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        {hasTrack ? (
          <Suspense fallback={<div className="absolute inset-0 bg-bg-1" />}>
            <SurveyMap {...props} onCursor={setCursor} />
          </Suspense>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-bg-1 px-6 text-center text-[13px] text-ink-3">
            Track and geotagged objects appear here once a scan is loaded.
          </div>
        )}
      </div>
    </section>
  );
}
