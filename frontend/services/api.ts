import axios from 'axios';

const API_Base = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://127.0.0.1:4000/api';

export const api = axios.create({
    baseURL: API_Base,
    headers: {
        'Content-Type': 'application/json',
    },
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

export const testConnection = async (params: ConnectionParams) => {
    const response = await api.post('/connections/test', params);
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
