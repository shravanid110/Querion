import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Supabase PostgreSQL Connection Pool Configuration
 */
const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase in many environments
    },
    max: 20, // Connection pooling limit
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

/**
 * Generic Database Query Handler
 * Includes secure parameterized query execution
 */
export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        // Performance and debug logging (can be toggled in production)
        if (process.env.DEBUG === 'true') {
            console.log('Executed query', { text, duration, rows: res.rowCount });
        }

        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Transaction Support Utility
 * @param callback - Function that receives a client and returns a promise
 */
export const getTransaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export default {
    query,
    getTransaction,
    pool
};
