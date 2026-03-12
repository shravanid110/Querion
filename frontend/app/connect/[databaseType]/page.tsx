"use client";

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Database, Shield, Zap } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { testConnection, saveConnection } from '@/services/api';
import axios from 'axios';

const DB_DATA: Record<string, any> = {
    postgresql: { name: 'PostgreSQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', driver: 'pg', defaultPort: 5432, desc: 'Advanced open-source relational database used by modern applications.' },
    mongodb: { name: 'MongoDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg', driver: 'mongodb', defaultPort: 27017, desc: 'Flexible NoSQL document database.' },
    sqlite: { name: 'SQLite', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg', driver: 'sqlite3', defaultPort: 0, desc: 'Small, fast, self-contained SQL engine.' },
    redis: { name: 'Redis', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg', driver: 'redis', defaultPort: 6379, desc: 'Fast in-memory data store.' },
    mariadb: { name: 'MariaDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mariadb/mariadb-original.svg', driver: 'mariadb', defaultPort: 3306, desc: 'Modern open source relational database.' },
    supabase: { name: 'Supabase', icon: 'https://raw.githubusercontent.com/supabase/supabase/master/packages/common/assets/images/supabase-logo.png', driver: 'pg', defaultPort: 5432, desc: 'The open source Firebase alternative.' },
    firebase: { name: 'Firebase', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg', driver: 'firebase-admin', defaultPort: 0, desc: 'Google\'s mobile and web platform.' },
    oracle: { name: 'Oracle', icon: 'https://www.vectorlogo.zone/logos/oracle/oracle-icon.svg', driver: 'oracledb', defaultPort: 1521, desc: 'Enterprise-grade relational database.' },
    sqlserver: { name: 'SQL Server', icon: 'https://www.vectorlogo.zone/logos/microsoft_sqlserver/microsoft_sqlserver-icon.svg', driver: 'mssql', defaultPort: 1433, desc: 'Enterprise database from Microsoft.' },
};

export default function ConnectDatabasePage({ params }: { params: Promise<{ databaseType: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const dbType = unwrappedParams.databaseType;
    const dbInfo = DB_DATA[dbType] || DB_DATA.postgresql;

    const [formData, setFormData] = useState({
        name: `${dbInfo.name} Connection`,
        host: 'localhost',
        port: dbInfo.defaultPort.toString(),
        database: '',
        username: '',
        password: '',
        masterPassword: '',
        uri: '', // For MongoDB or SQLite file path
        serviceAccountJson: '', // For Firebase
    });

    const [isTesting, setIsTesting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessCard, setShowSuccessCard] = useState(false);

    const isUriBased = dbType === 'mongodb' || dbType === 'sqlite' || dbType === 'firebase';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (testStatus !== 'idle') {
            setTestStatus('idle');
            setErrorMessage('');
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestStatus('idle');
        setErrorMessage('');

        try {
            // Dynamically detect API base based on current host
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const API_Base = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:4000`;
            
            console.log(`Connecting to backend at: ${API_Base}`);
            
            const payload = {
                ...formData,
                dbType: dbType,
                databaseType: dbType,
                port: Number(formData.port),
            };
            
            console.log("TEST PAYLOAD:", payload);
            console.log("Selected dbType:", dbType);
            
            const res = await axios.post(`${API_Base}/api/multidb/test`, payload, { 
                timeout: 30000 // 30s frontend timeout
            });

            if (res.data.success) {
                setTestStatus('success');
            } else {
                setTestStatus('error');
                setErrorMessage(res.data.error || 'Connection failed.');
            }
        } catch (error: any) {
            console.error('Connection test error:', error);
            setTestStatus('error');
            const data = error.response?.data;
            let msg = 'Server unreachable.';
            
            if (data?.detail) {
                msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            } else if (error.message) {
                msg = error.message;
            }
            
            setErrorMessage(msg);
        } finally {
            setIsTesting(false);
        }
    };

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const axios = (await import('axios')).default;
            const API_Base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
            
            const payload: Record<string, any> = {
                ...formData,
                dbType: dbType,
                master_password: formData.masterPassword, // Map to backend snake_case
                port: Number(formData.port),
                user_id: 'default_user'
            };

            // For Firebase, ensure the JSON is stored in the uri field
            if (dbType === 'firebase' && (formData as any).serviceAccountJson) {
                payload.uri = (formData as any).serviceAccountJson;
            }

            const res = await axios.post(`${API_Base}/api/multidb/save`, payload);

            if (res.data.id) {
                setShowSuccessCard(true);
                // Redirect after 3 seconds
                setTimeout(() => {
                    router.push('/chat');
                }, 3000);
            }
        } catch (error: any) {
            console.error('Save connection error:', error);
            setTestStatus('error');
            const data = error.response?.data;
            let msg = 'Failed to save connection.';
            
            if (data?.detail) {
                // Handle Pydantic validation error lists safely
                msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
            }
            
            setErrorMessage(msg);
            setIsConnecting(false);
        }
    };

    if (showSuccessCard) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center font-sans p-6 overflow-hidden relative">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f172a]/80 to-[#0f172a]"></div>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative z-10 p-10 bg-[#111827] border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)] max-w-lg w-full text-center"
                >
                    <div className="mx-auto flex items-center justify-center w-24 h-24 bg-indigo-500/20 rounded-full mb-6 relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            <CheckCircle2 size={50} className="text-indigo-400" />
                        </motion.div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin opacity-50"></div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">🎉 Database Connected!</h2>
                    <p className="text-slate-400 text-lg">Your {dbInfo.name} database is now securely connected to Querion AI.</p>
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center space-x-2 text-indigo-400 text-sm font-medium">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Redirecting to AI Chat in 3 seconds...</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-32 pb-20">
                <Link href="/database-selection" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-medium">
                    <ArrowLeft size={16} /> Back to Databases
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Form */}
                    <div className="lg:col-span-8">
                        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50" />
                            
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-white/5 rounded-xl border border-white/10 p-2.5 flex items-center justify-center">
                                    <img src={dbInfo.icon} alt={dbInfo.name} className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Connect to {dbInfo.name}</h1>
                                    <p className="text-slate-400 text-sm mt-1">Configure your database credentials</p>
                                </div>
                            </div>

                            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <Label className="text-slate-300">Connection Name</Label>
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="mt-2 bg-white/5 border-gray-700 text-white"
                                        placeholder="e.g. Production Data"
                                    />
                                </div>

                                {dbType === 'firebase' ? (
                                    <>
                                        <div>
                                            <Label className="text-slate-300">Project ID</Label>
                                            <Input
                                                name="database"
                                                value={formData.database}
                                                onChange={handleInputChange}
                                                className="mt-2 bg-white/5 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Service Account JSON (Paste content)</Label>
                                            <textarea
                                                name="serviceAccountJson"
                                                value={formData.serviceAccountJson}
                                                onChange={handleInputChange}
                                                className="w-full mt-2 bg-white/5 border border-gray-700 rounded-md text-white p-3 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                placeholder={`{ "type": "service_account", ... }`}
                                            />
                                        </div>
                                    </>
                                ) : dbType === 'mongodb' || dbType === 'sqlite' ? (
                                    <div>
                                        <Label className="text-slate-300">
                                            {dbType === 'mongodb' ? 'Connection URI' : 'Database File Path'}
                                        </Label>
                                        <Input
                                            name="uri"
                                            value={formData.uri}
                                            onChange={handleInputChange}
                                            className="mt-2 bg-white/5 border-gray-700 text-white"
                                            placeholder={dbType === 'mongodb' ? 'mongodb://username:password@host:27017/db' : '/var/data/app.db'}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <Label className="text-slate-300">Host</Label>
                                                <Input
                                                    name="host"
                                                    value={formData.host}
                                                    onChange={handleInputChange}
                                                    className="mt-2 bg-white/5 border-gray-700 text-white"
                                                    placeholder="localhost or IP Address"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">Port</Label>
                                                <Input
                                                    name="port"
                                                    value={formData.port}
                                                    onChange={handleInputChange}
                                                    className="mt-2 bg-white/5 border-gray-700 text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Database Name / Service Name</Label>
                                            <Input
                                                name="database"
                                                value={formData.database}
                                                onChange={handleInputChange}
                                                className="mt-2 bg-white/5 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <Label className="text-slate-300">Username</Label>
                                                <Input
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    className="mt-2 bg-white/5 border-gray-700 text-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">Password</Label>
                                                <Input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    className="mt-2 bg-white/5 border-gray-700 text-white"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Label className="text-indigo-300 flex items-center gap-2 mb-2 uppercase text-xs font-bold tracking-widest mt-4">
                                        <Shield size={14} /> Master Connection Password
                                    </Label>
                                    <Input
                                        type="password"
                                        name="masterPassword"
                                        value={formData.masterPassword}
                                        onChange={handleInputChange}
                                        className="bg-indigo-900/20 border-indigo-500/30 text-white"
                                        placeholder="Secure encryption key to save credentials"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Required for AES-256 secure credential storage.</p>
                                </div>

                                {/* Status Feedback */}
                                <AnimatePresence mode="wait">
                                    {testStatus === 'success' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400">
                                            <CheckCircle2 size={20} className="shrink-0" />
                                            <div className="text-sm font-medium">✅ Connection Successful</div>
                                        </motion.div>
                                    )}
                                    {testStatus === 'error' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400">
                                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                            <div className="text-sm">❌ Connection Failed: {errorMessage || 'Check credentials or server status'}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex gap-4 pt-4 border-t border-gray-800">
                                    <Button
                                        variant="outline"
                                        className="flex-1 bg-transparent border-gray-700 text-white hover:bg-white/5"
                                        onClick={handleTestConnection}
                                        disabled={isTesting || isConnecting}
                                    >
                                        {isTesting ? <><Loader2 size={16} className="animate-spin mr-2" /> Testing...</> : 'Test Connection'}
                                    </Button>
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.03] transition-transform"
                                        onClick={handleConnect}
                                        disabled={testStatus !== 'success' || isConnecting}
                                    >
                                        {isConnecting ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Connect Database'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Panel: Guide */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center p-2 mb-4 border border-white/10">
                                <img src={dbInfo.icon} alt={dbInfo.name} className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{dbInfo.name} Database</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                {dbInfo.desc} Query your natural data using simple english directly on the platform without complex setups.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                    <h4 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Zap size={14} className="text-yellow-400" /> Reference Format
                                    </h4>
                                    <div className="text-xs text-slate-400 font-mono flex flex-col gap-1.5">
                                        {dbType === 'mongodb' ? (
                                            "URI: mongodb://user:pass@host:port/db"
                                        ) : dbType === 'firebase' ? (
                                            "Paste full Google Cloud Service Account JSON credentials file."
                                        ) : (
                                            <>
                                                <span>Host: my-cluster.region.com</span>
                                                <span>Port: {dbInfo.defaultPort}</span>
                                                <span>User: admin</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-indigo-500/5 rounded-lg p-4 border border-indigo-500/10">
                                    <h4 className="text-indigo-400 text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Shield size={14} /> Security Tips
                                    </h4>
                                    <ul className="text-xs text-slate-400 space-y-2">
                                        <li>• Never share your credentials externally.</li>
                                        <li>• White-list our IP if behind a VPC/Firewall.</li>
                                        <li>• Best practice: Provide read-only user access.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
