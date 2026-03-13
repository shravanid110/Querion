import httpx
import json
import logging
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

async def analyze_log(log_text: str, file_context: str = None) -> dict:
    """
    Querion AI Observability Engine - Senior SRE Agent.
    Performs deep analysis of grouped logs, correlates with source code, 
    and generates root cause insights with fixes.
    """
    
    master_prompt = f"""You are the Querion AI Observability Engine.
You are an autonomous Site Reliability Engineering (SRE) system responsible for understanding software logs, scanning project code, identifying failures, and generating root cause explanations with solutions.

Analyze the following grouped log event and project file context deeply to produce observability insights.

LOG EVENT:
{log_text}

PROJECT FILE CONTEXT:
{file_context or "No source code available."}

TASKS:
1. Identify whether the log indicates: error, warning, or successful execution.
2. If an error exists: find the affected file, detect the line number, analyze the code snippet, explain why the error occurred.
3. Generate step-by-step instructions to fix the issue.
4. Provide corrected code if applicable.
5. Generate terminal commands if needed.
6. Suggest the best chart to visualize this event in the monitoring dashboard (pie, bar, line, gauge, sankey).
7. If no error exists: explain what the log indicates and why the system is working correctly.

DEBUGGING FRAMEWORK:
- Error Identification (Syntax, Runtime, Logical, Dependency, Build, Command)
- Error Message Analysis (File, Line, Column)
- Code Context Analysis (Imports, Variables, Brackets, Syntax)
- Root Cause Detection
- Fix Generation
- Prevention Advice
- Debugging Flow Explanation

SEVERITY CLASSIFICATION:
- CRITICAL (Syntax errors, Build failures, Server crashes) -> Score 90-100
- ERROR (Runtime failures, API errors, DB errors) -> Score 70-89
- WARNING (Slow operations, Deprecated features) -> Score 40-69
- INFO (Normal execution, Server start, Success) -> Score 0-39

SYSTEM STATUS:
- UNSTABLE: cannot run or render.
- RISK: connectivity/degraded.
- HEALTHY: normal operation.

OUTPUT RULES:
- Return ONLY JSON.
- Never mention the name of the AI model.
- Be deep, structured, and educational.

REQUIRED JSON FORMAT:
{{
  "severity_level": "CRITICAL",
  "severity_score": 95,
  "error_type": "...",
  "system_status": "UNSTABLE",
  "affected_file": "...",
  "file_path": "...",
  "line_number": "...",
  "code_snippet": "...",
  "root_cause": "...",
  "explanation": "...",
  "detailed_explanation": "...",
  "impact": "...",
  "fix_steps": ["Step 1...", "Step 2..."],
  "generated_fix_code": "...",
  "correct_code": "...",
  "terminal_commands": ["..."],
  "prevention_advice": ["..."],
  "chart_type": "bar",
  "dashboard_label": "..."
}}
"""

    try:
        async with httpx.AsyncClient() as client:
            # Using phi3 as requested model in context
            response = await client.post("http://127.0.0.1:11434/api/generate", json={
                "model": "phi3:latest",
                "prompt": master_prompt,
                "stream": False
            }, timeout=45.0)
            
            if response.status_code == 200:
                data = response.json()
                result_text = data.get("response", "")
                
                # Attempt to extract JSON
                json_match = re.search(r'```json(.*?)```', result_text, re.DOTALL)
                if json_match:
                    result_text = json_match.group(1).strip()
                else:
                    json_start = result_text.find('{')
                    json_end = result_text.rfind('}')
                    if json_start != -1 and json_end != -1:
                        result_text = result_text[json_start:json_end+1]
                
                try:
                    return json.loads(result_text)
                except Exception as e:
                    logger.error(f"AI_JSON_PARSE_FAILED: {e}")
            else:
                logger.error(f"AI_SERVICE_HTTP_ERROR: {response.status_code}")
                
    except Exception as e:
        logger.error(f"AI_INVESTIGATION_SERVICE_UNREACHABLE: {e}")
        
    # Return structured error if AI service is offline or failed
    return {
        "AI_ANALYSIS_UNAVAILABLE": True,
        "message": "AI analysis service is currently unavailable.",
        "severity_level": "INFO",
        "severity_score": 0,
        "explanation": "AI investigation system is offline. Automated analysis is currently restricted to pattern matching.",
        "chart_type": "line"
    }
