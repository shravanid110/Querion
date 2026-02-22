"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
    id: number;
    name: string;
    last_updated: string;
    file_count: number;
    log_count: number;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    ts: string;
}

interface LogLine {
    log_line: string;
    timestamp: string;
}

// ─── API base ─────────────────────────────────────────────────────────────────

const API = "http://localhost:4000";
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<"chat" | "logs" | "files">("chat");
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [files, setFiles] = useState<{ file_path: string; content: string }[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [backendOnline, setBackendOnline] = useState(false);
    const [projectError, setProjectError] = useState<string | null>(null);

    const logsEndRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch projects ──────────────────────────────────────────────────────────
    const fetchProjects = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/monitor/projects/${USER_ID}`, {
                timeout: 3000,
            });
            setProjects(res.data);
            setBackendOnline(true);
            setProjectError(null);
        } catch (e: any) {
            setBackendOnline(false);
            setProjectError("Cannot reach backend at localhost:4000. Make sure Python backend is running.");
        } finally {
            setLoadingProjects(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
        const interval = setInterval(fetchProjects, 5000);
        return () => clearInterval(interval);
    }, [fetchProjects]);

    // ── Fetch logs for selected project ────────────────────────────────────────
    const fetchProjectDetail = useCallback(async (project: Project) => {
        try {
            const [logsRes, filesRes] = await Promise.all([
                axios.get(`${API}/api/monitor/logs/${project.id}`, { timeout: 3000 }),
                axios.get(`${API}/api/monitor/files/${project.id}`, { timeout: 3000 }),
            ]);
            setLogs(logsRes.data || []);
            setFiles(filesRes.data || []);
        } catch {
            // silently ignore
        }
    }, []);

    useEffect(() => {
        if (!selectedProject) return;
        fetchProjectDetail(selectedProject);
        pollRef.current = setInterval(() => fetchProjectDetail(selectedProject), 2000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [selectedProject, fetchProjectDetail]);

    // ── Auto-scroll ─────────────────────────────────────────────────────────────
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Send chat message ───────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!input.trim() || !selectedProject || sending) return;
        const userMsg: ChatMessage = {
            role: "user",
            content: input.trim(),
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
                    message: userMsg.content,
                },
                { timeout: 30000 }
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
                    {!backendOnline || projects.length === 0 ? (
                        <div className="mb-8 bg-slate-900 border border-slate-700 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-indigo-600/20 rounded-xl flex-shrink-0">
                                    <Terminal className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-200 mb-1">
                                        {!backendOnline
                                            ? "⚠️ Backend not reachable"
                                            : "No projects connected yet"}
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
                    ) : null}

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
                                    onSelect={setSelectedProject}
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
                                    const filename = f.file_path.split(/[\\/]/).pop() || f.file_path;
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
                                { id: "logs", icon: Terminal, label: "Live Logs" },
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
                        {activeTab === "chat" && (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-600">
                                            <Cpu className="h-12 w-12 mb-4 text-slate-700" />
                                            <p className="text-lg font-semibold text-slate-500 mb-2">
                                                Ask anything about {selectedProject.name}
                                            </p>
                                            <p className="text-sm max-w-sm">
                                                Examples: "Explain my login flow", "Why is this endpoint slow?", "What does my middleware do?"
                                            </p>
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
                                                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user"
                                                    ? "bg-indigo-600 text-white"
                                                    : "bg-slate-800 text-slate-200"
                                                    }`}
                                            >
                                                {m.role === "assistant" && (
                                                    <p className="text-cyan-400 font-bold text-xs mb-1">
                                                        Querion:
                                                    </p>
                                                )}
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                                <p className="text-xs opacity-40 mt-1 text-right">
                                                    {fmtTime(m.ts)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {sending && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-800 rounded-2xl px-4 py-3 text-sm">
                                                <p className="text-cyan-400 font-bold text-xs mb-1">Querion:</p>
                                                <div className="flex gap-1 items-center py-1">
                                                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-slate-800 bg-slate-900">
                                    <div className="flex gap-3 items-end">
                                        <textarea
                                            rows={2}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                            placeholder={`Ask about ${selectedProject.name}... (Enter to send)`}
                                            className="flex-1 bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none transition-colors"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={sending || !input.trim()}
                                            className="p-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-colors flex-shrink-0"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Logs Tab ── */}
                        {activeTab === "logs" && (
                            <div className="flex-1 overflow-y-auto bg-slate-950 font-mono text-xs p-4 space-y-0.5">
                                {logs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                                        <Terminal className="h-10 w-10 mb-3" />
                                        <p>No logs captured yet.</p>
                                        <p className="mt-1 text-slate-800">
                                            Run your app with: <span className="text-cyan-800">python app.py | querion watch --project "{selectedProject.name}"</span>
                                        </p>
                                    </div>
                                ) : (
                                    logs.map((l, i) => (
                                        <div key={i} className="flex gap-3 py-0.5 hover:bg-slate-900/50 px-2 rounded">
                                            <span className="text-slate-700 flex-shrink-0 select-none">
                                                {fmtTime(l.timestamp)}
                                            </span>
                                            <span
                                                className={
                                                    l.log_line.toLowerCase().includes("error") ||
                                                        l.log_line.toLowerCase().includes("exception")
                                                        ? "text-red-400"
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
                        )}

                        {/* ── Files Tab ── */}
                        {activeTab === "files" && (
                            <div className="flex-1 flex min-h-0">
                                {/* File list */}
                                <div className="w-56 flex-shrink-0 border-r border-slate-800 overflow-y-auto py-2">
                                    {files.length === 0 ? (
                                        <p className="px-4 py-3 text-xs text-slate-600 italic">No files synced yet.</p>
                                    ) : (
                                        files.map((f) => {
                                            const filename = f.file_path.split(/[\\/]/).pop() || f.file_path;
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
                                                {files.find((f) => f.file_path === selectedFile)?.content ||
                                                    "Empty file"}
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
