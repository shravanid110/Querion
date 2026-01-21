import axios from 'axios';

const API_Base = 'http://localhost:4000/api';

export const api = axios.create({
    baseURL: API_Base,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface ConnectionParams {
    name?: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
}

export const testConnection = async (params: ConnectionParams) => {
    const response = await api.post('/connections/test', params);
    return response.data;
};

export const saveConnection = async (params: ConnectionParams) => {
    const response = await api.post('/connections', params);
    return response.data;
};

export const getConnections = async () => {
    const response = await api.get('/connections');
    return response.data;
};

export const runQuery = async (connectionId: string, prompt: string) => {
    const response = await api.post('/query/run', { connectionId, prompt });
    return response.data; // { sql, columns, rows, metrics, explanation }
};
