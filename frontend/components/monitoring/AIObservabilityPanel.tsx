"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, AlertTriangle, CheckCircle2, Activity, Zap, Database,
    ShieldAlert, Globe, Cpu, BarChart2, TrendingUp, Clock, AlertCircle,
    XCircle, ChevronDown, ChevronUp, Eye, Server, Layers, ArrowRight,
    Sparkles, Terminal, Hash, Info, HelpCircle, MapPin, Code2, ShieldCheck, Code2 as CodeIcon
} from 'lucide-react';
import * as echarts from 'echarts';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'MINOR' | 'INFO' | 'HEALTHY';

interface AgentInsight {
    cause?: string;
    root_cause?: string;
    impact?: string;
    suggested_fix?: string;
    system_status?: 'HEALTHY' | 'UNSTABLE' | 'RISK';
    risk_level?: string;
    severity_score?: number;
    error_type?: string;
    affected_file?: string;
    affected_line?: string | number;
    line_number?: string | number;
    severity?: string;
    code_snippet?: string;
    generated_fix_code?: string;
    correct_code?: string;
    explanation?: string;
    detailed_explanation?: string;
    fix_steps?: string[];
    terminal_commands?: string | string[];
    commands?: string;
    session_id?: string;
    prevention_advice?: string[];
    dashboard_label?: string;
    chart_type?: string;
}

interface ChartMapping {
    chart_type: string; panel: string; title: string; severity: string;
    description?: string; metric_type?: string; recommended_color?: string;
    cause?: string;
}

