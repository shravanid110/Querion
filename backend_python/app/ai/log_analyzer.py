import httpx
import json
import logging
import re
import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional, Union
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY or "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"

async def run_openrouter_engine(prompt: str) -> str:
    """Primary Cloud AI engine via OpenRouter (using DeepSeek)."""
    logger.info("Local engine unreachable. Querying OpenRouter (DeepSeek) for expert analysis...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                },
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "X-Title": "Querion Observability"
                },
                timeout=60.0
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                logger.error(f"OpenRouter API error: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.error(f"OpenRouter connection failed: {e}")
    return ""

async def run_ollama_fallback(prompt: str) -> str:
    """Fallback to local Ollama. Using settings.OLLAMA_MODEL."""
    logger.info(f"Querying local Ollama ({settings.OLLAMA_MODEL}) [Timeout: 120s]...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(settings.OLLAMA_API_URL, json={
                "model": settings.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_ctx": 4096
                }
            }, timeout=180.0)
            
            logger.info(f"Ollama Response Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("response", "")
                if content:
                    logger.info(f"Ollama Success: Received {len(content)} chars.")
                    return content
                else:
                    logger.warning("Ollama returned empty response content.")
            else:
                logger.error(f"Ollama error: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.error(f"Ollama connection error: {e}")
    return ""

async def run_grok_fallback(prompt: str) -> str:
    """Tertiary fallback to Grok."""
    grok_api_key = os.getenv("GROK_API_KEY")
    if not grok_api_key:
        return ""
        
    logger.info("Local engine failed. Falling back to Grok Cloud (grok-beta)...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                json={
                    "model": "grok-beta",
                    "messages": [{"role": "system", "content": prompt}],
                    "temperature": 0.2
                },
                headers={
                    "Authorization": f"Bearer {grok_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=15.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        logger.error(f"Grok fallback failed: {e}")
    return ""

def _parse_llm_json(result_text: Optional[str]) -> Optional[Dict[str, Any]]:
    if not result_text: return None
    if "LOG ANALYSIS REPORT" in result_text:
        # User requested a strict raw text format. Let's parse it manually for the UI.
        report_data = {
            "explanation": result_text, # The UI can just show the whole block
            "full_report": True,
            "severity_level": "HIGH" if "ERROR:" in result_text else "MEDIUM",
            "system_status": "RISK"
        }
        
        # Try to extract keys for the "Where" and "How" sections of the UI
        err_match = re.search(r"ERROR:\n(.*?)(?=\n\n|\nLOCATION:|$)", result_text, re.DOTALL)
        loc_match = re.search(r"LOCATION:\n(.*?)(?=\n\n|\nROOT CAUSE:|$)", result_text, re.DOTALL)
        fix_match = re.search(r"FIX:\n(.*?)(?=\n\n|\nVALIDATION:|$)", result_text, re.DOTALL)
        
        if err_match: report_data["error_type"] = err_match.group(1).strip()
        if loc_match: report_data["affected_file"] = loc_match.group(1).strip()
        if fix_match: report_data["suggested_fix"] = fix_match.group(1).strip()
        
        return report_data

    # Try standard JSON parsing
    data_str = None
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
    if json_match:
        data_str = json_match.group(1).strip()
    else:
        # Fallback: extract anything between the first { and last }
        text_match = re.search(r'(\{.*\})', result_text, re.DOTALL)
        if text_match:
            data_str = text_match.group(1).strip()
        else:
            return None
    
    if data_str:
        try:
            return json.loads(data_str)
        except Exception as e:
            logger.error(f"JSON Parse Error: {e}")
            return None
    return None

def _clean_log_text(log_text: str) -> str:
    """Pre-process and sanitize log content for better AI analysis."""
    # Remove timestamps to focus on the error content
    log_text = re.sub(r'\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?', '', log_text)
    # Remove large hex addresses or memory addresses
    log_text = re.sub(r'0x[a-fA-F0-9]{8,16}', '[addr]', log_text)
    # Deduplicate repeated lines (common in log spam)
    lines = log_text.split('\n')
    unique_lines = []
    last_line = None
    for line in lines:
        if line.strip() != last_line:
            unique_lines.append(line.strip())
            last_line = line.strip()
    return '\n'.join(unique_lines).strip()

async def analyze_log(log_text: str, file_context: Optional[str] = None) -> Dict[str, Any]:
    """
    Querion Senior SRE Agent (Ollama First Edition).
    Performs deep diagnosis and generates line-by-line fixes.
    """
    print(f"DEBUG: analyze_log called at {datetime.now()}")
    log_text = _clean_log_text(log_text)
    
    if not log_text.strip():
        logger.info("Skipping analysis: Received empty log string.")
        return {
            "success": False,
            "severity_level": "INFO",
            "explanation": "No logs to analyze or log was entirely sanitized (e.g. only timestamps/addresses).",
            "raw_ai_text": ""
        }
    master_prompt = f"""You are a backend monitoring expert. You will be provided with grouped log entries from a server or application. Your task is to:

1. Analyze each grouped log carefully.
2. Identify all errors, warnings, or failures.
3. For each error, provide a detailed explanation including:
   - Error Message: Exact error from the log
   - Explanation: What this error means in simple technical terms
   - Location/Context: Where in the code, process, or system the error is happening
   - Cause: Likely reason(s) for this error
   - Fix Steps: Step-by-step instructions to resolve it
4. Do not remove, truncate, or change any log lines.
5. If multiple errors exist in the grouped log, repeat the structure for each one.
6. If no errors are detected, explicitly say: "No critical errors found in this log."
7. ALWAYS start your response with "LOG ANALYSIS REPORT".

Logs to analyze:
{log_text}

Project Context:
{file_context or "No source code context available."}
"""

    logger.info(f"🚀 Initializing AI Analysis Engine...")
    # Bypass slow local Ollama and use OpenRouter directly
    result_text = await run_openrouter_engine(master_prompt)
    
    if not result_text:
        logger.info("OpenRouter failed, attempting final local fallback...")
        result_text = await run_ollama_fallback(master_prompt)
        
    if result_text:
        # Parse the structured text into a UI-friendly dictionary
        structured_data = _parse_llm_json(result_text) or {}
        
        # Ensure we have the basic fields
        severity = "ERROR" if any(x in log_text.lower() for x in ["error", "exception", "failed", "critical"]) else "INFO"
        
        response = {
            "success": True,
            "explanation": result_text,
            "severity_level": severity,
            "raw_ai_text": result_text,
            "full_report": True
        }
        
        # Merge structured data if available
        response.update(structured_data)
        
        # Ensure fallback for mandatory UI fields
        if "suggested_fix" not in response:
            response["suggested_fix"] = "Investigate the log trace for specific failure points."
            
        return response

    # Final Failure Message
    return {
        "success": False,
        "explanation": "### 🛑 AI Analysis Unavailable\n\nDeepSeek could not be reached via local Ollama or Cloud fallback.\n\n**Common Fixes:**\n1. Check if Ollama is running (`ollama list`)\n2. Ensure OpenRouter API key is valid\n3. Check your network connection.",
        "severity_level": "WARNING"
    }
