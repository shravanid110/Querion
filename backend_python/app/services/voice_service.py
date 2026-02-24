"""
voice_service.py
────────────────
Multilingual voice transcription using OpenAI Whisper.

Features
--------
• Lazy loading  – model is only loaded on first use (singleton)
• Auto-detect   – Whisper auto-detects the spoken language
• Translation   – if not English, re-runs with task="translate"
• CPU-only      – no GPU assumption
• Structured    – returns {detected_language, original_text, english_text}
"""

import os
import logging
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

import threading

# ── Singleton model holder ────────────────────────────────────────────────────
_whisper_model = None
_MODEL_SIZE = "tiny"
_model_lock = threading.Lock()

def preheat_model():
    """Trigger model loading in a background thread."""
    thread = threading.Thread(target=_load_model, daemon=True)
    thread.start()

def _load_model():
    """Load Whisper model once and cache it (thread-safe)."""
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    with _model_lock:
        if _whisper_model is not None:
            return _whisper_model

        # Ensure ffmpeg is in PATH
        import shutil
        if not shutil.which("ffmpeg"):
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if local_appdata:
                wg_path = os.path.join(local_appdata, "Microsoft", "WinGet", "Packages")
                if os.path.exists(wg_path):
                    for root, dirs, files in os.walk(wg_path):
                        if "ffmpeg.exe" in files:
                            bin_path = root
                            os.environ["PATH"] = bin_path + os.pathsep + os.environ["PATH"]
                            logger.info(f"Adding ffmpeg to PATH from WinGet: {bin_path}")
                            break

        try:
            import whisper
            logger.info(f"🎤 Loading Whisper model '{_MODEL_SIZE}' (CPU)...")
            _whisper_model = whisper.load_model(_MODEL_SIZE, device="cpu")
            logger.info("✅ Whisper model loaded successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise RuntimeError(f"Whisper model unavailable: {e}")
            
    return _whisper_model


# ── Public API ─────────────────────────────────────────────────────────────────

async def transcribe_audio(audio_path: str, language: Optional[str] = None) -> dict:
    """
    Transcribe *audio_path* and translate to English when needed.

    Args:
        audio_path: path to the audio file
        language: optional language hint (ISO code like 'mr', 'hi', 'en' or None/'auto')

    Returns
    -------
    {
        "detected_language": str,   # ISO 639-1 code, e.g. "hi"
        "original_text":     str,   # transcription in the spoken language
        "english_text":      str,   # English version (same as original if already English)
    }
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        model = _load_model()
    except Exception as exc:
        raise RuntimeError(f"Whisper model unavailable: {exc}") from exc

    try:
        # Normalize language input
        lang_hint = language if (language and language.lower() not in ("auto", "detect")) else None

        # ── Step 1: transcribe in original language ──────────────────────────
        logger.info(f"🗣 Transcribing: {os.path.basename(audio_path)} (hint={lang_hint})")
        
        transcribe_args = {"task": "transcribe"}
        if lang_hint:
            transcribe_args["language"] = lang_hint

        result_transcribe = model.transcribe(audio_path, **transcribe_args)
        detected_lang: str = result_transcribe.get("language", lang_hint or "unknown")
        original_text: str = result_transcribe.get("text", "").strip()

        logger.info(f"  Final language: {detected_lang!r}  |  text[:80]: {original_text[:80]!r}")

        # ── Step 2: translate to English if needed ───────────────────────────
        if detected_lang.lower() in ("en", "english"):
            english_text = original_text
        else:
            logger.info(f"  Translating from '{detected_lang}' → English …")
            translate_args = {"task": "translate"}
            if lang_hint:
                translate_args["language"] = lang_hint
            
            result_translate = model.transcribe(audio_path, **translate_args)
            english_text = result_translate.get("text", "").strip()
            logger.info(f"  Translated: {english_text[:80]!r}")

        return {
            "detected_language": detected_lang,
            "original_text": original_text,
            "english_text": english_text,
        }

    except Exception as exc:
        logger.error(f"❌ Transcription failed: {exc}")
        raise RuntimeError(f"Transcription error: {exc}") from exc
