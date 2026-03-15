"""Tests for the media router (/media/*)."""
from __future__ import annotations

import routers.media as media_mod


def test_voices_endpoint(client):
    response = client.get("/media/voices")
    assert response.status_code == 200
    data = response.json()
    assert "voices" in data
    assert "nova" in data["voices"]
    assert len(data["voices"]) >= 5


def test_tts_rejects_invalid_voice(client, monkeypatch):
    monkeypatch.setattr(media_mod, "_TTS_ENDPOINT", "https://fake.openai.azure.com/")
    monkeypatch.setattr(media_mod, "_TTS_KEY", "fake-key")
    response = client.post(
        "/media/tts",
        json={"text": "Hello", "voice": "invalid_voice"},
    )
    assert response.status_code == 400


def test_tts_returns_503_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(media_mod, "_TTS_ENDPOINT", "")
    monkeypatch.setattr(media_mod, "_TTS_KEY", "")
    response = client.post(
        "/media/tts",
        json={"text": "Hello", "voice": "nova"},
    )
    assert response.status_code == 503


def test_stt_returns_503_when_not_configured(client, monkeypatch):
    monkeypatch.setattr(media_mod, "_STT_ENDPOINT", "")
    monkeypatch.setattr(media_mod, "_STT_KEY", "")
    response = client.post(
        "/media/stt",
        files={"file": ("test.webm", b"fake audio data", "audio/webm")},
    )
    assert response.status_code == 503
