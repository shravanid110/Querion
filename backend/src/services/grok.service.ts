import axios from 'axios';

export class GrokService {
    private static readonly API_KEY = process.env.GROK_API_KEY;
    private static readonly BASE_URL = "https://api.x.ai/v1";

    static async generateSummary(dataPreview: string): Promise<string> {
        try {
            const response = await axios.post(
                `${this.BASE_URL}/chat/completions`,
                {
                    model: "grok-beta",
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert Data Scientist at Querion. 
                            Your goal is to provide a Deep, Professional, and Official-format Summary of the dataset provided.
                            Include:
                            1. Executive Overview
                            2. Data Quality & Structure Analysis
                            3. Key Insights (Top 3-5 trends)
                            4. Strategic Recommendations
                            Use professional language, clear headings, and be extremely thorough.`
                        },
                        {
                            role: "user",
                            content: `Here is a preview of the dataset:\n${dataPreview}`
                        }
                    ],
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content || "Summary generation failed.";
        } catch (error: any) {
            console.error("Grok API Error:", error.response?.data || error.message);
            return "Failed to generate deep summary via Grok.";
        }
    }
}
