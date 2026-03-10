import httpx
import json
import logging

logger = logging.getLogger(__name__)

async def analyze_log(log_text: str) -> dict:
    prompt = f"""Analyze this backend log.

Log:
{log_text}

Return JSON with:
type
severity
cause
suggested_fix"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:11434/api/generate", json={
                "model": "phi3",
                "prompt": prompt,
                "stream": False
            }, timeout=15.0)
            
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
        
    return {
        "type": "error",
        "severity": "medium",
        "cause": "Unknown issue parsing log",
        "suggested_fix": "Investigate logs manually."
    }
