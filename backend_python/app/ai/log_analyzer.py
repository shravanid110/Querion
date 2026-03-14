import httpx
import json
import logging
import re
import os
from dotenv import load_dotenv
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def run_ollama_fallback(prompt: str):
    logger.info("Falling back to local Ollama (phi3:latest) for Log Analysis...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://127.0.0.1:11434/api/generate", json={
                "model": "phi3:latest",
                "prompt": prompt,
                "stream": False
            }, timeout=45.0)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "")
    except Exception as e:
        logger.error(f"Ollama fallback failed: {e}")
    return ""

def _parse_llm_json(result_text: str):
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
    if json_match:
        result_text = json_match.group(1).strip()
    else:
        json_start = result_text.find('{')
        json_end = result_text.rfind('}')
        if json_start != -1 and json_end != -1:
            result_text = result_text[json_start:json_end+1]
    return json.loads(result_text)

async def analyze_log(log_text: str, file_context: str = None) -> dict:
    """
    Querion AI Observability Engine - Senior SRE Agent.
    Performs deep analysis of grouped logs, correlates with source code, 
    and generates root cause insights with fixes using Grok.
    """
    load_dotenv()
    grok_api_key = os.getenv("GROK_API_KEY")

    if not grok_api_key:
        return {
            "AI_ANALYSIS_UNAVAILABLE": True,
            "message": "xAI API Key not configured.",
            "severity_level": "INFO",
            "severity_score": 0,
            "explanation": "Please configure your GROK_API_KEY environment variable to enable intelligent root cause analysis.",
            "chart_type": "line"
        }

    master_prompt = f"""You are a senior debugging engineer.

Analyze the following error log and provide:

1. Error explanation
2. Root cause
3. Why the error occurred
4. File location causing the issue
5. Correct code if code is wrong
6. Correct command if command failed
7. Step-by-step debugging instructions
8. Best practices to avoid the error
9. Severity classification

Error Log:
{log_text}

Project File Context (if any):
{file_context or "No source code available."}

SEVERITY CLASSIFICATION RULES:
- Critical: SyntaxError, ReferenceError, DatabaseConnectionError, Server crash
- High: TypeError, RuntimeError
- Medium: NetworkError, TimeoutError
- Low: Warnings, Info

Return ONLY a raw JSON object with the following schema exactly (no markdown formatting or wrappers):
{{
  "severity_level": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "error_type": "name of error",
  "explanation": "detailed explanation of the error",
  "root_cause": "why it occurred",
  "affected_file": "file location",
  "line_number": "line number if detected",
  "incorrect_code": "the specific code causing the issue",
  "correct_code": "the corrected code",
  "terminal_commands": ["comma", "separated", "commands if any"],
  "fix_steps": ["step 1", "step 2"],
  "prevention_advice": ["best practices to avoid error"],
  "chart_type": "bar" | "line" | "pie" | "gauge"
}}
"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                json={
                    "model": "grok-beta",
                    "messages": [{"role": "system", "content": master_prompt}],
                    "temperature": 0.2
                },
                headers={
                    "Authorization": f"Bearer {grok_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=15.0
            )
            
            result_text = ""
            if response.status_code == 200:
                data = response.json()
                result_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                logger.error(f"GROK_API_ERROR: {response.status_code} - {response.text}")
                result_text = await run_ollama_fallback(master_prompt)
                
            if result_text:
                try:
                    return _parse_llm_json(result_text)
                except Exception as e:
                    logger.error(f"AI_JSON_PARSE_FAILED: {e}\nPayload: {result_text}")
                    
    except Exception as e:
        logger.error(f"GROK_SERVICE_UNREACHABLE: {e}")
        result_text = await run_ollama_fallback(master_prompt)
        if result_text:
            try:
                return _parse_llm_json(result_text)
            except:
                pass
            
    # Return structured error if AI service is offline or failed
    return {
        "AI_ANALYSIS_UNAVAILABLE": True,
        "message": "AI analysis service is currently unavailable.",
        "severity_level": "INFO",
        "severity_score": 0,
        "explanation": "AI investigation system is offline. Automated analysis is currently restricted to pattern matching.",
        "chart_type": "line"
    }
