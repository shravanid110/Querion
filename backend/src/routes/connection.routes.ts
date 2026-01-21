import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../services/encryption';
import { testConnection } from '../services/mysqlExecutor';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const ConnectionSchema = z.object({
    name: z.string().optional(),
    host: z.string(),
    port: z.coerce.number().default(3306),
    database: z.string(),
    username: z.string(),
    password: z.string(),
});

// Test Connection
router.post('/test', async (req, res) => {
    try {
        const { host, port, database, username, password } = req.body;
        const result = await testConnection({ host, port: Number(port), database, user: username, password });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save Connection
router.post('/', async (req, res) => {
    try {
        const validated = ConnectionSchema.parse(req.body);
        const encryptedPassword = encrypt(validated.password);

        const connection = await prisma.connection.create({
            data: {
                name: validated.name || `${validated.database} @ ${validated.host}`,
                host: validated.host,
                port: validated.port,
                database: validated.database,
                username: validated.username,
                password: encryptedPassword,
            }
        });

        res.json(connection);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// List Connections
router.get('/', async (req, res) => {
    try {
        const connections = await prisma.connection.findMany({
            select: {
                id: true,
                name: true,
                host: true,
                database: true,
                port: true,
                createdAt: true,
                // NEVER return password
            }
        });
        res.json(connections);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch connections" });
    }
});

export default router;
