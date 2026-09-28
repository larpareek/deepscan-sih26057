# DeepScan: 3-Minute Demo Script (SIH26057)

## Before you start (5 minutes ahead)

- [ ] Backend running: `uvicorn src.api:app --port 8000`. The status dot next to **DEEPSCAN** should be green.
- [ ] Dashboard open at full screen; browser zoom 100%; notifications off.
- [ ] Have a sonar image (`scan.png`) and its metadata (`scan.json`) ready for drag-and-drop. `ping_coords` needs one `[lat, lon]` per image row; the format is in [ARCHITECTURE.md](ARCHITECTURE.md#metadata-json-upload). Test the pair once before the demo.
- [ ] Optional: turn on **⋯ → Sonar ping sounds** if the room has audio.
- [ ] Fallback: if the backend or Wi-Fi fails, use **Load demo scan**. It runs entirely in the browser.

## Script

| Time | Say | Do |
|---|---|---|
| **0:00–0:20** | "Ghost nets and seabed debris keep killing marine life and endangering navigation, but finding them means experts reviewing hours of side-scan sonar by hand." | Show the **Awaiting Acoustic Data** screen with the sonar sweep. |
| **0:20–0:40** | "Side-scan sonar is noisy: speckle, fading with range, dropouts when the AUV pitches. DeepScan cleans it, detects hazards and geotags them automatically. Problem statement SIH26057, for MoES/NIOT." | Hover **Sonar waterfall** to show the plain-language tooltip. |
| **0:40–1:10** | "Here's a survey leg off Chennai. Each bracket is a detection: a shipwreck, a pipeline, ghost nets and anomalies." | Click **Load demo scan**. Let the brackets draw in, then hover the shipwreck to show the tooltip, confidence ring and size in metres. |
| **1:10–1:35** | "Confidence is shown as text and an icon, not just colour. This detection sat inside an acoustic shadow, so we halved its score. That's how we cut false positives." | Open **Hazards**. Open **Controls** and drag **Confidence threshold** down to 30% to reveal the faded shadow detection, then back to 50%. |
| **1:35–1:55** | "Every hazard is geotagged. One click takes you to it on the mission map, with the AUV's track." | Expand a hazard card, then click **View on map**. |
| **1:55–2:30** | "Now a real upload. The FastAPI backend runs the full pipeline: dropout fill, despeckle, CLAHE, then YOLOv8, the shadow filter, and geotagging." | In **Controls**, drop `scan.png` + `scan.json`, then click **Run detection**. While the scan line sweeps: "about 50 ms of compute on a laptop CPU." |
| **2:30–2:45** | "Results export as JSON or CSV for survey teams." | Click **Report**. Show the downloaded file briefly. |
| **2:45–3:00** | "It's small enough for the edge: one command exports ONNX for the AUV's onboard computer. DeepScan turns hours of sonar review into minutes. Thank you." | Show the `python scripts/export_onnx.py` line in the README. |

## Likely judge questions

- **"What accuracy do you get?"** Be honest: fine-tuning on labelled SSS data (for example AI4Shipwrecks) is in progress, and the pipeline is model-agnostic. Show the Model Performance table and the measured latency.
- **"How accurate is the geotagging?"** It uses a linear across-track model with slant-range correction from the sonar's altitude, plus interpolated ping positions. Roll and pitch correction is the next step.
- **"Why halve confidence in shadows?"** Real objects produce a bright echo next to their shadow. A box that is mostly dark has no echo behind it, so it's likely noise.
- **"Can it run offline on the vehicle?"** Yes. The ONNX export runs on onnxruntime with no internet, and the UI works offline in demo mode.
