import mysql from 'mysql2/promise';

interface ConnectionParams {
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
}

export const testConnection = async (params: ConnectionParams): Promise<{ success: boolean; error?: string }> => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: params.host,
            port: params.port,
            user: params.user,
            password: params.password,
            database: params.database,
            connectTimeout: 5000,
            ssl: {
                rejectUnauthorized: false
            }
        });
        await connection.end();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const executeReadOnlyQuery = async (params: ConnectionParams, sql: string) => {
    // Basic safety check for READ ONLY
    const forbiddenKeywords = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
    const uppercaseSql = sql.trim().toUpperCase();

    // Allow 'SHOW', 'DESCRIBE', 'EXPLAIN' etc, but primarily SELECT.
    // If it starts with anything destructive, block it.
    // This is a naive check. A robust system would use a read-only DB user.
    const isDestructive = forbiddenKeywords.some(keyword => uppercaseSql.startsWith(keyword) || uppercaseSql.includes(` ${keyword} `));

    if (isDestructive) {
        throw new Error("Security Alert: Only SELECT queries are allowed.");
    }

    let connection;
    try {
        connection = await mysql.createConnection({
            host: params.host,
            port: params.port,
            user: params.user,
            password: params.password,
            database: params.database,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Execute query
        const [rows, fields] = await connection.query<mysql.RowDataPacket[]>(sql);
        await connection.end();

        return {
            rows,
            columns: fields ? (fields as any[]).map(f => f.name) : []
        };
    } catch (error: any) {
        if (connection) await connection.end();
        console.error("Database Execution Error:", error.message);
        throw new Error(`Database Error: ${error.message}`);
    }
};

export const getSchemaSummary = async (params: ConnectionParams): Promise<string> => {
    let connection;
    try {
        const pwd = params.password || '';
        console.log(`[Schema] Connecting to ${params.host} as ${params.user}. Password length: ${pwd.length}`);

        connection = await mysql.createConnection({
            host: params.host,
            port: params.port,
            user: params.user,
            password: params.password,
            database: params.database,
            connectTimeout: 15000,
            ssl: {
                rejectUnauthorized: false
            }
        });

        console.log("Connection established successfully for schema summary.");

        // Fetch tables
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);

        console.log(`Successfully fetched ${tableNames.length} tables from ${params.database}`);

        if (tableNames.length === 0) {
            await connection.end();
            return "The database is empty. No tables found.";
        }

        // List all tables found (up to 100 for context safety)
        const allTablesHeader = tableNames.length > 100
            ? tableNames.slice(0, 100).join(', ') + '... (and more)'
            : tableNames.join(', ');

        let schemaContext = `DATABASE SCHEMA:\n`;
        schemaContext += `Total Tables Found: ${tableNames.length}\n`;
        schemaContext += `All Table Names: ${allTablesHeader}\n\n`;
        schemaContext += `COLUMN DETAILS (for first 40 tables):\n`;

        // For each table, get columns - increase limit to 60 for better coverage
        for (const table of tableNames.slice(0, 60)) {
            try {
                const [columns] = await connection.query(`DESCRIBE \`${table}\``);
                const colDetails = (columns as any[]).map((c: any) => `${c.Field} (${c.Type})`).join(', ');
                schemaContext += `- ${table}: [${colDetails}]\n`;
            } catch (err) {
                console.warn(`Could not describe table ${table}:`, err);
            }
        }

        console.log(`[Schema] Returning context (${schemaContext.length} chars) with tables: ${tableNames.slice(0, 5).join(', ')}...`);
        await connection.end();
        return schemaContext;
    } catch (error: any) {
        console.error("CRITICAL: Error fetching schema from MySQL:", error.message);
        let hint = "";
        if (error.message.includes("Access denied")) {
            hint = " TIP: This usually means the password is wrong or was encrypted with an old version of the app. Try deleting and re-creating this connection.";
        }
        return `Could not fetch schema. Database error: ${error.message}${hint}`;
    }
}
