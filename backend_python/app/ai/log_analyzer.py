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
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY or ""

async def run_openrouter_engine(prompt: str) -> str:
    """Primary Cloud AI engine via OpenRouter (using high-performance models)."""
    api_key = os.getenv("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY or OPENROUTER_API_KEY
    models = [
        "openai/gpt-4o-mini",
        "google/gemini-2.0-flash-001",
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat",
        "openrouter/auto"
    ]
    for model_name in models:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    json={
                        "model": model_name,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a senior site reliability engineer and backend debugging expert. Your job is to analyze server and application error logs, diagnose root cause, identify the exact file and line number where the issue is, and provide clear step-by-step fix instructions with the exact code snippet."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2
                    },
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://querion.ai",
                        "X-Title": "Querion Observability"
                    },
                    timeout=35.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        return content
                else:
                    logger.warning(f"OpenRouter ({model_name}) status: {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            logger.warning(f"OpenRouter connection for {model_name} failed: {e}")
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
    report_data = {
        "explanation": result_text,
        "full_report": True,
        "severity_level": "HIGH" if any(x in result_text.lower() for x in ["error", "exception", "failed", "critical"]) else "MEDIUM",
        "system_status": "RISK"
    }

    # Try extracting structured fields from the markdown
    err_match = re.search(r"(?:### 1\. Error Summary|ERROR:?)\s*\n(.*?)(?=\n###|\n\n[A-Z]|$)", result_text, re.DOTALL | re.IGNORECASE)
    loc_match = re.search(r"(?:### 2\. Location|LOCATION:?)\s*\n(.*?)(?=\n###|\n\n[A-Z]|$)", result_text, re.DOTALL | re.IGNORECASE)
    fix_match = re.search(r"(?:### 4\. Step-by-Step Fix|FIX:?)\s*\n(.*?)(?=\n###|\n\n[A-Z]|$)", result_text, re.DOTALL | re.IGNORECASE)
    code_match = re.search(r"```(?:\w+)?\n(.*?)```", result_text, re.DOTALL)

    if err_match: report_data["error_type"] = err_match.group(1).strip()
    if loc_match: report_data["affected_file"] = loc_match.group(1).strip()
    if fix_match: report_data["suggested_fix"] = fix_match.group(1).strip()
    if code_match: report_data["generated_fix_code"] = code_match.group(1).strip()

    # Fallback to check if response contains raw json
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group(1).strip())
            report_data.update(parsed)
        except Exception:
            pass

    return report_data

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
    Querion Senior SRE Agent.
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
    master_prompt = f"""You are a senior site reliability engineer and full-stack software debugging expert.
A project encountered the following error during execution:

ERROR LOG / TRACEBACK:
{log_text}

PROJECT SOURCE FILES (Inspect ALL files carefully):
{file_context or "No project files available."}

INSTRUCTIONS:
1. Carefully review ALL provided project files above. Correlate the error log trace with the actual source code across the files.
2. Pinpoint the exact file name and line number responsible for the failure.
3. Explain why the failure occurred in simple, precise technical terms.
4. Provide step-by-step instructions to fix the issue.
5. Provide the exact corrected code block so the developer can replace the broken code directly.

Format your response in clean Markdown with these exact headings:

### 1. Error Summary
State the exact error and what broke.

### 2. Location
State the exact file path (e.g. `src/App.jsx`, `script.js`, or `main.py`) and line number where the problem is located.

### 3. Root Cause Analysis
Explain clearly why this error occurred based on your inspection of the project files.

### 4. Step-by-Step Fix
Provide clear, numbered instructions on how to fix this issue in the code.

### 5. Corrected Code
Provide the complete corrected code snippet for the affected file/function.
"""

    logger.info(f"🚀 Initializing AI Analysis Engine...")
    result_text = await run_openrouter_engine(master_prompt)
    
    if not result_text:
        logger.info("OpenRouter failed, attempting local Ollama fallback...")
        result_text = await run_ollama_fallback(master_prompt)

    if not result_text:
        logger.info("Ollama failed, attempting Grok fallback...")
        result_text = await run_grok_fallback(master_prompt)
        
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
