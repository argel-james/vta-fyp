"""Media endpoints: Text-to-Speech (gpt-4o-mini-tts) and Speech-to-Text (Whisper).

Uses the Azure OpenAI deployments in eastus2 for audio capabilities.
"""
from __future__ import annotations

import io
import logging
import os
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["Media (TTS & STT)"])

_TTS_ENDPOINT = os.getenv(
    "AZURE_OPENAI_ENDPOINT_TTS",
    os.getenv("AZURE_OPENAI_ENDPOINT_CHAT", ""),
)
_TTS_KEY = os.getenv(
    "AZURE_OPENAI_API_KEY_TTS",
    os.getenv("AZURE_OPENAI_API_KEY_CHAT", ""),
)
_TTS_DEPLOYMENT = os.getenv("AZURE_OPENAI_TTS_DEPLOYMENT", "gpt-4o-mini-tts")
_TTS_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION_TTS", "2025-03-01-preview")

_STT_ENDPOINT = os.getenv(
    "AZURE_OPENAI_ENDPOINT_STT",
    os.getenv("AZURE_OPENAI_ENDPOINT_CHAT", ""),
)
_STT_KEY = os.getenv(
    "AZURE_OPENAI_API_KEY_STT",
    os.getenv("AZURE_OPENAI_API_KEY_CHAT", ""),
)
_STT_DEPLOYMENT = os.getenv("AZURE_OPENAI_STT_DEPLOYMENT", "whisper")
_STT_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION_STT", "2024-12-01-preview")

VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"]


class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"
    instructions: Optional[str] = None


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Generate speech audio from text using gpt-4o-mini-tts."""
    if not _TTS_ENDPOINT or not _TTS_KEY:
        raise HTTPException(status_code=503, detail="TTS service not configured")

    if req.voice not in VOICES:
        raise HTTPException(status_code=400, detail=f"Invalid voice. Choose from: {', '.join(VOICES)}")

    try:
        from openai import AzureOpenAI

        client = AzureOpenAI(
            azure_endpoint=_TTS_ENDPOINT,
            api_key=_TTS_KEY,
            api_version=_TTS_API_VERSION,
        )

        kwargs: dict = {
            "model": _TTS_DEPLOYMENT,
            "voice": req.voice,
            "input": req.text,
            "response_format": "mp3",
        }
        if req.instructions:
            kwargs["instructions"] = req.instructions

        response = client.audio.speech.create(**kwargs)

        audio_bytes = io.BytesIO(response.content)
        return StreamingResponse(
            audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"},
        )
    except Exception as exc:
        logger.exception("TTS generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Transcribe audio to text using Whisper."""
    if not _STT_ENDPOINT or not _STT_KEY:
        raise HTTPException(status_code=503, detail="STT service not configured")

    try:
        from openai import AzureOpenAI

        client = AzureOpenAI(
            azure_endpoint=_STT_ENDPOINT,
            api_key=_STT_KEY,
            api_version=_STT_API_VERSION,
        )

        audio_data = await file.read()
        audio_file = io.BytesIO(audio_data)
        audio_file.name = file.filename or "audio.webm"

        result = client.audio.transcriptions.create(
            model=_STT_DEPLOYMENT,
            file=audio_file,
            language="en",
        )

        return {"text": result.text}
    except Exception as exc:
        logger.exception("STT transcription failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/voices")
async def list_voices():
    """List available TTS voices."""
    return {"voices": VOICES}
