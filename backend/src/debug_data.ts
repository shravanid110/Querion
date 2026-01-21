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
            const names = (tables as any[]).map(t => Object.values(t)[0] as string);

            for (const table of names) {
                console.log(`\nTable: ${table}`);
                const [columns] = await connection.query(`DESCRIBE \`${table}\``);
                console.log(JSON.stringify(columns, null, 2));

                console.log("\nSample Row:");
                const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 1`);
                console.log(JSON.stringify(rows, null, 2));
            }

            await connection.end();
        } catch (err: any) {
            console.error(`Error with ${conn.name}:`, err.message);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
