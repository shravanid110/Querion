"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import {
    Activity,
    FolderCode,
    Terminal,
    MessageSquare,
    RefreshCw,
    ChevronRight,
    ArrowLeft,
    Send,
    FileCode,
    Cpu,
    Wifi,
    WifiOff,
    Clock,
    Layers,
    Mic,
    MicOff,
    Globe,
    CheckCircle,
    Loader2,
    Volume2,
    Zap,
    ShieldAlert,
    AlertCircle,
    CheckCircle2,
    Info,
    FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import DashboardTab from "@/components/monitoring/DashboardTab";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
    id: number;
    name: string;
    last_updated: string;
    file_count: number;
    log_count: number;
    is_active?: boolean;
    session_id?: string;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    ts: string;
    voiceMeta?: { detected_language: string; original_text: string };
}

interface LogLine {
    log_line: string;
    timestamp: string;
}

// ─── API base ─────────────────────────────────────────────────────────────────

const API = "http://127.0.0.1:4000";
const USER_ID = "default_user";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function fmtTime(iso: string) {
    try {
        return new Date(iso).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return iso;
    }
}

// ─── Markdown renderer (no external dep) ──────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.startsWith("```")) {
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push(
                <div key={i} className="my-3 rounded-xl overflow-hidden border border-slate-700 shadow-sm">
                    {lang && (
                        <div className="bg-slate-800 px-3 py-1 text-[10px] text-cyan-400 font-bold uppercase tracking-widest border-b border-slate-700">
                            {lang}
                        </div>
                    )}
                    <pre className="bg-slate-950 p-4 text-[12px] font-mono text-emerald-300 overflow-x-auto leading-relaxed custom-scrollbar">
                        {codeLines.join("\n")}
                    </pre>
                </div>
            );
            i++;
            continue;
        }

        // Table detection
        if (line.trim().startsWith("|")) {
            const tableRows: string[][] = [];
            let j = i;
            while (j < lines.length && lines[j].trim().includes("|")) {
                const rawLine = lines[j].trim();
                // Split by |, handle cases with/without leading/trailing pipes
                let cells = rawLine.split("|");
                // Remove first and last if they are empty (from leading/trailing pipes)
                if (cells[0] === "") cells.shift();
                if (cells[cells.length - 1] === "") cells.pop();

                tableRows.push(cells.map(c => c.trim()));
                j++;
            }

            if (tableRows.length > 1) {
                const header = tableRows[0];
                // Check if the second row is a separator
                const hasSeparator = tableRows[1]?.every(cell => cell.match(/^-+:?$/) || cell.match(/^:?-+$/) || cell.match(/^:?-+:?$/));
                const bodyRows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1);

                elements.push(
                    <div key={i} className="my-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/40 shadow-lg custom-scrollbar">
                        <table className="w-full text-xs text-left border-collapse min-w-[400px]">
                            <thead className="bg-slate-800/60 text-cyan-400 font-bold uppercase tracking-tight border-b border-slate-700/50">
                                <tr>
                                    {header.map((cell, idx) => (
                                        <th key={idx} className="px-4 py-3 border-r border-slate-700/30 last:border-0 whitespace-nowrap">
                                            {inlineFormat(cell)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {bodyRows.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="hover:bg-indigo-600/5 transition-colors group">
                                        {row.map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-4 py-2.5 text-slate-300 group-hover:text-slate-100 border-r border-slate-800/30 last:border-0 leading-relaxed font-sans">
                                                {inlineFormat(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                i = j;
                continue;
            }
        }

        // Heading 3
        if (line.startsWith("### ")) {
            elements.push(
                <h3 key={i} className="text-sm font-bold text-cyan-300 mt-4 mb-2">
                    {inlineFormat(line.slice(4))}
                </h3>
            );
            i++;
            continue;
        }

        // Heading 2
        if (line.startsWith("## ")) {
            elements.push(
                <h2 key={i} className="text-base font-bold text-indigo-300 mt-5 mb-2 border-b border-slate-800 pb-1">
                    {inlineFormat(line.slice(3))}
                </h2>
            );
            i++;
            continue;
        }

        // Heading 1
        if (line.startsWith("# ")) {
            elements.push(
                <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 flex items-center gap-2">
                    <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                    {inlineFormat(line.slice(2))}
                </h1>
            );
            i++;
            continue;
        }

        // Bullet
        if (line.match(/^(\s*)[-*•]\s/)) {
            elements.push(
                <div key={i} className="flex gap-2 items-start my-1 pl-1">
                    <span className="text-indigo-400 mt-1.5 flex-shrink-0 text-[10px]">●</span>
                    <span className="text-slate-300 text-[13.5px] leading-relaxed">{inlineFormat(line.replace(/^(\s*)[-*•]\s/, ""))}</span>
                </div>
            );
            i++;
            continue;
        }

        // Numbered list
        if (line.match(/^\d+\.\s/)) {
            const num = line.match(/^(\d+)\./)?.[1];
            elements.push(
                <div key={i} className="flex gap-3 items-start my-1.5 pl-1">
                    <span className="bg-indigo-500/20 text-indigo-400 font-bold text-[10px] flex items-center justify-center rounded-md w-5 h-5 flex-shrink-0">{num}</span>
                    <span className="text-slate-300 text-[13.5px] leading-relaxed">{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
                </div>
            );
            i++;
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/)) {
            elements.push(<hr key={i} className="border-slate-800 my-4" />);
            i++;
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            elements.push(<div key={i} className="h-3" />);
            i++;
            continue;
        }

        // Paragraph
        elements.push(
            <p key={i} className="text-slate-300 text-[13.5px] leading-relaxed mb-1 font-sans">
                {inlineFormat(line)}
            </p>
        );
        i++;
    }

    return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): React.ReactNode {
    // Bold + Italics + Code + Links inline
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) {
            parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
        }
        const token = match[0];
        if (token.startsWith("`")) {
            parts.push(
                <code key={key++} className="bg-slate-800 text-cyan-300 px-1 rounded text-[11px] font-mono">
                    {token.slice(1, -1)}
                </code>
            );
        } else if (token.startsWith("**")) {
            parts.push(
                <strong key={key++} className="text-white font-bold">
                    {token.slice(2, -2)}
                </strong>
            );
        } else if (token.startsWith("*")) {
            parts.push(
                <em key={key++} className="text-slate-200 italic">
                    {token.slice(1, -1)}
                </em>
            );
        } else if (token.startsWith("[")) {
            const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                parts.push(
                    <a
                        key={key++}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }
        }
        last = match.index + token.length;
    }
    if (last < text.length) {
        parts.push(<span key={key++}>{text.slice(last)}</span>);
    }
    return <>{parts}</>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
    return (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            {online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? "bg-emerald-400" : "bg-slate-600"
                    }`}
            />
        </span>
    );
}

function ProjectCard({
    project,
    onSelect,
}: {
    project: Project;
    onSelect: (p: Project) => void;
}) {
    const isRecent =
        Date.now() - new Date(project.last_updated).getTime() < 5 * 60 * 1000;

    return (
        <button
            onClick={() => onSelect(project)}
            className="group w-full text-left bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-900/30 hover:-translate-y-0.5"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-indigo-600/20 rounded-xl group-hover:bg-indigo-600/30 transition-colors">
                    <FolderCode className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <StatusDot online={isRecent} />
                    <span className={isRecent ? "text-emerald-400" : "text-slate-500"}>
                        {isRecent ? "Live" : "Idle"}
                    </span>
                </div>
            </div>

            <h3 className="font-bold text-slate-100 text-base mb-1 group-hover:text-indigo-300 transition-colors">
                {project.name}
            </h3>

            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-4">
                <Clock className="h-3 w-3" />
                <span>Updated {timeAgo(project.last_updated)}</span>
                {project.is_active && (
                    <span className="ml-auto flex items-center gap-1 text-[8px] font-black text-emerald-400 animate-pulse bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                        ● ACTIVE
                    </span>
                )}
            </div>

            <div className="flex gap-3">
                <div className="flex-1 bg-slate-900/60 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-cyan-400">{project.file_count}</div>
                    <div className="text-xs text-slate-500">Files</div>
                </div>
                <div className="flex-1 bg-slate-900/60 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-indigo-400">{project.log_count}</div>
                    <div className="text-xs text-slate-500">Log Lines</div>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                <span>Open Chat</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
}

// ─── Voice Status Badge ────────────────────────────────────────────────────────
function VoiceBadge({ lang, status }: { lang?: string; status: "idle" | "recording" | "processing" | "done" | "error" }) {
    if (status === "idle") return null;
    if (status === "recording") return (
        <div className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1 animate-pulse">
            <span className="h-2 w-2 bg-red-400 rounded-full" />
            Recording…
        </div>
    );
    if (status === "processing") return (
        <div className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcribing…
        </div>
    );
    if (status === "done") return (
        <div className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1">
            <CheckCircle className="h-3 w-3" />
            <Globe className="h-3 w-3" />
            {lang && <span>{lang.toUpperCase()}</span>}
            → EN
        </div>
    );
    if (status === "error") return (
        <div className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1">
            <AlertCircle className="h-3 w-3" />
            Voice error
        </div>
    );
    return null;
}

// ─── Real Time Log Fetching Tab ─────────────────────────────────────────────

interface LogGroupV2 {
    key: string;
    representative_line: string;
    count: number;
    last_timestamp: string;
    severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
}

interface ErrorAnalysisV2 {
    success: boolean;
    explanation: string;
    severity_level: string;
    raw_ai_text: string;
}

function RealTimeLogFetchingTab({ projectId }: { projectId: number }) {
    const [groups, setGroups] = useState<LogGroupV2[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [analysisResults, setAnalysisResults] = useState<Record<string, ErrorAnalysisV2>>({});
    const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});

    const fetchGroups = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/monitor/log-groups/${projectId}`, { timeout: 30000 });
            setGroups(res.data);
        } catch (e) {
            console.error("Failed to fetch log groups:", e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchGroups();
        const interval = setInterval(fetchGroups, 5000);
        return () => clearInterval(interval);
    }, [fetchGroups]);

    // Automatic trigger for errors
    useEffect(() => {
        groups.forEach(group => {
            const isError = group.severity === "ERROR" || group.severity === "CRITICAL";
            if (isError && !analysisResults[group.key] && analyzing !== group.key) {
                runAnalysis(group.representative_line, group.key);
            }
        });
    }, [groups, analysisResults, analyzing]);

    const runAnalysis = async (log: string, key: string) => {
        setAnalyzing(key);
        try {
            const res = await axios.post(`${API}/api/monitor/analyze-error-v2`, { log }, { timeout: 180000 });
            setAnalysisResults(prev => ({ ...prev, [key]: res.data }));
        } catch (e: any) {
            console.error("Analysis failed", e);
            setAnalysisResults(prev => ({
                ...prev,
                [key]: {
                    success: false,
                    explanation: `### 🛑 AI Analysis Timeout\n\nDeepSeek took too long to respond or the backend could not be reached.\n\n**Error:** ${e.message}\n\n**Common Fixes:**\n1. Check if Ollama is running and has downloaded the model.\n2. Verify python backend is running.\n3. Wait a bit longer, local DeepSeek inference can be slow.`,
                    severity_level: "WARNING",
                    raw_ai_text: ""
                } as any
            }));
        } finally {
            setAnalyzing(null);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight text-indigo-100 italic">REAL-TIME LOG INTELLIGENCE</h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    LIVE CLUSTERING ACTIVE
                </div>
            </div>

            {loading && groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Pattern Registry...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl py-20 text-center">
                    <Terminal className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Waiting for logs to cluster...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => {
                        const isError = group.severity === "ERROR" || group.severity === "CRITICAL";
                        const color = isError ? "red" : group.severity === "WARNING" ? "yellow" : "blue";
                        const analysis = analysisResults[group.key];

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={group.key}
                                className={`bg-slate-900/60 border rounded-2xl p-5 hover:bg-slate-900 transition-all ${isError ? "border-red-500/20 hover:border-red-500/40" : "border-slate-800 hover:border-indigo-500/30"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="pt-1">
                                        <div className={`p-2 rounded-xl bg-${color}-500/10`}>
                                            <AlertCircle className={`h-5 w-5 text-${color}-400`} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border tracking-widest ${isError ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    }`}>
                                                    {group.severity}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-500">{new Date(group.last_timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
                                                <span className="text-xs font-black text-white">{group.count}</span>
                                                <span className="text-[8px] font-black text-slate-600 uppercase">Hits</span>
                                            </div>
                                        </div>

                                        <pre className="mt-3 p-3 bg-black/40 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                            {group.representative_line}
                                        </pre>

                                        {analyzing === group.key && (
                                            <div className="mt-4 flex items-center gap-3 py-3 px-4 bg-slate-900/40 rounded-xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">DeepSeek: Analyzing Root Cause...</span>
                                            </div>
                                        )}

                                        {analysis && (
                                            <div className="mt-6 border-t border-slate-800/60 pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">SRE Agent: GPT-4o Intelligence</span>
                                                </div>

                                                <div className="bg-slate-950/40 border border-slate-800/80 rounded-3xl p-6 shadow-2xl overflow-hidden relative group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <Zap className="h-24 w-24 text-indigo-500" />
                                                    </div>

                                                    <div className="relative prose prose-invert prose-xs max-w-none prose-pre:bg-black/60 prose-pre:border prose-pre:border-slate-800">
                                                        <ReactMarkdown
                                                            components={{
                                                                code({ node, inline, className, children, ...props }: any) {
                                                                    const match = /language-(\w+)/.exec(className || '');
                                                                    return !inline && match ? (
                                                                        <div className="relative my-4 group/code">
                                                                            <div className="absolute top-2 right-2 flex gap-2">
                                                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">{match[1]}</span>
                                                                            </div>
                                                                            <pre className="!bg-black/80 !border-slate-800 !rounded-2xl !p-5 !text-[11px] font-mono leading-relaxed" {...props}>
                                                                                {children}
                                                                            </pre>
                                                                        </div>
                                                                    ) : (
                                                                        <code className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[10px]" {...props}>
                                                                            {children}
                                                                        </code>
                                                                    );
                                                                },
                                                                h3: ({ children }: any) => <h3 className="text-sm font-black text-white uppercase tracking-widest mt-6 mb-3 flex items-center gap-2">
                                                                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                                    {children}
                                                                </h3>,
                                                                h4: ({ children }: any) => <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest mt-4 mb-2">{children}</h4>,
                                                                p: ({ children }: any) => <p className="text-xs text-slate-300 leading-relaxed mb-4">{children}</p>,
                                                                ul: ({ children }: any) => <ul className="space-y-2 mb-4 list-none p-0">{children}</ul>,
                                                                li: ({ children }: any) => <li className="flex gap-3 items-start text-xs text-slate-400">
                                                                    <div className="mt-1.5 h-1 w-1 rounded-full bg-indigo-500/50 flex-shrink-0" />
                                                                    {children}
                                                                </li>
                                                            }}
                                                        >
                                                            {analysis.explanation}
                                                        </ReactMarkdown>
                                                    </div>

                                                    <div className="mt-8 flex items-center justify-between border-t border-slate-800/50 pt-4">
                                                        <div className="flex items-center gap-6 text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] italic">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                                <span>ANALYSIS COMPLETE</span>
                                                            </div>
                                                            <span>ENGINE: OPENROUTER / GPT-4O</span>
                                                        </div>

                                                        {analysis.raw_ai_text && (
                                                            <button
                                                                onClick={() => setShowRaw(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                                                className="flex items-center gap-2 text-[9px] font-black text-indigo-500/60 hover:text-indigo-400 uppercase tracking-widest transition-all group/raw"
                                                            >
                                                                <Terminal className="h-3 w-3 group-hover/raw:rotate-12 transition-transform" />
                                                                {showRaw[group.key] ? "Collapse Log Trace" : "View Model Trace"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {showRaw[group.key] && analysis.raw_ai_text && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-4 p-5 bg-black/60 rounded-3xl border border-slate-800/80 shadow-inner"
                                                    >
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="h-1 w-1 rounded-full bg-slate-700" />
                                                            <h5 className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">RAW DEEPSEEK STREAM</h5>
                                                        </div>
                                                        <pre className="text-[10px] font-mono text-cyan-500/60 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
                                                            {analysis.raw_ai_text}
                                                        </pre>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlProjectId = searchParams.get("projectId");

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<"chat" | "logs" | "files" | "dashboard" | "realtime-logs">("chat");
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [files, setFiles] = useState<{ file_path: string }[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedFileContent, setSelectedFileContent] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [backendOnline, setBackendOnline] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("auto"); // Default to auto-detect

    const LANGUAGES = [
        { code: "auto", name: "🌍 Auto-detect" },
        { code: "en", name: "🇺🇸 English" },
        { code: "mr", name: "🇮🇳 Marathi" },
        { code: "hi", name: "🇮🇳 Hindi" },
        { code: "es", name: "🇪🇸 Spanish" },
        { code: "fr", name: "🇫🇷 French" },
        { code: "de", name: "🇩🇪 German" },
        { code: "ja", name: "🇯🇵 Japanese" },
        { code: "zh", name: "🇨🇳 Chinese" },
    ];

    const [projectError, setProjectError] = useState<string | null>(null);

    // ── Voice state ─────────────────────────────────────────────────────────
    const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing" | "done" | "error">("idle");
    const [voiceLang, setVoiceLang] = useState<string>("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const isRecordingRef = useRef(false);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch projects ──────────────────────────────────────────────────────────
    const fetchProjects = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/monitor/projects/${USER_ID}`, {
                timeout: 30000, // Increased timeout for remote DB
            });
            const fetchedProjects = res.data as Project[];
            setProjects(fetchedProjects);
            setBackendOnline(true);
            setProjectError(null);

            // Auto-select project if ID is in URL and not already selected
            if (urlProjectId && !selectedProject) {
                const found = fetchedProjects.find(p => p.id === parseInt(urlProjectId));
                if (found) setSelectedProject(found);
            }
        } catch (e: any) {
            setBackendOnline(false);
            setProjectError(`Cannot reach backend at ${API}. Make sure Python backend is running and port 4000 is open.`);
        } finally {
            setLoadingProjects(false);
        }
    }, [urlProjectId, selectedProject]);

    useEffect(() => {
        fetchProjects();
        const interval = setInterval(fetchProjects, 3000); // Polling every 3s for faster detection
        return () => clearInterval(interval);
    }, [fetchProjects]);

    // Store last known log count to prevent redundant fetches
    const lastMetaRef = useRef({ count: -1, session: "" });

    // ── Fetch logs for selected project ────────────────────────────────────────
    const fetchProjectDetail = useCallback(async (project: Project) => {
        try {
            // 1. Fetch lightweight meta
            const metaRes = await axios.get(`${API}/api/monitor/logs-meta/${project.id}`, { timeout: 15000 });
            const currentMeta = metaRes.data;
            const currentSession = project.session_id || "initial";

            // If session is unchanged and log count is unchanged, skip full payload fetch!
            if (lastMetaRef.current.session === currentSession && lastMetaRef.current.count === currentMeta.count) {
                return;
            }

            // 2. State has changed, fetch heavy logs and files
            const [logsRes, filesRes, projectsRes] = await Promise.all([
                axios.get(`${API}/api/monitor/logs/${project.id}`, { timeout: 20000 }),
                axios.get(`${API}/api/monitor/files/${project.id}`, { timeout: 20000 }),
                axios.get(`${API}/api/monitor/projects/${USER_ID}`, { timeout: 20000 })
            ]);

            lastMetaRef.current = { count: currentMeta.count, session: currentSession };

            const latestProject = (projectsRes.data as Project[]).find(p => p.id === project.id);
            if (latestProject) {
                const hasSessionChanged = project.session_id &&
                    latestProject.session_id &&
                    project.session_id !== latestProject.session_id;

                if (hasSessionChanged) {
                    setLogs([]);
                } else if (latestProject.is_active) {
                    setLogs(logsRes.data || []);
                }

                setSelectedProject(latestProject);
            }

            setFiles(filesRes.data || []);
        } catch {
            // silently ignore
        }
    }, [selectedProject]);

    useEffect(() => {
        if (!selectedProject) return;
        fetchProjectDetail(selectedProject);
        pollRef.current = setInterval(() => fetchProjectDetail(selectedProject), 5000); // Poll logs/filelist every 5s
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [selectedProject, fetchProjectDetail]);

    // Fetch file content when selection changes
    useEffect(() => {
        if (!selectedProject || !selectedFile) {
            setSelectedFileContent("");
            return;
        }
        const fetchContent = async () => {
            try {
                const res = await axios.get(`${API}/api/monitor/file-content/${selectedProject.id}`, {
                    params: { path: selectedFile }
                });
                setSelectedFileContent(res.data.content || "Empty file");
            } catch (e) {
                setSelectedFileContent("Error loading file content.");
            }
        };
        fetchContent();
    }, [selectedProject, selectedFile]);

    // ── Auto-scroll ─────────────────────────────────────────────────────────────
    const scrollToBottom = (force = false) => {
        const container = logContainerRef.current;
        if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            if (force || isNearBottom) {
                container.scrollTo({ top: container.scrollHeight, behavior: force ? "smooth" : "auto" });
            }
        }
    };

    useEffect(() => {
        if (activeTab === "logs" && logs.length > 0) {
            scrollToBottom();
        }
    }, [logs, activeTab]);

    useEffect(() => {
        if (activeTab === "chat" && messages.length > 0) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 100);
        }
    }, [messages, activeTab]);

    const speakText = (text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    // ── Send chat message ───────────────────────────────────────────────────────
    const sendMessage = async (overrideInput?: string) => {
        const text = (overrideInput ?? input).trim();
        if (!text || !selectedProject || sending) return;
        const userMsg: ChatMessage = {
            role: "user",
            content: text,
            ts: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            const res = await axios.post(
                `${API}/api/monitor/chat`,
                {
                    user_id: USER_ID,
                    project_name: selectedProject.name,
                    message: text,
                    focused_file_path: selectedFile || undefined,
                    focused_file_content: selectedFileContent || undefined
                },
                { timeout: 180000 }
            );
            const botMsg: ChatMessage = {
                role: "assistant",
                content: res.data.response || "No response from agent.",
                ts: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (e: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "⚠️ Could not reach the monitoring agent. Make sure the Python backend is running at localhost:4000.",
                    ts: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    // ── Voice recording ─────────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            isRecordingRef.current = true;

            // Prefer webm for broad browser support
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/ogg";

            const mr = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mr;

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mr.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                if (!isRecordingRef.current) return; // cancelled

                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                if (blob.size === 0) {
                    setVoiceStatus("error");
                    setTimeout(() => setVoiceStatus("idle"), 3000);
                    return;
                }

                setVoiceStatus("processing");

                try {
                    const formData = new FormData();
                    const ext = mimeType.includes("ogg") ? ".ogg" : ".webm";
                    formData.append("file", blob, `voice${ext}`);
                    formData.append("language", selectedLanguage);

                    const res = await axios.post(`${API}/api/voice-input`, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                        timeout: 120000,
                    });

                    const { detected_language, english_text, original_text } = res.data;
                    setVoiceLang(detected_language || "");
                    setVoiceStatus("done");
                    setInput(english_text || "");

                    // Add voice indicator note if translated
                    if (detected_language && detected_language.toLowerCase() !== "en") {
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: "assistant" as const,
                                content: `🎤 **Voice detected** — Language: \`${detected_language.toUpperCase()}\`\n\n> Original: *${original_text}*\n\n✅ Translated to English and ready to send.`,
                                ts: new Date().toISOString(),
                            },
                        ]);
                    }

                    setTimeout(() => setVoiceStatus("idle"), 4000);
                } catch (err: any) {
                    console.error("Voice transcription error:", err);
                    setVoiceStatus("error");
                    setTimeout(() => setVoiceStatus("idle"), 4000);
                }
            };

            mr.start(250); // collect data every 250ms
            setVoiceStatus("recording");
        } catch (err: any) {
            console.error("Microphone error:", err);
            setVoiceStatus("error");
            setTimeout(() => setVoiceStatus("idle"), 3000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };

    const toggleRecording = () => {
        if (voiceStatus === "recording") {
            stopRecording();
        } else if (voiceStatus === "idle") {
            startRecording();
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <Link
                        href="/connect"
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <span className="text-slate-700">|</span>
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <span className="font-bold text-slate-100">Backend Monitoring</span>
                    </div>
                    {selectedProject && (
                        <>
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                            <span className="text-cyan-400 font-semibold text-sm">
                                {selectedProject.name}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                        {backendOnline ? (
                            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className={backendOnline ? "text-emerald-400" : "text-red-400"}>
                            {backendOnline ? "Backend Online" : "Backend Offline"}
                        </span>
                    </div>
                    <button
                        onClick={fetchProjects}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>

                    <Link
                        href={`/monitoring/log-groups?projectId=${selectedProject?.id || ''}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all"
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Log Groups
                    </Link>
                </div>
            </header>

            {/* ── Body ── */}
            {!selectedProject ? (
                /* ─ Project Grid ─────────────────────────────────────────────────── */
                <div className="max-w-5xl mx-auto px-6 py-10">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-slate-100 mb-2">
                            Your Connected Projects
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Projects watched by the{" "}
                            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400 text-xs">
                                querion watch
                            </code>{" "}
                            CLI. Select one to open the monitoring chat.
                        </p>
                    </div>

                    {/* CLI quickstart hint */}
                    <div className="mb-8 bg-slate-900 border border-slate-700 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-indigo-600/20 rounded-xl flex-shrink-0">
                                <Terminal className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 mb-1">
                                    {!backendOnline
                                        ? "⚠️ Backend not reachable"
                                        : projects.length === 0
                                            ? "No projects connected yet"
                                            : "Connected Projects Guide"}
                                </h3>
                                {projectError && (
                                    <p className="text-red-400 text-sm mb-3">{projectError}</p>
                                )}
                                <p className="text-slate-400 text-sm mb-3">
                                    To connect a project, run these commands in your project
                                    folder:
                                </p>
                                <div className="bg-slate-950 rounded-xl p-4 font-mono text-sm space-y-1">
                                    <p>
                                        <span className="text-slate-500"># 1. Install CLI</span>
                                    </p>
                                    <p className="text-cyan-300">
                                        pip install querion-cli
                                    </p>
                                    <p className="mt-2">
                                        <span className="text-slate-500"># 2. Watch your project</span>
                                    </p>
                                    <p className="text-cyan-300">
                                        querion watch --project "MyProject"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingProjects ? (
                        <div className="flex justify-center py-16">
                            <div className="flex items-center gap-3 text-slate-400">
                                <RefreshCw className="h-5 w-5 animate-spin" />
                                <span>Loading projects...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((p) => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    onSelect={(selected) => {
                                        setSelectedProject(selected);
                                        router.push(`/monitoring?projectId=${selected.id}`);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* ─ Project Detail View ──────────────────────────────────────────── */
                <div className="flex h-[calc(100vh-56px)]">
                    {/* ── Left sidebar: file tree ── */}
                    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-800">
                            <button
                                onClick={() => {
                                    setSelectedProject(null);
                                    setMessages([]);
                                    setLogs([]);
                                    setFiles([]);
                                    router.push("/monitoring");
                                }}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-xs"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                All Projects
                            </button>
                        </div>
                        <div className="px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-indigo-400" />
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Files
                                </span>
                                <span className="ml-auto text-xs text-slate-500">{files.length}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            {files.length === 0 ? (
                                <p className="px-4 py-3 text-xs text-slate-600 italic">
                                    No files synced yet.
                                </p>
                            ) : (
                                files.map((f) => {
                                    const filename = f.file_path.split(/[\\\/]/).pop() || f.file_path;
                                    const isSelected = selectedFile === f.file_path;
                                    return (
                                        <button
                                            key={f.file_path}
                                            onClick={() =>
                                                setSelectedFile(isSelected ? null : f.file_path)
                                            }
                                            className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors truncate ${isSelected
                                                ? "bg-indigo-600/20 text-indigo-300"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                }`}
                                        >
                                            <FileCode className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span className="truncate">{filename}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </aside>

                    {/* ── Main area ── */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Banner */}
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-950/60 border-b border-indigo-900/50 text-xs">
                            <StatusDot online={true} />
                            <span className="text-indigo-300 font-medium">
                                Monitoring: <strong className="text-indigo-200">{selectedProject.name}</strong>
                            </span>
                            <span className="text-indigo-500">—</span>
                            <span className="text-indigo-400">
                                {files.length} files · {logs.length} log lines loaded
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-800 bg-slate-900">
                            {[
                                { id: "chat", icon: MessageSquare, label: "AI Chat" },
                                { id: "realtime-logs", icon: Zap, label: "Real Time Logs" },
                                { id: "logs", icon: Terminal, label: "Live Logs" },
                                { id: "dashboard", icon: Activity, label: "Dashboard" },
                                { id: "files", icon: FileCode, label: "File Viewer" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? "border-indigo-500 text-indigo-300"
                                        : "border-transparent text-slate-500 hover:text-slate-300"
                                        }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                    {tab.id === "logs" && logs.length > 0 && (
                                        <span className="ml-1 bg-indigo-600/30 text-indigo-400 text-xs px-1.5 py-0.5 rounded-full">
                                            {logs.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* ── Chat Tab ── */}
                        <div className={activeTab === "chat" ? "flex-1 flex flex-col min-h-0" : "hidden"}>
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-600">
                                        <Cpu className="h-12 w-12 mb-4 text-slate-700" />
                                        <p className="text-lg font-semibold text-slate-500 mb-2">
                                            Ask anything about {selectedProject.name}
                                        </p>
                                        <p className="text-sm max-w-sm text-slate-600">
                                            Examples: "Explain my login flow", "Why is this endpoint
                                            slow?", "What does my middleware do?"
                                        </p>
                                        <div className="mt-4 flex items-center gap-2 text-slate-600 text-xs">
                                            <Mic className="h-4 w-4 text-indigo-500" />
                                            <span>Or tap the mic button to speak in any language — it auto-translates to English</span>
                                        </div>
                                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                            {[
                                                "Explain my login flow",
                                                "Find errors in recent logs",
                                                "Summarize recent file changes",
                                                "How does my middleware work?",
                                            ].map((ex) => (
                                                <button
                                                    key={ex}
                                                    onClick={() => setInput(ex)}
                                                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                                                >
                                                    {ex}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user"
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-800/90 border border-slate-700/60"
                                                }`}
                                        >
                                            {m.role === "assistant" && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center">
                                                        <Cpu className="h-3 w-3 text-indigo-400" />
                                                    </div>
                                                    <p className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Querion AI</p>
                                                </div>
                                            )}
                                            {m.role === "assistant" ? (
                                                <MarkdownRenderer content={m.content} />
                                            ) : (
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                            )}
                                            <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-700/30">
                                                <div className="flex items-center gap-2">
                                                    {m.role === "assistant" && (
                                                        <button
                                                            onClick={() => speakText(m.content)}
                                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all border border-indigo-500/20 group"
                                                            title="Listen to response"
                                                        >
                                                            <Volume2 className="h-3.5 w-3.5" />
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider">Listen</span>
                                                        </button>
                                                    )}
                                                    {m.role === "assistant" && (
                                                        <button
                                                            onClick={() => window.speechSynthesis.cancel()}
                                                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                                                            title="Stop reading"
                                                        >
                                                            <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] opacity-40 font-mono tracking-tight">{fmtTime(m.ts)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center">
                                                    <Cpu className="h-3 w-3 text-indigo-400" />
                                                </div>
                                                <p className="text-cyan-400 font-bold text-xs">Querion AI</p>
                                            </div>
                                            <div className="flex gap-1 items-center py-1">
                                                <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* ── Input Area with Mic ── */}
                            <div className="p-4 border-t border-slate-800 bg-slate-900">
                                {/* Voice status badge */}
                                {voiceStatus !== "idle" && (
                                    <div className="flex justify-center mb-2">
                                        <VoiceBadge lang={voiceLang} status={voiceStatus} />
                                    </div>
                                )}

                                <div className="flex gap-2 items-end">
                                    {/* Mic button and Language selector */}
                                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                            title="Speaking language hint"
                                        >
                                            {LANGUAGES.map((l) => (
                                                <option key={l.code} value={l.code}>
                                                    {l.name}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            id="voice-mic-btn"
                                            onClick={toggleRecording}
                                            disabled={voiceStatus === "processing"}
                                            title={voiceStatus === "recording" ? "Stop recording" : "Start voice input"}
                                            className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${voiceStatus === "recording"
                                                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse ring-2 ring-red-400/50"
                                                : voiceStatus === "processing"
                                                    ? "bg-amber-500/20 text-amber-400 cursor-wait"
                                                    : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500"
                                                }`}
                                        >
                                            {voiceStatus === "recording" ? (
                                                <MicOff className="h-4 w-4" />
                                            ) : voiceStatus === "processing" ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Mic className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    <textarea
                                        id="chat-input"
                                        rows={2}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder={
                                            voiceStatus === "recording"
                                                ? "🔴 Listening… click mic to stop"
                                                : `Ask about ${selectedProject.name}… (Enter to send, or 🎤 for voice)`
                                        }
                                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none transition-colors"
                                    />
                                    <button
                                        id="chat-send-btn"
                                        onClick={() => sendMessage()}
                                        disabled={sending || !input.trim()}
                                        className="p-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors flex-shrink-0"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="text-xs text-slate-700 mt-2 text-center">
                                    🎤 Voice supports 100+ languages · auto-translates to English · powered by Whisper
                                </p>
                            </div>
                        </div>

                        {/* ── Real Time Logs Tab ── */}
                        <div className={activeTab === "realtime-logs" ? "flex-1 overflow-y-auto bg-slate-950" : "hidden"}>
                            {selectedProject && (
                                <RealTimeLogFetchingTab projectId={selectedProject.id} />
                            )}
                        </div>

                        {/* ── Dashboard Tab ── */}
                        <div className={activeTab === "dashboard" ? "flex-1 overflow-y-auto" : "hidden"}>
                            {selectedProject && (
                                <DashboardTab project={selectedProject} logs={logs} />
                            )}
                        </div>

                        {/* ── Logs Tab ── */}
                        <div
                            ref={logContainerRef}
                            className={activeTab === "logs" ? "flex-1 overflow-y-auto custom-scrollbar bg-slate-950 font-mono text-xs p-4 relative" : "hidden"}
                        >
                            {selectedProject && (
                                <div className="flex items-center justify-between mb-6 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 sticky top-0 z-10 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${selectedProject.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Live Session Stream</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => scrollToBottom(true)}
                                            className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 transition-all"
                                        >
                                            <Clock className="h-3 w-3" />
                                            Latest
                                        </button>
                                        <Link
                                            href={`/monitoring/log-groups?projectId=${selectedProject.id}`}
                                            className="flex items-center gap-2 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20 transition-all hover:bg-indigo-500/20"
                                        >
                                            <Layers className="h-3 w-3" />
                                            Grouped
                                            <ChevronRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {logs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                                        <Terminal className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="font-bold tracking-tight text-sm">Waiting for incoming logs...</p>
                                        <p className="mt-2 text-[10px] text-slate-800 max-w-xs text-center leading-relaxed">
                                            Logs from the current session will appear here in real-time. Previous session history has been cleared for focus.
                                        </p>
                                    </div>
                                ) : (
                                    logs.map((l, i) => (
                                        <div key={i} className="flex gap-3 py-0.5 hover:bg-slate-900/50 px-2 rounded group transition-colors">
                                            <span className="text-slate-700 flex-shrink-0 select-none font-bold w-16">
                                                {fmtTime(l.timestamp)}
                                            </span>
                                            <span
                                                className={
                                                    l.log_line.toLowerCase().includes("error") ||
                                                        l.log_line.toLowerCase().includes("exception")
                                                        ? "text-red-400 font-medium"
                                                        : l.log_line.toLowerCase().includes("warn")
                                                            ? "text-yellow-400"
                                                            : "text-slate-400"
                                                }
                                            >
                                                {l.log_line}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>

                        {/* ── Files Tab ── */}
                        <div className={activeTab === "files" ? "flex-1 flex min-h-0" : "hidden"}>
                            {/* File list */}
                            <div className="w-56 flex-shrink-0 border-r border-slate-800 overflow-y-auto py-2">
                                {files.length === 0 ? (
                                    <p className="px-4 py-3 text-xs text-slate-600 italic">No files synced yet.</p>
                                ) : (
                                    files.map((f) => {
                                        const filename = f.file_path.split(/[\\\/]/).pop() || f.file_path;
                                        const isSelected = selectedFile === f.file_path;
                                        return (
                                            <button
                                                key={f.file_path}
                                                onClick={() => setSelectedFile(f.file_path)}
                                                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors ${isSelected
                                                    ? "bg-indigo-600/20 text-indigo-300"
                                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                    }`}
                                            >
                                                <FileCode className="h-3.5 w-3.5 flex-shrink-0 shrink-0" />
                                                <span className="truncate max-w-[140px]">{filename}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            {/* File content */}
                            <div className="flex-1 overflow-auto bg-slate-950 p-5">
                                {selectedFile ? (
                                    <>
                                        <p className="text-xs text-slate-600 mb-3 font-mono">{selectedFile}</p>
                                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                                            {selectedFileContent || "Loading..."}
                                        </pre>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                                        <FileCode className="h-10 w-10 mb-3" />
                                        <p>Select a file from the panel to view its content.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