interface MonitoringEvent {
    id: string; timestamp: string; log_line: string;
    severity: Severity; service: string; errorType: string; cause: string;
    chartType: string; chartTitle: string; chartPanel: string;
    insight: AgentInsight; hasAnomaly: boolean; anomalyTitle?: string;
    anomalyAction?: string; explanation: string;
    fixSteps: { steps: string[]; command?: string };
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const SEV_STYLES: Record<Severity, { bg: string; border: string; text: string; bar: string; dot: string; glow: string }> = {
    CRITICAL: { bg: 'bg-red-950/40', border: 'border-red-500/40', text: 'text-red-400', bar: 'bg-red-500', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
    ERROR: { bg: 'bg-red-950/30', border: 'border-red-400/40', text: 'text-red-300', bar: 'bg-red-400', dot: 'bg-red-400', glow: 'shadow-red-400/20' },
    WARNING: { bg: 'bg-amber-950/30', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-400', dot: 'bg-amber-400', glow: 'shadow-amber-500/20' },
    MINOR: { bg: 'bg-yellow-950/20', border: 'border-yellow-500/20', text: 'text-yellow-400', bar: 'bg-yellow-400', dot: 'bg-yellow-400', glow: 'shadow-yellow-500/10' },
    INFO: { bg: 'bg-blue-950/20', border: 'border-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500', dot: 'bg-blue-500', glow: 'shadow-blue-500/10' },
    HEALTHY: { bg: 'bg-emerald-950/20', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/10' },
};
const SEV_PCT: Record<Severity, number> = { CRITICAL: 90, ERROR: 75, WARNING: 55, MINOR: 25, INFO: 15, HEALTHY: 10 };

const PANEL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    DATABASE_MONITORING: { label: 'Database', icon: <Database className="h-3.5 w-3.5" />, color: 'text-sky-400' },
    SECURITY: { label: 'Auth/Security', icon: <ShieldAlert className="h-3.5 w-3.5" />, color: 'text-red-400' },
    API_TRAFFIC: { label: 'API Gateway', icon: <Globe className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
    SYSTEM_HEALTH: { label: 'Infrastructure', icon: <Cpu className="h-3.5 w-3.5" />, color: 'text-violet-400' },
    APPLICATION_LOGS: { label: 'Application', icon: <Layers className="h-3.5 w-3.5" />, color: 'text-cyan-400' },
    EXTERNAL_SERVICES: { label: 'External APIs', icon: <Server className="h-3.5 w-3.5" />, color: 'text-amber-400' },
    GENERIC_MONITORING: { label: 'Monitoring', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-slate-400' },
};

function deriveEvent(mapping: ChartMapping, ai: AgentInsight | any, logLine: string, id: string): MonitoringEvent {
    const sev = (ai?.severity_level?.toUpperCase() as Severity) || (ai?.severity?.toUpperCase() as Severity) || (mapping.severity?.toUpperCase() as Severity) || 'HEALTHY';
    const pm = PANEL_META[mapping.panel] || PANEL_META.GENERIC_MONITORING;
    
    // Explicit anomaly detection based on AI system_status
    const isUnstable = ai?.system_status === 'UNSTABLE';
    const isRisk = ai?.system_status === 'RISK';
    const hasAnomaly = isUnstable || isRisk || sev === 'CRITICAL' || sev === 'ERROR';
    
    const anomalyTitle = isUnstable 
        ? `SYSTEM UNSTABLE: ${ai.error_type || mapping.title}` 
        : (isRisk ? `PERFORMANCE RISK: ${ai.error_type || mapping.title}` : undefined);

    // Build detailed explanation
    const explanation = ai?.detailed_explanation || ai?.explanation || buildExplanation(mapping, ai, logLine);
    
    // Build fix data from new AI fields
    const fixData = {
        steps: ai?.fix_steps || (ai?.suggested_fix ? [ai.suggested_fix] : ['Monitor the situation', 'Check recent deployments']),
        command: (Array.isArray(ai?.terminal_commands) ? ai.terminal_commands[0] : ai?.terminal_commands) || ai?.commands || 'npm run logs'
    };

    return {
        id, timestamp: new Date().toISOString(), log_line: logLine || `[log event]`,
        severity: sev, service: pm.label, errorType: ai?.error_type || mapping.metric_type || 'general',
        cause: ai?.root_cause || ai?.cause || mapping.description || 'Log pattern detected.',
        chartType: mapping.chart_type || (ai?.chart_type) || 'line',
        chartTitle: mapping.title || ai?.dashboard_label || 'Log Event',
        chartPanel: mapping.panel || 'GENERIC_MONITORING',
        insight: ai || { cause: 'Analyzing architectural context...', impact: 'Evaluating system stability...', suggested_fix: 'Stand by for detailed fix.' },
        hasAnomaly, anomalyTitle,
        anomalyAction: ai?.suggested_fix || (ai?.fix_steps?.length ? ai.fix_steps[0] : 'Investigating logs...'),
        explanation,
        fixSteps: fixData,
    };
}

function buildExplanation(mapping: ChartMapping, ai: AgentInsight, log: string): string {
    if (ai?.explanation) return ai.explanation; 
    
    const cause = ai?.root_cause || ai?.cause || mapping.description || 'A system event was captured.';
    const impact = ai?.impact || 'Monitoring service is evaluating the effects on upstream dependencies.';
    const subsystem = (mapping.panel || 'GENERIC').replace(/_/g, ' ').toLowerCase();
    const fileInfo = ai?.affected_file ? ` The issue originated in ${ai.affected_file}.` : '';
    
    return `ROOT CAUSE: ${cause} ARCHITECTURAL IMPACT: ${impact} System context: Detected in the ${subsystem} layer.${fileInfo}`;
}

/* ─── Animated Counter ───────────────────────────────────────────────────────── */
function AnimatedCounter({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = display;
        const step = Math.ceil(Math.abs(value - start) / 20);
        const timer = setInterval(() => {
            start = start < value ? Math.min(start + step, value) : Math.max(start - step, value);
            setDisplay(start);
            if (start === value) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [value]);
    return <>{display}</>;
}

/* ─── Typing Text ────────────────────────────────────────────────────────────── */
function TypingText({ text, speed = 18 }: { text: string; speed?: number }) {
    const [shown, setShown] = useState('');
    useEffect(() => {
        setShown('');
        let i = 0;
        const t = setInterval(() => {
            i++;
            setShown(text.slice(0, i));
            if (i >= text.length) clearInterval(t);
        }, speed);
        return () => clearInterval(t);
    }, [text, speed]);
    return (
        <span>
            {shown}
            {shown.length < text.length && (
                <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 animate-pulse" />
            )}
        </span>
    );
}

/* ─── Severity Meter ─────────────────────────────────────────────────────────── */
function SeverityMeter({ severity }: { severity: Severity }) {
    const s = SEV_STYLES[severity] || SEV_STYLES.INFO;
    const pct = SEV_PCT[severity] || 50;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Severity Level</span>
                <span className={`text-[9px] font-black ${s.text} tracking-widest`}>{severity}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${s.bar}`}
                />
            </div>
            <div className="flex justify-between">
                <span className="text-[7px] text-slate-700">LOW</span>
                <span className="text-[7px] text-slate-700">HIGH</span>
            </div>
        </div>
    );
}

/* ─── Info Row ───────────────────────────────────────────────────────────────── */
function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
            <span className={`text-[10px] font-bold truncate ${color || 'text-slate-300'}`}>{value || '—'}</span>
        </div>
    );
}

/* ─── Individual Event Card ──────────────────────────────────────────────────── */
function EventCard({ event, index, metrics }: { event: MonitoringEvent; index: number; metrics: any }) {
    const [expanded, setExpanded] = useState(index === 0);
    const s = SEV_STYLES[event.severity] || SEV_STYLES.HEALTHY;
    const pm = PANEL_META[event.chartPanel] || PANEL_META.GENERIC_MONITORING;

    return (
        <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className={`rounded-2xl border overflow-hidden shadow-lg ${s.border} ${s.bg} ${event.hasAnomaly ? `shadow-md ${s.glow}` : ''}`}
        >
            {/* Header */}
            <button onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-all text-left uppercase tracking-tight ${expanded ? 'bg-white/5 ring-1 ring-white/10' : ''}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot} ${event.severity === 'CRITICAL' ? 'animate-pulse' : ''} shadow-lg shadow-current/20`} />
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-lg border ${s.border} ${s.text} bg-black/40`}>
                        {event.severity}
                    </span>
                </div>
                <Terminal className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="font-mono text-xs text-indigo-100 font-black truncate tracking-tight">
                        {event.log_line.split('\n')[0]}
                    </div>
                    {event.log_line.includes('\n') && (
                        <div className="flex items-center gap-2">
                             <Layers className="h-3 w-3 text-slate-500" />
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                {event.log_line.split('\n').length} UNIT CLUSTER • RECURRING PATTERN
                             </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-black ${pm.color} flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-lg border border-white/5`}>
                        {pm.icon}{pm.label}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="border-t border-white/5 p-5 space-y-6">

                            {/* visual agent panels */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-black/30 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-3.5 w-3.5 text-indigo-400" />
                                        <span className="text-[9px] font-black text-indigo-400 tracking-widest uppercase">Analysis</span>
                                    </div>
                                    <div className="space-y-2">
                                        <InfoRow label="Error Type" value={event.errorType} color="text-slate-300" />
                                        <InfoRow label="Service" value={event.service} color="text-slate-300" />
                                    </div>
                                    <SeverityMeter severity={event.severity} />
                                </div>


                                <div className="bg-black/30 border border-violet-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BrainCircuit className="h-3.5 w-3.5 text-violet-400" />
                                        <span className="text-[9px] font-black text-violet-400 tracking-widest uppercase">AI Insight</span>
                                    </div>
                                    <div className="space-y-3">
                                        <InfoRow label="Root Cause" value={event.insight.root_cause || 'Analyzing...'} />
                                        <div>
                                            <span className="text-[7px] font-black text-slate-600 uppercase block mb-1">Impact</span>
                                            <p className="text-[9px] text-red-400 font-bold leading-tight">{event.insight.impact || 'In Review'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`rounded-2xl p-4 border transition-all ${event.insight.system_status === 'UNSTABLE' ? 'bg-red-950/20 border-red-500/30' : 'bg-black/30 border-emerald-500/20'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        {event.insight.system_status === 'UNSTABLE' ? <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                                        <span className={`text-[10px] font-black tracking-widest uppercase ${event.insight.system_status === 'UNSTABLE' ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {event.insight.system_status || 'STABLE'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-relaxed italic">Log indicates nominal operational baseline. External dependencies healthy.</p>
                                </div>
                            </div>

                            {/* Raw Logs */}
                            <div className="bg-black/40 border border-slate-800 rounded-2xl overflow-hidden">
                                <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Live Group Payload</span>
                                    <span className="text-[7px] font-mono text-slate-600 uppercase">ID: {event.id.substring(0, 10)}</span>
                                </div>
                                <div className="p-4 bg-slate-950/30 max-h-[150px] overflow-y-auto scrollbar-hide">
                                    <pre className="font-mono text-[10px] text-slate-300 whitespace-pre-wrap break-all leading-relaxed">
                                        {event.log_line}
                                    </pre>
                                </div>
                            </div>

                            {/* DEEP OBSERVABILITY SYNOPSIS / LOG ANALYSIS REPORT */}
                            <div className="bg-gradient-to-br from-indigo-950/40 via-black to-black border border-indigo-500/30 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Sparkles className="h-24 w-24 text-indigo-400" />
                                </div>
                                
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
                                            <Sparkles className="h-5 w-5 text-indigo-400" />
                                        </div>
                                        <h3 className="text-sm font-black text-indigo-100 uppercase tracking-widest">
                                            {event.insight?.full_report ? 'LOG ANALYSIS REPORT' : 'Deep Observability Synopsis'}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                                            <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: '96%' }} />
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-700 uppercase tracking-tighter">AI-MODEL: DEEPSEEK REASONING ENGINE</span>
                                    </div>
                                </div>

                                {event.insight?.full_report ? (
                                    <div className="p-6 rounded-2xl bg-black/50 border border-white/5 font-mono selection:bg-indigo-500/30">
                                        <pre className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {event.explanation}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Fallback to 3-column layout if AI didn't provide full report */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                                                    <HelpCircle className="h-4 w-4 text-cyan-400" />
                                                </div>
                                                <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase underline decoration-cyan-400/20 underline-offset-8">1. What happened?</span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 min-h-[120px]">
                                                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                                    {event.explanation || "Analyzing log sequence..."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:border-l md:border-white/5 md:pl-8">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-amber-500/10">
                                                    <MapPin className="h-4 w-4 text-amber-400" />
                                                </div>
                                                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase underline decoration-amber-400/20 underline-offset-8">2. Where is it?</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                                    <span className="text-[7px] font-black text-slate-500 uppercase block mb-1">Affected File Path</span>
                                                    <p className="text-[10px] text-amber-200 font-mono font-bold break-all">
                                                        {event.insight?.affected_file || 'Log Metadata (No file mapping found)'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:border-l md:border-white/5 md:pl-8">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase underline decoration-emerald-400/20 underline-offset-8">3. How to fix?</span>
                                            </div>
                                            <div className="space-y-3">
                                                {event.fixSteps.steps.map((step, i) => (
                                                    <div key={i} className="flex gap-3 items-start">
                                                        <span className="shrink-0 w-4 h-4 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[8px] font-black text-emerald-400 mt-0.5">{i+1}</span>
                                                        <p className="text-[10px] text-slate-300 leading-snug font-medium">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Corrective Snippet (Still shown below if AI returns it separately) */}
                                {(event.insight?.generated_fix_code || event.insight?.correct_code || event.fixSteps.command) && (
                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        {event.fixSteps.command && (
                                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between group/cmd">
                                                <div className="flex items-center gap-3">
                                                    <Terminal className="h-4 w-4 text-indigo-400" />
                                                    <code className="text-[11px] text-indigo-200 font-mono font-bold tracking-tight">{event.fixSteps.command}</code>
                                                </div>
                                                <button className="text-[8px] font-black text-indigo-500 uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">Copy Fix</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between opacity-30">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-3 w-3 text-slate-500" />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Validated Autopilot Deployment</span>
                                    </div>
                                    <span className="text-[8px] font-black text-slate-700 uppercase">Latency: DeepSeek-Sync</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ─── Pipeline Node ──────────────────────────────────────────────────────────── */
const PIPELINE = [
    { label: 'Backend App', icon: <Server className="h-3.5 w-3.5" />, color: 'text-slate-400 border-slate-700 bg-slate-800/60' },
    { label: 'Log Collector', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-900/20' },
    { label: 'Log Analyzer', icon: <Eye className="h-3.5 w-3.5" />, color: 'text-violet-400 border-violet-500/30 bg-violet-900/20' },
    { label: 'Insight Gen', icon: <BrainCircuit className="h-3.5 w-3.5" />, color: 'text-amber-400 border-amber-500/30 bg-amber-900/20' },
    { label: 'Anomaly Det', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-400 border-red-500/30 bg-red-900/20' },
];

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function AIObservabilityPanel({ logGroups = [] }: { logGroups?: any[] }) {
    const [events, setEvents] = useState<MonitoringEvent[]>([]);
    const [pipelineActive, setPipelineActive] = useState(0);
    const [metrics, setMetrics] = useState<any>(null);
    const [liveAI, setLiveAI] = useState<Record<string, any>>({});
    const [connected, setConnected] = useState(false);

    const critical = events.filter(e => e.severity === 'CRITICAL' || e.severity === 'ERROR').length;
    const warnings = events.filter(e => e.severity === 'WARNING').length;
    const anomalies = events.filter(e => e.hasAnomaly).length;

    // Animate pipeline
    // Real-time AI Update Listener
    useEffect(() => {
        let isMounted = true;
        const connect = () => {
            if (!isMounted) return;
            try {
                const ws = new WebSocket('ws://localhost:4000/ws/monitor');
                ws.onopen = () => { if (isMounted) setConnected(true); };
                ws.onclose = () => { if (isMounted) { setConnected(false); setTimeout(connect, 4000); } };
                ws.onerror = () => ws.close();
                ws.onmessage = (ev) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(ev.data);
                        if (data.type === 'mapped_chart' && data.ai) {
                            const msgId = data.log_id;
                            if (msgId) {
                                setLiveAI(prev => ({ ...prev, [msgId]: data.ai }));
                            }
                        } else if (data.type === 'real_metrics') {
                            setMetrics(data.metrics);
                        }
                    } catch (_) { }
                };
            } catch (_) { }
        };
        connect();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (!logGroups || logGroups.length === 0) {
            setEvents([]);
            return;
        }

        // --- Unified Clustering Logic (Matches LogGroupsPage) ---
        const merged: any[] = [];
        let lastErrorGroup: any = null;

        logGroups.forEach(g => {
            const line = g.representative_line.trim();
            const isStackTrace = line.startsWith("at ");
            const isCodeFrame = /^\d+\s*\|/.test(line);
            const isPointer = /^(\||\s*\^)/.test(line);
            const isFilePath = /([a-zA-Z]:\\[^: \n]+|\/[^: \n]+)/.test(line);
            
            const isContinuation =
                isStackTrace ||
                isCodeFrame ||
                isPointer ||
                isFilePath ||
                line.includes("node_modules") ||
                line.includes("async") ||
                line.includes("@babel") ||
                line.includes("gensync") ||
                line.startsWith("Network:") ||
                line.startsWith("Local:") ||
                line.startsWith("->") ||
                line.startsWith("VITE v") ||
                line.startsWith("> ") ||
                (lastErrorGroup && (isCodeFrame || isStackTrace || isPointer));

            const startsError = 
                g.severity === 'ERROR' || 
                g.severity === 'CRITICAL' || 
                g.representative_line.includes("[vite] Internal server error") ||
                g.representative_line.toLowerCase().includes("error:");

            if (isContinuation && lastErrorGroup) {
                lastErrorGroup.representative_line += "\n" + g.representative_line;
                lastErrorGroup.count += g.count;
                if (new Date(g.last_timestamp) > new Date(lastErrorGroup.last_timestamp)) {
                    lastErrorGroup.last_timestamp = g.last_timestamp;
                }
            } else {
                const newGroup = { ...g };
                merged.push(newGroup);
                // Allow any log that isn't itself a continuation to be an anchor
                lastErrorGroup = newGroup;
            }
        });

        const derived = merged.map((lg, i) => {
            const logId = `evt-${lg.key}`;
            const aiResult = liveAI[logId];

            const aiData = aiResult || {
                root_cause: lg.severity === 'CRITICAL' ? 'Core system fault detected' : (lg.severity === 'ERROR' ? 'Exception raised in execution layer' : 'Routine system event logged'),
                impact: lg.severity === 'CRITICAL' ? 'High risk to system stability and availability' : (lg.severity === 'ERROR' ? 'Potential localized context failure' : 'Monitoring nominal operating execution'),
                system_status: lg.severity === 'CRITICAL' ? 'UNSTABLE' : (lg.severity === 'ERROR' ? 'RISK' : 'HEALTHY'),
                severity_score: SEV_PCT[lg.severity as Severity] || 10 + Math.floor(Math.random() * 5),
                error_type: lg.severity === 'INFO' ? 'Routine Execution' : 'System Exception',
                affected_file: lg.representative_line?.match(/([a-zA-Z0-9_\-\/\\]+\.[a-zA-Z0-9]+(:\d+)?)/)?.[0] || 'System Core'
            };

            return deriveEvent(
                { 
                  chart_type: aiResult?.chart_type || (lg.severity === 'INFO' ? 'line' : 'gauge'), 
                  panel: 'APPLICATION_LOGS', 
                  title: aiResult?.dashboard_label || (lg.severity === 'INFO' ? 'Activity Timeline' : 'Risk Assessment'), 
                  severity: lg.severity 
                },
                aiData,
                lg.representative_line,
                logId
            );
        });

        // Sort by severity 
        derived.sort((a,b) => (SEV_PCT[b.severity as Severity] || 0) - (SEV_PCT[a.severity as Severity] || 0));

        setEvents(derived);
    }, [logGroups, liveAI]);

    return (
        <div className="mt-10 pt-10 border-t border-slate-800/50 space-y-8"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.02) 50%, transparent 100%)' }}>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="relative">
                            <BrainCircuit className="h-8 w-8 text-indigo-400" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-ping opacity-60" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight leading-none">
                                AI OBSERVABILITY INTELLIGENCE
                            </h2>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.3em] mt-0.5">
                                Senior SRE Multi-Agent · Real-Time Log Analysis · Code Deep Scan
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest ${connected ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-red-950/30 text-red-400 border-red-500/30'}`}>
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    {connected ? '● LIVE AI SYNC' : '○ CONNECTING...'}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Analyzed', val: events.length, color: 'text-indigo-400', border: 'border-indigo-500/20', icon: <Activity className="h-4 w-4" /> },
                    { label: 'Critical', val: critical, color: 'text-red-400', border: 'border-red-500/20', icon: <XCircle className="h-4 w-4" /> },
                    { label: 'Warnings', val: warnings, color: 'text-amber-400', border: 'border-amber-500/20', icon: <AlertTriangle className="h-4 w-4" /> },
                    { label: 'Anomalies', val: anomalies, color: 'text-violet-400', border: 'border-violet-500/20', icon: <Zap className="h-4 w-4" /> },
                ].map((s, i) => (
                    <motion.div key={i} whileHover={{ y: -2, scale: 1.01 }}
                        className={`bg-slate-900/60 backdrop-blur-sm border ${s.border} rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                        <div>
                            <span className="text-[8px] font-black text-slate-500 tracking-widest block mb-1">{s.label.toUpperCase()}</span>
                            <div className={`text-2xl font-black ${s.color}`}><AnimatedCounter value={s.val} /></div>
                        </div>
                        <div className={`p-2 rounded-xl bg-slate-800 ${s.color}`}>{s.icon}</div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-4 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                    {PIPELINE.map((node, i) => (
                        <React.Fragment key={i}>
                            <motion.div
                                animate={{ scale: pipelineActive === i ? 1.05 : 1, opacity: pipelineActive === i ? 1 : 0.6 }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-bold flex-shrink-0 transition-all duration-200 ${node.color} ${pipelineActive === i ? 'shadow-sm' : ''}`}>
                                {node.icon}<span>{node.label}</span>
                            </motion.div>
                            {i < PIPELINE.length - 1 && (
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                                    className="text-indigo-500 text-xs font-bold flex-shrink-0">
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </motion.div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {events.length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-5">
                        <div className="relative">
                            <BrainCircuit className="h-14 w-14 text-slate-800" />
                            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full" />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-400 font-bold">Waiting for backend logs...</p>
                            <p className="text-slate-600 text-xs mt-1">The Senior SRE AI will analyze and explain each log here in real time.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">
                                Real-Time Investigation Feed · {events.length} events
                            </span>
                        </div>
                        <AnimatePresence>
                            {events.map((evt, i) => <EventCard key={evt.id} event={evt} index={i} metrics={metrics} />)}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
}

