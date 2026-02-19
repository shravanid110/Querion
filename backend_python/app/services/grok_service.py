import httpx
from app.config import settings

class GrokService:
    @staticmethod
    async def generate_summary(data_preview: str) -> str:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    json={
                        "model": "grok-beta",
                        "messages": [
                            {
                                "role": "system",
                                "content": """You are an expert Data Scientist at Querion. 
                                Your goal is to provide a Deep, Professional, and Official-format Summary of the dataset provided.
                                Include:
                                1. Executive Overview
                                2. Data Quality & Structure Analysis
                                3. Key Insights (Top 3-5 trends)
                                4. Strategic Recommendations
                                Use professional language, clear headings, and be extremely thorough."""
                            },
                            {
                                "role": "user",
                                "content": f"Here is a preview of the dataset:\n{data_preview}"
                            }
                        ],
                        "temperature": 0.7
                    },
                    headers={
                        "Authorization": f"Bearer {settings.GROK_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    print(f"Grok API Error: {response.text}")
                    return "Failed to generate deep summary via Grok."

                data = response.json()
                return data["choices"][0]["message"]["content"] or "Summary generation failed."
        except Exception as e:
            print(f"Grok Service Error: {str(e)}")
            return "Failed to generate deep summary via Grok."
