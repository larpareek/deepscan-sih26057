# SEASCAN: 3-Minute Demo Script (SIH26057 · Team BLACK SWANS)

## Before you start (5 minutes ahead)

- [ ] Open the production site: <https://deepscan-sih26057-lilac.vercel.app>. Use this exact URL: preview links from Vercel serve older builds and can't reach the backend.
- [ ] The navbar should read **● SYSTEM ONLINE**. If it says OFFLINE, open <https://deepscan-api-production.up.railway.app/health> once to wake the backend, then reload.
- [ ] Full screen, browser zoom 100%, notifications off.
- [ ] Optional: have your own sonar image (`scan.png`, plus `scan.json` for real coordinates, format in [ARCHITECTURE.md](ARCHITECTURE.md#metadata-json-upload)) ready. Without JSON the scan still runs, but positions are marked *not georeferenced*. No data? **Scan → Download a sample scan** gives a matching PNG + JSON pair.
- [ ] Optional: **Settings (⚙) → Audible contact ping** if the room has audio.
- [ ] Fallback: if the backend or Wi-Fi fails, **Load demo survey** runs entirely in the browser.

## Script

| Time | Say | Do |
|---|---|---|
| **0:00–0:20** | "Ghost nets and seabed debris keep killing marine life and endangering navigation, but finding them means experts reviewing hours of side-scan sonar by hand." | Start on the landing page (whale hero), scroll once to the 640,000-tons quote. |
| **0:20–0:40** | "Side-scan sonar is noisy: speckle, fading with range, dropouts when the vehicle pitches. SEASCAN cleans it, detects hazards and geotags them. Problem statement SIH26057, for MoES/NIOT." | Click **Launch Dashboard**. Point to the three areas: operator console (left), sonar display (centre), object detail and survey map (right). |
| **0:40–1:10** | "Here's a survey leg off Chennai. Axes are in metres: range to port and starboard across the top, distance along the track down the side. Each box is a detection, coloured by hazard status." | Click **Load demo survey**. Move the cursor over the image to show the live range / along-track / lat-lon readout. |
| **1:10–1:35** | "The table ranks objects by status. T1 is a shipwreck at 94% confidence, 23.7 metres to starboard, about 18 by 16 metres. Every object is geotagged." | Click **T1** in the Detections table: the display, object detail and survey map all follow. |
| **1:35–1:55** | "We cut false positives with physics: a real object casts a shadow next to its echo. This return sits inside a shadow, so its score was halved and it's marked for review." | In **Detection**, drag **Confidence threshold** to 30%. Select the new REVIEW object (dashed box) and show the acoustic-shadow note, then set the threshold back to 50%. |
| **1:55–2:30** | "That was a precomputed demo. Now the real model: the same waterfall goes to our FastAPI backend, which runs dropout fill, despeckle, contrast enhancement, our fine-tuned YOLOv8, the shadow filter, then geotagging." | In **Scan**, click **Run live model on this waterfall** (or drop your own `scan.png` + `scan.json`). While it processes, point to **System → Processing**: each stage reports its real time in milliseconds. |
| **2:30–2:45** | "Results export as JSON or CSV, and anyone can just ask: SEASCAN AI answers from the scan itself, with coordinates." | **Export → CSV**, then **Ask SEASCAN AI → What is the most dangerous hazard here?** (or on **Map**: *closest ghost net to Chennai*). |
| **2:45–3:00** | "It's small enough for the edge: one command exports ONNX for the vehicle's onboard computer. SEASCAN turns hours of sonar review into minutes. Thank you." | Show the `python scripts/export_onnx.py` line in the README. |

## Likely judge questions

- **"What accuracy do you get?"** Be honest: mAP@50 0.995 (mAP@50-95 0.940) on 240 *synthetic* validation images from our sonar simulator, with ≈ 15 ms CPU inference. That is an upper bound; the next step is fine-tuning on real labelled surveys (AI4Shipwrecks, NIOT data). Training is fully reproducible from two scripts.
- **"Why synthetic data?"** Public labelled side-scan data for ghost nets and pipelines is scarce. The simulator models speckle, range falloff, the nadir gap, acoustic shadows and dropped pings, and images pass through the same preprocessing as live scans.
- **"How accurate is the geotagging?"** A linear across-track model with slant-range correction from the sonar's altitude, plus interpolated ping positions. Roll and pitch correction is the next step.
- **"How do you decide CRITICAL vs WARNING?"** Settings (⚙) lists the rules: wreck or ghost net at ≥ 80% is CRITICAL; lower confidence or an exposed pipeline is WARNING; unclassified, < 60% or shadowed returns go to REVIEW.
- **"Why halve confidence in shadows?"** Real objects produce a bright echo next to their shadow. A box that is mostly dark has no echo behind it, so it's likely noise.
- **"Can it run offline on the vehicle?"** Yes. The ONNX export runs on ONNX Runtime with no internet, and the UI works offline with the demo survey.
- **"Is the chatbot making things up?"** It only sees the current scan's detections (sent as JSON with each question) and is told to answer from that alone; each reply shows which model answered. Without Gemini, it falls back to a rule-based summary and says so.
- **"Are the analytics real?"** "This session" is computed from the scans you ran. "Sample campaign" is simulated and labelled as such on the page.
