"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, AlertTriangle, CheckCircle2, Activity, Zap,
    Database, ShieldAlert, Globe, Cpu, Search, ChevronDown, ChevronUp,
    Server, BarChart2, TrendingUp, Clock, AlertCircle, XCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AgentAnalysis {
    type: string;
    severity: 'CRITICAL' | 'WARNING' | 'MINOR' | 'HEALTHY';
    service: string;
    cause: string;
    suggested_fix: string;
}

interface AgentInsight {
    reason: string;
    impact: string;
    suggested_fix: string;
}

interface ChartMapping {
    chart_type: string;
    panel: string;
    title: string;
    severity: string;
    description?: string;
    metric_type?: string;
    recommended_color?: string;
}

interface AnomalyAlert {
    type: string;
    cause: string;
    action: string;
    value?: number;
}

interface MonitoringEvent {
    id: string;
    timestamp: string;
    log_line: string;
    analysis: AgentAnalysis;
    chartType: string;
    chartTitle: string;
    chartPanel: string;
    insight: AgentInsight;
    anomaly: AnomalyAlert | null;
}

// ── Severity helpers ────────────────────────────────────────────────────────────

function getSeverityColor(severity: string) {
    switch (severity?.toUpperCase()) {
        case 'CRITICAL': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500', ring: 'ring-red-500/20' };
        case 'WARNING': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500', ring: 'ring-amber-500/20' };
        case 'MINOR': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400', ring: 'ring-yellow-500/20' };
        default: return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500', ring: 'ring-emerald-500/20' };
    }
}

function getSeverityIcon(severity: string) {
    switch (severity?.toUpperCase()) {
        case 'CRITICAL': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
        case 'WARNING': return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
        case 'MINOR': return <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />;
        default: return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    }
}

// Derive analysis from the WebSocket mapped_chart event
function deriveAnalysis(mapping: ChartMapping, ai: AgentInsight, logLine: string): AgentAnalysis {
    const severity = (mapping.severity as AgentAnalysis['severity']) || 'HEALTHY';
    const metricType = mapping.metric_type || 'general';
    const panel = mapping.panel || 'GENERIC';

    const serviceMap: Record<string, string> = {
        'DATABASE_MONITORING': 'Database',
        'SECURITY': 'Auth / Security',
        'API_TRAFFIC': 'API Gateway',
        'SYSTEM_HEALTH': 'Infrastructure',
        'APPLICATION_LOGS': 'Application',
        'EXTERNAL_SERVICES': 'External APIs',
        'GENERIC_MONITORING': 'Monitoring'
    };

    return {
        type: metricType,
        severity,
        service: serviceMap[panel] || 'Backend',
        cause: ai?.reason || mapping.description || 'Log pattern detected',
        suggested_fix: ai?.suggested_fix || 'Investigate logs manually.'
    };
}

// Detect anomaly based on severity
function detectAnomaly(analysis: AgentAnalysis, logLine: string): AnomalyAlert | null {
    const msg = logLine.toLowerCase();
    if (analysis.severity === 'CRITICAL') {
        if (msg.includes('cpu') && msg.includes('high')) {
            return { type: 'High CPU Usage Detected', cause: 'CPU consumption exceeds safe threshold', action: 'Scale resources or kill heavy processes', value: 87 };
        }
        if (msg.includes('error rate')) {
            return { type: 'High Error Rate Detected', cause: 'Service producing errors above 20% threshold', action: 'Inspect error logs and recent deployments', value: 35 };
        }
        if (msg.includes('memory') || msg.includes('mem')) {
            return { type: 'Memory Pressure Detected', cause: 'Memory usage above 80%', action: 'Investigate memory leaks or scale vertically', value: 82 };
        }
        return { type: `Critical Event: ${analysis.type.toUpperCase()}`, cause: analysis.cause, action: analysis.suggested_fix };
    }
    if (analysis.severity === 'WARNING' && (msg.includes('slow') || msg.includes('timeout'))) {
        return { type: 'Latency Anomaly Detected', cause: 'Response times above normal threshold (>1000ms)', action: 'Check database query performance and network latency' };
    }
    return null;
}

