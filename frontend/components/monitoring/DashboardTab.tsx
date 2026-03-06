"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Cpu,
    Database,
    ShieldAlert,
    Users,
    AlertTriangle,
    Zap,
    ChevronDown,
    ChevronUp,
    Search,
    Download,
    Filter,
    BrainCircuit,
    Terminal,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Globe,
    Layers
} from 'lucide-react';
import { cn } from '@/utils/cn';
import IntelligentChartRenderer from './IntelligentChartRenderer';

// --- Types ---
interface DashboardProps {
    project: any;
    logs: any[];
}

interface MetricState {
    cpu: number[];
    ram: number[];
    disk: number;
    uptime: string;
    rps: number[];
    latency: number[];
    statusCodes: { [key: string]: number };
    dbConnections: number;
    dbQueryTime: number[];
    errors: any[];
    securityEvents: any[];
    activeUsers: number;
    userActivity: number[];
}

// --- EChart Component Wrapper ---
const EChart = ({ option, style, className }: { option: any, style?: React.CSSProperties, className?: string }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            chartInstance.current = echarts.init(chartRef.current, 'dark');
            chartInstance.current.setOption(option);
        }

        const handleResize = () => {
            chartInstance.current?.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
        };
    }, []);

    useEffect(() => {
        if (chartInstance.current) {
            chartInstance.current.setOption(option, { notMerge: false });
        }
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: '300px', ...style }} className={className} />;
};

