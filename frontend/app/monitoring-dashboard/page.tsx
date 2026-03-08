"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, Cpu, Database, Server, Zap, Shield,
    Bell, Search, Filter, ArrowUpRight, ArrowDownRight,
    LayoutDashboard, Globe, Layers, BarChart3, TrendingUp, AlertTriangle
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MonitoringDashboardPage() {
    const [stats, setStats] = useState({
        cpu: 45,
        ram: 62,
        requests: 1240,
        errors: 3
    });

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
                ram: Math.min(100, Math.max(0, prev.ram + (Math.random() * 4 - 2))),
                requests: prev.requests + Math.floor(Math.random() * 10),
                errors: Math.random() > 0.95 ? prev.errors + 1 : prev.errors
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-mesh flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 flex flex-col pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                            Monitoring Dashboard
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Live</span>
                        </h1>
                        <p className="text-slate-400 mt-2">Intelligent backend insights and system performance.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="bg-white/5 border border-white/10 text-white rounded-xl h-11 px-4 gap-2">
                            <Bell size={18} className="text-slate-400" />
                            <span>Set Alert</span>
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-indigo-500/20 border-0">
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="System Health"
                        value="99.8%"
                        trend="+0.2%"
                        trendUp={true}
                        icon={<Shield className="text-emerald-400" />}
                        chart={<MiniChart color="#10b981" />}
                    />
                    <StatCard
                        title="CPU Usage"
                        value={`${stats.cpu.toFixed(1)}%`}
                        trend="-2.4%"
                        trendUp={false}
                        icon={<Cpu className="text-indigo-400" />}
                        chart={<MiniChart color="#6366f1" />}
                    />
                    <StatCard
                        title="Memory Usage"
                        value={`${stats.ram.toFixed(1)}%`}
                        trend="+1.2%"
                        trendUp={true}
                        icon={<Database className="text-purple-400" />}
                        chart={<MiniChart color="#a855f7" />}
                    />
                    <StatCard
                        title="API Requests"
                        value={stats.requests.toLocaleString()}
                        trend="+12%"
                        trendUp={true}
                        icon={<Zap className="text-cyan-400" />}
                        chart={<MiniChart color="#22d3ee" />}
                    />
                </div>

                {/* Main Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Charts Section */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Huge Performance Chart Card */}
                        <div className="p-8 rounded-[32px] glass-card border-white/10 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <Activity size={240} className="text-indigo-500" />
                            </div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Query Performance</h3>
                                    <p className="text-slate-400 text-sm">Real-time database latency and throughput.</p>
                                </div>
                                <div className="flex gap-2">
                                    {['1h', '6h', '24h', '7d'].map((p) => (
                                        <button key={p} className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${p === '1h' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white transition-colors'}`}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-80 w-full relative z-10 flex items-end gap-2 px-2">
                                {Array.from({ length: 30 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${20 + Math.random() * 80}%` }}
                                        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', delay: i * 0.05 }}
                                        className="flex-1 bg-gradient-to-t from-indigo-600/20 via-indigo-600/40 to-cyan-400/60 rounded-t-xl"
                                    />
                                ))}
                                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-white/10" />
                                <div className="absolute inset-y-0 left-0 w-[1px] bg-white/10" />
                            </div>

                            <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest relative z-10">
                                <span>12:00 PM</span>
                                <span>1:00 PM</span>
                                <span>2:00 PM</span>
                                <span>3:00 PM</span>
                                <span>4:00 PM</span>
                            </div>
                        </div>

                        {/* Logs Section */}
                        <div className="p-8 rounded-[32px] glass-card border-white/10 shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Layers className="text-slate-400" size={20} />
                                    Live Logs
                                </h3>
                                <Button variant="ghost" size="sm" className="text-indigo-400 text-xs font-bold uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/10">View All</Button>
                            </div>

                            <div className="space-y-3 font-mono text-xs">
                                <LogEntry time="14:22:01" level="INFO" tag="DB" message="Query executed successfully: SELECT * FROM users LIMIT 100" />
                                <LogEntry time="14:21:45" level="WARN" tag="SYSTEM" message="CPU spikes detected on node worker-04 (82.1%)" />
                                <LogEntry time="14:21:30" level="ERROR" tag="API" message="Failed to authenticate request: Invalid bearer token" />
                                <LogEntry time="14:21:12" level="INFO" tag="CACHE" message="Warm-up complete for global redis-cluster" />
                                <LogEntry time="14:20:55" level="INFO" tag="DB" message="New connection established from 192.168.1.105" />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar section */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* AI Suggestions Card */}
                        <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <TrendingUp size={200} className="text-cyan-400" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-6 relative z-10 flex items-center gap-3">
                                <Zap className="text-yellow-400 fill-yellow-400" size={20} />
                                AI Suggestions
                            </h3>

                            <div className="space-y-6 relative z-10">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <h4 className="text-sm font-bold text-white mb-2">Optimize Indexing</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Querion detected 14 slow queries on the <code className="text-cyan-400">orders</code> table. Adding an index to <code className="text-indigo-400">customer_id</code> could improve performance by 45%.
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <h4 className="text-sm font-bold text-white mb-2">Memory Pressure</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Worker node A is approaching 80% RAM utilization. Consider increasing the cache eviction rate or scaling out.
                                    </p>
                                </div>
                                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl h-12 font-bold transition-all border-0">
                                    Apply All Optimizations
                                </Button>
                            </div>
                        </div>

                        {/* Recent Alerts Card */}
                        <div className="p-8 rounded-[32px] glass-card border-white/10 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <Bell className="text-slate-400" size={20} />
                                Recent Alerts
                            </h3>

                            <div className="space-y-4">
                                <AlertItem
                                    severity="CRITICAL"
                                    title="Database Connection Lost"
                                    time="2 mins ago"
                                />
                                <AlertItem
                                    severity="WARNING"
                                    title="High Latency on Login API"
                                    time="15 mins ago"
                                />
                                <AlertItem
                                    severity="INFO"
                                    title="Monthly Backup Complete"
                                    time="1 hour ago"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ title, value, trend, trendUp, icon, chart }: any) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-[28px] glass-card border-white/10 shadow-xl"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {icon}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {trend}
                </div>
            </div>

            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h4>
            <div className="text-2xl font-black text-white mb-4">{value}</div>

            <div className="h-10 w-full overflow-hidden">
                {chart}
            </div>
        </motion.div>
    );
}

function MiniChart({ color }: { color: string }) {
    return (
        <div className="flex items-end gap-1 h-full w-full">
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                        backgroundColor: color,
                        opacity: 0.2 + (i / 12) * 0.8,
                        height: `${30 + Math.random() * 70}%`
                    }}
                />
            ))}
        </div>
    );
}

function LogEntry({ time, level, tag, message }: any) {
    const levelColors: any = {
        INFO: 'text-indigo-400',
        WARN: 'text-yellow-400',
        ERROR: 'text-red-400'
    };

    return (
        <div className="flex items-start gap-4 p-2 hover:bg-white/5 rounded-lg transition-colors group">
            <span className="text-slate-600 whitespace-nowrap">{time}</span>
            <span className={`font-bold w-12 ${levelColors[level]}`}>{level}</span>
            <span className="text-slate-500 w-16 px-1 border border-white/5 rounded bg-white/5 text-[10px] text-center">{tag}</span>
            <span className="text-slate-300 group-hover:text-white transition-colors truncate">{message}</span>
        </div>
    );
}

function AlertItem({ severity, title, time }: any) {
    const colors: any = {
        CRITICAL: 'bg-red-500',
        WARNING: 'bg-yellow-500',
        INFO: 'bg-indigo-500'
    };

    return (
        <div className="flex items-start gap-4">
            <div className={`w-1.5 h-10 rounded-full ${colors[severity]}`} />
            <div>
                <h5 className="text-sm font-bold text-white leading-tight">{title}</h5>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{severity} · {time}</span>
            </div>
        </div>
    );
}
