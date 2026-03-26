# Mapping: backend/src/services/url.service.ts
import httpx
import bs4
import csv
import json
import uuid
import time
from typing import Dict, Any, List, Optional
from openai import OpenAI
from app.config import settings
from .grok_service import GrokService

# Simple persistence for session context
SESSION_FILE = "url_sessions.json"
session_store: Dict[str, Dict[str, Any]] = {}

def save_sessions():
    try:
        # Filter out very large rawContent if needed, but for now just save
        # Convert objects to serializable if needed, but they are dicts
        with open(SESSION_FILE, "w") as f:
            json.dump(session_store, f)
    except Exception as e:
        print(f"Failed to save sessions: {str(e)}")

def load_sessions():
    global session_store
    try:
        import os
        if os.path.exists(SESSION_FILE):
            with open(SESSION_FILE, "r") as f:
                session_store = json.load(f)
            print(f"Loaded {len(session_store)} sessions from {SESSION_FILE}")
    except Exception as e:
        print(f"Failed to load sessions: {str(e)}")

load_sessions()

class UrlService:
    @staticmethod
    async def fetch_content(url: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    },
                    timeout=10.0,
                    follow_redirects=True
                )
                return {
                    "data": response.text,
                    "content_type": response.headers.get('content-type', 'text/plain')
                }
        except Exception as e:
            raise Exception(f"Failed to fetch URL: {str(e)}")

    @staticmethod
    async def connect(url: str) -> Dict[str, Any]:
        result = await UrlService.fetch_content(url)
        data = result["data"]
        content_type = result["content_type"]

        data_type = 'text'
        if 'text/html' in content_type or url.lower().endswith(('.html', '.htm')):
            data_type = 'html'
        elif 'text/csv' in content_type or url.lower().endswith('.csv'):
            data_type = 'csv'
        elif 'application/json' in content_type or url.lower().endswith('.json'):
            data_type = 'json'
            
        return await UrlService.connect_content(data, url, data_type)

    @staticmethod
    async def connect_content(data: str, source_name: str, data_type: str) -> Dict[str, Any]:
        raw_content = ''
        structured_data = None
        columns = None
        summary = None

        if data_type == 'html':
            soup = bs4.BeautifulSoup(data, 'html.parser')
            for s in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                s.decompose()
            raw_content = soup.get_text(separator=' ').strip()
            raw_content = " ".join(raw_content.split())
            if len(raw_content) > 100000:
                raw_content = raw_content[:100000]

        elif data_type == 'csv':
            lines = data.splitlines()
            reader = csv.DictReader(lines)
            records = list(reader)
            
            structured_data = records[:100000]
            if records:
                columns = list(records[0].keys())

            preview_data = records[:50]
            raw_content = f"Dataset Preview (first 50 rows):\n{json.dumps(preview_data, indent=2)}\n\nSchema: {', '.join(columns) if columns else ''}"

            try:
                summary = await GrokService.generate_summary(raw_content)
            except Exception as e:
                print(f"Grok summary failed: {str(e)}")

        elif data_type == 'json':
            json_data = json.loads(data)

            if isinstance(json_data, list):
                structured_data = json_data[:2000]
                if json_data:
                    columns = list(json_data[0].keys())
            
            raw_content = json.dumps(json_data)[:50000]
        else:
            raw_content = str(data)[:100000]

        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "url": source_name,
            "type": data_type,
            "rawContent": raw_content,
            "structuredData": structured_data,
            "columns": columns,
            "summary": summary,
            "timestamp": int(time.time() * 1000)
        }

        session_store[session_id] = session
        save_sessions()
        return session

    @staticmethod
    async def query(connection_id: str, prompt: str) -> Dict[str, str]:
        import traceback
        try:
            session = session_store.get(connection_id)
            if not session:
                return {"answer": "I'm sorry, I've lost the context for this session because the server restarted. Please go back to the 'Connect' page and reconnect your dataset."}

            # Prioritize OpenRouter Key from any available setting
            api_key = settings.OPENROUTER_API_KEY or settings.LLM_API_KEY
            if not api_key:
                return {"answer": "I don't have an AI API key configured. Please add your OpenRouter key to the .env file."}

            # Using httpx directly to avoid library-specific keyword argument crashes (like 'proxies' or 'extra_headers')
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://querion.ai",
                "X-Title": "Querion Intelligence",
                "Content-Type": "application/json"
            }

            system_prompt = f"""You are a helper Data Analyst AI. You are analyzing a dataset from: {session['url']}.
            
            The user has provided a preview of the data below. 
            Your goal is to be helpful, insightful, and analytical.
            
            STRICT VISUALIZATION RULE:
            If the user asks for a "dashboard", "chart", "graph", or "visual", you MUST return ONLY a raw JSON object. 
            Do NOT include any conversational text like "Here is your chart" or "I have generated the visual". 
            Do NOT include markdown backticks unless strictly necessary.
            
            Detailed Explanations:
            If the user asks for both a chart and an explanation/detail, provide the FULL explanation inside the "explanation" field of the JSON. Do not put text outside the JSON.

            JSON Format for Charts:
            {{
                "isChart": true,
                "type": "bar" | "line" | "pie" | "area", 
                "title": "A descriptive title",
                "data": [
                    {{ "name": "Label1", "value": 100 }},
                    {{ "name": "Label2", "value": 200 }}
                ],
                "xAxisLabel": "X Axis Label",
                "yAxisLabel": "Y Axis Label",
                "explanation": "A detailed multi-sentence analysis of the data and the chart shown."
            }}
            
            - AGGREGATION IS REQUIRED: If the dataset has multiple rows for the same category, you MUST calculate the AVERAGE, SUM, or COUNT and return ONLY the summarized data. 
            - DO NOT return raw rows. The "data" array should contain no more than 15 aggregated items.
            - format: "data": [{"name": "Category", "value": 12.5}, ...]
            - If the request is NOT for a visual, answer normally in text.
            - Do NOT say "information is not available" unless truly impossible.
            - You CAN infer trends and aggregate the sample data provided to create these charts."""

            models_to_try = [
                "google/gemini-2.0-flash-001",
                "google/gemini-flash-1.5",
                "google/gemini-2.0-flash-lite-preview-02-05:free",
                "openai/gpt-3.5-turbo",
                "anthropic/claude-3-haiku",
                "meta-llama/llama-3.1-8b-instruct:free",
                "google/gemini-pro-1.5"
            ]

            ai_answer = ""
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                for model_name in models_to_try:
                    try:
                        print(f"[AI Service] Trying model: {model_name} via Direct HTTP")
                        response = await client.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers=headers,
                            json={
                                "model": model_name,
                                "messages": [
                                    {"role": "system", "content": system_prompt},
                                    {"role": "user", "content": f"Context:\n{session['rawContent']}\n\nQuestion: {prompt}"}
                                ]
                            }
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            ai_answer = data["choices"][0]["message"]["content"] or ""
                            if ai_answer:
                                print(f"[AI Service] SUCCESS with {model_name}")
                                break
                        else:
                            print(f"[AI Service] {model_name} returned status {response.status_code}: {response.text}")
                    except Exception as e:
                        print(f"[AI Service] Request to {model_name} failed: {str(e)}")
                        continue

            if not ai_answer:
                return {"answer": "I'm sorry, all AI models failed to respond. This usually means the API key is out of credits or invalid."}

            return {"answer": ai_answer}

        except Exception as e:
            print(f"[AI Service] CRITICAL ERROR: {str(e)}")
            traceback.print_exc()
            return {"answer": f"I encountered a technical error: {str(e)}. Please check the backend logs."}

    @staticmethod
    def get_session(session_id: str):
        return session_store.get(session_id)
