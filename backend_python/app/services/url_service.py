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

# Simple in-memory storage for session context
session_store: Dict[str, Dict[str, Any]] = {}

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
        raw_content = ''
        structured_data = None
        columns = None
        summary = None

        # Content Type Detection
        if 'text/html' in content_type or url.lower().endswith(('.html', '.htm')):
            data_type = 'html'
            soup = bs4.BeautifulSoup(data, 'html.parser')
            for s in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                s.decompose()
            raw_content = soup.get_text(separator=' ').strip()
            raw_content = " ".join(raw_content.split())
            if len(raw_content) > 100000:
                raw_content = raw_content[:100000]

        elif 'text/csv' in content_type or url.lower().endswith('.csv'):
            data_type = 'csv'
            # Use csv module for parsing
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

        elif 'application/json' in content_type or url.lower().endswith('.json'):
            data_type = 'json'
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
            "url": url,
            "type": data_type,
            "rawContent": raw_content,
            "structuredData": structured_data,
            "columns": columns,
            "summary": summary,
            "timestamp": int(time.time() * 1000)
        }

        session_store[session_id] = session
        return session

    @staticmethod
    async def query(connection_id: str, prompt: str) -> Dict[str, str]:
        session = session_store.get(connection_id)
        if not session:
            raise Exception("Connection session not found.")

        client = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )

        system_prompt = f"""You are a helper Data Analyst AI. You are analyzing a dataset from: {session['url']}.
        
        The user has provided a preview of the data below. 
        Your goal is to be helpful, insightful, and analytical.
        
        IMPORTANT: Visualization Rule
        If the user asks for a "dashboard", "chart", "graph", or "visual", you MUST return a valid JSON object (and ONLY the JSON object, no markdown) in this format:
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
            "explanation": "A one-sentence summary of the insight."
        }}
        
        - "type" should clearly match the best visualization for the data.
        - "data" must be an array of objects with "name" (string) and "value" (number) keys. Do NOT use other keys. Aggregation (sum/avg) must be done by YOU.
        - If the request is NOT for a visual, answer normally in text.
        - Do NOT say "information is not available" unless truly impossible.
        - You CAN infer trends and aggregate the sample data provided to create these charts."""

        try:
            completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context:\n{session['rawContent']}\n\nQuestion: {prompt}"}
                ],
                model="google/gemini-2.0-flash-001",
            )

            ai_answer = completion.choices[0].message.content or "No response."

            final_answer = ai_answer
            if "deep summary" in prompt.lower() or "official report" in prompt.lower():
                try:
                    grok_summary = await GrokService.generate_summary(session['rawContent'] + "\n\nUser Question: " + prompt)
                    final_answer = f"{grok_summary}\n\n---\n{ai_answer}"
                except Exception as e:
                    print(f"Grok query summary failed: {str(e)}")

            return {"answer": final_answer}
        except Exception as e:
            print(f"AI Error: {str(e)}")
            raise Exception(f"AI processing failed: {str(e)}")

    @staticmethod
    def get_session(session_id: str):
        return session_store.get(session_id)
