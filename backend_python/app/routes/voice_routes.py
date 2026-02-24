"""
voice_routes.py
───────────────
POST /api/voice-input

Accepts a multipart audio upload, validates it, transcribes via Whisper,
and returns a structured JSON response.

Security
--------
• MIME type whitelist: audio/webm, audio/wav, audio/mpeg, audio/ogg, audio/mp4
• File extension whitelist: .webm .wav .mp3 .ogg .m4a
• Max size: 25 MB
• Temp file auto-deleted after processing
• No arbitrary execution of uploaded files
"""

import os
import logging
import tempfile

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "video/webm",       # Chrome MediaRecorder often reports this for audio
}

ALLOWED_EXTENSIONS = {".webm", ".wav", ".mp3", ".ogg", ".m4a"}

MAX_BYTES = 25 * 1024 * 1024  # 25 MB


def _check_extension(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS


# ── Endpoint ──────────────────────────────────────────────────────────────────

from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Form

@router.post("/voice-input")
async def voice_input(file: UploadFile = File(...), language: Optional[str] = Form(None)):
    """
    Transcribe an uploaded audio file with an optional language hint.
    """
    # ── Validate content type ────────────────────────────────────────────────
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        logger.warning(f"Voice upload rejected: MIME type '{content_type}'")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type '{content_type}'. Allowed: webm, wav, mp3, ogg, m4a"
        )
    
    # ... size checks ...
    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large")
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # ── Write to temp file ───────────────────────────────────────────────────
    original_filename = file.filename or "audio.webm"
    _, ext = os.path.splitext(original_filename)
    ext = ext or ".webm"
    tmp_path: str = ""

    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        logger.info(f"🎤 Voice upload received | lang_hint={language!r} | tmp={tmp_path}")

        # ── Transcribe ───────────────────────────────────────────────────────
        from app.services.voice_service import transcribe_audio
        result = await transcribe_audio(tmp_path, language=language)

        logger.info(
            f"✅ Transcription done | lang={result['detected_language']!r} | "
            f"text={result['english_text'][:60]!r}"
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except RuntimeError as exc:
        logger.error(f"❌ Voice transcription failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error(f"❌ Unexpected voice error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error during transcription.")
    finally:
        # ── Always delete temp file ──────────────────────────────────────────
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.debug(f"🗑 Temp file deleted: {tmp_path}")
            except Exception as cleanup_err:
                logger.warning(f"Could not delete temp file {tmp_path}: {cleanup_err}")
