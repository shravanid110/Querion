import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import CryptoJS from 'crypto-js';

const SECRET_KEY = (process.env.ENCRYPTION_KEY || 'default-secret-key-change-me').replace(/["']/g, "").trim();

const decrypt = (cipherText: string): string => {
    try {
        if (!cipherText) return '';
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || cipherText;
    } catch (e: any) {
        return cipherText;
    }
};

const prisma = new PrismaClient();

async function main() {
    const connections = await prisma.connection.findMany();
    for (const conn of connections) {
        console.log(`\n--- Connection: ${conn.name} (${conn.id}) ---`);
        const password = decrypt(conn.password);

        try {
            const connection = await mysql.createConnection({
                host: conn.host,
                port: conn.port,
                user: conn.username,
                password: password,
                database: conn.database,
                ssl: { rejectUnauthorized: false }
            });

            const [tables] = await connection.query('SHOW TABLES');
            const names = (tables as any[]).map(t => Object.values(t)[0]);
            console.log("Tables:", names);

            await connection.end();
        } catch (err: any) {
            console.error(`Failed to connect to ${conn.name}:`, err.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
