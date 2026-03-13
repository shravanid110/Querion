# Mapping: backend/src/services/nlToSql.ts
import httpx
import json
import re
from typing import Dict, Any, List, Optional
from app.config import settings

SYSTEM_PROMPT = """You are a highly intelligent, context-aware Query Assistant for the Querion dashboard.
Your purpose is to monitor, explain, and provide DEEP INSIGHTS for all database interactions while strictly enforcing read-only access.

── CRITICAL BEHAVIORAL RULES ────────────────────────────────────────────────
1. DB-TYPE AWARENESS: You will be told the database type (e.g., PostgreSQL, Redis, MongoDB).
   - For SQL DBs (Postgres, MySQL, SQLite, Oracle, MSSQL): Generate standard SQL (SELECT only).
   - For Redis: Generate a raw command string. 
     * To list keys: "KEYS *" (Standard way to list all data)
     * To get value: "GET mykey" or "HGETALL myhash"
     * To check memory: "MEMORY USAGE mykey"
   - For MongoDB: Generate a JSON object. SQL is NOT supported.
     * Format: {"collection": "users", "find": {}} or {"collection": "orders", "pipeline": []}
     * To see all data: {"collection": "customers", "find": {}}

2. READ-ONLY ENFORCEMENT: Strictly reject any query or prompt that attempts to modify the database.
   - Response: "Database modifications are not allowed. This dashboard is strictly read-only."

3. OUTPUT FORMATTING (MANDATORY): Your "explanation" field must be a detailed summary.
   Use this structure in the explanation:
   ```
   ⚠ Query Explanation:
   Reason: [Detailed reason for success/failure]
   Available Data: [Context about tables/cols or redis keys]

   📊 Data Visualization & Insights:
   [Identify key trends, outliers, or patterns]

   ✅ Query Summary:
   Executed Query: [SQL or Command]
   Tables/Collections/Keys Accessed: [Names]
   ```

4. CHART RECOMMENDATION: Always suggest the best chart type ('bar', 'line', 'pie', 'area') for the result data in a "suggestedChart" field.

Output MUST be RAW JSON with "sql", "explanation", and "suggestedChart". 
NOTE: Put the command/query string in the "sql" field.
"""

async def convert_nl_to_sql(schema_context: str, user_prompt: str, db_type: str = "SQL", custom_model: Optional[str] = None) -> Dict[str, Any]:
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
        "google/gemini-2.0-flash-001",
        "google/gemini-2.0-flash-lite-preview-02-05",
        "meta-llama/llama-3.3-70b-instruct",
        "anthropic/claude-3-haiku",
        "google/gemini-flash-1.5-8b:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "openrouter/auto"
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
                            {"role": "user", "content": f"Database Type: {db_type}\nSchema/Context:\n{schema_context}\n\nQuestion: {user_prompt}"}
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

async def generate_data_insights(user_prompt: str, sql: str, data: List[Dict[str, Any]], schema_context: str) -> str:
    """Enriches the AI explanation with actual data insights after query execution."""
    api_key = settings.LLM_API_KEY
    base_url = settings.LLM_BASE_URL or 'https://openrouter.ai/api/v1'

    if not api_key:
        return "Insights unavailable (API Key not configured)."

    # Sample data for the LLM (first 10 rows to keep context small)
    data_sample = data[:10]
    total_rows = len(data)
    
    # Simple data summary
    numeric_columns = []
    if data:
        numeric_columns = [k for k, v in data[0].items() if isinstance(v, (int, float))]
    
    analysis_prompt = f"""You are a Data Analyst Expert.
User Question: {user_prompt}
Executed SQL: {sql}
Results Found: {total_rows} rows.

Data Sample (First 10 rows):
{json.dumps(data_sample, indent=2)}

Task:
Provide a deep, professional analysis of these results for the Querion "AI Summary" dashboard box.
1. Explain what the data shows in relation to the user's prompt.
2. Highlight key trends, top values, or interesting outliers.
3. If charts are shown (Bars/Lines/Pie), explain what the values represent.
4. Mention specific 'Important Types' or 'Names' found in the data.

5. CHART RECOMMENDATION: End your response with a clear recommendation: "CHART_TYPE: [bar|line|pie|area]" based on which visualizes this specific data best.

Structure your response using these headers:
📊 Data Visualization & Insights:
[Your detailed analysis here]

✅ Query Summary:
Executed SQL: {sql}
Rows Returned: {total_rows}
CHART_TYPE: [type]
"""

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/chat/completions",
                json={
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [
                        {"role": "system", "content": "You are a helpful expert data analyst. Be concise but insightful."},
                        {"role": "user", "content": analysis_prompt}
                    ],
                    "temperature": 0.3
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            if response.status_code == 200:
                content = response.json().get('choices', [{}])[0].get('message', {}).get('content', "")
                return content
            return "Failed to generate deep data insights."
        except Exception as e:
            print(f"[Insights Error] {str(e)}")
            return "Error generating insights from data."
