"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Globe, ArrowRight, Activity, Zap, Shield, PieChart } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-mesh flex flex-col font-sans overflow-hidden">
            <Navbar />

            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 relative z-10">
                {/* Hero Section */}
                <div className="max-w-4xl w-full text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4"
                    >
                        <Zap size={14} className="fill-indigo-400" />
                        Next-Gen AI Backend Intelligence
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-extrabold text-[var(--text-primary)] tracking-tight leading-[1.1]"
                    >
                        Ask Your Database. <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500">
                            Monitor Your Backend.
                        </span> <br />
                        Instantly.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed"
                    >
                        Querion enables secure conversational database queries and intelligent backend monitoring using state-of-the-art AI.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-4 pt-4"
                    >
                        <Link href="/database-selection">
                            <Button className="h-14 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-base shadow-xl shadow-indigo-500/20 border-0 gap-2 transition-all duration-300 hover:scale-105">
                                Get Started <ArrowRight size={18} />
                            </Button>
                        </Link>
                        <Link href="/landingpage">
                            <Button variant="ghost" className="h-14 px-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold text-base gap-2 transition-all duration-300">
                                Learn More <ArrowRight size={18} />
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-6 pt-4 text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest"
                    >
                        {[
                            { icon: <Shield size={14} className="text-emerald-500" />, label: 'Enterprise Security' },
                            { icon: <Zap size={14} className="text-yellow-500 fill-yellow-500" />, label: 'AI Powered' },
                            { icon: <Activity size={14} className="text-cyan-500" />, label: 'Real-Time Monitoring' },
                        ].map(b => (
                            <div key={b.label} className="flex items-center gap-2">
                                {b.icon}
                                <span>{b.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Feature Cards */}
                <motion.div
                    id="features"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="max-w-6xl w-full mt-24 scroll-mt-24"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1: Database Interaction */}
                        <FeatureCard
                            title="Connect Database"
                            description="Securely connect and interact with your databases using natural language queries powered by AI."
                            icon={<Database className="h-8 w-8 text-indigo-400" />}
                            link="/database-selection"
                            buttonText="Connect Database"
                            visual={<DatabaseVisual />}
                        />

                        {/* Card 2: Backend Monitoring */}
                        <FeatureCard
                            title="Backend Monitoring"
                            description="Monitor system performance, logs, API activity, and backend health with intelligent insights."
                            icon={<Activity className="h-8 w-8 text-cyan-400" />}
                            link="/monitoring"
                            buttonText="Open Monitoring Dashboard"
                            visual={<MonitoringVisual />}
                        />

                        {/* Card 3: External Dataset */}
                        <FeatureCard
                            title="Dataset via URL"
                            description="Connect external datasets instantly using a secure URL. Querion will automatically fetch and integrate data."
                            icon={<Globe className="h-8 w-8 text-purple-400" />}
                            link="/connect"
                            buttonText="Connect Dataset"
                            visual={<DatasetVisual />}
                        />
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-10 px-6 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Querion AI. All rights reserved.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ title, description, icon, link, buttonText, visual }: any) {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="group relative flex flex-col p-8 rounded-[32px] glass-card border-white/10 hover:border-indigo-500/50 transition-all duration-500 overflow-hidden h-full shadow-2xl"
        >
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                {icon}
            </div>

            <div className="mb-6 bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-300">
                {icon}
            </div>

            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">{title}</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 flex-1">
                {description}
            </p>

            <div className="relative h-32 w-full mb-8 bg-black/20 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                {visual}
            </div>

            <Link href={link}>
                <Button className="w-full h-12 rounded-xl bg-[var(--bg-main)] hover:bg-[var(--accent-glow)] text-[var(--text-primary)] border border-[var(--border-color)] group-hover:border-[var(--accent-primary)]/30 group-hover:text-[var(--accent-primary)] transition-all duration-300 font-bold gap-2">
                    {buttonText} <ArrowRight className="h-4 w-4" />
                </Button>
            </Link>

            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[32px] z-[-1] opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500" />
        </motion.div>
    );
}

function DatabaseVisual() {
    return (
        <div className="relative flex items-center justify-center gap-4 w-full h-full">
            <div className="w-12 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center animate-pulse">
                <Database className="h-6 w-6 text-indigo-400/50" />
            </div>
            <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500/20 via-cyan-500/40 to-indigo-500/20" />
            <div className="w-16 h-18 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <Shield className="h-8 w-8 text-cyan-400" />
            </div>
            <div className="w-8 h-[2px] bg-gradient-to-r from-indigo-500/20 via-cyan-500/40 to-indigo-500/20" />
            <div className="w-12 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center animate-pulse" style={{ animationDelay: '1s' }}>
                <Server className="h-6 w-6 text-indigo-400/50" />
            </div>
        </div>
    );
}

function MonitoringVisual() {
    return (
        <div className="w-full px-6 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">CPU</span>
                <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" />
                </div>
                <span className="text-cyan-400 text-[10px] font-bold">45%</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">RAM</span>
                <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[62%] bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full" />
                </div>
                <span className="text-purple-400 text-[10px] font-bold">62%</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">API</span>
                <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[88%] bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" />
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">Good</span>
            </div>
        </div>
    );
}

function DatasetVisual() {
    return (
        <div className="flex items-center justify-center gap-3 w-full h-full px-4">
            <div className="flex flex-col gap-1.5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-1.5 rounded-full bg-purple-500/20 border border-purple-500/10" style={{ width: `${50 + i * 12}px` }} />
                ))}
            </div>
            <div className="w-8 flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-purple-400/50" />
            </div>
            <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <PieChart className="h-8 w-8 text-purple-400" />
            </div>
        </div>
    );
}
