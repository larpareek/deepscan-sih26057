---
title: SEASCAN API
emoji: 🌊
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
license: mit
short_description: Side-scan sonar hazard detection API (SIH26057)
---

# SEASCAN API

FastAPI backend for **SEASCAN** (SIH26057, Team BLACK SWANS): side-scan sonar preprocessing,
YOLOv8 detection, geotagging and the SEASCAN AI chat endpoint.

- Website: <https://deepscan-sih26057-lilac.vercel.app>
- Source: <https://github.com/larpareek/deepscan-sih26057>
- Health check: `/health` · API docs: `/docs`

This Space is deployed from the GitHub repository with `scripts/deploy_hf_space.py`.
