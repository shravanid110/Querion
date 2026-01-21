import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const connections = await prisma.connection.findMany();
    for (const conn of connections) {
        console.log(`Name: ${conn.name}, ID: ${conn.id}`);
        console.log(`Host: ${conn.host}, Port: ${conn.port}, DB: ${conn.database}, User: ${conn.username}`);
        console.log(`Encrypted Password Length: ${conn.password.length}`);
        console.log(`Encrypted Password Start: ${conn.password.substring(0, 10)}...`);
        console.log(`-----------------------------------`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
