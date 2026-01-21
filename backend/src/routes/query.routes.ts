import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../services/encryption';
import { executeReadOnlyQuery, getSchemaSummary } from '../services/mysqlExecutor';
import { convertNlToSql } from '../services/nlToSql';

const router = Router();
const prisma = new PrismaClient();

// Run Query
router.post('/run', async (req, res) => {
    console.log(`[Query Route] Received request for connectionId: ${req.body.connectionId}, prompt: "${req.body.prompt}"`);
    try {
        const { connectionId, prompt } = req.body;

        if (!connectionId || !prompt) {
            return res.status(400).json({ error: "Missing connectionId or prompt" });
        }

        // 1. Fetch credentials
        const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
        if (!connection) {
            return res.status(404).json({ error: "Connection not found" });
        }

        const password = decrypt(connection.password);
        const connectionParams = {
            host: connection.host,
            port: connection.port,
            database: connection.database,
            user: connection.username,
            password: password
        };

        // 2. Fetch Schema context
        const schema = await getSchemaSummary(connectionParams);
        console.log(`Schema fetched for connection ${connectionId}. Length: ${schema.length} chars.`);

        if (!schema || schema.includes("Could not fetch schema") || schema.includes("The database is empty")) {
            console.warn("Empty or invalid schema for connection:", connectionId);
        }

        // 3. Convert NL to SQL
        const result = await convertNlToSql(schema, prompt);

        if (!result.sql) {
            return res.status(422).json({
                error: result.explanation || "Could not generate SQL for this prompt.",
                explanation: result.explanation
            });
        }

        // 4. Execute SQL
        const data = await executeReadOnlyQuery(connectionParams, result.sql);

        // 5. Calculate basic metrics
        const totalRows = data.rows.length;
        // Simple numeric column detection for 'Total Value' or similar
        // This is a naive heuristic
        let numericSum = 0;
        if (totalRows > 0) {
            const firstRow = (data.rows as any[])[0];
            const numberFields = Object.keys(firstRow).filter(k => typeof firstRow[k] === 'number');
            if (numberFields.length > 0) {
                // Sum the first found number field as a sample metric
                numericSum = (data.rows as any[]).reduce((sum, row) => sum + (row[numberFields[0]] || 0), 0);
            }
        }

        res.json({
            sql: result.sql,
            explanation: result.explanation,
            columns: data.columns,
            rows: data.rows,
            metrics: {
                totalRows,
                approxSum: numericSum
            }
        });

    } catch (error: any) {
        console.error("Query Handler Error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