// ── Agent Badge ─────────────────────────────────────────────────────────────────

function AgentBadge({ num, label, color }: { num: number; label: string; color: string }) {
    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black tracking-widest ${color}`}>
            <span>AGENT {num}</span>
            <span className="text-slate-500">·</span>
            <span>{label}</span>
        </div>
    );
}

// ── Single Event Card ────────────────────────────────────────────────────────────

function MonitoringEventCard({ event, index }: { event: MonitoringEvent; index: number }) {
    const [expanded, setExpanded] = useState(index === 0);
    const sc = getSeverityColor(event.analysis.severity);

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200",
                sc.border,
                event.anomaly ? `ring-1 ${sc.ring}` : ''
            )}
        >
            {/* ── Header Row ── */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/30 transition-colors"
            >
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot, event.analysis.severity === 'CRITICAL' ? 'animate-pulse' : '')} />
                <div className="flex items-center gap-2 flex-shrink-0">
                    {getSeverityIcon(event.analysis.severity)}
                    <span className={cn("text-[9px] font-black tracking-widest uppercase", sc.text)}>
                        {event.analysis.severity}
                    </span>
                </div>
                <span className="text-[10px] font-bold text-slate-300 flex-1 truncate text-left">
                    {event.chartTitle || event.analysis.type}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[8px] text-slate-600 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    {event.anomaly && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[7px] font-black text-red-400 tracking-widest">
                            ANOMALY
                        </span>
                    )}
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-800 p-4 space-y-4">

                            {/* Log line */}
                            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/50 font-mono text-[9px] text-slate-400 truncate">
                                <span className="text-slate-600 mr-2">&gt;</span>{event.log_line}
                            </div>

                            {/* 4-agent grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

                                {/* Agent 1 — Log Analyzer */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                                    <AgentBadge num={1} label="LOG ANALYZER" color="text-indigo-400 border-indigo-500/20 bg-indigo-500/5" />
                                    <div className="space-y-1.5 pt-1">
                                        <Row label="Type" value={event.analysis.type} />
                                        <Row label="Service" value={event.analysis.service} />
                                        <Row label="Cause" value={event.analysis.cause} truncate />
                                    </div>
                                </div>

                                {/* Agent 2 — Chart Selector */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                                    <AgentBadge num={2} label="CHART SELECTOR" color="text-cyan-400 border-cyan-500/20 bg-cyan-500/5" />
                                    <div className="space-y-1.5 pt-1">
                                        <Row label="Chart Type" value={event.chartType} />
                                        <Row label="Panel" value={event.chartPanel.replace('_', ' ')} />
                                        <Row label="Metric" value={event.analysis.type} />
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                                        <BarChart2 className="h-3 w-3 text-cyan-500/60" />
                                        <span className="text-[8px] text-cyan-400 font-black tracking-widest uppercase">{event.chartType} view</span>
                                    </div>
                                </div>

                                {/* Agent 3 — Insight Generator */}
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                                    <AgentBadge num={3} label="INSIGHT GEN" color="text-violet-400 border-violet-500/20 bg-violet-500/5" />
                                    <div className="space-y-1.5 pt-1">
                                        <Row label="Reason" value={event.insight.reason} truncate />
                                        <Row label="Impact" value={event.insight.impact} truncate />
                                        <Row label="Fix" value={event.insight.suggested_fix} truncate highlight />
                                    </div>
                                </div>

                                {/* Agent 4 — Anomaly Detector */}
                                <div className={cn(
                                    "border rounded-xl p-3 space-y-2",
                                    event.anomaly
                                        ? "bg-red-950/20 border-red-500/20"
                                        : "bg-slate-950 border-slate-800"
                                )}>
                                    <AgentBadge
                                        num={4}
                                        label="ANOMALY DET"
                                        color={event.anomaly
                                            ? "text-red-400 border-red-500/20 bg-red-500/5"
                                            : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                                        }
                                    />
                                    {event.anomaly ? (
                                        <div className="space-y-1.5 pt-1">
                                            <Row label="Alert" value={event.anomaly.type} highlight />
                                            <Row label="Cause" value={event.anomaly.cause} truncate />
                                            <Row label="Action" value={event.anomaly.action} truncate />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-3 gap-2">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />
                                            <span className="text-[8px] font-black text-emerald-600 tracking-widest text-center">NO ANOMALY DETECTED</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function Row({ label, value, truncate, highlight }: { label: string; value: string; truncate?: boolean; highlight?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
            <span className={cn(
                "text-[8px] font-bold leading-tight",
                truncate ? "truncate" : "line-clamp-2",
                highlight ? "text-emerald-400 italic" : "text-slate-300"
            )}>{value || '—'}</span>
        </div>
    );
}

// ── Summary Stats Bar ─────────────────────────────────────────────────────────

function SummaryBar({ events }: { events: MonitoringEvent[] }) {
    const critical = events.filter(e => e.analysis.severity === 'CRITICAL').length;
    const warning = events.filter(e => e.analysis.severity === 'WARNING').length;
    const healthy = events.filter(e => e.analysis.severity === 'HEALTHY').length;
    const anomalies = events.filter(e => e.anomaly !== null).length;
    const total = events.length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
                { label: 'TOTAL ANALYZED', val: total, color: 'text-indigo-400', icon: <Activity className="h-4 w-4" /> },
                { label: 'CRITICAL', val: critical, color: 'text-red-400', icon: <XCircle className="h-4 w-4" /> },
                { label: 'WARNINGS', val: warning, color: 'text-amber-400', icon: <AlertTriangle className="h-4 w-4" /> },
                { label: 'ANOMALIES', val: anomalies, color: 'text-violet-400', icon: <Zap className="h-4 w-4" /> },
            ].map((s, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-black text-slate-500 tracking-widest block mb-1">{s.label}</span>
                        <div className={cn("text-2xl font-black", s.color)}>{s.val}</div>
                    </div>
                    <div className={cn("p-2 rounded-xl bg-slate-800", s.color)}>{s.icon}</div>
                </div>
            ))}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIObservabilityPanel() {
    const [events, setEvents] = useState<MonitoringEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const counterRef = useRef(0);

    useEffect(() => {
        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            try {
                const ws = new WebSocket('ws://localhost:4000/ws/monitor');
                socketRef.current = ws;

                ws.onopen = () => { if (isMounted) setConnected(true); };

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'mapped_chart') {
                            const mapping = data.mapping as ChartMapping;
                            const ai = data.ai as AgentInsight;
                            const logLine = (data.log_line || data.log?.message || '').toString();

                            const analysis = deriveAnalysis(mapping, ai, logLine);
                            const anomaly = detectAnomaly(analysis, logLine);

                            counterRef.current++;
                            const newEvent: MonitoringEvent = {
                                id: `evt-${counterRef.current}-${Date.now()}`,
                                timestamp: new Date().toISOString(),
                                log_line: logLine || `log event #${counterRef.current}`,
                                analysis,
                                chartType: mapping.chart_type || 'line',
                                chartTitle: mapping.title || 'Log Event',
                                chartPanel: mapping.panel || 'GENERIC_MONITORING',
                                insight: ai || { reason: analysis.cause, impact: 'See log details', suggested_fix: analysis.suggested_fix },
                                anomaly,
                            };

                            setEvents(prev => [newEvent, ...prev].slice(0, 30));
                        }
                    } catch (_) { }
                };

                ws.onclose = () => {
                    if (isMounted) {
                        setConnected(false);
                        setTimeout(connect, 4000);
                    }
                };

                ws.onerror = () => { ws.close(); };
            } catch (_) { }
        };

        connect();
        return () => {
            isMounted = false;
            socketRef.current?.close();
        };
    }, []);

    return (
        <div className="mt-10 space-y-6 border-t border-slate-800/60 pt-10">

            {/* ── Section Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <BrainCircuit className="h-7 w-7 text-violet-400" />
                        <h2 className="text-xl font-black text-white tracking-tight">
                            AI OBSERVABILITY INTELLIGENCE
                        </h2>
                    </div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.25em] ml-10">
                        4-Agent System · Log Analyzer · Chart Selector · Insight Gen · Anomaly Detector
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Agent legend */}
                    <div className="hidden xl:flex items-center gap-2">
                        {[
                            { n: 1, label: 'ANALYZER', c: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
                            { n: 2, label: 'CHARTS', c: 'text-cyan-400   border-cyan-500/20   bg-cyan-500/5' },
                            { n: 3, label: 'INSIGHTS', c: 'text-violet-400 border-violet-500/20 bg-violet-500/5' },
                            { n: 4, label: 'ANOMALY', c: 'text-red-400    border-red-500/20    bg-red-500/5' },
                        ].map(a => (
                            <span key={a.n} className={`px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${a.c}`}>
                                A{a.n} {a.label}
                            </span>
                        ))}
                    </div>

                    <div className={cn(
                        "px-4 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black tracking-widest border",
                        connected
                            ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/5 text-red-500 border-red-500/20"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                        {connected ? "LIVE AI ANALYSIS" : "CONNECTING..."}
                    </div>
                </div>
            </div>

            {/* ── Summary stats ── */}
            {events.length > 0 && <SummaryBar events={events} />}

            {/* ── System Flow Visual ── */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                    {[
                        { label: 'Backend Application', icon: <Server className="h-3.5 w-3.5" />, color: 'text-slate-400 border-slate-700 bg-slate-800' },
                        { label: 'Log Collector', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5' },
                        { label: 'AI Log Analyzer', icon: <BrainCircuit className="h-3.5 w-3.5" />, color: 'text-violet-400 border-violet-500/30 bg-violet-500/5' },
                        { label: 'Chart Selector', icon: <BarChart2 className="h-3.5 w-3.5" />, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' },
                        { label: 'Insight Generator', icon: <Zap className="h-3.5 w-3.5" />, color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
                        { label: 'Anomaly Detector', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-400 border-red-500/30 bg-red-500/5' },
                        { label: 'ECharts Dashboard', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
                    ].map((node, i, arr) => (
                        <React.Fragment key={i}>
                            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-bold flex-shrink-0", node.color)}>
                                {node.icon}
                                <span>{node.label}</span>
                            </div>
                            {i < arr.length - 1 && (
                                <div className="text-slate-700 flex-shrink-0 text-xs font-bold">→</div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── Event Feed ── */}
            <div className="space-y-3">
                {events.length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                            <BrainCircuit className="h-12 w-12 text-slate-800" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-500 font-bold text-sm">Waiting for backend logs...</p>
                            <p className="text-slate-700 text-[11px] mt-1">
                                The 4-agent AI analysis will appear here as logs are received from your project.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex -space-x-1">
                                {['bg-indigo-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500'].map((c, i) => (
                                    <div key={i} className={cn("w-5 h-5 rounded-full border-2 border-slate-900 animate-pulse", c)} style={{ animationDelay: `${i * 200}ms` }} />
                                ))}
                            </div>
                            <span className="text-[9px] text-slate-600 font-bold tracking-widest">4 AGENTS READY</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">Latest Analysis — {events.length} events processed</span>
                        </div>
                        <AnimatePresence>
                            {events.map((evt, i) => (
                                <MonitoringEventCard key={evt.id} event={evt} index={i} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
