"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

SEASCAN AI: a Gemini-backed assistant that answers questions about the current scan.

The API key is read from the GEMINI_API_KEY environment variable (or src/.env for local
development); it never reaches the browser. If Gemini is not configured, rate-limited or
overloaded, the assistant falls back to a deterministic summary of the context so the
chat still answers, and says that it did.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are SEASCAN AI, an expert marine surveyor assistant. Answer based ONLY on the provided sonar "
    "context data. Be concise, professional, and highlight hazards like ghost nets or shipwrecks with "
    "their GPS coordinates if available.\n\n"
    "The context is JSON describing the current side-scan sonar survey: detections with class, hazard "
    "status (CRITICAL > WARNING > REVIEW), confidence in percent, latitude/longitude and size in metres. "
    "Distances to reference points are precomputed in kilometres where provided; use them rather than "
    "estimating. If the context does not contain the answer, say so plainly. Use short paragraphs or "
    "bullet points, plain text only (no Markdown headings or tables)."
)

# Tried in order; a 503 "high demand" or 429 on one model moves to the next.
# The lite model is fastest and ample for summarising a scan.
MODELS = [
    m.strip()
    for m in os.environ.get("GEMINI_MODELS", "gemini-flash-lite-latest,gemini-flash-latest,gemini-2.5-flash").split(",")
    if m.strip()
]
TIMEOUT_S = 25
MAX_CONTEXT_CHARS = 40_000
RATE_LIMIT = int(os.environ.get("SSS_CHAT_PER_MIN", "12"))  # requests per client per minute

_client = None
_hits: dict[str, deque] = defaultdict(deque)


def configured() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def _get_client():
    global _client
    if _client is None:
        from google import genai  # imported lazily: only needed when chat is used

        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def allow(client_id: str, now: float | None = None) -> bool:
    """Sliding one-minute window per client; protects the key's quota on a public demo."""
    now = time.monotonic() if now is None else now
    q = _hits[client_id]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        return False
    q.append(now)
    return True


def context_json(context: object) -> str:
    text = json.dumps(context, separators=(",", ":"), ensure_ascii=False, default=str)
    return text if len(text) <= MAX_CONTEXT_CHARS else text[:MAX_CONTEXT_CHARS] + "…(truncated)"


def offline_reply(query: str, context: object) -> str:
    """Deterministic answer from the context when Gemini is unavailable."""
    dets = context.get("detections", []) if isinstance(context, dict) else []
    dets = [d for d in dets if isinstance(d, dict)]
    if not dets:
        return "SEASCAN AI is offline and there are no detections in the current scan to summarise."
    rank = {"CRITICAL": 0, "WARNING": 1, "REVIEW": 2}
    dets.sort(key=lambda d: (rank.get(str(d.get("status", "")).upper(), 3), -float(d.get("confidence", 0) or 0)))
    counts: dict[str, int] = {}
    for d in dets:
        status = str(d.get("status", "UNKNOWN")).upper()
        counts[status] = counts.get(status, 0) + 1
    lines = [
        "Language model unavailable, so here is an automatic summary of the scan instead.",
        f"{len(dets)} objects: "
        + ", ".join(f"{n} {s}" for s, n in sorted(counts.items(), key=lambda x: rank.get(x[0], 3)))
        + ".",
        "Highest priority:",
    ]
    for d in dets[:5]:
        pos = (
            f" at {d['lat']:.5f}, {d['lon']:.5f}"
            if isinstance(d.get("lat"), int | float) and isinstance(d.get("lon"), int | float)
            else ""
        )
        name = d.get("label") or d.get("class", "object")
        lines.append(f"- {d.get('id', '?')} {name} ({d.get('status', '?')}, {d.get('confidence', '?')}%){pos}")
    return "\n".join(lines)


async def answer(query: str, context: object) -> dict:
    """Returns {"reply", "model"}; model is "offline" when the fallback answered."""
    if configured():
        from google.genai import errors, types

        prompt = f"Sonar context data (JSON):\n{context_json(context)}\n\nQuestion: {query}"
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
            max_output_tokens=2048,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )
        client = _get_client()
        for model in MODELS:
            try:
                res = await asyncio.wait_for(
                    client.aio.models.generate_content(model=model, contents=prompt, config=config), TIMEOUT_S
                )
                if res.text:
                    return {"reply": res.text.strip(), "model": model}
            except (errors.APIError, TimeoutError) as e:
                log.warning("gemini %s failed: %s", model, str(e)[:200])
    return {"reply": offline_reply(query, context), "model": "offline"}
