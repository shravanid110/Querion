'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { Loader2 } from 'lucide-react';

export default function Connect() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        host: '',
        port: '3306',
        database: '',
        username: '',
        password: ''
    });
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTest = async () => {
        setLoading(true);
        setStatus({ type: null, message: '' });
        try {
            await api.connect.test(formData);
            setStatus({ type: 'success', message: 'Connection successful!' });
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Connection failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.connect.save(formData);
            router.push('/dashboard');
        } catch (error: any) {
            setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to save connection' });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
                <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Querion</h1>
                <p className="text-gray-400 text-center mb-8">Connect your database to start querying</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Connection Name</label>
                        <input name="name" placeholder="My Production DB" value={formData.name} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Host</label>
                            <input name="host" placeholder="127.0.0.1" value={formData.host} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Port</label>
                            <input name="port" placeholder="3306" value={formData.port} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Database Name</label>
                        <input name="database" placeholder="users_db" value={formData.database} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                        <input name="username" placeholder="root" value={formData.username} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>

                    {status.message && (
                        <div className={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {status.message}
                        </div>
                    )}

                    <div className="flex gap-4 mt-6">
                        <button onClick={handleTest} disabled={loading} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Test'}
                        </button>
                        <button onClick={handleSave} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-500/20">
                            {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Save & Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

