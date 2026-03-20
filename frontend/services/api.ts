import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

const API_Base = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://127.0.0.1:4000/api';

export const api = axios.create({
    baseURL: API_Base,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(async (config) => {
    try {
        // Prevent interceptor from hanging forever
        const authData = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 2000))
        ]) as any;

        const session = authData?.data?.session;
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
    } catch (err) {
        console.warn('Auth interceptor timeout or error:', err);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export interface ConnectionParams {
    user_id?: string;
    name?: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    master_password?: string;
}

export const testConnection = async (params: ConnectionParams, signal?: AbortSignal) => {
    const response = await api.post('/connections/test', params, {
        timeout: 5000,
        signal: signal
    });
    return response.data;
};

export const saveConnection = async (params: ConnectionParams) => {
    const response = await api.post('/connections/', params);
    return response.data;
};

export const getConnections = async () => {
    const response = await api.get('/connections');
    return response.data;
};

export const deleteConnection = async (id: string) => {
    const response = await api.delete(`/connections/${id}`);
    return response.data;
};

export const runQuery = async (connectionId: string, prompt: string) => {
    const response = await api.post('/query/run', { connectionId, prompt });
    return response.data; // { sql, columns, rows, metrics, explanation }
};

export const connectUrl = async (url: string) => {
    const response = await api.post('/url/connect', { url });
    return response.data;
};

export const runUrlQuery = async (connectionId: string, prompt: string) => {
    const response = await api.post('/url/query', { connectionId, prompt });
    return response.data;
};

export const verifyMasterPassword = async (connectionId: string, masterPassword: string) => {
    const response = await api.post('/connections/verify-master-password', { connectionId, masterPassword });
    return response.data;
};

export const getHistory = async () => {
    const response = await api.get('/history');
    return response.data;
};

export const getMultidbConnections = async () => {
    const response = await api.get('/multidb');
    return response.data;
};

export const runMultidbQuery = async (connectionId: string, prompt: string) => {
    const response = await api.post('/multidb/query', { connectionId, prompt });
    return response.data;
};
