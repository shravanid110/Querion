"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import {
    Activity,
    Terminal,
    ChevronRight,
    ArrowLeft,
    Layers,
    Clock,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    Info,
    RefreshCw,
    Search,
    Filter,
    ArrowUpDown,
    BrainCircuit,
    Zap,
    History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface LogGroup {
    key: string;
    representative_line: string;
    count: number;
    last_timestamp: string;
    severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
}

interface Project {
    id: number;
    name: string;
}

const API = "http://127.0.0.1:4000";

// --- Components ---

function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
        ERROR: "bg-red-500/10 text-red-400 border-red-500/20",
        WARNING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        INFO: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    };
    
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border tracking-widest ${styles[severity] || styles.INFO}`}>
            {severity}
        </span>
    );
}

function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function LogGroupsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get("projectId");
    
    const [groups, setGroups] = useState<LogGroup[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/monitor/projects/default_user`, { timeout: 15000 });
            setProjects(res.data);
            if (projectId) {
                const p = res.data.find((x: Project) => x.id === parseInt(projectId));
                if (p) setSelectedProject(p);
            } else if (res.data.length > 0) {
                setSelectedProject(res.data[0]);
                router.replace(`/monitoring/log-groups?projectId=${res.data[0].id}`);
            }
        } catch (e) {
            console.error("Failed to fetch projects:", e);
        }
    }, [projectId, router]);

    const fetchGroups = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/monitor/log-groups/${projectId}`, { timeout: 15000 });
            setGroups(res.data);
        } catch (e) {
            console.error("Failed to fetch log groups:", e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (!projectId) return;

        // Initial fetch
        fetchGroups();

        // Reactive sync: Connect to the same monitoring stream
        const socket = new WebSocket("ws://127.0.0.1:4000/ws/monitor");

        socket.onopen = () => {
            console.log("Log Groups: Reactive sync active");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Trigger refresh only on log sync or chart update events for THIS project
                const incomingProjectId = data.project_id || data.log?.project_id;
                
                if ((data.type === "logs_synced" || data.type === "mapped_chart") && 
                    (!incomingProjectId || incomingProjectId === parseInt(projectId))) {
                    fetchGroups();
                }
            } catch (err) {
                console.error("WS parse error", err);
            }
        };

        socket.onerror = (err) => {
            console.error("Log Groups sync error", err);
        };

        return () => {
            socket.close();
        };
    }, [projectId, fetchGroups]);

    const filteredGroups = groups.filter(g => 
        g.representative_line.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/monitoring" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors group">
                            <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-white" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Layers className="h-5 w-5 text-indigo-400" />
                                <h1 className="text-xl font-black tracking-tight">LOG GROUPS</h1>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">Intelligence Clustering Engine</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2 flex items-center gap-3">
                            <Clock className="h-4 w-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-300">Live Sync Active</span>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        
                        <button 
                            onClick={fetchGroups}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <RefreshCw className={`h-4 w-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* Project Selector & Search */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                    <div className="lg:col-span-4 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">Current Workspace</label>
                        <select 
                            value={projectId || ""} 
                            onChange={(e) => router.push(`/monitoring/log-groups?projectId=${e.target.value}`)}
                            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer appearance-none"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-8 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase ml-1">Filter Patterns</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by error signature, file path, or log content..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* Intelligence Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Identified Groups', val: groups.length, icon: BrainCircuit, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { label: 'Critical Clusters', val: groups.filter(g => g.severity === 'CRITICAL').length, icon: Zap, color: 'text-red-400', bg: 'bg-red-500/10' },
                        { label: 'Repeat Errors', val: groups.reduce((acc, g) => acc + (g.count > 1 ? 1 : 0), 0), icon: History, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'Total Instances', val: groups.reduce((acc, g) => acc + g.count, 0), icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 hover:bg-slate-900/60 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-slate-600">WORKSPACE ALPHA</span>
                            </div>
                            <div className="text-2xl font-black text-white mb-1">{stat.val}</div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Groups List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">Aggregated Pattern Registry</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                            <Filter className="h-3 w-3" />
                            <span>Sorted by Severity & Frequency</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                            <p className="font-bold text-sm">Initializing Grouping Engine...</p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl py-20 flex flex-col items-center justify-center text-center px-6">
                            <Terminal className="h-12 w-12 text-slate-800 mb-4" />
                            <h3 className="text-lg font-bold text-slate-400">No Groups Found</h3>
                            <p className="text-sm text-slate-600 max-w-xs mt-1">We couldn't find any log patterns matching your current filters or in the recent project history.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            <AnimatePresence mode="popLayout">
                                {filteredGroups.map((group, idx) => (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: idx * 0.02 }}
                                        key={group.key}
                                        className="group bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-lg hover:shadow-indigo-500/5"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="pt-1 flex flex-col items-center gap-2">
                                                <SeverityBadge severity={group.severity} />
                                                <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 flex flex-col items-center">
                                                    <span className="text-[14px] font-black text-white">{group.count}</span>
                                                    <span className="text-[7px] font-black text-slate-600 uppercase">Hits</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-[10px] font-mono text-slate-500">{timeAgo(group.last_timestamp)}</span>
                                                    <div className="h-px flex-1 bg-slate-800/50" />
                                                    <span className={`text-[9px] font-bold ${group.severity === 'CRITICAL' ? 'text-red-400' : 'text-slate-500'} uppercase tracking-widest`}>
                                                        Pattern {group.key.substring(0, 8)}
                                                    </span>
                                                </div>
                                                
                                                <div className="bg-black/30 rounded-xl p-4 border border-slate-800/50 group-hover:border-indigo-500/20 transition-colors">
                                                    <p className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words italic">
                                                        {group.representative_line}
                                                    </p>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {group.severity === 'CRITICAL' && (
                                                        <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest animate-pulse">
                                                            Awaiting AI Resolution
                                                        </span>
                                                    )}
                                                    {group.count > 10 && (
                                                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                                                            High Frequency Pattern
                                                        </span>
                                                    )}
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <button 
                                                            onClick={() => router.push(`/monitoring?projectId=${projectId}&tab=chat&input=Explain this log group: ${group.representative_line}`)}
                                                            className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/10 transition-all"
                                                        >
                                                            <BrainCircuit className="h-3 w-3" />
                                                            Ask AI
                                                        </button>
                                                        <button className="p-1 px-2 text-slate-600 hover:text-slate-200 transition-colors">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>
            
            {/* Footer / Status */}
            <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 mt-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-4">
                        <span>Querion Observability v2.4.0</span>
                        <span className="w-1 h-1 bg-slate-800 rounded-full" />
                        <span>Clustering Engine Stable</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500">© 2024 DEEPMIND AGENTIC SYSTEMS</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
