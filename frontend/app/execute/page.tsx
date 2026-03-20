"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Unlock, Loader2, CheckCircle, Database, AlertCircle, Sparkles, Key, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/Navbar';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Isolated backend port for the new feature
const API_BASE = "http://127.0.0.1:4001/api";

function ExecuteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const [userPw, setUserPw] = useState("");
    const [dbPw, setDbPw] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [executionData, setExecutionData] = useState<any>(null);

    // If no token is provided, show a clear security warning
    if (!token) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="p-10 bg-red-950/20 border-red-500/30 text-red-100 max-w-md rounded-[32px] shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="text-red-500" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Security Breach Detected</h2>
                        <p className="text-sm opacity-70 leading-relaxed">
                            No valid execution token was found. This request has been blocked for your protection. 
                            Please use the link provided in your notification email.
                        </p>
                        <Button 
                            className="mt-8 bg-red-500 hover:bg-red-600 text-white w-full rounded-xl py-6 font-bold"
                            onClick={() => router.push('/')}
                        >
                            Return to Safe Zone
                        </Button>
                    </Card>
                </motion.div>
            </div>
        );
    }

    const handleExecute = async () => {
        if (!userPw || !dbPw) {
            toast.error("Please provide both passwords for verification");
            return;
        }

        setIsVerifying(true);
        try {
            const res = await axios.post(`${API_BASE}/execute-verify`, {
                token,
                user_password: userPw,
                db_password: dbPw
            });
            
            if (res.data.success) {
                setIsSuccess(true);
                setExecutionData(res.data);
                toast.success("Identity verified! Executing query...");
                
                // Final destination: Dashboard with the result context
                setTimeout(() => {
                    const params = new URLSearchParams();
                    params.append('prompt', res.data.prompt);
                    params.append('connId', res.data.database_id);
                    // For UI purposes, we could also pass a signal to auto-run
                    router.push(`/dashboard?${params.toString()}`);
                }, 2500);
            } else {
                toast.error(res.data.error || "Execution failed");
                setIsVerifying(false);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Verification failed. Check your passwords.");
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-indigo-500/30 bg-[url('/grid.svg')] bg-center bg-fixed">
            <Toaster position="top-right" />
            <Navbar />
            
            <main className="flex-1 flex items-center justify-center p-6 mt-16">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="w-full max-w-xl"
                >
                    <Card className="bg-[#0f172a]/90 border-white/10 backdrop-blur-3xl rounded-[40px] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative overflow-hidden border-t border-t-white/10">
                        {/* Status bar */}
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-1.5 transition-all duration-1000",
                            isSuccess ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"
                        )} />

                        {/* Top Decoration */}
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                            <Shield size={200} />
                        </div>
                        
                        <div className="text-center space-y-6 mb-12 relative z-10">
                            <div className={cn(
                                "w-24 h-24 rounded-[28px] flex items-center justify-center mx-auto transition-all duration-700 shadow-2xl",
                                isSuccess 
                                    ? "bg-emerald-500/20 text-emerald-400 rotate-[360deg] scale-110" 
                                    : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                            )}>
                                {isSuccess ? <CheckCircle size={48} /> : <Lock size={48} />}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight mb-2">Security <span className="text-indigo-400">Vault</span></h1>
                                <p className="text-slate-500 text-sm font-medium tracking-wide flex items-center justify-center gap-2">
                                    <Sparkles size={14} className="text-amber-400" /> Action requires multi-factor clearance
                                </p>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {isSuccess ? (
                                <motion.div 
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-10 space-y-8"
                                >
                                    <div className="space-y-2">
                                        <p className="text-emerald-400 font-black text-2xl tracking-tight italic">CLEARANCE GRANTED</p>
                                        <p className="text-slate-400 text-xs uppercase tracking-[0.4em]">Establishing Secure Relay...</p>
                                    </div>
                                    <div className="flex justify-center">
                                        <div className="relative">
                                            <Loader2 className="animate-spin text-emerald-500" size={56} strokeWidth={3} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                        <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest leading-relaxed">
                                            Handshaking with database node...<br/>Initializing AI Analyst transition...
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-8 relative z-10"
                                >
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2 pl-1">
                                                <Key size={12} className="text-indigo-500" /> User Credentials
                                            </Label>
                                            <Input 
                                                type="password" 
                                                className="bg-white/5 border-white/5 h-16 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/40 text-lg transition-all shadow-inner group-hover:border-white/10"
                                                placeholder="Enter account password"
                                                value={userPw}
                                                onChange={(e) => setUserPw(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2 pl-1">
                                                <Database size={12} className="text-emerald-500" /> Database Access Pass
                                            </Label>
                                            <Input 
                                                type="password" 
                                                className="bg-white/5 border-white/5 h-16 rounded-2xl text-white focus:ring-2 focus:ring-emerald-500/40 text-lg transition-all shadow-inner"
                                                placeholder="Enter database password"
                                                value={dbPw}
                                                onChange={(e) => setDbPw(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        className={cn(
                                            "w-full h-20 rounded-[24px] text-xl font-black transition-all duration-500 group/btn shadow-[0_15px_40px_rgba(0,0,0,0.3)]",
                                            userPw && dbPw 
                                                ? "bg-gradient-to-r from-indigo-600 to-emerald-600 hover:scale-[1.02] active:scale-[0.98] text-white" 
                                                : "bg-white/5 text-slate-600 border border-white/5"
                                        )}
                                        onClick={handleExecute}
                                        disabled={!userPw || !dbPw || isVerifying}
                                    >
                                        {isVerifying ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="animate-spin" size={24} />
                                                <span>Verifying Cryptography...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Unlock size={24} className="group-hover/btn:rotate-12 transition-transform" />
                                                <span>MFA Unlock & Execute</span>
                                                <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform opacity-50" />
                                            </div>
                                        )}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="mt-12 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-2">
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">AES-256 Secure Terminal Tunnel</p>
                            <div className="flex gap-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}

export default function ExecutePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">Loading Security Node...</div>}>
            <ExecuteContent />
        </Suspense>
    );
}
