import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const connections = await prisma.connection.findMany();
    console.log("Registered Connections:");
    console.log(JSON.stringify(connections, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
