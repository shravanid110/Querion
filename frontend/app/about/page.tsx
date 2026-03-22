"use client";

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { 
    Zap, Database, Activity, Shield, Globe, 
    ArrowRight, MessageSquare, BarChart3, 
    Lock, CheckCircle2, Cpu, Layers, TrendingUp,
    Users, Heart, Sparkles, Target, Star
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-x-hidden">
            <Navbar />

            {/* ─── HERO SECTION ────────────────────────────────────────── */}
            <section className="relative pt-40 pb-24 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--accent-glow)] rounded-full blur-[150px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--accent-primary)] rounded-full blur-[120px] opacity-10 pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs font-black tracking-widest uppercase mb-8"
                >
                    <Sparkles size={14} className="fill-[var(--accent-primary)]" />
                    Built for the Future of Data
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-5xl mb-8"
                >
                    Transforming Data into <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                        Insights with AI
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-12"
                >
                    Querion allows users to query databases using natural language and visualize results instantly. We bridge the gap between complex data and human understanding.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-lg shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all hover:scale-105">
                        Get Started <ArrowRight size={20} />
                    </button>
                </motion.div>
            </section>

            {/* ─── WHAT IS QUERION ────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-t border-[var(--border-color)]">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-6">
                        <div className="inline-block p-3 rounded-2xl bg-white/5 border border-white/10">
                            <Zap size={24} className="text-yellow-400" />
                        </div>
                        <h2 className="text-4xl font-black">What is Querion AI?</h2>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                            Querion is an AI-powered platform that converts natural language queries into SQL, executes them on connected databases, and displays results in visual formats instantly.
                        </p>
                        <ul className="space-y-4 pt-4">
                            {[
                                { title: "Conversational Analytics", icon: <MessageSquare size={18} className="text-indigo-400" /> },
                                { title: "Real-time Monitoring", icon: <Activity size={18} className="text-cyan-400" /> },
                                { title: "Enterprise-Grade Security", icon: <Shield size={18} className="text-emerald-400" /> }
                            ].map(item => (
                                <li key={item.title} className="flex items-center gap-3 text-sm font-bold text-[var(--text-primary)]">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">{item.icon}</div>
                                    {item.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative p-8 rounded-3xl bg-[var(--bg-nav)] border border-[var(--border-color)] overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12">
                            <Database size={200} className="text-[var(--accent-primary)]" />
                        </div>
                        <div className="relative space-y-4">
                            <div className="bg-indigo-600/20 px-4 py-2 rounded-xl text-indigo-300 text-xs font-mono">"Show all users registered in the last 24 hours"</div>
                            <div className="flex justify-center p-4">
                                <ArrowRight className="text-slate-600 rotate-90" />
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed shadow-xl">
                                SELECT * FROM users <br />
                                WHERE created_at {'Build Different.'[0] === 'B' ? '>=' : ''} NOW() - INTERVAL '24 HOURS'
                            </div>
                            <div className="flex justify-center p-2">
                                <ArrowRight className="text-slate-600 rotate-90" />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 h-32 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 flex flex-col justify-end">
                                    <div className="h-full w-full flex items-end gap-1">
                                        {[40, 70, 50, 90, 60].map((h, i) => <div key={i} className="flex-1 bg-cyan-400/40 rounded-t-sm" style={{ height: `${h}%` }} />)}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-cyan-400 mt-2">Daily Trends</span>
                                </div>
                                <div className="flex-1 h-32 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 flex flex-col justify-center items-center">
                                    <div className="text-2xl font-black text-purple-400">1,240</div>
                                    <span className="text-[10px] uppercase font-bold text-purple-400 mt-1">Total Signals</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── PROBLEM STATEMENT (4 CARDS) ────────────────────────── */}
            <section className="py-24 px-6 md:px-12 bg-[var(--bg-nav)] border-y border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black">Solving Real Challenges</h2>
                        <p className="text-[var(--text-secondary)] text-lg">Traditional database interaction is broken. We fixed it.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "Technical Complexity", desc: "Complex SQL queries are hard to write, even for experienced developers.", icon: <Code className="text-indigo-400" /> },
                            { title: "Access Barriers", desc: "Non-technical users struggle to get data without waiting for IT reports.", icon: <Lock className="text-red-400" /> },
                            { title: "Visualization Limits", desc: "Data visualization tools are often expensive, limited, or too complex.", icon: <BarChart3 className="text-cyan-400" /> },
                            { title: "Time Loss", desc: "Manual analysis and data preparation take hours — time better spent on strategy.", icon: <Target className="text-emerald-400" /> }
                        ].map((item, idx) => (
                            <motion.div 
                                key={item.title}
                                whileHover={{ y: -6 }}
                                className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/20 transition-all shadow-xl"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-6">{item.icon}</div>
                                <h4 className="font-bold text-lg mb-3 tracking-tight">{item.title}</h4>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── OUR SOLUTION (VISUAL FLOW) ─────────────────────────── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black">Our Unified Solution</h2>
                    <p className="text-[var(--text-secondary)] text-lg">From question to insight in milliseconds.</p>
                </div>
                <div className="relative py-16 px-8 rounded-[40px] bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-cyan-950/20 border border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 lg:gap-8">
                    {[
                        { label: "User", sub: "Natural Question", icon: <Users size={20} />, color: "bg-indigo-500" },
                        { label: "AI Core", sub: "NLP Logic", icon: <Cpu size={20} />, color: "bg-purple-500" },
                        { label: "SQL Engine", sub: "Secure Exec", icon: <Layers size={20} />, color: "bg-blue-500" },
                        { label: "Database", sub: "Multi-Source", icon: <Database size={20} />, color: "bg-cyan-500" },
                        { label: "Insights", sub: "Visual Reports", icon: <Sparkles size={20} />, color: "bg-emerald-500" }
                    ].map((step, i, arr) => (
                        <React.Fragment key={step.label}>
                            <div className="flex-1 flex flex-col items-center gap-4 text-center group">
                                <div className={`w-16 h-16 rounded-2xl ${step.color} shadow-lg shadow-${step.color.split('-')[1]}-500/20 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                                    {step.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-[var(--text-primary)]">{step.label}</p>
                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">{step.sub}</p>
                                </div>
                            </div>
                            {i < arr.length - 1 && (
                                <div className="hidden md:block">
                                    <ArrowRight size={24} className="text-slate-600 opacity-30" />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* ─── KEY FEATURES ────────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 bg-[var(--bg-nav)]">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { title: "AI Chat Interface", desc: "Interactive conversational experience for natural language database operations.", icon: <MessageSquare className="text-indigo-400" /> },
                        { title: "Multi Database Support", desc: "Seamlessly connect MySQL, PostgreSQL, and MongoDB with one unified interface.", icon: <Database className="text-cyan-400" /> },
                        { title: "3D Data Visualization", desc: "Go beyond flat charts with immersive, high-fidelity data visualizations.", icon: <BarChart3 className="text-purple-400" /> },
                        { title: "Secure Data Handling", desc: "Enterprise-standard SHA-256 encryption and complete data isolation.", icon: <Lock className="text-emerald-400" /> },
                        { title: "Scheduled Reports", desc: "Set up automated snapshots and health reports delivered to your inbox.", icon: <TrendingUp className="text-yellow-400" /> },
                        { title: "Real-time Monitoring", icon: <Activity className="text-red-400" />, desc: "Live signals for your backend health, API activity, and server resources." }
                    ].map(feat => (
                        <div key={feat.title} className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/20 transition-all flex flex-col items-start text-left group">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{feat.icon}</div>
                            <h4 className="text-xl font-bold mb-3 tracking-tight">{feat.title}</h4>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── WHY UNIQUE ─────────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-black mb-8 leading-tight">Why Choose Querion AI?</h2>
                        <div className="space-y-6">
                            {[
                                { t: "No Coding Required", d: "Ask questions as you would to a colleague, no SQL knowledge needed." },
                                { t: "Instant Insights", d: "Get immediate reports and trends without manual parsing and visualization." },
                                { t: "Chat-based Analytics", d: "Explore your data through conversations, not complex dashboards." },
                                { t: "Multi-Source Integrations", d: "One platform for all your databases and system monitoring." }
                            ].map(p => (
                                <div key={p.t} className="flex gap-5">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{p.t}</h4>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1">{p.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 pt-12">
                                <div className="p-8 pb-12 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                    <h5 className="text-4xl font-black text-white">95%</h5>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-2">Accuracy Rate</p>
                                </div>
                                <div className="p-8 pb-12 rounded-3xl bg-white/3 border border-white/5 text-center">
                                    <h5 className="text-4xl font-black text-white">2k+</h5>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Engineers Linked</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-8 pb-12 rounded-3xl bg-white/3 border border-white/5 text-center">
                                    <h5 className="text-4xl font-black text-white">100+</h5>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">DB Integrations</p>
                                </div>
                                <div className="p-8 pb-12 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                                    <h5 className="text-4xl font-black text-white">12ms</h5>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mt-2">Avg. Latency</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── VISION SECTION ──────────────────────────────────────── */}
            <section className="py-24 px-6 md:px-12">
                <div className="max-w-4xl mx-auto p-16 rounded-[40px] bg-gradient-to-br from-indigo-900/40 via-[var(--bg-main)] to-cyan-900/30 border border-white/10 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center gap-8">
                        <Heart className="text-red-400 fill-red-400/20 shadow-xl" size={48} />
                        <h2 className="text-3xl md:text-5xl font-black max-w-2xl leading-tight">
                            "Our vision is to make data accessible and understandable for everyone, 
                            regardless of technical expertise."
                        </h2>
                        <div className="p-2 border-b-2 border-indigo-500/40">
                             <p className="text-lg font-bold text-slate-400">Team Querion AI</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ────────────────────────────────────────────── */}
            <footer className="py-12 px-6 text-center border-t border-[var(--border-color)]">
                <p className="text-slate-500 text-sm">© 2026 Querion AI. All rights reserved.</p>
            </footer>
        </div>
    );
}

function Code({ size, className }: { size?: number, className?: string }) {
    return <Layers size={size} className={className} />;
}
