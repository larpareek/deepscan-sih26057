"""SEASCAN: AI-Powered Underwater Marine Debris & Anomaly Detection (SIH26057).

Tests for the SEASCAN AI helpers that don't need network access.
"""

import asyncio

from src import chat

CONTEXT = {
    "detections": [
        {"id": "D2", "label": "Anomaly", "status": "REVIEW", "confidence": 70, "lat": 13.05, "lon": 80.33},
        {"id": "D1", "label": "Ghost net", "status": "CRITICAL", "confidence": 96.1, "lat": 13.0512, "lon": 80.3301},
    ]
}


def test_offline_reply_ranks_critical_first_with_coordinates():
    reply = chat.offline_reply("most dangerous?", CONTEXT)
    lines = reply.splitlines()
    assert "1 CRITICAL, 1 REVIEW" in reply
    assert lines[3].startswith("- D1 Ghost net (CRITICAL")
    assert "13.05120, 80.33010" in lines[3]


def test_offline_reply_without_detections():
    assert "no detections" in chat.offline_reply("?", {})


def test_answer_falls_back_when_not_configured(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    res = asyncio.run(chat.answer("summary", CONTEXT))
    assert res["model"] == "offline"


def test_rate_limit_window():
    cid = "test-client"
    assert all(chat.allow(cid, now=100.0) for _ in range(chat.RATE_LIMIT))
    assert not chat.allow(cid, now=100.5)
    assert chat.allow(cid, now=161.0)  # window has passed


def test_context_is_truncated():
    big = {"x": "a" * (chat.MAX_CONTEXT_CHARS * 2)}
    assert len(chat.context_json(big)) <= chat.MAX_CONTEXT_CHARS + 20
