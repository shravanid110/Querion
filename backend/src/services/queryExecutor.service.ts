import mysql from 'mysql2/promise';

export const queryExecutorService = {
    execute: async (connectionConfig: any, query: string) => {
        let connection;
        try {
            // Create a specific connection for this query
            connection = await mysql.createConnection({
                host: connectionConfig.host,
                port: Number(connectionConfig.port),
                user: connectionConfig.username,
                password: connectionConfig.password,
                database: connectionConfig.database,
                multipleStatements: false // Security
            });

            const [rows, fields] = await connection.execute(query);

            // Extract column metadata
            const columns = fields?.map(field => ({
                name: field.name,
                type: field.type // basic type info
            })) || [];

            await connection.end();

            return {
                rows,
                columns
            };
        } catch (error: any) {
            if (connection) await connection.end();
            throw new Error(`Query execution failed: ${error.message}`);
        }
    },

    getSchema: async (connectionConfig: any): Promise<string> => {
        let connection;
        try {
            connection = await mysql.createConnection({
                host: connectionConfig.host,
                port: Number(connectionConfig.port),
                user: connectionConfig.username,
                password: connectionConfig.password,
                database: connectionConfig.database
            });

            // Get tables
            const [tables]: any[] = await connection.execute('SHOW TABLES');
            const tableNames = tables.map((row: any) => Object.values(row)[0]);

            let schemaSummary = '';

            for (const table of tableNames) {
                const [columns]: any[] = await connection.execute(`DESCRIBE ${table}`);
                const columnDefs = columns.map((col: any) => `${col.Field} (${col.Type})`).join(', ');
                schemaSummary += `Table ${table}: [${columnDefs}]\n`;
            }

            await connection.end();
            return schemaSummary;

        } catch (error: any) {
            if (connection) await connection.end();
            throw new Error(`Failed to fetch schema: ${error.message}`);
        }
    }
};

