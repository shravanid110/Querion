"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Shield, Zap, Database, Activity, CheckCircle2, Loader2, AlertCircle, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function PasswordStrength({ password }: { password: string }) {
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        const levels = [{ label: 'Too Weak', color: 'bg-red-500' }, { label: 'Weak', color: 'bg-orange-500' }, { label: 'Fair', color: 'bg-yellow-500' }, { label: 'Good', color: 'bg-teal-400' }, { label: 'Strong', color: 'bg-emerald-500' }];
        return { score, ...levels[score] };
    }, [password]);
    if (!password) return null;
    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">{[1, 2, 3, 4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-white/10'}`} />)}</div>
            {strength.label && <p className={`text-[10px] font-bold ${strength.score <= 1 ? 'text-red-400' : strength.score === 2 ? 'text-yellow-400' : 'text-emerald-400'}`}>Strength: {strength.label}</p>}
        </div>
    );
}

function VisualPanel() {
    return (
        <div className="relative flex flex-col justify-between h-full p-12 overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30"><Zap size={20} className="text-white fill-white" /></div>
                <span className="text-2xl font-black text-white tracking-tight">Querion</span>
            </div>
            <div className="relative z-10 flex-1 flex items-center justify-center py-12">
                <div className="relative w-72 h-72">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border border-purple-500/20" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute inset-4 rounded-full border border-cyan-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div animate={{ scale: [1, 1.08, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(167,139,250,0.5)]"><Database size={36} className="text-white" /></motion.div>
                    </div>
                    {[{ angle: 30, icon: <Activity size={14} className="text-cyan-300" />, color: "from-cyan-500/30 to-cyan-600/10" }, { angle: 102, icon: <Shield size={14} className="text-purple-300" />, color: "from-purple-500/30 to-purple-600/10" }, { angle: 174, icon: <Zap size={14} className="text-yellow-300" />, color: "from-yellow-500/30 to-yellow-600/10" }, { angle: 246, icon: <CheckCircle2 size={14} className="text-emerald-300" />, color: "from-emerald-500/30 to-emerald-600/10" }, { angle: 318, icon: <Lock size={14} className="text-pink-300" />, color: "from-pink-500/30 to-pink-600/10" }].map((node, i) => {
                        const rad = (node.angle * Math.PI) / 180;
                        const x = Math.cos(rad) * 110, y = Math.sin(rad) * 110;
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
                    <h2 className="text-3xl font-black text-white leading-tight mb-3">Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Querion</span> today</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">Start interacting with databases using AI and monitor your new account.</p>
                </div>
                <div className="space-y-3">
                    {["Conversational Database Queries", "Secure Data Interaction", "Intelligent Backend Monitoring", "Real-Time System Insights"].map((feat, i) => (
                        <motion.div key={feat} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-purple-400" /></div>
                            <span className="text-slate-300 text-sm">{feat}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focused, setFocused] = useState<Record<string, boolean>>({});

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name || !email || !password || !confirm) { setError("Please fill in all fields."); return; }
        if (password !== confirm) { setError("Passwords do not match."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (!agreed) { setError("Please agree to the Terms of Service."); return; }
        setLoading(true);
        try {
            await register(name, email, password);
            router.push('/');
        } catch (err: any) {
            setError(err?.response?.data?.detail || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const ic = (field: string) => `w-full pt-6 pb-2 px-4 bg-white/5 rounded-xl border text-white text-sm outline-none transition-all duration-200 ${focused[field] ? 'border-purple-500/70 shadow-[0_0_0_3px_rgba(167,139,250,0.1)]' : 'border-white/10 hover:border-white/20'}`;
    const lc = (field: string, val: string) => `absolute left-4 transition-all duration-200 pointer-events-none ${focused[field] || val ? 'top-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest' : 'top-1/2 -translate-y-1/2 text-slate-500 text-sm'}`;
    const setF = (k: string, v: boolean) => setFocused(p => ({ ...p, [k]: v }));

    return (
        <div className="min-h-screen bg-[#020617] flex">
            <div className="hidden lg:flex lg:w-[54%] bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 border-r border-white/5">
                <VisualPanel />
            </div>
            <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-[420px] relative z-10">
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"><Zap size={18} className="text-white fill-white" /></div>
                        <span className="text-xl font-black text-white">Querion</span>
                    </div>
                    <div className="mb-7">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Create Your Querion Account</h1>
                        <p className="text-slate-400 text-sm">Start interacting with databases using AI.</p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-start gap-3 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{error}{error.includes("already exists") && <><br /><Link href="/login" className="text-indigo-400 underline font-bold">Sign in instead →</Link></>}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Full Name */}
                        <div className="relative">
                            <label className={lc('name', name)}>Full Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} onFocus={() => setF('name', true)} onBlur={() => setF('name', false)} className={ic('name')} required />
                            <User size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                        </div>
                        {/* Email */}
                        <div className="relative">
                            <label className={lc('email', email)}>Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setF('email', true)} onBlur={() => setF('email', false)} className={ic('email')} required />
                            <Mail size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                        </div>
                        {/* Password */}
                        <div>
                            <div className="relative">
                                <label className={lc('password', password)}>Password</label>
                                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setF('password', true)} onBlur={() => setF('password', false)} className={`${ic('password')} pr-12`} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            <PasswordStrength password={password} />
                        </div>
                        {/* Confirm */}
                        <div>
                            <div className="relative">
                                <label className={lc('confirm', confirm)}>Confirm Password</label>
                                <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} onFocus={() => setF('confirm', true)} onBlur={() => setF('confirm', false)} className={`${ic('confirm')} pr-12 ${confirm && password !== confirm ? '!border-red-500/50' : confirm && password === confirm ? '!border-emerald-500/40' : ''}`} required />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            {confirm && password !== confirm && <p className="text-[10px] text-red-400 font-bold mt-1.5">Passwords do not match</p>}
                            {confirm && password === confirm && <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1"><CheckCircle2 size={10} /> Passwords match</p>}
                        </div>
                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <div onClick={() => setAgreed(!agreed)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${agreed ? 'bg-purple-600 border-purple-500' : 'border-white/20 bg-white/5'}`}>{agreed && <CheckCircle2 size={10} className="text-white fill-white" />}</div>
                            <span className="text-slate-400 text-xs leading-relaxed select-none">I agree to the <Link href="/terms" className="text-purple-400 hover:text-purple-300 font-semibold">Terms of Service</Link> and <Link href="/privacy" className="text-purple-400 hover:text-purple-300 font-semibold">Privacy Policy</Link></span>
                        </label>
                        {/* Submit */}
                        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative w-full h-12 rounded-xl font-bold text-white text-sm overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed mt-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-300 group-hover:from-purple-500 group-hover:to-cyan-400" />
                            <span className="relative flex items-center justify-center gap-2">{loading ? <><Loader2 size={16} className="animate-spin" />Creating account...</> : <>Create Account <ArrowRight size={16} /></>}</span>
                        </motion.button>
                    </form>
                    <p className="text-center text-slate-400 text-sm mt-6">Already have an account?{" "}<Link href="/login" className="font-bold text-purple-400 hover:text-purple-300 transition-colors">Sign in</Link></p>
                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-[11px]"><Shield size={12} /><span>Encrypted authentication · Stored securely</span></div>
                </motion.div>
            </div>
        </div>
    );
}
