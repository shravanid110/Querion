"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    Database, Server, Globe, ArrowRight, Activity, Zap, Shield, MessageSquare,
    BarChart3, Lock, CheckCircle2, Cpu, Layers, TrendingUp, Wifi,
    Code2, FileCode, GitBranch, Package, ChevronRight, Star, Users, Terminal
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

// ─── Animated particle canvas background ──────────────────────────────────────
function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let animId: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        const DOTS = 80;
        const dots = Array.from({ length: DOTS }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            dots.forEach(d => {
                d.x += d.vx; d.y += d.vy;
                if (d.x < 0) d.x = canvas.width;
                if (d.x > canvas.width) d.x = 0;
                if (d.y < 0) d.y = canvas.height;
                if (d.y > canvas.height) d.y = 0;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99,102,241,0.4)';
                ctx.fill();
            });
            dots.forEach((a, i) => dots.slice(i + 1).forEach(b => {
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 130)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }));
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000" style={{ opacity: 0.4 }} />;
}

// ─── Floating 3D Element ───────────────────────────────────────────────────
function Floating3DElement({ children, className = '', delay = 0, duration = 6, rotate = true }: any) {
    return (
        <motion.div
            initial={{ y: 0 }}
            animate={{ 
                y: [0, -20, 0],
                rotateZ: rotate ? [0, 5, -5, 0] : 0,
                rotateX: rotate ? [0, 10, -10, 0] : 0,
                rotateY: rotate ? [0, 10, -10, 0] : 0
            }}
            transition={{ 
                duration, 
                repeat: Infinity, 
                delay,
                ease: "easeInOut" 
            }}
            className={`absolute pointer-events-none select-none z-0 ${className}`}
        >
            {children}
        </motion.div>
    );
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────
function MagneticButton({ children, className = '', onClick }: any) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const ref = useRef<HTMLButtonElement>(null);

    const handleMouse = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current!.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
    };

    const reset = () => setPosition({ x: 0, y: 0 });

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            className={className}
            onClick={onClick}
        >
            {children}
        </motion.button>
    );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    return (
        <section id={id} className={`relative py-24 px-6 md:px-12 ${className}`}>
            <div className="max-w-7xl mx-auto">{children}</div>
        </section>
    );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ badge, title, sub }: { badge: string; title: React.ReactNode; sub: string }) {
    return (
        <div className="text-center mb-16 space-y-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[var(--accent-primary)] text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_var(--accent-glow)]"
            >
                <Zap size={12} className="fill-current" />
                {badge}
            </motion.div>
            <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-tight"
            >
                {title}
            </motion.h2>
            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg leading-relaxed"
            >
                {sub}
            </motion.p>
        </div>
    );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, features, gradient }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ 
                y: -12, 
                rotateX: 5, 
                rotateY: 5, 
                scale: 1.02,
                boxShadow: "0 25px 50px -12px var(--accent-glow)"
            }}
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            className="relative group p-8 rounded-[28px] bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-500"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-xl">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2">
                    {features.map((f: string) => (
                        <li key={f} className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                            <CheckCircle2 size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
            </div>
        </motion.div>
    );
}

// ─── Capability card ──────────────────────────────────────────────────────────
function CapCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <motion.div 
            whileHover={{ y: -6, rotateX: 3, rotateY: 3 }} 
            style={{ transformStyle: "preserve-3d" }}
            className="p-6 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--accent-glow)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/20 transition-all duration-300 backdrop-blur-sm shadow-lg"
        >
            <div className="mb-4" style={{ transform: "translateZ(20px)" }}>{icon}</div>
            <h4 className="text-[var(--text-primary)] font-bold mb-2" style={{ transform: "translateZ(10px)" }}>{title}</h4>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed" style={{ transform: "translateZ(5px)" }}>{desc}</p>
        </motion.div>
    );
}

