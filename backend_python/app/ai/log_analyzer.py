import httpx
import json
import logging

logger = logging.getLogger(__name__)

async def analyze_log(log_text: str, file_context: str = None) -> dict:
    # ── QUERION MASTER AI BRAIN PROMPT ──
    master_prompt = f"""You are the "Querion Autonomous Observability AI".
You are an intelligent Site Reliability Engineering (SRE) system designed to deeply understand system logs, inspect project source code, and identify the real root cause of issues.

YOUR RESPONSIBILITIES:
1. Analyze logs (backend, build, runtime, API, DB).
2. Detect failures, warnings, and successful executions.
3. Correlate logs with the provided project source code context.
4. Identify exactly where the problem originates in the codebase.

ERROR CLASSIFICATION:
- CRITICAL (Score 90-100): Syntax errors, build failures, compilation errors, fatal exceptions.
- ERROR (Score 70-89): Runtime failures, 500 API errors, DB timing issues.
- WARNING (Score 40-69): Deprecated functions, slow performance, partial degradation.
- INFO (Score 0-10): Successful processes, startup messages.

IMPACT ANALYSIS:
- UNSTABLE: App cannot run or render.
- RISK: Degraded performance or background failure.
- HEALTHY: Monitoring success/normal operations.

LOG TO ANALYZE:
{log_text}

FILE SOURCE CONTEXT:
{file_context or "No source code provided."}

INSTRUCTIONS:
- Trace stack traces back to the original file.
- If syntax/variable typo is present (e.g. 'setS tudents'), pinpoint it.
- Suggest a chart from: bar, pie, line, gauge, sankey, heatmap, treemap, waterfall.
- Return ONLY JSON.

JSON STRUCTURE:
{{
  "severity": "CRITICAL/ERROR/WARNING/INFO",
  "error_type": "",
  "file": "",
  "file_path": "",
  "line": "",
  "code_snippet": "",
  "root_cause": "",
  "impact": "",
  "explanation": "",
  "fix_steps": [],
  "generated_fix_code": "",
  "system_status": "UNSTABLE/RISK/HEALTHY",
  "risk_level": "percentage",
  "severity_score": number,
  "confidence_score": 0.0-1.0,
  "chart_suggestion": "chart_type"
}}
"""
    prompt = master_prompt

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://127.0.0.1:11434/api/generate", json={
                "model": "phi3:latest",
                "prompt": prompt,
                "stream": False
            }, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                result_text = data.get("response", "")
                
                # Attempt to extract JSON from response
                import re
                json_match = re.search(r'```json(.*?)```', result_text, re.DOTALL)
                if json_match:
                    result_text = json_match.group(1).strip()
                else:
                    # sometimes phi3 might output without code blocks
                    json_start = result_text.find('{')
                    json_end = result_text.rfind('}')
                    if json_start != -1 and json_end != -1:
                        result_text = result_text[json_start:json_end+1]
                
                try:
                    return json.loads(result_text)
                except Exception as e:
                    logger.error(f"Failed to parse Ollama JSON: {e} | Text: {result_text}")
    except Exception as e:
        logger.error(f"Error calling local Ollama Phi3: {e}")
        
    # Emergency Fallback - Simple regex based analysis if AI is offline
    is_err = any(kw in log_text.lower() for kw in ["error", "fail", "unexpected", "exception", "failed"])
    err_type = "System Log"
    cause = "Routine log execution."
    if "unexpected token" in log_text.lower():
        err_type = "Syntax Error"
        cause = "Possible syntax typo or missing token (e.g. comma or bracket) in codebase."
    elif "timeout" in log_text.lower():
        err_type = "Connection Timeout"
        cause = "Internal service or database connection timed out."
    elif "at " in log_text.lower():
        err_type = "Runtime Traceback"
        cause = "Exception captured in runtime execution stack."

    return {
        "severity": "CRITICAL" if is_err else "INFO",
        "error_type": err_type,
        "root_cause": f"[OFFLINE] {cause}",
        "impact": "Infrastructure monitoring active. Deep AI reasoning is pending Ollama recovery.",
        "explanation": f"Automated analysis of: {log_text[:200]}...",
        "fix_steps": [
            "Check code for syntax typos",
            "Verify database/API connectivity",
            "Restart Ollama service (ollama serve)"
        ],
        "system_status": "DEGRADED" if is_err else "HEALTHY",
        "risk_level": "80%" if is_err else "0%",
        "severity_score": 90 if is_err else 5
    }
