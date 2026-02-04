import { Router, Request, Response } from 'express';
import { UrlService } from '../services/url.service';

const router = Router();

// Connect to a URL
router.post('/connect', async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;

        if (!url) {
            res.status(400).json({ error: "URL is required." });
            return;
        }

        const session = await UrlService.connect(url);

        res.json({
            connectionId: session.id,
            type: session.type,
            summary: session.summary || "Successfully connected. You can now query the content.",
            // Return columns for initial setup if available
            columns: session.columns,
            // Return full data so frontend can show all rows
            preview: session.structuredData,
            data: session.structuredData
        });
    } catch (error: any) {
        console.error("Connection Error:", error);
        res.status(500).json({ error: error.message || "Failed to connect to URL." });
    }
});

// Query the connected URL content
router.post('/query', async (req: Request, res: Response): Promise<void> => {
    try {
        const { connectionId, prompt } = req.body;

        if (!connectionId || !prompt) {
            res.status(400).json({ error: "Connection ID and Prompt are required." });
            return;
        }

        const answer = await UrlService.query(connectionId, prompt);

        res.json({
            answer: answer.answer,
        });

    } catch (error: any) {
        console.error("Query Error:", error);
        res.status(500).json({ error: error.message || "Failed to process query." });
    }
});

// Get session details (for visualizations, etc.)
router.get('/session/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = UrlService.getSession(id);

    if (!session) {
        res.status(404).json({ error: "Session not found." });
        return;
    }

    res.json({
        id: session.id,
        url: session.url,
        type: session.type,
        columns: session.columns,
        structuredData: session.structuredData, // Be careful if massive
        timestamp: session.timestamp
    });
});

export const urlConnectRoutes = router;
