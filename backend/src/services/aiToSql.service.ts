import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

export const aiToSqlService = {
    generateSql: async (prompt: string, schemaSummary: string): Promise<string> => {
        try {
            const completion = await openai.chat.completions.create({
                model: 'openai/gpt-3.5-turbo', // Using a standard functional model via OpenRouter
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert SQL generator. given a database schema, convert the user's natural language question into a valid MySQL query.
            
            Schema:
            ${schemaSummary}
            
            Rules:
            1. Return ONLY the raw SQL query. No markdown formatting, no backticks, no explanation.
            2. The query must be READ-ONLY (SELECT only).
            3. Do not include semicolon at the end if possible, or it's fine.
            4. If the question cannot be answered by the schema, select "SELECT 'Error: Cannot answer query based on schema' as error".
            `
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
            });

            let sql = completion.choices[0]?.message?.content?.trim() || '';

            // Basic cleanup
            sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();

            return sql;
        } catch (error) {
            console.error('AI Service Error:', error);
            throw new Error('Failed to generate SQL from prompt');
        }
    }
};

