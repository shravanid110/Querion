"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Server, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Unlock, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { testConnection, saveConnection, getConnections, verifyMasterPassword, saveMultidbConnection, getMultidbConnections } from '@/services/api';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

interface DatabaseConnectionFormProps {
    dbType?: string;
    onClose?: () => void;
}

export const DatabaseConnectionForm = ({ dbType, onClose }: DatabaseConnectionFormProps) => {
    const router = useRouter();
    const [mode, setMode] = useState<'create' | 'select'>('create');
    const [savedConnections, setSavedConnections] = useState<any[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    
    const [formData, setFormData] = useState({
        name: `${dbType || 'Database'} Connection`,
        host: 'localhost',
        port: dbType === 'PostgreSQL' ? '5432' : '3306',
        database: '',
        username: '',
        password: '',
        masterPassword: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showMasterPassword, setShowMasterPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                // Fetch from both standard and multidb tables to ensure user sees everything
                const [standardData, multiData] = await Promise.all([
                    getConnections(),
                    getMultidbConnections()
                ]);
                
                // Normalize both into a single list
                const normalizedStandard = (standardData || []).map((c: any) => ({ ...c, isMultidb: false }));
                const normalizedMulti = (multiData || []).map((c: any) => ({
                    ...c,
                    isMultidb: true,
                    // multiData often has host/database as optional, ensure they are present for display
                    host: c.host || 'Cloud Endpoint',
                }));
                
                setSavedConnections([...normalizedStandard, ...normalizedMulti]);
            } catch (err) {
                console.warn("Failed to fetch connections", err);
                setSavedConnections([]);
            }
        };
        fetchConnections();
    }, []);

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
            // PRO FIX: Use direct axios to bypass auth interceptor, aligning with Redis/MongoDB buttons
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const API_Base = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:4000`;
            
            const payload = {
                ...formData,
                port: Number(formData.port),
            };

            const response = await axios.post(`${API_Base}/api/connections/test`, payload, {
                timeout: 15000 // Increased to 15s to avoid premature timeouts
            });

            if (response.data.success) {
                setConnectionStatus('success');
            } else {
                setConnectionStatus('error');
                setErrorMessage(response.data.error || 'Connection failed');
            }
        } catch (error: any) {
            console.error('Test connection error:', error);
            setConnectionStatus('error');
            
            const data = error.response?.data;
            if (data?.detail) {
                setErrorMessage(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                setErrorMessage('Connection Timeout: The database server is taking too long to respond.');
            } else {
                setErrorMessage(error.message || 'Connection failed');
            }
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveConnection = async () => {
        setIsSaving(true);
        try {
            // Fetch real user session / ID instead of hardcoded default
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id || 'default_user';

            const response = await saveMultidbConnection({
                ...formData,
                dbType: dbType?.toLowerCase() || 'mysql',
                port: Number(formData.port),
                master_password: formData.masterPassword,
                user_id: userId,
            } as any);

            // Double write to Supabase directly as requested, so it shows up in their Supabase dashboard
            if (response && response.id) {
                try {
                    const { error } = await supabase.from('multidb_connections').insert([{
                        id: response.id,
                        user_id: userId,
                        db_type: dbType?.toLowerCase() || 'mysql',
                        name: formData.name || 'Connection',
                        host: formData.host,
                        port: Number(formData.port),
                        database: formData.database,
                        username: formData.username,
                        password: 'ENCRYPTED_BY_BACKEND'
                    }]);
                    if (error) {
                        console.error("Supabase insert error:", error);
                    } else {
                        console.log("Successfully dual-wrote to Supabase multidb_connections");
                    }
                } catch(e) {
                    console.error("Failed to dual-write to Supabase:", e);
                }
            }

            // Store for dashboard
            if (response && response.id) {
                localStorage.setItem('last_connection_id', response.id);
                localStorage.setItem('last_connection_name', response.name || formData.name);
                localStorage.setItem('last_connection_type', dbType || 'MySQL');
            }

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Save connection error:', error.response?.data || error.message);
            const detail = error.response?.data?.detail;
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                ? detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
                : error.message || 'Failed to save connection';
            setErrorMessage(msg);
            setConnectionStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlockConnection = async () => {
        if (!selectedConnectionId || !formData.masterPassword) return;
        setIsSaving(true);
        try {
            const data = await verifyMasterPassword(selectedConnectionId, formData.masterPassword);
            if (data.success) {
                const conn = savedConnections.find(c => c.id === selectedConnectionId);
                if (conn) {
                    localStorage.setItem('last_connection_id', conn.id);
                    localStorage.setItem('last_connection_name', conn.name);
                }
                router.push('/dashboard');
            }
        } catch (error: any) {
            setErrorMessage(error.response?.data?.detail || 'Invalid Master Password');
            setConnectionStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="glass-card border-white/10 overflow-hidden shadow-2xl w-full max-w-xl">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 p-1 h-1.5 w-full" />
            
            <CardHeader className="text-center pb-6 pt-8 px-8">
                <div className="mx-auto bg-indigo-500/10 p-4 rounded-2xl w-fit mb-4 text-cyan-400 border border-indigo-500/20 shadow-inner">
                    <Database size={32} />
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                    {mode === 'create' ? `Connect ${dbType || 'MySQL'}` : 'Unlock Connection'}
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm mt-2">
                    {mode === 'create' 
                        ? `Enter your ${dbType || 'MySQL'} credentials with a secure master password.` 
                        : 'Verify your master password to sync credentials.'}
                </CardDescription>

                {savedConnections.length > 0 && (
                    <div className="mt-6 flex justify-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMode('create')}
                            className={cn("bg-white/5 border-white/10", mode === 'create' && "bg-indigo-500/20 border-indigo-500/50 text-indigo-400")}
                        >
                            New Connection
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMode('select')}
                            className={cn("bg-white/5 border-white/10", mode === 'select' && "bg-indigo-500/20 border-indigo-500/50 text-indigo-400")}
                        >
                            Saved Connections
                        </Button>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-4 px-8 pb-6">
                <AnimatePresence mode="wait">
                    {mode === 'create' ? (
                        <motion.div 
                            key="create"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
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
                                    <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">DB Password</Label>
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
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                                <Label htmlFor="masterPassword" className="text-indigo-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Unlock size={14} /> Master User Password
                                </Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="masterPassword"
                                        name="masterPassword"
                                        type={showMasterPassword ? 'text' : 'password'}
                                        className="bg-indigo-500/10 border-indigo-500/20 text-white placeholder:text-indigo-900 focus:border-indigo-500"
                                        placeholder="Secure Master Password"
                                        value={formData.masterPassword}
                                        onChange={handleInputChange}
                                    />
                                    <button type="button" onClick={() => setShowMasterPassword(!showMasterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                                        {showMasterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="select"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Select Saved Database</Label>
                                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {savedConnections.map((conn) => (
                                        <div 
                                            key={conn.id}
                                            onClick={() => setSelectedConnectionId(conn.id)}
                                            className={cn(
                                                "p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                                                selectedConnectionId === conn.id 
                                                    ? "bg-indigo-500/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <History size={18} className="text-indigo-400" />
                                                <div className="text-left">
                                                    <p className="text-white font-medium">{conn.name}</p>
                                                    <p className="text-slate-500 text-xs">{conn.database} @ {conn.host}</p>
                                                </div>
                                            </div>
                                            {selectedConnectionId === conn.id && <CheckCircle2 size={18} className="text-indigo-400" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedConnectionId && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-2 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10"
                                >
                                    <Label htmlFor="masterPasswordVerify" className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Verify Master Password</Label>
                                    <Input
                                        id="masterPasswordVerify"
                                        name="masterPassword"
                                        type="password"
                                        className="bg-indigo-500/10 border-indigo-500/20 text-white mt-2"
                                        placeholder="Enter Master Password to sync"
                                        value={formData.masterPassword}
                                        onChange={handleInputChange}
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {connectionStatus === 'success' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-400 text-sm rounded-xl border border-emerald-500/20">
                        <CheckCircle2 size={18} />
                        <span>Fast Sync Success! Connection established.</span>
                    </motion.div>
                )}

                {connectionStatus === 'error' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20">
                        <AlertCircle size={18} />
                        <span>{errorMessage || 'Connection failed.'}</span>
                    </motion.div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 px-8 pb-8 pt-0">
                {mode === 'create' ? (
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <Button variant="secondary" onClick={handleTestConnection} isLoading={isTesting} className="bg-white/5 text-white">
                            Test Connection
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleSaveConnection} 
                            isLoading={isSaving} 
                            disabled={connectionStatus !== 'success' || !formData.masterPassword}
                            className="bg-indigo-600 hover:bg-indigo-500"
                        >
                            Save & Sync
                        </Button>
                    </div>
                ) : (
                    <Button 
                        variant="primary" 
                        onClick={handleUnlockConnection} 
                        isLoading={isSaving} 
                        disabled={!selectedConnectionId || !formData.masterPassword}
                        className="w-full bg-indigo-600 hover:bg-indigo-500"
                    >
                        Unlock & Connect
                    </Button>
                )}
                
                <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-widest font-medium">
                    AES-256 SECURE CREDENTIAL SYNC ACTIVE
                </p>
                {onClose && (
                    <Button variant="ghost" onClick={onClose} className="mt-2 text-slate-400">Cancel</Button>
                )}
            </CardFooter>
        </Card>
    );
};
