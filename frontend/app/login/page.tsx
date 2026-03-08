"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Shield, Zap, Database, Activity, CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function SocialButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-semibold transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {icon}
            <span>{label}</span>
        </button>
    );
}

function VisualPanel() {
    return (
        <div className="relative flex flex-col justify-between h-full p-12 overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="text-2xl font-black text-white tracking-tight">Querion</span>
                </div>
            </div>
            <div className="relative z-10 flex-1 flex items-center justify-center py-12">
                <div className="relative w-72 h-72">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border border-indigo-500/20" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-4 rounded-full border border-cyan-500/20" />
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-8 rounded-full border border-purple-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)]">
                            <Database size={36} className="text-white" />
                        </motion.div>
                    </div>
                    {[{ angle: 0, icon: <Activity size={14} className="text-cyan-300" />, color: "from-cyan-500/30 to-cyan-500/10" }, { angle: 72, icon: <Shield size={14} className="text-indigo-300" />, color: "from-indigo-500/30 to-indigo-500/10" }, { angle: 144, icon: <Zap size={14} className="text-purple-300" />, color: "from-purple-500/30 to-purple-500/10" }, { angle: 216, icon: <CheckCircle2 size={14} className="text-emerald-300" />, color: "from-emerald-500/30 to-emerald-500/10" }, { angle: 288, icon: <Lock size={14} className="text-pink-300" />, color: "from-pink-500/30 to-pink-500/10" }].map((node, i) => {
                        const rad = (node.angle * Math.PI) / 180;
                        const x = Math.cos(rad) * 110;
                        const y = Math.sin(rad) * 110;
                        return (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15, duration: 0.5 }} style={{ left: `calc(50% + ${x}px - 20px)`, top: `calc(50% + ${y}px - 20px)` }} className="absolute">
                                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }} className={`w-10 h-10 rounded-xl bg-gradient-to-br ${node.color} border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg`}>{node.icon}</motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
            <div className="relative z-10 space-y-6">
                <div>
                    <h2 className="text-3xl font-black text-white leading-tight mb-3">Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Querion</span></h2>
                    <p className="text-slate-400 text-sm leading-relaxed">Sign in to continue your AI-powered database journey.</p>
                </div>
                <div className="space-y-3">
                    {["Conversational Database Queries", "Secure Data Interaction", "Intelligent Backend Monitoring", "Real-Time System Insights"].map((feat, i) => (
                        <motion.div key={feat} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /></div>
                            <span className="text-slate-300 text-sm">{feat}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { login, signInWithGoogle, signInWithGithub } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) { setError("Please fill in all fields."); return; }
        setLoading(true);
        try {
            await login(email, password);
            router.push('/');
        } catch (err: any) {
            setError(err?.response?.data?.detail || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex">
            <div className="hidden lg:flex lg:w-[54%] bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 border-r border-white/5">
                <VisualPanel />
            </div>
            <div className="flex-1 flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none" />
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-[420px] relative z-10">
                    <div className="flex items-center gap-3 mb-10 lg:hidden">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center"><Zap size={18} className="text-white fill-white" /></div>
                        <span className="text-xl font-black text-white">Querion</span>
                    </div>
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Sign in to Querion</h1>
                        <p className="text-slate-400 text-sm">Access your AI-powered database workspace.</p>
                    </div>

                    {/* OAuth Login Buttons */}
                    <div className="space-y-3 mb-6">
                        <SocialButton disabled={loading} onClick={async () => {
                            try {
                                setLoading(true);
                                await signInWithGoogle();
                            } catch (error: any) {
                                setError(error.message || "Failed to sign in with Google");
                                setLoading(false);
                            }
                        }} icon={<svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2a10.3 10.3 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91A8.78 8.78 0 0 0 17.64 9.2z" fill="#4285F4" /><path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" /><path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z" fill="#FBBC05" /><path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" /></svg>} label="Sign in with Google" />

                        <SocialButton disabled={loading} onClick={async () => {
                            try {
                                setLoading(true);
                                await signInWithGithub();
                            } catch (error: any) {
                                setError(error.message || "Failed to sign in with GitHub");
                                setLoading(false);
                            }
                        }} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.17c-3.34.72-4.04-1.45-4.04-1.45-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.9 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0z" /></svg>} label="Sign in with GitHub" />
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-start gap-3 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{error}{error.includes("create an account") && <><br /><Link href="/signup" className="text-indigo-400 underline font-bold">Create account →</Link></>}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${emailFocused || email ? 'top-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest' : 'top-1/2 -translate-y-1/2 text-slate-500 text-sm'}`}>Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} className={`w-full pt-6 pb-2 px-4 bg-white/5 rounded-xl border text-white text-sm outline-none transition-all duration-200 ${emailFocused ? 'border-indigo-500/70 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]' : 'border-white/10 hover:border-white/20'}`} required />
                        </div>
                        <div className="relative">
                            <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${passwordFocused || password ? 'top-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest' : 'top-1/2 -translate-y-1/2 text-slate-500 text-sm'}`}>Password</label>
                            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} className={`w-full pt-6 pb-2 pl-4 pr-12 bg-white/5 rounded-xl border text-white text-sm outline-none transition-all duration-200 ${passwordFocused ? 'border-indigo-500/70 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]' : 'border-white/10 hover:border-white/20'}`} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            <Lock size={12} className="absolute right-11 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div onClick={() => setRememberMe(!rememberMe)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-indigo-600 border-indigo-500' : 'border-white/20 bg-white/5'}`}>{rememberMe && <CheckCircle2 size={10} className="text-white fill-white" />}</div>
                                <span className="text-slate-400 text-xs select-none">Remember me</span>
                            </label>
                            <Link href="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Forgot Password?</Link>
                        </div>
                        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative w-full h-12 rounded-xl font-bold text-white text-sm overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 transition-all duration-300 group-hover:from-indigo-500 group-hover:to-cyan-400" />
                            <span className="relative flex items-center justify-center gap-2">{loading ? <><Loader2 size={16} className="animate-spin" />Signing in...</> : <>Sign In <ArrowRight size={16} /></>}</span>
                        </motion.button>
                    </form>

                    <p className="text-center text-slate-400 text-sm mt-6">Don&apos;t have an account?{" "}<Link href="/signup" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Create an account</Link></p>
                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-[11px]"><Shield size={12} /><span>Encrypted authentication · Stored securely</span></div>
                </motion.div>
            </div>
        </div>
    );
}
