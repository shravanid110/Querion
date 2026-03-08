"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Server, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { testConnection, saveConnection } from '@/services/api';

interface DatabaseConnectionFormProps {
    dbType?: string;
    onClose?: () => void;
}

export const DatabaseConnectionForm = ({ dbType, onClose }: DatabaseConnectionFormProps) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: `${dbType || 'Database'} Connection`,
        host: 'localhost',
        port: dbType === 'PostgreSQL' ? '5432' : '3306',
        database: '',
        username: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (connectionStatus !== 'idle') {
            setConnectionStatus('idle');
            setErrorMessage('');
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setConnectionStatus('idle');
        setErrorMessage('');

        try {
            const result = await testConnection({
                ...formData,
                port: Number(formData.port),
                type: dbType
            } as any);

            if (result.success) {
                setConnectionStatus('success');
            } else {
                setConnectionStatus('error');
                setErrorMessage(result.error || 'Connection failed');
            }
        } catch (error: any) {
            setConnectionStatus('error');
            setErrorMessage(error.response?.data?.error || error.message || 'Connection failed');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveConnection = async () => {
        setIsSaving(true);
        try {
            await saveConnection({
                ...formData,
                port: Number(formData.port),
                type: dbType
            } as any);
            router.push('/dashboard');
        } catch (error: any) {
            setErrorMessage(error.response?.data?.error || 'Failed to save connection');
            setConnectionStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="glass-card border-white/10 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 p-1 h-1.5 w-full" />
            <CardHeader className="text-center pb-6 pt-8 px-8">
                <div className="mx-auto bg-indigo-500/10 p-4 rounded-2xl w-fit mb-4 text-cyan-400 border border-indigo-500/20 shadow-inner">
                    <Database size={32} />
                </div>
                <CardTitle className="text-2xl font-bold text-white">Connect {dbType || 'Database'}</CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-2">
                    Enter your {dbType} credentials to start analyzing your data.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-8 pb-6">
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Connection Name</Label>
                        <Input
                            id="name"
                            name="name"
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500/50"
                            placeholder="e.g. Production DB"
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="host" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Host</Label>
                            <Input
                                id="host"
                                name="host"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                placeholder="localhost"
                                icon={<Server size={16} className="text-slate-500" />}
                                value={formData.host}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="port" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Port</Label>
                            <Input
                                id="port"
                                name="port"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                placeholder="3306"
                                value={formData.port}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="database" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Database Name</Label>
                        <Input
                            id="database"
                            name="database"
                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                            placeholder="my_database"
                            icon={<Database size={16} className="text-slate-500" />}
                            value={formData.database}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                placeholder="root"
                                icon={<User size={16} className="text-slate-500" />}
                                value={formData.username}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    icon={<Lock size={16} className="text-slate-500" />}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feedback Messages */}
                {connectionStatus === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-400 text-sm rounded-xl border border-emerald-500/20"
                    >
                        <CheckCircle2 size={18} />
                        <span>Success! Connection established.</span>
                    </motion.div>
                )}

                {connectionStatus === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20"
                    >
                        <AlertCircle size={18} />
                        <span>{errorMessage || 'Connection failed.'}</span>
                    </motion.div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 px-8 pb-8 pt-0">
                <div className="grid grid-cols-2 gap-4 w-full">
                    <Button
                        variant="secondary"
                        onClick={handleTestConnection}
                        isLoading={isTesting}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border-white/10"
                    >
                        Test Connection
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveConnection}
                        isLoading={isSaving}
                        disabled={connectionStatus !== 'success'}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-0"
                    >
                        Save & Continue
                    </Button>
                </div>
                <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-widest font-medium">
                    Secure encrypted AES-256 storage
                </p>
                {onClose && (
                    <Button variant="ghost" onClick={onClose} className="mt-2 text-slate-400 hover:text-white">
                        Cancel
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