// ─── Dashboard Preview panel ───────────────────────────────────────────────────
function DashboardPreview() {
    const [tick, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 2000); return () => clearInterval(t); }, []);
    const cpu = 42 + (tick % 7) * 4;
    const req = 1240 + tick * 8;
    return (
        <motion.div 
            whileHover={{ rotateY: -5, rotateX: 5 }}
            style={{ transformStyle: "preserve-3d", perspective: "1500px" }}
            className="relative w-full max-w-3xl mx-auto rounded-[28px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-2xl shadow-[0_0_80px_var(--accent-glow)]"
        >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-main)]/40">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/70" /><div className="w-3 h-3 rounded-full bg-yellow-500/70" /><div className="w-3 h-3 rounded-full bg-emerald-500/70" /></div>
                <div className="flex-1 mx-4 h-6 rounded-md bg-[var(--text-primary)]/5 border border-[var(--border-color)] flex items-center px-3 text-[var(--text-secondary)] text-xs">querion.ai/dashboard</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</div>
            </div>
            {/* Content */}
            <div className="p-6 space-y-4" style={{ transform: "translateZ(40px)" }}>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: "CPU Usage", value: `${cpu}%`, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                        { label: "API Requests", value: req.toLocaleString(), color: "text-cyan-400", bg: "bg-cyan-500/10" },
                        { label: "DB Latency", value: "12ms", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { label: "Errors", value: "0", color: "text-purple-400", bg: "bg-purple-500/10" },
                    ].map((s) => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-3 border border-white/5`}>
                            <p className="text-[var(--text-secondary)] text-[10px] uppercase tracking-widest font-bold">{s.label}</p>
                            <p className={`${s.color} text-lg font-black mt-1`}>{s.value}</p>
                        </div>
                    ))}
                </div>
                {/* Chart */}
                <div className="rounded-2xl bg-[var(--bg-main)]/60 p-4 border border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[var(--text-primary)] text-sm font-bold">Query Performance</span>
                        <span className="text-[var(--accent-primary)] text-xs font-bold">Last 1h</span>
                    </div>
                    <div className="flex items-end gap-1 h-20">
                        {Array.from({ length: 32 }).map((_, i) => (
                            <motion.div 
                                key={i} 
                                animate={{ height: `${20 + ((i + tick) % 11) * 8}%` }}
                                className="flex-1 rounded-t-sm bg-gradient-to-t from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-60" 
                            />
                        ))}
                    </div>
                </div>
                {/* Bottom row */}
                <div className="grid grid-cols-2 gap-3">
                    {/* AI Chat */}
                    <div className="rounded-2xl bg-[var(--bg-main)]/60 p-4 border border-[var(--border-color)] space-y-2">
                        <div className="flex items-center gap-2 mb-3"><MessageSquare size={14} className="text-cyan-400" /><span className="text-[var(--text-primary)] text-xs font-bold">AI Query</span></div>
                        <div className="bg-[var(--accent-primary)]/10 rounded-lg px-3 py-2 text-[11px] text-[var(--text-secondary)]">Show me sales data for last quarter</div>
                        <div className="bg-white/5 rounded-lg px-3 py-2 text-[11px] text-emerald-400 font-mono">SELECT * FROM sales ...</div>
                    </div>
                    {/* Logs */}
                    <div className="rounded-2xl bg-[var(--bg-main)]/60 p-4 border border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-3"><Terminal size={14} className="text-purple-400" /><span className="text-[var(--text-primary)] text-xs font-bold">Live Logs</span></div>
                        <div className="space-y-1.5 font-mono text-[10px]">
                            <div className="text-emerald-400">✓ Query executed (12ms)</div>
                            <div className="text-indigo-400">→ API GET /users 200</div>
                            <div className="text-yellow-400">⚠ Memory 68% — monitoring</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ num, icon, title, desc }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -10 }}
            className="relative flex flex-col items-center text-center group"
        >
            <div className="relative mb-6">
                <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }} 
                    className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 border border-[var(--border-color)] flex items-center justify-center shadow-[0_0_30px_var(--accent-glow)] group-hover:shadow-[0_0_50px_var(--accent-glow)] transition-all duration-500"
                >
                    <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
                </motion.div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white text-xs font-black flex items-center justify-center shadow-lg border-2 border-[var(--bg-main)]">{num}</div>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{desc}</p>
        </motion.div>
    );
}

// ─── Tech badge ───────────────────────────────────────────────────────────────
function TechBadge({ label, color }: { label: string; color: string }) {
    return (
        <div className={`px-4 py-2 rounded-xl border text-xs font-bold ${color} flex items-center gap-2`}>
            <div className="w-2 h-2 rounded-full bg-current opacity-70" />
            {label}
        </div>
    );
}

// ─── Use case card ────────────────────────────────────────────────────────────
function UseCaseCard({ icon, title, who, desc }: any) {
    return (
        <motion.div 
            whileHover={{ y: -10, rotateX: 5, rotateY: 5, scale: 1.05 }} 
            style={{ transformStyle: "preserve-3d" }}
            className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 transition-all duration-500 backdrop-blur-xl shadow-xl group"
        >
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--border-color)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" style={{ transform: "translateZ(20px)" }}>{icon}</div>
            <div className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-1" style={{ transform: "translateZ(10px)" }}>{who}</div>
            <h4 className="text-[var(--text-primary)] font-bold text-lg mb-2" style={{ transform: "translateZ(15px)" }}>{title}</h4>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed" style={{ transform: "translateZ(5px)" }}>{desc}</p>
        </motion.div>
    );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────────
export default function HomePage() {
    const { user } = useAuth();
    const { theme } = useTheme();

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans overflow-x-hidden selection:bg-[var(--accent-primary)] selection:text-white">
            <Navbar />

            {/* ─── HERO ──────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center pt-20 pb-10 px-6 md:px-12 overflow-hidden">
                <ParticleCanvas />

                {/* Decorative 3D Elements */}
                <Floating3DElement className="top-[15%] left-[10%] opacity-20" delay={0}>
                    <Database size={120} className="text-[var(--accent-primary)] blur-[2px]" />
                </Floating3DElement>
                <Floating3DElement className="bottom-[20%] right-[15%] opacity-15" delay={2} duration={8}>
                    <Globe size={180} className="text-[var(--accent-secondary)] blur-[3px]" />
                </Floating3DElement>
                <Floating3DElement className="top-[40%] right-[5%] opacity-20" delay={1} duration={7}>
                    <Zap size={80} className="text-yellow-400 blur-[1px]" />
                </Floating3DElement>
                <Floating3DElement className="bottom-[10%] left-[5%] opacity-15" delay={3} duration={10}>
                    <Shield size={100} className="text-emerald-400 blur-[2px]" />
                </Floating3DElement>

                {/* Background glows */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--accent-primary)]/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[var(--accent-secondary)]/10 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '4s' }} />

                <div className="max-w-7xl mx-auto relative z-10 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left text */}
                        <div className="space-y-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[var(--accent-primary)] text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_var(--accent-glow)]">
                                <Zap size={12} className="fill-current" />
                                Next-Gen AI Database Intelligence
                            </motion.div>

                            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                                className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05] text-[var(--text-primary)]">
                                Talk to Your<br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-cyan-400 drop-shadow-sm">Database.</span><br />
                                Monitor Your<br />
                                <span className="text-[var(--text-secondary)] opacity-80">Backend.</span>
                            </motion.h1>

                            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                                Querion is an AI-powered platform that allows developers and organizations to interact with databases using natural language while monitoring backend systems in real time.
                            </motion.p>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                                className="flex flex-wrap gap-4">
                                <Link href={user ? '/database-selection' : '/signup'}>
                                    <MagneticButton className="relative px-8 py-4 rounded-2xl font-bold text-white text-base overflow-hidden group shadow-xl">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 shadow-[0_0_40px_var(--accent-glow)] transition-opacity duration-300" />
                                        <span className="relative flex items-center gap-2">Start Using Querion <ArrowRight size={18} /></span>
                                    </MagneticButton>
                                </Link>
                                <a href="#features">
                                    <MagneticButton
                                        className="px-8 py-4 rounded-2xl font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 bg-[var(--bg-card)] hover:bg-[var(--accent-glow)] text-base transition-all duration-300 backdrop-blur-md shadow-lg">
                                        View Features
                                    </MagneticButton>
                                </a>
                            </motion.div>

                            {/* Social proof */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                className="flex items-center gap-6 pt-2">
                                <div className="flex -space-x-2">
                                    {['#6366f1', '#22d3ee', '#a78bfa', '#22c55e'].map((c, i) => (
                                        <motion.div 
                                            key={i} 
                                            whileHover={{ y: -5, scale: 1.2, zIndex: 10 }}
                                            className="w-8 h-8 rounded-full border-2 border-[var(--bg-main)] shadow-lg" 
                                            style={{ backgroundColor: c }} 
                                        />
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}</div>
                                    <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">Trusted by 2,000+ engineers</p>
                                </div>
                                <div className="h-8 w-px bg-[var(--border-color)]" />
                                <div className="text-[var(--text-secondary)] text-xs">
                                    <span className="text-[var(--text-primary)] font-bold text-base">99.9%</span><br />uptime SLA
                                </div>
                            </motion.div>
                        </div>

                        {/* Right – Dashboard preview */}
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
                            className="relative hidden lg:block">
                            <div className="absolute -inset-4 bg-gradient-to-r from-[var(--accent-primary)]/20 to-cyan-600/20 rounded-[40px] blur-3xl opacity-50 animate-pulse" />
                            <DashboardPreview />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ─── TRUST STRIP ───────────────────────────────────────── */}
            <Section className="border-y border-[var(--border-color)] py-12">
                <div className="text-center mb-10">
                    <p className="text-[var(--text-secondary)] text-sm font-black uppercase tracking-widest opacity-70">Built for Developers, Startups, and Enterprises</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { icon: <Shield className="text-[var(--accent-primary)] mx-auto mb-3" size={32} />, label: "Enterprise Security", sub: "AES-256 · SOC 2" },
                        { icon: <Database className="text-cyan-400 mx-auto mb-3" size={32} />, label: "10+ Databases", sub: "PostgreSQL, MongoDB, MySQL…" },
                        { icon: <Activity className="text-emerald-400 mx-auto mb-3" size={32} />, label: "Real-time Monitoring", sub: "< 100ms latency" },
                        { icon: <Zap className="text-[var(--accent-secondary)] mx-auto mb-3 fill-current" size={32} />, label: "AI Analytics", sub: "GPT-4 powered insights" },
                    ].map(item => (
                        <motion.div 
                            key={item.label} 
                            whileHover={{ y: -8, scale: 1.05 }} 
                            className="text-center p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 hover:shadow-xl transition-all"
                        >
                            {item.icon}
                            <p className="text-[var(--text-primary)] font-bold text-sm">{item.label}</p>
                            <p className="text-[var(--text-secondary)] text-xs mt-1 font-medium">{item.sub}</p>
                        </motion.div>
                    ))}
                </div>
            </Section>

            {/* ─── CORE FEATURES ─────────────────────────────────────── */}
            <Section id="features">
                <SectionHeading badge="Core Features" title={<>Everything You Need<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400">In One Platform</span></>} sub="Querion combines AI, database intelligence, and backend observability into a single powerful platform." />
                <div className="grid md:grid-cols-3 gap-6 relative">
                    <Floating3DElement className="-top-10 -left-10 opacity-10" delay={0.5}>
                        <Cpu size={100} className="text-[var(--accent-primary)]" />
                    </Floating3DElement>
                    <FeatureCard
                        icon={<MessageSquare size={24} className="text-[var(--accent-primary)]" />}
                        title="Conversational Database Interaction"
                        desc='Interact with databases using natural language. Simply ask "Show me patient records added today" — Querion converts it into secure database operations.'
                        features={["Natural language queries", "Auto SQL generation", "Secure data access", "Fast query execution"]}
                        gradient="from-[var(--accent-primary)]/10 to-transparent"
                    />
                    <FeatureCard
                        icon={<Activity size={24} className="text-cyan-400" />}
                        title="Intelligent Backend Monitoring"
                        desc="Monitor your entire backend infrastructure in real time with interactive dashboards that visualize system health and performance."
                        features={["CPU & memory monitoring", "API performance metrics", "Database latency tracking", "Live log streaming"]}
                        gradient="from-cyan-500/5 to-cyan-500/0"
                    />
                    <FeatureCard
                        icon={<Globe size={24} className="text-purple-400" />}
                        title="External Dataset Integration"
                        desc="Connect external datasets through secure URLs. Import and analyze datasets without manual database setup — instant AI analysis included."
                        features={["Dataset import via URL", "Automatic data parsing", "Instant AI analysis", "Data visualization"]}
                        gradient="from-purple-500/5 to-purple-500/0"
                    />
                </div>
            </Section>

            {/* ─── DASHBOARD PREVIEW ─────────────────────────────────── */}
            <Section className="bg-gradient-to-b from-transparent via-[var(--accent-glow)]/10 to-transparent">
                <SectionHeading badge="Platform Preview" title={<>Powerful AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400">Dashboard</span></>} sub="Everything you need to monitor, analyze and interact with your data in one beautiful interface." />
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--accent-secondary)]/5 to-cyan-600/10 rounded-[40px] blur-3xl pointer-events-none" />
                    <DashboardPreview />
                    {/* Labels */}
                    <div className="hidden lg:flex justify-between mt-6 px-8">
                        {["AI Insights", "Real-Time Logs", "Error Detection", "Performance Monitoring"].map((l, i) => (
                            <div key={l} className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-bold">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                                {l}
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ─── ADVANCED CAPABILITIES ─────────────────────────────── */}
            <Section>
                <SectionHeading badge="Advanced Capabilities" title="Built Different." sub="Production-grade features that scale from hobby projects to enterprise deployments." />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative">
                    <Floating3DElement className="top-1/4 -right-20 opacity-10" delay={0} duration={12}>
                        <Server size={120} className="text-[var(--accent-primary)] opacity-30" />
                    </Floating3DElement>
                    {[
                        { icon: <Zap size={20} className="text-yellow-400" />, title: "AI Query Intelligence", desc: "Automatically translates natural language into database queries with high accuracy." },
                        { icon: <Shield size={20} className="text-red-400" />, title: "Real-Time Error Detection", desc: "Detect backend errors instantly through advanced log pattern monitoring." },
                        { icon: <TrendingUp size={20} className="text-emerald-400" />, title: "Predictive System Insights", desc: "AI predicts potential failures and anomalies before they affect your system." },
                        { icon: <Lock size={20} className="text-indigo-400" />, title: "Secure Database Connections", desc: "Enterprise-grade authentication and encrypted data access protocols." },
                        { icon: <BarChart3 size={20} className="text-cyan-400" />, title: "Live Monitoring Dashboard", desc: "Visualize infrastructure performance using high-fidelity interactive charts." },
                        { icon: <Globe size={20} className="text-purple-400" />, title: "Dataset URL Integration", desc: "Import external datasets via URL for instant analysis and visualization." },
                    ].map(cap => <CapCard key={cap.title} {...cap} />)}
                </div>
            </Section>

            {/* ─── HOW IT WORKS ──────────────────────────────────────── */}
            <Section className="border-y border-[var(--border-color)]">
                <SectionHeading badge="How It Works" title={<>Up and Running in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400">3 Steps</span></>} sub="Connect, query, and monitor — it's that simple." />
                <div className="grid md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-[var(--accent-primary)]/30 via-cyan-500/30 to-[var(--accent-primary)]/30" />
                    <StepCard num="1" icon={<Database size={32} className="text-[var(--accent-primary)]" />} title="Connect Your Data" desc="Connect your database or paste a dataset URL. Querion handles the rest automatically." />
                    <StepCard num="2" icon={<MessageSquare size={32} className="text-cyan-400" />} title="Ask in Natural Language" desc='Type questions like "Show top customers this month" and get instant SQL-powered results.' />
                    <StepCard num="3" icon={<Activity size={32} className="text-[var(--accent-secondary)]" />} title="Monitor & Optimize" desc="Watch real-time metrics, read AI insights, and act on intelligent recommendations." />
                </div>
            </Section>

            {/* ─── TECH STACK ────────────────────────────────────────── */}
            <Section>
                <SectionHeading badge="Technology Stack" title="Powered by the Best Stack" sub="Built on modern, battle-tested technologies designed for scale and performance." />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: "Frontend", techs: ["React", "Next.js", "Tailwind CSS"], color: "border-cyan-500/20 text-cyan-400" },
                        { label: "Backend", techs: ["Python", "FastAPI", "Node.js"], color: "border-indigo-500/20 text-indigo-400" },
                        { label: "Database", techs: ["PostgreSQL", "MongoDB", "MySQL"], color: "border-purple-500/20 text-purple-400" },
                        { label: "Monitoring", techs: ["Real-time Logs", "AI Anomaly Detection", "ECharts"], color: "border-emerald-500/20 text-emerald-400" },
                    ].map(stack => (
                        <motion.div 
                            key={stack.label} 
                            whileHover={{ y: -8, scale: 1.02 }}
                            className={`p-6 rounded-2xl border ${stack.color} bg-[var(--bg-card)] backdrop-blur-sm shadow-lg`}
                        >
                            <p className={`font-black text-sm uppercase tracking-widest mb-4 ${stack.color.split(' ')[1]}`}>{stack.label}</p>
                            <div className="space-y-2">
                                {stack.techs.map(t => (
                                    <div key={t} className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                                        <ChevronRight size={12} className="opacity-50" />{t}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Section>

            {/* ─── USE CASES ─────────────────────────────────────────── */}
            <Section className="bg-gradient-to-b from-transparent via-[var(--accent-glow)]/10 to-transparent">
                <SectionHeading badge="Use Cases" title="Who Uses Querion?" sub="From solo developers to enterprise teams — Querion scales with your needs." />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
                    <Floating3DElement className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5" delay={0} duration={20} rotate={true}>
                        <Globe size={400} className="text-[var(--accent-primary)]" />
                    </Floating3DElement>
                    <UseCaseCard icon={<Code2 size={20} className="text-cyan-400" />} who="Developers" title="Query Without SQL" desc="Analyze database data instantly without writing complex SQL statements." />
                    <UseCaseCard icon={<Layers size={20} className="text-[var(--accent-primary)]" />} who="Startups" title="Monitor Infrastructure" desc="Keep your backend healthy with real-time performance visibility." />
                    <UseCaseCard icon={<Shield size={20} className="text-emerald-400" />} who="Enterprises" title="Secure AI Access" desc="Interact with complex databases securely using enterprise-grade controls." />
                    <UseCaseCard icon={<BarChart3 size={20} className="text-[var(--accent-secondary)]" />} who="Researchers" title="Natural Language Analysis" desc="Analyze datasets using conversational queries and instant AI insights." />
                </div>
            </Section>

            {/* ─── SECURITY ──────────────────────────────────────────── */}
            <Section className="border-y border-[var(--border-color)]">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-6"
                        >
                            <Shield size={12} /> Enterprise-Grade Security
                        </motion.div>
                        <h2 className="text-4xl font-black text-[var(--text-primary)] mb-4 leading-tight">Your Data Is <span className="text-emerald-400">Always Safe</span></h2>
                        <p className="text-[var(--text-secondary)] leading-relaxed mb-8">Querion is built from the ground up with security as the foundation, not an afterthought.</p>
                        <div className="space-y-4">
                            {[
                                { title: "Encrypted Connections", desc: "AES-256 + TLS for all database connections", icon: <Lock size={18} className="text-emerald-400" /> },
                                { title: "Role-Based Access", desc: "Fine-grained permission control per user/team", icon: <Users size={18} className="text-indigo-400" /> },
                                { title: "Secure API Integrations", desc: "OAuth 2.0 and signed token authentication", icon: <Shield size={18} className="text-cyan-400" /> },
                                { title: "Audit Logging", desc: "Complete audit trail of all database interactions", icon: <FileCode size={18} className="text-purple-400" /> },
                            ].map(f => (
                                <motion.div 
                                    key={f.title} 
                                    whileHover={{ x: 10, backgroundColor: 'var(--accent-glow)' }}
                                    className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center flex-shrink-0 border border-[var(--border-color)] shadow-sm">{f.icon}</div>
                                    <div>
                                        <p className="text-[var(--text-primary)] font-bold text-sm">{f.title}</p>
                                        <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">{f.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    {/* Visual */}
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-indigo-600/10 rounded-full blur-3xl" />
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="relative w-64 h-64"
                        >
                            {Array.from({ length: 8 }).map((_, i) => {
                                const angle = (i / 8) * Math.PI * 2;
                                return (
                                    <div key={i} className="absolute w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                                        style={{ left: `calc(50% + ${Math.cos(angle) * 100}px - 20px)`, top: `calc(50% + ${Math.sin(angle) * 100}px - 20px)` }}>
                                        <CheckCircle2 size={16} className="text-emerald-400" />
                                    </div>
                                );
                            })}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                                    <Shield size={40} className="text-white fill-white/20" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </Section>

            {/* ─── CTA ───────────────────────────────────────────────── */}
            <Section>
                <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[var(--bg-card)] via-[var(--accent-glow)] to-[var(--bg-main)] border border-[var(--border-color)] p-16 text-center shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-primary)]/20 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative z-10">
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-glow)] border border-[var(--border-color)] text-[var(--accent-primary)] text-xs font-bold tracking-widest uppercase mb-6"
                        >
                            <Zap size={12} className="fill-current" /> Get Started Free
                        </motion.div>
                        <h2 className="text-5xl font-black text-[var(--text-primary)] mb-4 leading-tight">Start Using Querion<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-cyan-400">Today</span></h2>
                        <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-lg mx-auto font-medium">Unlock the power of AI-driven database interaction and backend monitoring.</p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link href={user ? '/database-selection' : '/signup'}>
                                <MagneticButton className="px-10 py-4 rounded-2xl font-bold text-white text-base bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-xl">
                                    Get Started <ArrowRight size={18} />
                                </MagneticButton>
                            </Link>
                            <Link href="/docs">
                                <MagneticButton className="px-10 py-4 rounded-2xl font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 bg-[var(--bg-card)] hover:bg-[var(--accent-glow)] text-base transition-all duration-300 backdrop-blur-md shadow-lg">
                                    View Documentation
                                </MagneticButton>
                            </Link>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ─── FOOTER ────────────────────────────────────────────── */}
            <footer className="border-t border-[var(--border-color)] px-6 md:px-12 py-16 bg-[var(--bg-main)]">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
                        {/* Brand */}
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg">
                                    <Zap size={20} className="text-white fill-white" />
                                </div>
                                <span className="text-xl font-black text-[var(--text-primary)]">Querion</span>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs font-medium">AI-Powered Conversational Assistant for Secure Database Interaction and Intelligent Backend Monitoring.</p>
                        </div>
                        {/* Links */}
                        {[
                            { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Dashboard", href: "/dashboard" }, { label: "Integrations", href: "/integrations" }] },
                            { title: "Resources", links: [{ label: "Documentation", href: "/docs" }, { label: "API Reference", href: "/api" }, { label: "Support", href: "/support" }] },
                            { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Privacy Policy", href: "/privacy" }] },
                        ].map(col => (
                            <div key={col.title}>
                                <h5 className="text-[var(--text-primary)] font-bold text-sm uppercase tracking-widest mb-4 opacity-80">{col.title}</h5>
                                <ul className="space-y-3">
                                    {col.links.map(l => <li key={l.label}><Link href={l.href} className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-sm transition-colors font-medium">{l.label}</Link></li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-[var(--border-color)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[var(--text-secondary)] text-sm font-medium">Querion © 2026. All rights reserved.</p>
                        <div className="flex items-center gap-4 text-[var(--text-secondary)] text-xs">
                            <span className="font-medium">Built with ❤️ for developers</span>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-500 font-bold">All systems operational</span></div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
