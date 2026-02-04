import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'csv-parse/sync';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { GrokService } from './grok.service';

interface ProcessedData {
    id: string;
    url: string;
    type: 'html' | 'csv' | 'json' | 'text';
    rawContent: string; // The full text for AI context
    structuredData?: any[]; // For CSV/JSON visualization
    columns?: string[];
    summary?: string;
    timestamp: number;
}

// Simple in-memory storage for session context
// In production, use Redis or a Database
const sessionStore = new Map<string, ProcessedData>();

export class UrlService {

    private static readonly API_KEY = process.env.LLM_API_KEY;

    private static async fetchContent(url: string): Promise<{ data: any, contentType: string }> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                timeout: 10000,
                responseType: 'text'
            });
            return { data: response.data, contentType: response.headers['content-type'] || 'text/plain' };
        } catch (error: any) {
            throw new Error(`Failed to fetch URL: ${error.message}`);
        }
    }

    static async connect(url: string): Promise<ProcessedData> {
        const { data, contentType } = await this.fetchContent(url);

        let type: 'html' | 'csv' | 'json' | 'text' = 'text';
        let rawContent = '';
        let structuredData = undefined;
        let columns = undefined;
        let summary = undefined;

        // Content Type Detection
        if (contentType.includes('text/html') || url.match(/\.html?$/i)) {
            type = 'html';
            const $ = cheerio.load(data);
            $('script').remove();
            $('style').remove();
            $('nav, footer, header, aside, .ad, .advertisement').remove();
            rawContent = $('body').text().replace(/\s+/g, ' ').trim();
            if (rawContent.length > 100000) rawContent = rawContent.substring(0, 100000);

        } else if (contentType.includes('text/csv') || url.match(/\.csv$/i)) {
            type = 'csv';
            const records = parse(typeof data === 'string' ? data : JSON.stringify(data), {
                columns: true,
                skip_empty_lines: true,
                cast: true,
                bom: true
            }) as Record<string, any>[];

            // Limit for visualization safely - Increased to 100,000 per user request
            structuredData = records.slice(0, 100000);

            if (records.length > 0 && typeof records[0] === 'object' && records[0] !== null) {
                columns = Object.keys(records[0]);
            }

            const previewData = records.slice(0, 50);
            rawContent = `Dataset Preview (first 50 rows):\n${JSON.stringify(previewData, null, 2)}\n\nSchema: ${columns?.join(', ')}`;

            // Generate Deep Summary using Grok
            try {
                summary = await GrokService.generateSummary(rawContent);
            } catch (err) {
                console.error("Grok summary failed:", err);
            }

        } else if (contentType.includes('application/json') || url.match(/\.json$/i)) {
            type = 'json';
            const jsonData = typeof data === 'string' ? JSON.parse(data) : data;

            if (Array.isArray(jsonData)) {
                structuredData = jsonData.slice(0, 2000) as any[];
                if (jsonData.length > 0) columns = Object.keys((jsonData as any[])[0]);
            }
            rawContent = JSON.stringify(jsonData).substring(0, 50000);
        } else {
            rawContent = String(data).substring(0, 100000);
        }

        const id = uuidv4();
        const session: ProcessedData = {
            id,
            url,
            type,
            rawContent,
            structuredData,
            columns,
            summary,
            timestamp: Date.now()
        };

        sessionStore.set(id, session);
        return session;
    }

    static async query(connectionId: string, prompt: string): Promise<{ answer: string }> {
        const session = sessionStore.get(connectionId);
        if (!session) {
            throw new Error("Connection session not found.");
        }

        const openai = new OpenAI({
            apiKey: UrlService.API_KEY,
            baseURL: "https://openrouter.ai/api/v1",
        });

        const systemPrompt = `You are a helper Data Analyst AI. You are analyzing a dataset from: ${session.url}.
        
        The user has provided a preview of the data below. 
        Your goal is to be helpful, insightful, and analytical.
        
        IMPORTANT: Visualization Rule
        If the user asks for a "dashboard", "chart", "graph", or "visual", you MUST return a valid JSON object (and ONLY the JSON object, no markdown) in this format:
        {
            "isChart": true,
            "type": "bar" | "line" | "pie" | "area", 
            "title": "A descriptive title",
            "data": [
                { "name": "Label1", "value": 100 },
                { "name": "Label2", "value": 200 }
            ],
            "xAxisLabel": "X Axis Label",
            "yAxisLabel": "Y Axis Label",
            "explanation": "A one-sentence summary of the insight."
        }
        
        - "type" should clearly match the best visualization for the data.
        - "data" must be an array of objects with "name" (string) and "value" (number) keys. Do NOT use other keys. Aggregation (sum/avg) must be done by YOU.
        - If the request is NOT for a visual, answer normally in text.
        - Do NOT say "information is not available" unless truly impossible.
        - You CAN infer trends and aggregate the sample data provided to create these charts.`;

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Context:\n${session.rawContent}\n\nQuestion: ${prompt}` }
                ],
                model: "google/gemini-2.0-flash-001",
            });

            const aiAnswer = completion.choices[0].message.content || "No response.";

            let finalAnswer = aiAnswer;
            if (prompt.toLowerCase().includes("deep summary") || prompt.toLowerCase().includes("official report")) {
                try {
                    const grokSummary = await GrokService.generateSummary(session.rawContent + "\n\nUser Question: " + prompt);
                    finalAnswer = grokSummary + "\n\n---\n" + aiAnswer;
                } catch (err) {
                    console.error("Grok query summary failed:", err);
                }
            }

            return { answer: finalAnswer };
        } catch (error: any) {
            console.error("AI Error:", error);
            throw new Error(`AI processing failed: ${error.message}`);
        }
    }

    static getSession(id: string) {
        return sessionStore.get(id);
    }
}
