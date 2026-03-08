import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Sync Supabase Auth User to our public.users table
router.post('/sync', async (req, res) => {
    try {
        const { id, email, name, avatar_url } = req.body;

        if (!id || !email) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        // Upsert user in public.users
        const user = await prisma.user.upsert({
            where: { id },
            update: {
                name: name || email.split('@')[0],
                email: email,
            },
            create: {
                id: id,
                name: name || email.split('@')[0],
                email: email,
                passwordHash: '', // Placeholder for OAuth users
                role: 'user',
            }
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
