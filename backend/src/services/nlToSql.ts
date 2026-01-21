import axios from 'axios';

const SYSTEM_PROMPT = `You are an expert MySQL Data Analyst for "Querion".
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
`;

export const convertNlToSql = async (schemaContext: string, userPrompt: string): Promise<{ sql: string | null; explanation: string }> => {
    const apiKey = process.env.LLM_API_KEY;
    const baseURL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey || apiKey === 'sk-...' || apiKey === 'your_openai_api_key') {
        return {
            sql: null,
            explanation: "LLM API Key is missing or invalid. Please configure a valid API key to generate queries."
        };
    }

    if (!schemaContext || schemaContext.includes("Could not fetch schema")) {
        return {
            sql: null,
            explanation: schemaContext || "Could not retrieve database schema. Please check your connection and try again."
        };
    }

    const customModel = process.env.LLM_MODEL;
    const models = customModel ? [customModel] : [
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-flash-1.5:free",
        "google/gemini-flash-1.5-8b:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "qwen/qwen-2.5-72b-instruct:free"
    ];

    console.log(`[SQL Gen] Prompt: "${userPrompt}"`);
    console.log(`[SQL Gen] Schema snippet: ${schemaContext.substring(0, 200)}...`);

    let lastError: any = null;
    for (const model of models) {
        try {
            console.log(`[SQL Gen] Attempting model: ${model}`);
            const response = await axios.post(
                `${baseURL}/chat/completions`,
                {
                    model: model,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: `Schema:\n${schemaContext}\n\nQuestion: ${userPrompt}` }
                    ],
                    temperature: 0.1
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://querion.app',
                        'X-Title': 'Querion'
                    },
                    timeout: 20000
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                console.warn(`[SQL Gen] Model ${model} returned empty content.`);
                continue;
            }

            try {
                // Clean up potentially messy JSON
                const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const start = cleanContent.indexOf('{');
                const end = cleanContent.lastIndexOf('}');

                if (start !== -1 && end !== -1) {
                    const jsonStr = cleanContent.substring(start, end + 1);
                    return JSON.parse(jsonStr);
                }

                // Fallback: extract SQL directly if not JSON
                const sqlMatch = content.match(/SELECT\s+.*?;/is) || content.match(/SELECT\s+.*$/is);
                if (sqlMatch) {
                    return {
                        sql: sqlMatch[0],
                        explanation: "Generated SQL directly (non-JSON response)."
                    };
                }
                throw new Error("Could not parse JSON or SQL from AI response.");

            } catch (e) {
                console.warn(`Model ${model} returned invalid format, trying next...`);
                continue;
            }

        } catch (error: any) {
            lastError = error;
            const openRouterError = error.response?.data?.error?.message || error.message;
            console.warn(`[SQL Gen] Model ${model} failed: ${openRouterError}`);
            continue;
        }
    }

    const errorMsg = lastError?.response?.data?.error?.message || lastError?.message || "All models failed";
    throw new Error(`Failed to generate SQL from AI: ${errorMsg}`);
};
