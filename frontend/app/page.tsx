"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Globe, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

import { useRouter } from 'next/navigation';
import { testConnection, saveConnection } from '@/services/api';

export default function ConnectionPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        host: 'localhost',
        port: '3306',
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
                port: Number(formData.port)
            });

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
                port: Number(formData.port)
            });
            router.push('/dashboard');
        } catch (error: any) {
            setErrorMessage(error.response?.data?.error || 'Failed to save connection');
            setConnectionStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            <Navbar />

            <main className="flex-1 flex items-center justify-center p-6 pt-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-lg"
                >
                    <Card className="overflow-hidden border-0 shadow-2xl shadow-indigo-500/10">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-1 h-2 w-full" />
                        <CardHeader className="text-center pb-8 pt-8 px-8">
                            <div className="mx-auto bg-indigo-50 p-3 rounded-full w-fit mb-4 text-indigo-600">
                                <Database size={32} />
                            </div>
                            <CardTitle className="text-2xl font-bold">Connect Database</CardTitle>
                            <CardDescription className="text-base mt-2">
                                Enter your connection details to start analyzing your data.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 px-8 pb-8">
                            {/* Connection Name */}
                            <div className="space-y-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="name">Connection Name (Optional)</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="e.g. Production DB"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-1.5">
                                        <Label htmlFor="host">Host / IP Address</Label>
                                        <Input
                                            id="host"
                                            name="host"
                                            placeholder="localhost"
                                            icon={<Server size={16} />}
                                            value={formData.host}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="port">Port</Label>
                                        <Input
                                            id="port"
                                            name="port"
                                            placeholder="3306"
                                            value={formData.port}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="database">Database Name</Label>
                                    <Input
                                        id="database"
                                        name="database"
                                        placeholder="my_database"
                                        icon={<Database size={16} />}
                                        value={formData.database}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            name="username"
                                            placeholder="root"
                                            icon={<User size={16} />}
                                            value={formData.username}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                icon={<Lock size={16} />}
                                                value={formData.password}
                                                onChange={handleInputChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                                    className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100"
                                >
                                    <CheckCircle2 size={18} />
                                    <span>Success! Connection established.</span>
                                </motion.div>
                            )}

                            {connectionStatus === 'error' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100"
                                >
                                    <AlertCircle size={18} />
                                    <span>{errorMessage || 'Connection failed.'}</span>
                                </motion.div>
                            )}

                        </CardContent>

                        <CardFooter className="flex flex-col gap-3 px-8 pb-8 pt-0">
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <Button
                                    variant="secondary"
                                    onClick={handleTestConnection}
                                    isLoading={isTesting}
                                    className="w-full"
                                >
                                    Test Connection
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSaveConnection}
                                    isLoading={isSaving}
                                    disabled={connectionStatus !== 'success'}
                                    className="w-full"
                                >
                                    Save & Continue
                                </Button>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-4">
                                Your credentials are encrypted using AES-256 before storage.
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}
