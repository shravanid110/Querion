import { Router, Request, Response } from 'express';
import axios from 'axios';
import { URL } from 'url';

const router = Router();

interface ScanResult {
    status: "safe" | "blocked";
    score: number;
    issues: string[];
    domain: string;
    fileSize: number;
    riskLevel: "Low" | "Medium" | "High";
}

const MALICIOUS_PATTERNS = [
    /<script/i,
    /alert\(/i,
    /onerror/i,
    /eval\(/i,
    /SELECT.*FROM/i,
    /INSERT.*INTO/i,
    /DELETE.*FROM/i,
    /DROP.*TABLE/i,
    /UNION.*SELECT/i,
    /OR.*1=1/i,
];

const HARMFUL_KEYWORDS = [
    'drugs', 'bomb', 'terror', 'porn', 'violence', 'hate', 'suicide', 'kill', 'attack'
];

const CSV_INJECTION_PREFIXES = ['=', '+', '-', '@'];

const isPrivateIP = (host: string): boolean => {
    const parts = host.split('.');
    if (parts.length === 4) {
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        if (first === 10) return true;
        if (first === 127) return true;
        if (first === 172 && (second >= 16 && second <= 31)) return true;
        if (first === 192 && second === 168) return true;
    }
    return host === 'localhost' || host === '::1';
};

router.post('/scan-url', async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const parsedUrl = new URL(url);

        // 1. HTTPS validation
        if (parsedUrl.protocol !== 'https:') {
            return res.status(200).json({
                status: "blocked",
                score: 0,
                issues: ["URL must use HTTPS for secure data transfer."],
                domain: parsedUrl.hostname,
                fileSize: 0,
                riskLevel: "High"
            });
        }

        // 2. CSV extension check
        if (!parsedUrl.pathname.toLowerCase().endsWith('.csv')) {
            return res.status(200).json({
                status: "blocked",
                score: 10,
                issues: ["URL must point to a .csv file."],
                domain: parsedUrl.hostname,
                fileSize: 0,
                riskLevel: "High"
            });
        }

        // 3. Private IP check
        if (isPrivateIP(parsedUrl.hostname)) {
            return res.status(200).json({
                status: "blocked",
                score: 0,
                issues: ["Access to private network or localhost is restricted."],
                domain: parsedUrl.hostname,
                fileSize: 0,
                riskLevel: "High"
            });
        }

        // 4. Fetch metadata (File size check)
        let headResponse;
        try {
            headResponse = await axios.head(url, { timeout: 5000 });
        } catch (e) {
            // If HEAD fails, we'll try GET but limit the range or just proceed to GET
        }

        const contentLength = headResponse?.headers['content-length'];
        const fileSize = contentLength ? parseInt(contentLength) : 0;
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        if (fileSize > MAX_SIZE) {
            return res.status(200).json({
                status: "blocked",
                score: 20,
                issues: ["File size exceeds 5MB limit."],
                domain: parsedUrl.hostname,
                fileSize: Math.round(fileSize / 1024),
                riskLevel: "High"
            });
        }

        // 5. Content Scanning (First 100KB for safety checks)
        const issues: string[] = [];
        let score = 100;

        try {
            const response = await axios.get(url, {
                timeout: 10000,
                responseType: 'text',
                headers: { 'Range': 'bytes=0-102400' } // Get first 100KB
            });

            const content = response.data;

            // Script/SQL Injection
            for (const pattern of MALICIOUS_PATTERNS) {
                if (pattern.test(content)) {
                    issues.push(`Detected malicious pattern: ${pattern.source}`);
                    score -= 30;
                }
            }

            // Harmful Keywords
            for (const keyword of HARMFUL_KEYWORDS) {
                if (content.toLowerCase().includes(keyword.toLowerCase())) {
                    issues.push(`Detected prohibited keyword: ${keyword}`);
                    score -= 20;
                }
            }

            // CSV Formula Injection
            const lines = content.split('\n');
            let formulaInjections = 0;
            for (const line of lines.slice(0, 100)) { // Check first 100 lines
                const cells = line.split(',');
                for (const cell of cells) {
                    const trimmed = cell.trim();
                    if (CSV_INJECTION_PREFIXES.some(p => trimmed.startsWith(p)) && trimmed.length > 1) {
                        formulaInjections++;
                    }
                }
            }
            if (formulaInjections > 0) {
                issues.push(`Detected ${formulaInjections} potential CSV formula injection attempts.`);
                score -= 25;
            }

        } catch (error) {
            issues.push("Could not verify file content security.");
            score -= 50;
        }

        // Final assessment
        score = Math.max(0, score);
        const riskLevel = score > 80 ? "Low" : score > 40 ? "Medium" : "High";
        const status = score > 60 ? "safe" : "blocked";

        return res.status(200).json({
            status,
            score,
            issues,
            domain: parsedUrl.hostname,
            fileSize: Math.round(fileSize / 1024),
            riskLevel
        });

    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL provided' });
    }
});

export default router;
