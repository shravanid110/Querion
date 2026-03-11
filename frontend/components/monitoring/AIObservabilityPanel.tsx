"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, AlertTriangle, CheckCircle2, Activity, Zap, Database,
    ShieldAlert, Globe, Cpu, BarChart2, TrendingUp, Clock, AlertCircle,
    XCircle, ChevronDown, ChevronUp, Eye, Server, Layers, ArrowRight,
    Sparkles, Terminal, Hash, Info
} from 'lucide-react';
import * as echarts from 'echarts';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'MINOR' | 'INFO' | 'HEALTHY';

interface AgentInsight {
    cause: string;
    impact: string;
    suggested_fix: string;
    system_status?: 'HEALTHY' | 'UNSTABLE' | 'RISK';
    risk_level?: string;
    severity_score?: number;
    error_type?: string;
    affected_file?: string;
    severity?: string;
    line_number?: string | number;
    code_snippet?: string;
    generated_fix_code?: string;
    explanation?: string;
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

const CHART_ICONS: Record<string, string> = {
    gauge: '⏲', ring: '◉', line: '📈', bar: '📊', pie: '🥧', counter: '🔢',
    table: '📋', logViewer: '📝', stackTrace: '🔍', badge: '🏷', alertPanel: '🚨',
    securityTable: '🛡', securityBar: '🔒', timeline: '📅',
};

function deriveEvent(mapping: ChartMapping, ai: AgentInsight, logLine: string, id: string): MonitoringEvent {
    const sev = (ai?.severity?.toUpperCase() as Severity) || (mapping.severity?.toUpperCase() as Severity) || 'HEALTHY';
    const pm = PANEL_META[mapping.panel] || PANEL_META.GENERIC_MONITORING;
    
    // Explicit anomaly detection based on AI system_status
    const isUnstable = ai?.system_status === 'UNSTABLE';
    const isRisk = ai?.system_status === 'RISK';
    const hasAnomaly = isUnstable || isRisk || sev === 'CRITICAL';
    
    const anomalyTitle = isUnstable 
        ? `SYSTEM UNSTABLE: ${ai.error_type || mapping.title}` 
        : (isRisk ? `PERFORMANCE RISK: ${ai.error_type || mapping.title}` : undefined);

    // Build detailed explanation
    const explanation = buildExplanation(mapping, ai, logLine);
    const fixData = buildFixSteps(ai?.suggested_fix || '', mapping.metric_type || 'general');

    return {
        id, timestamp: new Date().toISOString(), log_line: logLine || `[log event]`,
        severity: sev, service: pm.label, errorType: ai?.error_type || mapping.metric_type || 'general',
        cause: ai?.cause || mapping.description || 'Log pattern detected.',
        chartType: mapping.chart_type || 'line',
        chartTitle: mapping.title || 'Log Event',
        chartPanel: mapping.panel || 'GENERIC_MONITORING',
        insight: ai || { cause: 'Analyzing architectural context...', impact: 'Evaluating system stability...', suggested_fix: 'Stand by for detailed fix.' },
        hasAnomaly, anomalyTitle,
        anomalyAction: ai?.suggested_fix || 'Investigating logs...',
        explanation,
        fixSteps: fixData,
    };
}

function buildExplanation(mapping: ChartMapping, ai: AgentInsight, log: string): string {
    if (ai?.explanation) return ai.explanation; // Use raw AI explanation if available
    
    const cause = ai?.cause || mapping.description || 'A system event was captured.';
    const impact = ai?.impact || 'Monitoring service is evaluating the effects on upstream dependencies.';
    const subsystem = (mapping.panel || 'GENERIC').replace(/_/g, ' ').toLowerCase();
    const fileInfo = ai?.affected_file ? ` The issue originated in ${ai.affected_file}.` : '';
    
    return `ROOT CAUSE: ${cause} ARCHITECTURAL IMPACT: ${impact} System context: Detected in the ${subsystem} layer.${fileInfo}`;
}

function buildFixSteps(fix: string, type: string): { steps: string[]; command?: string } {
    const defaultFix = { steps: ['Monitor the situation', 'Check recent deployments', 'Review system logs'], command: 'npm run logs' };

    // Commands mapping based on metric types
    const commands: Record<string, string> = {
        connection: 'docker restart postgres-db',
        performance: 'npm run benchmark',
        access: 'npm run auth:reverify',
        usage: 'top -n 1 -b | head -n 20',
        http_error: 'curl -v http://localhost:4000/api/health',
        runtime_error: 'npm run debug -- --trace-warnings',
        io_error: 'ls -larth /var/log/querion',
        availability: 'systemctl status querion-backend'
    };

    if (!fix) return defaultFix;

    const sentences = fix.split(/[.;]/).map(s => s.trim()).filter(Boolean);
    return {
        steps: sentences.length ? sentences : [fix],
        command: commands[type] || 'npm run logs'
    };
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
    const s = SEV_STYLES[severity];
    const pct = SEV_PCT[severity];
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

/* ─── Individual Event Card ──────────────────────────────────────────────────── */
function EventCard({ event, index, metrics }: { event: MonitoringEvent; index: number; metrics: any }) {
    const [expanded, setExpanded] = useState(index === 0);
    const [showFix, setShowFix] = useState(false);
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
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot} ${event.severity === 'CRITICAL' ? 'animate-pulse' : ''}`} />
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${s.border} ${s.text} bg-black/20`}>
                        {event.severity}
                    </span>
                </div>
                <Terminal className="h-3 w-3 text-slate-600 flex-shrink-0" />
                <span className="font-mono text-[10px] text-slate-400 flex-1 truncate text-left">{event.log_line}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[9px] font-bold ${pm.color} flex items-center gap-1`}>
                        {pm.icon}{pm.label}
                    </span>
                    {event.hasAnomaly && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[7px] font-black text-red-400 animate-pulse">
                            ⚡ ANOMALY
                        </span>
                    )}
                    <span className="text-[8px] text-slate-600 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="border-t border-white/5 p-5 space-y-5">

                            {/* 4 visual agent panels */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                                {/* Panel 1 — Log Analysis */}
                                <div className="bg-black/30 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                            <Eye className="h-3.5 w-3.5 text-indigo-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-400 tracking-widest uppercase">Log Analysis</span>
                                    </div>
                                    <div className="space-y-2">
                                        <InfoRow label="Error Type" value={event.errorType.replace(/_/g, ' ')} color="text-slate-300" />
                                        <InfoRow label="Service" value={event.service} color="text-slate-300" />
                                        <InfoRow label="Source" value={event.chartPanel.replace(/_/g, ' ')} color={pm.color} />
                                    </div>
                                    <SeverityMeter severity={event.severity} />
                                </div>

                                {/* Panel 2 — Chart Assignment */}
                                <div className="bg-black/30 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                                            <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-cyan-400 tracking-widest uppercase">Chart Assigned</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2 bg-slate-900/50 rounded-xl border border-slate-800 h-full min-h-[160px] relative overflow-hidden group/chart">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity duration-500" />
                                        <div className="w-full flex-1">
                                            <EChartRenderer type={event.chartType} severity={event.severity} metrics={metrics} title={event.chartTitle} />
                                        </div>
                                        <div className="flex flex-col items-center mt-1 z-10">
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">{event.chartType}</span>
                                            <span className="text-[7px] text-slate-500 uppercase tracking-[0.2em]">{event.chartTitle}</span>
                                        </div>
                                    </div>
                                    <InfoRow label="Panel" value={event.chartPanel.replace(/_/g, ' ')} color={pm.color} />
                                </div>

                                {/* Panel 3 — AI Insight */}
                                <div className="bg-black/30 backdrop-blur-sm border border-violet-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-violet-500/10 rounded-lg">
                                            <BrainCircuit className="h-3.5 w-3.5 text-violet-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-violet-400 tracking-widest uppercase">AI Insight</span>
                                    </div>
                                    <div className="space-y-2">
                                        {event.insight.error_type && (
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[7px] font-black text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 uppercase tracking-widest">{event.insight.error_type}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Affected File / Object</span>
                                            <p className="text-[9px] text-cyan-400 font-mono font-bold truncate">
                                                {event.insight.affected_file || 'System Core'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Root Cause Analysis</span>
                                            <p className="text-[9px] text-slate-300 font-bold leading-relaxed">
                                                <TypingText text={event.insight.cause || event.cause} speed={12} />
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Potential Impact</span>
                                            <p className="text-[9px] text-red-400 leading-relaxed font-semibold">{event.insight.impact}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Panel 4 — Anomaly Detector */}
                                <div className={`backdrop-blur-sm rounded-2xl p-4 space-y-3 border transition-all duration-700 ${event.insight.system_status === 'UNSTABLE' ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20' : event.insight.system_status === 'RISK' ? 'bg-amber-950/30 border-amber-500/40' : 'bg-black/30 border-emerald-500/30'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${event.insight.system_status === 'UNSTABLE' ? 'bg-red-500/20' : event.insight.system_status === 'RISK' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                                                {event.insight.system_status === 'UNSTABLE' ? <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" /> : event.insight.system_status === 'RISK' ? <AlertCircle className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                                            </div>
                                            <span className={`text-[10px] font-black tracking-widest uppercase ${event.insight.system_status === 'UNSTABLE' ? 'text-red-400' : event.insight.system_status === 'RISK' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {event.insight.system_status || 'HEALTHY'}
                                            </span>
                                        </div>
                                        {event.insight.risk_level && (
                                            <div className="px-2 py-0.5 rounded-full bg-black/50 border border-white/10 flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">Risk</span>
                                                <span className={`text-[10px] font-mono font-black ${event.insight.system_status === 'UNSTABLE' ? 'text-red-500' : 'text-emerald-400'}`}>{event.insight.risk_level}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className={`p-2.5 rounded-xl border ${event.insight.system_status === 'UNSTABLE' ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                            <p className={`text-[10px] font-black tracking-widest uppercase ${event.insight.system_status === 'UNSTABLE' ? 'text-red-500' : 'text-emerald-400'}`}>
                                                {event.insight.system_status === 'UNSTABLE' ? 'SYSTEM UNSTABLE' : 'SYSTEM STABLE'}
                                            </p>
                                        </div>
                                        <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
                                            {event.insight.system_status === 'UNSTABLE' 
                                                ? `CRITICAL ERROR: ${event.insight.error_type || 'Syntax Exception'} detected. This preventing compilation and rendering. High risk to service availability.`
                                                : `Log indicates routine service health with ${event.insight.severity || 'INFO'} level. The system is operating within nominal thresholds.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* AI Explanation */}
                            <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                    <span className="text-xs font-black text-indigo-400 tracking-widest uppercase">AI Log Explanation</span>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
                                        {event.insight.system_status === 'UNSTABLE' && (
                                            <span className="text-red-500 font-black mr-2 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">CRITICAL SYSTEM ANALYSIS:</span>
                                        )}
                                        {event.explanation}
                                    </p>
                                    {event.insight.system_status === 'UNSTABLE' && (
                                        <div className="flex flex-wrap gap-2 text-[10px] items-center">
                                            <span className="text-slate-500 font-bold uppercase tracking-widest">Affected Stack:</span>
                                            <span className="text-cyan-400 font-mono bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">{event.service} / {event.insight.affected_file || 'Core'}</span>
                                            <span className="text-slate-500 font-bold uppercase tracking-widest ml-2">Severity Score:</span>
                                            <span className="text-red-400 font-black">{event.insight.severity_score || 95}/100</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowFix(!showFix)}
                                    className="flex items-center gap-2 text-[9px] font-black text-emerald-400 tracking-widest uppercase hover:text-emerald-300 transition-colors">
                                    <Hash className="h-3 w-3" />
                                    {showFix ? 'HIDE' : 'SHOW'} STEP-BY-STEP FIX
                                    {showFix ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>

                                <AnimatePresence>
                                    {showFix && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4 pt-4 border-t border-slate-800">
                                            <div className="space-y-2">
                                                {event.fixSteps.steps.map((step, i) => (
                                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                                        className="flex items-start gap-3">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[8px] font-black text-emerald-400 flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-[11px] text-slate-300 leading-relaxed">{step}</span>
                                                    </motion.div>
                                                ))}
                                            </div>

                                            {event.fixSteps.command && (
                                                <div className="bg-black/50 rounded-xl p-3 border border-indigo-500/20 relative group/cmd">
                                                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block mb-1">RECOMMENDED COMMAND</span>
                                                    <code className="text-[10px] text-indigo-300 font-mono">{event.fixSteps.command}</code>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover/cmd:opacity-100 transition-opacity">
                                                        <Terminal className="h-3 w-3 text-indigo-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
            <span className={`text-[10px] font-bold truncate ${color || 'text-slate-300'}`}>{value || '—'}</span>
        </div>
    );
}

/* ─── Pipeline Node ──────────────────────────────────────────────────────────── */
const PIPELINE = [
    { label: 'Backend App', icon: <Server className="h-3.5 w-3.5" />, color: 'text-slate-400 border-slate-700 bg-slate-800/60' },
    { label: 'Log Collector', icon: <Activity className="h-3.5 w-3.5" />, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-900/20' },
    { label: 'Log Analyzer', icon: <Eye className="h-3.5 w-3.5" />, color: 'text-violet-400 border-violet-500/30 bg-violet-900/20' },
    { label: 'Chart Selector', icon: <BarChart2 className="h-3.5 w-3.5" />, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20' },
    { label: 'Insight Gen', icon: <BrainCircuit className="h-3.5 w-3.5" />, color: 'text-amber-400 border-amber-500/30 bg-amber-900/20' },
    { label: 'Anomaly Det', icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-red-400 border-red-500/30 bg-red-900/20' },
    { label: 'ECharts Dashboard', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20' },
];

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function AIObservabilityPanel() {
    const [events, setEvents] = useState<MonitoringEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [pipelineActive, setPipelineActive] = useState(0);
    const [metrics, setMetrics] = useState<any>(null);
    const counterRef = useRef(0);

    const critical = events.filter(e => e.severity === 'CRITICAL').length;
    const warnings = events.filter(e => e.severity === 'WARNING').length;
    const anomalies = events.filter(e => e.hasAnomaly).length;

    // Animate pipeline
    useEffect(() => {
        const t = setInterval(() => setPipelineActive(p => (p + 1) % PIPELINE.length), 600);
        return () => clearInterval(t);
    }, []);

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
                        if (data.type === 'mapped_chart') {
                            const mapping = data.mapping as ChartMapping;
                            const ai = data.ai as AgentInsight;
                            const logLine = String(data.log_line || data.log?.message || '');
                            const msgId = data.log_id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                            setEvents(prev => {
                                // 1. If this is an update with AI data, find the matching card by ID
                                if (ai) {
                                    const existingIdx = prev.findIndex(e => e.id === msgId);
                                    if (existingIdx !== -1) {
                                        const updated = [...prev];
                                        updated[existingIdx] = deriveEvent(mapping, ai, logLine, msgId);
                                        return updated;
                                    }
                                }

                                // 2. If we already have this exact message ID, don't add it as a new card
                                if (prev.some(e => e.id === msgId)) return prev;

                                // 3. Add as new event (at the top)
                                return [
                                    deriveEvent(mapping, ai, logLine, msgId),
                                    ...prev
                                ].slice(0, 50); // Increased slice to show more logs
                            });
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

    return (
        <div className="mt-10 pt-10 border-t border-slate-800/50 space-y-8"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.02) 50%, transparent 100%)' }}>

            {/* ── Header ── */}
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
                                4-Agent Multi-System · Real-Time Log Analysis · Pattern Detection
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest ${connected ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-red-950/30 text-red-400 border-red-500/30'}`}>
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    {connected ? '● LIVE AI ANALYSIS' : '○ CONNECTING...'}
                </div>
            </div>

            {/* ── Stats ── */}
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

            {/* ── Animated Pipeline ── */}
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

            {/* ── Events Feed ── */}
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
                            <p className="text-slate-600 text-xs mt-1">The 4-agent AI will analyze and explain each log here in real time.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {['bg-indigo-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500'].map((c, i) => (
                                <motion.div key={i} animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className={`w-4 h-4 rounded-full ${c} opacity-60`} />
                            ))}
                            <span className="text-[9px] text-slate-600 font-black tracking-widest">4 AGENTS READY</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">
                                Live Analysis Feed · {events.length} events
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

/* ─── ECharts Renderer ───────────────────────────────────────────────────────── */
function EChartRenderer({ type, severity, metrics, title }: {
    type: string,
    severity: Severity,
    metrics: any,
    title: string
}) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    // Initial setup and static options
    useEffect(() => {
        if (!chartRef.current) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current, 'dark');
        }

        const colorMap: any = {
            CRITICAL: '#ef4444',
            WARNING: '#f59e0b',
            MINOR: '#fde047',
            HEALTHY: '#10b981'
        };
        const activeColor = colorMap[severity] || '#6366f1';

        const chartType = type.toLowerCase();
        let baseOption: any = {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 1200,
            tooltip: {
                show: true,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                textStyle: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
                borderRadius: 8,
                padding: [8, 12],
                borderWidth: 1,
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.5)',
                confine: true
            },
            grid: { top: 10, bottom: 20, left: 10, right: 10 },
        };

        if (chartType === 'gauge') {
            baseOption.series = [{
                type: 'gauge',
                startAngle: 210, endAngle: -30, center: ['50%', '60%'], radius: '100%',
                axisLine: {
                    lineStyle: {
                        width: 10,
                        color: [
                            [0.3, new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }])],
                            [0.7, new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#fbbf24' }])],
                            [1, new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }])]
                        ],
                        shadowBlur: 15,
                        shadowColor: 'rgba(0,0,0,0.5)'
                    }
                },
                progress: { show: true, width: 10, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255,255,255,0.2)' } },
                pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '12%', width: 6, offsetCenter: [0, '-40%'], itemStyle: { color: 'auto' } },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                detail: { fontSize: 22, offsetCenter: [0, '20%'], valueAnimation: true, formatter: '{value}%', color: '#fff', fontWeight: 'black', textShadowBlur: 10, textShadowColor: 'rgba(255,255,255,0.3)' },
                data: [{ value: 0 }]
            }];
        } else if (chartType === 'pie') {
            baseOption.series = [{
                type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 12,
                    borderColor: '#0f172a',
                    borderWidth: 3,
                    shadowBlur: 30,
                    shadowColor: 'rgba(0,0,0,0.8)',
                },
                label: { show: false },
                emphasis: {
                    scale: true,
                    scaleSize: 10,
                },
                data: [
                    { value: 0, name: 'Errors', itemStyle: { color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [{ offset: 0, color: '#ff4d4d' }, { offset: 1, color: '#990000' }]) } },
                    { value: 0, name: 'Warning', itemStyle: { color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [{ offset: 0, color: '#ffae00' }, { offset: 1, color: '#996a00' }]) } }
                ]
            }];
        } else if (chartType === 'line') {
            baseOption.xAxis = { type: 'category', data: ['-25m', '-20m', '-15m', '-10m', '-5m', 'Now'], show: true, axisLabel: { color: '#475569', fontSize: 7, fontWeight: 'bold' }, axisLine: { show: false }, axisTick: { show: false } };
            baseOption.yAxis = { type: 'value', show: false };
            baseOption.series = [{
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: {
                    width: 5,
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#e066ff' }]),
                    shadowBlur: 15,
                    shadowColor: 'rgba(99, 102, 241, 0.6)',
                    shadowOffsetY: 10
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99, 102, 241, 0.4)' }, { offset: 1, color: 'transparent' }]),
                    opacity: 0.8
                },
                itemStyle: { color: '#fff', borderColor: '#818cf8', borderWidth: 3 },
                data: [0, 0, 0, 0, 0, 0]
            }];
        } else if (chartType === 'stackTrace') {
            baseOption.radar = {
                indicator: [
                    { name: 'Complexity', max: 100 },
                    { name: 'Depth', max: 100 },
                    { name: 'Entropy', max: 100 },
                    { name: 'Impact', max: 100 },
                    { name: 'Risk', max: 100 }
                ],
                shape: 'circle',
                splitNumber: 4,
                axisName: { color: '#64748b', fontSize: 7, fontWeight: 'bold' },
                splitLine: { lineStyle: { color: 'rgba(99, 102, 241, 0.1)' } },
                splitArea: { show: false },
                axisLine: { lineStyle: { color: 'rgba(99, 102, 241, 0.1)' } }
            };
            baseOption.series = [{
                type: 'radar',
                data: [
                    {
                        value: [85, 92, 78, 95, 88],
                        name: 'Error Context',
                        itemStyle: { color: '#f43f5e' },
                        areaStyle: { color: 'rgba(244, 63, 94, 0.3)' },
                        lineStyle: { width: 2, color: '#f43f5e', shadowBlur: 10, shadowColor: '#f43f5e' }
                    }
                ]
            }];
        } else if (chartType === 'bar') {
            baseOption.xAxis = { type: 'value', show: false };
            baseOption.yAxis = {
                type: 'category',
                data: ['API', 'DB', 'Auth', 'OSS'],
                show: true,
                axisLabel: { color: '#94a3b8', fontSize: 8, fontWeight: 'black', margin: 10 },
                axisLine: { show: false },
                axisTick: { show: false }
            };
            baseOption.series = [{
                type: 'bar',
                itemStyle: {
                    borderRadius: [0, 10, 10, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: '#3b82f6' }]),
                    shadowBlur: 12,
                    shadowColor: 'rgba(59, 130, 246, 0.5)',
                    shadowOffsetX: 4
                },
                barWidth: '45%',
                data: [0, 0, 0, 0]
            }];
        } else {
            // High-end Donut for others
            baseOption.series = [{
                type: 'pie',
                radius: ['65%', '85%'],
                data: [
                    { value: 82, itemStyle: { color: activeColor, shadowBlur: 15, shadowColor: activeColor } },
                    { value: 18, itemStyle: { color: 'rgba(255,255,255,0.03)' } }
                ],
                label: { show: false },
                itemStyle: { borderRadius: 4 }
            }];
        }

        chartInstance.current.setOption(baseOption);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, [type, severity, title]);

    // Dynamic data updates
    useEffect(() => {
        if (!chartInstance.current) return;

        const chartType = type.toLowerCase();
        let updateData: any = {};

        if (chartType === 'gauge') {
            const health = metrics ? Math.max(5, 100 - (metrics.error_rate * 4) - (metrics.warning_count * 1.5)) : 94;
            updateData = { series: [{ data: [{ value: health }] }] };
        } else if (chartType === 'pie') {
            const errorCount = (metrics?.error_rate || 0) + (severity === 'CRITICAL' ? 12 : 2);
            const warningCount = (metrics?.warning_count || 0) + (severity === 'WARNING' ? 8 : 4);
            const successCount = (metrics?.status_codes?.['200'] || 45);
            updateData = {
                series: [{
                    data: [
                        { value: errorCount, name: 'Errors' },
                        { value: warningCount, name: 'Warning' },
                        { value: successCount, name: 'Success' }
                    ]
                }]
            };
        } else if (chartType === 'line') {
            const rps = metrics?.requests_per_second || 1.2;
            updateData = { series: [{ data: [12, 18, 15, 25, 22, 30].map(v => Math.round(v * rps + Math.random() * 5)) }] };
        } else if (chartType === 'bar') {
            updateData = { series: [{ data: [88, 94, 76, 91].map(v => Math.round(v * (metrics ? 0.9 + Math.random() * 0.2 : 1))) }] };
        }

        chartInstance.current.setOption(updateData, { notMerge: false });
    }, [metrics, type, severity]);

    return <div ref={chartRef} className="w-full h-full" style={{ minHeight: '130px' }} />;
}
