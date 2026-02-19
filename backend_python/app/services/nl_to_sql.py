# Mapping: backend/src/services/nlToSql.ts
import httpx
import json
import re
from typing import Dict, Any, List, Optional
from app.config import settings

SYSTEM_PROMPT = """You are an expert MySQL Data Analyst for "Querion".
Your goal is to convert natural language questions into EXACT, optimized MySQL SELECT queries.

CRITICAL RULES:
1. ONLY generate SELECT queries.
2. USE ONLY the tables and columns provided in the SCHEMA.
3. If columns for a specific table are not listed in "COLUMN DETAILS", but the table name is in "All Table Names", you can still query it if the question is simple (e.g., SELECT * FROM table).
4. INTELLIGENT MAPPING: Map synonyms intelligently. "diabetic patient" might mean a 'patients' table with a 'status', 'diagnosis', or 'outcome' column.
5. If the exact filter column is unclear, use a plausible one or a generic COUNT.
6. SAFETY: Do NOT assume ANY tables exist unless they are in the schema.
7. If the question mentions an entity (e.g. "patients") and you see a similar table name (e.g. "patient_data"), USE IT.
8. Output MUST be RAW JSON with "sql" and "explanation". No markdown.

Output format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does"
}
"""

async def convert_nl_to_sql(schema_context: str, user_prompt: str, custom_model: Optional[str] = None) -> Dict[str, Any]:
    api_key = settings.LLM_API_KEY
    base_url = settings.LLM_BASE_URL or 'https://openrouter.ai/api/v1'

    if not api_key or api_key in ['sk-...', 'your_openai_api_key']:
        return {
            "sql": None,
            "explanation": "LLM API Key is missing or invalid. Please configure a valid API key to generate queries."
        }

    if not schema_context or "Could not fetch schema" in schema_context:
        return {
            "sql": None,
            "explanation": schema_context or "Could not retrieve database schema. Please check your connection and try again."
        }

    models = [custom_model] if custom_model else [
        "google/gemma-3-27b:free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "deepseek/deepseek-r1:free",
        "meta-llama/llama-3.1-405b-instruct:free",
        "mistralai/mistral-small-24b-instruct-2501:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
    ]

    print(f"[SQL Gen] Prompt: \"{user_prompt}\"")
    
    error_log = []

    async with httpx.AsyncClient() as client:
        for model in models:
            try:
                print(f"[SQL Gen] Attempting model: {model}")
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": f"Schema:\n{schema_context}\n\nQuestion: {user_prompt}"}
                        ],
                        "temperature": 0.1
                    },
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://querion.app",
                        "X-Title": "Querion"
                    },
                    timeout=45.0
                )

                if response.status_code != 200:
                    msg = f"Model {model} failed with status {response.status_code}: {response.text}"
                    print(f"[SQL Gen] {msg}")
                    error_log.append(msg)
                    continue

                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content')
                
                if not content:
                    msg = f"Model {model} returned empty content."
                    print(f"[SQL Gen] {msg}")
                    error_log.append(msg)
                    continue

                # Clean up potentially messy JSON
                clean_content = content.replace('```json', '').replace('```', '').strip()
                start = clean_content.find('{')
                end = clean_content.rfind('}')

                if start != -1 and end != -1:
                    json_str = clean_content[start:end + 1]
                    try:
                        return json.loads(json_str)
                    except:
                        pass

                # Fallback: extract SQL directly if not JSON
                sql_match = re.search(r'SELECT\s+.*?;', content, re.IGNORECASE | re.DOTALL) or \
                            re.search(r'SELECT\s+.*$', content, re.IGNORECASE | re.DOTALL)
                if sql_match:
                    return {
                        "sql": sql_match.group(0),
                        "explanation": "Generated SQL directly (non-JSON response)."
                    }
                
                error_log.append(f"Model {model} returned invalid format.")

            except Exception as e:
                msg = f"Model {model} failed: {str(e)}"
                print(f"[SQL Gen] {msg}")
                error_log.append(msg)
                continue

    unique_errors = list(set(error_log))
    error_msg = " | ".join(unique_errors) if unique_errors else "All models failed with unknown errors."
    raise Exception(f"Failed to generate SQL from AI. Errors: {error_msg}")
