# Mapping: backend/src/services/aiToSql.service.ts
from openai import OpenAI
from app.config import settings

class AiToSqlService:
    @staticmethod
    async def generate_sql(prompt: str, schema_summary: str) -> str:
        try:
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.OPENROUTER_API_KEY,
            )
            
            completion = client.chat.completions.create(
                model="openai/gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert SQL generator. given a database schema, convert the user's natural language question into a valid MySQL query.
            
            Schema:
            {schema_summary}
            
            Rules:
            1. Return ONLY the raw SQL query. No markdown formatting, no backticks, no explanation.
            2. The query must be READ-ONLY (SELECT only).
            3. Do not include semicolon at the end if possible, or it's fine.
            4. If the question cannot be answered by the schema, select "SELECT 'Error: Cannot answer query based on schema' as error".
            """
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
            )

            cpu_sql = completion.choices[0].message.content or ""
            sql = cpu_sql.strip()

            # Basic cleanup
            sql = sql.replace("```sql", "").replace("```", "").strip()

            return sql
        except Exception as e:
            print(f"AI Service Error: {str(e)}")
            raise Exception("Failed to generate SQL from prompt")