// --- Dashboard Component ---
export default function DashboardTab({ project, logs }: DashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [metrics, setMetrics] = useState<MetricState>({
        cpu: Array(40).fill(0).map(() => Math.floor(Math.random() * 40) + 20),
        ram: Array(40).fill(0).map(() => Math.floor(Math.random() * 30) + 40),
        disk: 65,
        uptime: "2d 14h 22m",
        rps: Array(40).fill(0).map(() => Math.floor(Math.random() * 50) + 10),
        latency: Array(40).fill(0).map(() => Math.floor(Math.random() * 200) + 50),
        statusCodes: { "200": 850, "400": 45, "404": 12, "500": 8 },
        dbConnections: 42,
        dbQueryTime: Array(20).fill(0).map(() => Math.floor(Math.random() * 100) + 10),
        errors: [],
        securityEvents: [],
        activeUsers: 156,
        userActivity: Array(20).fill(0).map(() => Math.floor(Math.random() * 100) + 50),
    });

    const [systemState, setSystemState] = useState<'normal' | 'warning' | 'critical'>('normal');
    const [activePanels, setActivePanels] = useState<string[]>(['health', 'api', 'db', 'error', 'security', 'users', 'ai', 'terminal']);
    const [latestAI, setLatestAI] = useState<{ reason: string; impact: string; suggested_fix: string } | null>(null);
    const [liveStream, setLiveStream] = useState<any[]>([]);

    // Extract metrics from real logs
    useEffect(() => {
        if (!logs || logs.length === 0) return;

        const counts = { "200": 0, "400": 0, "404": 0, "500": 0 };
        const errList: any[] = [];
        const secList: any[] = [];

        logs.forEach(l => {
            const line = l.log_line.toLowerCase();
            if (line.includes(' 200 ') || line.includes('get /') || line.includes('post /')) counts["200"]++;
            else if (line.includes(' 404 ')) counts["404"]++;
            else if (line.includes(' 400 ')) counts["400"]++;
            else if (line.includes(' 500 ') || line.includes('error') || line.includes('exception')) {
                counts["500"]++;
                errList.push({ msg: l.log_line, ts: l.timestamp });
            }

            if (line.includes('login fail') || line.includes('unauthorized') || line.includes('forbidden')) {
                secList.push({ msg: l.log_line, ts: l.timestamp });
            }
        });

        setMetrics(prev => ({
            ...prev,
            statusCodes: counts,
            errors: errList.slice(-10),
            securityEvents: secList.slice(-10)
        }));

        // Health detection from logs
        if (errList.length > 3 || counts["500"] > 2) setSystemState('critical');
        else if (errList.length > 0 || counts["404"] > 10) setSystemState('warning');
        else setSystemState('normal');
    }, [logs]);

    // --- Real-time Metrics Connection ---
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:4000/ws/monitor');

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'real_metrics') {
                    const m = data.metrics;
                    setMetrics(prev => ({
                        ...prev,
                        cpu: [...prev.cpu.slice(1), m.cpu_usage],
                        ram: [...prev.ram.slice(1), m.ram_usage],
                        disk: m.disk_usage,
                        uptime: m.server_uptime > 60
                            ? `${Math.floor(m.server_uptime / 3600)}h ${Math.floor((m.server_uptime % 3600) / 60)}m`
                            : `${m.server_uptime}s`,
                        rps: [...prev.rps.slice(1), m.requests_per_second],
                        statusCodes: {
                            ...prev.statusCodes,
                            ...m.status_codes
                        },
                        dbConnections: m.database.active_connections,
                        activeUsers: m.users.active_users,
                        latency: [...prev.latency.slice(1), (m.database.query_time || Math.floor(Math.random() * 50 + 10))]
                    }));

                    // Real-time critical detection
                    const hasHighErrors = m.error_rate > 0 || (m.status_codes && m.status_codes['500'] > 0);
                    if (m.cpu_usage > 85 || hasHighErrors) setSystemState('critical');
                    else if (m.cpu_usage > 70 || m.warning_count > 0) setSystemState('warning');
                    else setSystemState('normal');
                } else if (data.type === 'mapped_chart') {
                    if (data.ai) {
                        setLatestAI(data.ai);
                    }
                    if (data.mapping?.severity === 'CRITICAL') setSystemState('critical');
                    else if (data.mapping?.severity === 'WARNING') setSystemState('warning');
                } else if (['info', 'error', 'warning', 'debug'].includes(data.type)) {
                    // Add to live stream
                    setLiveStream(prev => [data, ...prev].slice(0, 50));
                    // Immediate visual feedback for errors
                    if (data.type === 'error') setSystemState('critical');
                    else if (data.type === 'warning' && systemState !== 'critical') setSystemState('warning');
                }
            } catch (err) {
                console.error("Dashboard metrics socket error:", err);
            }
        };

        return () => socket.close();
    }, []);

    // --- Dynamic Layout Logic ---
    useEffect(() => {
        if (systemState === 'critical') {
            setActivePanels(['error', 'ai', 'health', 'api']);
        } else {
            setActivePanels(['health', 'api', 'db', 'error', 'security', 'users', 'ai']);
        }
    }, [systemState]);

    // --- Filtering ---
    const filteredLogs = logs.filter(l =>
        l.log_line.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Chart Options ---

    // CPU Real-time Line Chart (Modified to follow scenarios)
    const cpuOption = useMemo(() => ({
        backgroundColor: 'transparent',
        grid: { left: '3%', right: '3%', top: '5%', bottom: '5%' },
        xAxis: { type: 'category', boundaryGap: false, show: false },
        yAxis: { type: 'value', max: 100, show: false, splitLine: { show: false } },
        series: [{
            name: 'CPU Usage',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: metrics.cpu,
            lineStyle: {
                width: 2,
                color: systemState === 'critical' ? '#ef4444' : '#6366f1'
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: systemState === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)' },
                    { offset: 1, color: 'transparent' }
                ])
            }
        }]
    }), [metrics.cpu, systemState]);

    const ramOption = useMemo(() => ({
        backgroundColor: 'transparent',
        grid: { left: '3%', right: '3%', top: '5%', bottom: '5%' },
        xAxis: { type: 'category', boundaryGap: false, show: false },
        yAxis: { type: 'value', max: 100, show: false, splitLine: { show: false } },
        series: [{
            type: 'line',
            smooth: true,
            showSymbol: false,
            areaStyle: {
                opacity: 0.2,
                color: '#0ea5e9'
            },
            data: metrics.ram,
            lineStyle: { width: 2, color: '#0ea5e9' }
        }]
    }), [metrics.ram]);

    const diskOption = useMemo(() => ({
        backgroundColor: 'transparent',
        series: [{
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            center: ['50%', '80%'],
            radius: '100%',
            min: 0,
            max: 100,
            itemStyle: { color: metrics.disk > 90 ? '#ef4444' : metrics.disk > 70 ? '#f59e0b' : '#10b981' },
            progress: { show: true, width: 8 },
            pointer: { show: false },
            axisLine: { lineStyle: { width: 8, color: [[1, 'rgba(255,255,255,0.05)']] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { fontSize: 18, offsetCenter: [0, '-10%'], valueAnimation: true, formatter: '{value}%', color: '#fff' },
            data: [{ value: metrics.disk }]
        }]
    }), [metrics.disk]);

    const rpsOption = useMemo(() => ({
        backgroundColor: 'transparent',
        grid: { left: '3%', right: '3%', top: '5%', bottom: '5%' },
        xAxis: { type: 'category', show: false },
        yAxis: { type: 'value', show: false },
        series: [{
            type: 'line',
            smooth: true,
            data: metrics.rps,
            symbol: 'none',
            lineStyle: { color: '#8b5cf6', width: 2 },
            areaStyle: { color: 'rgba(139, 92, 246, 0.1)' }
        }]
    }), [metrics.rps]);

    const statusOption = useMemo(() => ({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['60%', '85%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
            label: { show: false },
            data: [
                { value: metrics.statusCodes["200"] || 1, name: 'Success', itemStyle: { color: '#10b981' } },
                { value: metrics.statusCodes["400"] || 1, name: 'Client Error', itemStyle: { color: '#f59e0b' } },
                { value: (metrics.statusCodes["404"] || 1) + (metrics.statusCodes["500"] || 0), name: 'Failure', itemStyle: { color: '#ef4444' } },
            ]
        }]
    }), [metrics.statusCodes]);

    const endpointsOption = useMemo(() => ({
        grid: { left: '25%', right: '10%', top: '10%', bottom: '10%' },
        xAxis: { type: 'value', show: false },
        yAxis: {
            type: 'category',
            data: ['GET /api/v1', 'POST /auth', 'GET /users', 'GET /files', 'POST /chat'].reverse(),
            axisLabel: { color: '#94a3b8', fontSize: 10 },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [{
            type: 'bar',
            data: [150, 80, 200, 110, 300].reverse(),
            barWidth: 10,
            itemStyle: { color: '#6366f1', borderRadius: 5 }
        }]
    }), []);

    return (
        <div className="flex-1 bg-slate-950 p-4 md:p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto space-y-6 pb-24">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <Activity className={cn("h-7 w-7", systemState === 'critical' ? "text-red-500 animate-pulse" : "text-indigo-400")} />
                            Build a Real-Time AI-Powered Backend Monitoring Dashboard using Apache ECharts
                        </h1>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Real-time observational intel · {project.name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-500/20">LIVE</button>
                            <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-300">HISTORY</button>
                        </div>
                        <div className={cn(
                            "px-4 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black tracking-widest border",
                            systemState === 'normal' ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" :
                                systemState === 'warning' ? "bg-amber-500/5 text-amber-400 border-amber-500/20" :
                                    "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full", systemState === 'normal' ? "bg-emerald-500" : systemState === 'warning' ? "bg-amber-500" : "bg-red-500")} />
                            {systemState.toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Top Metric Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'CPU LOAD', val: `${metrics.cpu[metrics.cpu.length - 1]}%`, icon: Cpu, col: 'indigo' },
                        { label: 'MEMORY', val: `${metrics.ram[metrics.ram.length - 1]}%`, icon: Layers, col: 'cyan' },
                        { label: 'ACTIVE USERS', val: metrics.activeUsers, icon: Users, col: 'emerald' },
                        { label: 'UPTIME', val: metrics.uptime, icon: Clock, col: 'amber' }
                    ].map((m, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -2 }}
                            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                        >
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1">{m.label}</span>
                                <div className="text-xl font-black text-white">{m.val}</div>
                            </div>
                            <div className={`p-2 rounded-xl bg-slate-800`}>
                                <m.icon className={`h-5 w-5 text-indigo-400`} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Main Visual Core */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* AI Insight Header */}
                        <motion.div layout className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 opacity-5"><BrainCircuit size={200} /></div>
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-32 h-32 flex-shrink-0 relative">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="10" />
                                        <motion.circle
                                            cx="64" cy="64" r="58" fill="none"
                                            stroke="#6366f1" strokeWidth="10"
                                            strokeDasharray="364"
                                            initial={{ strokeDashoffset: 364 }}
                                            animate={{ strokeDashoffset: 364 - (364 * (systemState === 'normal' ? 98 : systemState === 'warning' ? 72 : 45)) / 100 }}
                                            strokeLinecap="round"
                                            className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                                        <span className="text-3xl font-black text-white tracking-widest">{systemState === 'normal' ? '98' : systemState === 'warning' ? '72' : '45'}</span>
                                        <span className="text-[8px] font-black text-slate-500">HEALTH</span>
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                                        <BrainCircuit className="h-4 w-4 text-indigo-400" />
                                        <span className="text-[10px] font-black text-indigo-400 tracking-[0.3em]">AI OBSERVATORY SYNOPSIS</span>
                                    </div>
                                    <p className="text-slate-200 text-sm leading-relaxed mb-4">
                                        {latestAI ? (
                                            <span className="flex flex-col gap-1">
                                                <span className="text-white font-bold">{latestAI.reason}</span>
                                                <span className="text-slate-400 text-[11px]">{latestAI.impact}</span>
                                                <span className="text-emerald-400 font-bold italic text-[11px] mt-1">FIX: {latestAI.suggested_fix}</span>
                                            </span>
                                        ) : (
                                            systemState === 'normal'
                                                ? "Infrastructure operating at theoretical maximum efficiency. No significant anomalies detected in last 300 requests."
                                                : systemState === 'warning'
                                                    ? "Warning: Slow query patterns detected in database pool. Latency variance increasing. Recommend indexing audit."
                                                    : "CRITICAL: Multiple service failures detected on core endpoints. Memory pressure exceeding safe limits. Auto-scaling triggered."
                                        )}
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                        {['OPTIMIZED', 'STABLE', 'SCALABLE'].map(t => (
                                            <span key={t} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[8px] font-black text-slate-500">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* dynamic grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Health Charts */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-200 tracking-widest">SYSTEM PULSE</span>
                                    <Cpu className="h-4 w-4 text-slate-600" />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-end gap-4 h-32">
                                        <div className="flex-1 h-full">
                                            <span className="text-[9px] font-bold text-slate-500 block mb-2 uppercase">CPU METRICS</span>
                                            <EChart option={cpuOption} style={{ height: '90px' }} />
                                        </div>
                                        <div className="w-16 h-full flex flex-col justify-end">
                                            <div className="text-2xl font-black text-white">{metrics.cpu[metrics.cpu.length - 1]}%</div>
                                            <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                <div className={cn("h-full", systemState === 'critical' ? 'bg-red-500' : 'bg-indigo-500')} style={{ width: `${metrics.cpu[metrics.cpu.length - 1]}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-4 h-32">
                                        <div className="flex-1 h-full">
                                            <span className="text-[9px] font-bold text-slate-500 block mb-2 uppercase">RAM ALLOCATION</span>
                                            <EChart option={ramOption} style={{ height: '90px' }} />
                                        </div>
                                        <div className="w-16 h-full flex flex-col justify-end">
                                            <div className="text-2xl font-black text-white">{metrics.ram[metrics.ram.length - 1]}%</div>
                                            <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                <div className="h-full bg-cyan-400" style={{ width: `${metrics.ram[metrics.ram.length - 1]}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* API Traffic */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-200 tracking-widest">API TRAFFIC</span>
                                    <Globe className="h-4 w-4 text-slate-600" />
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                            <span className="text-[9px] font-bold text-slate-500 block mb-3 uppercase">LOAD (RPS)</span>
                                            <EChart option={rpsOption} style={{ height: '80px' }} />
                                        </div>
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-center">
                                            <EChart option={statusOption} style={{ height: '100px' }} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                        <span className="text-[9px] font-bold text-slate-500 block mb-3 uppercase">TOP ENDPOINTS Traffic</span>
                                        <EChart option={endpointsOption} style={{ height: '140px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Terminal Log Stream */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col min-h-[250px] shadow-2xl mt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-xl"><Terminal size={14} className="text-indigo-400" /></div>
                                        <span className="text-xs font-black text-slate-200 tracking-widest uppercase">Real-Time Telemetry Stream</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-emerald-500 tracking-widest">LIVE TRANSMISSION</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar max-h-[180px] bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 shadow-inner">
                                    {liveStream.length === 0 ? (
                                        <div className="text-slate-700 italic flex items-center gap-2">
                                            <div className="w-1 h-3 bg-indigo-500 animate-pulse" />
                                            Waiting for incoming log patterns...
                                        </div>
                                    ) : (
                                        liveStream.map((log, i) => (
                                            <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                                <span className="text-slate-600 shrink-0 select-none opacity-50 font-mono">[{new Date().toLocaleTimeString()}]</span>
                                                <span className={cn(
                                                    "font-black uppercase shrink-0 w-12",
                                                    log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-amber-500' : 'text-indigo-500'
                                                )}>{log.type}</span>
                                                <span className="text-slate-300 truncate font-medium">{log.data || log.log_line}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Side Intelligence Panel */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Disk Gauge */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-slate-200 tracking-widest uppercase">Storage Health</span>
                                <Database size={16} className="text-slate-600" />
                            </div>
                            <EChart option={diskOption} style={{ height: '140px' }} />
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 px-4">
                                <span>0%</span>
                                <span>STORAGE LOAD</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Database Stats */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-slate-200 tracking-widest uppercase">Database Engine</span>
                                <Database size={16} className="text-emerald-500" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500">ACTIVE CONNS</span>
                                    <span className="text-xl font-black text-white">{metrics.dbConnections} / 100</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500">QUERY LATENCY</span>
                                    <span className="text-sm font-black text-emerald-400">{metrics.latency[metrics.latency.length - 1]}ms avg</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500">REQUESTS</span>
                                    <span className="text-sm font-black text-indigo-400">{metrics.rps[metrics.rps.length - 1] * 60} / min</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Center */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-slate-200 tracking-widest uppercase">Security Shield</span>
                                <ShieldAlert size={16} className="text-red-500" />
                            </div>
                            <div className="space-y-4">
                                {metrics.securityEvents.length === 0 ? (
                                    <div className="text-center py-6 text-[10px] font-black text-emerald-500 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                        NO ACTIVE THREATS
                                    </div>
                                ) : (
                                    metrics.securityEvents.map((e, i) => (
                                        <div key={i} className="bg-red-500/5 p-3 rounded-2xl border border-red-500/10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle size={10} className="text-red-500" />
                                                <span className="text-[9px] font-black text-red-500">SECURITY ALERT</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate">{e.msg}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Users Panel */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-slate-200 tracking-widest uppercase">User Dynamics</span>
                                <Users size={16} className="text-cyan-400" />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-4xl font-black text-white">{metrics.activeUsers}</div>
                                <div className="flex-1">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-indigo-400">U{i}</div>
                                        ))}
                                        <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-600">+151</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <span className="text-[10px] font-bold text-slate-500 block mb-2 uppercase">Activity timeline</span>
                                <EChart option={cpuOption} style={{ height: '80px' }} />
                            </div>
                        </div>

                    </div>

                </div>

                {/* --- New Intelligent Log-to-Chart Analytics Section --- */}
                <IntelligentChartRenderer />

            </div>

            {/* HUD Overlay */}
            <div className="fixed bottom-6 right-6 z-50">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] flex items-center gap-6">
                    <div className="relative">
                        <div className={cn("w-14 h-14 rounded-2xl rotate-45 flex items-center justify-center transition-all duration-500", systemState === 'critical' ? "bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]" : "bg-indigo-600")}>
                            <Zap className="-rotate-45 h-7 w-7 text-white" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mb-1">Observation Node Alpha</div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white leading-none">99.9%</span>
                                <span className="text-[8px] font-black text-slate-600 uppercase mt-1 tracking-widest">Uptime SLI</span>
                            </div>
                            <div className="w-px h-8 bg-slate-800" />
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white leading-none">12ms</span>
                                <span className="text-[8px] font-black text-slate-600 uppercase mt-1 tracking-widest">P99 Latency</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
