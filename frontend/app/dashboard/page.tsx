"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { ConnectionSelector } from '@/components/dashboard/ConnectionSelector';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Users, DollarSign, Calendar, Database, AlertCircle, Copy, Zap, Code, Plus, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { runQuery, generateReport } from '@/services/api';

export default function DashboardPage() {
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('last_connection_id');
        return null;
    });
    const [selectedConnectionName, setSelectedConnectionName] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('last_connection_name');
        return null;
    });

    // Update localStorage when selection changes
    const updateSelectedConnection = (id: string, name: string) => {
        if (selectedConnectionId === id && selectedConnectionName === name) return;
        setSelectedConnectionId(id);
        setSelectedConnectionName(name);
        localStorage.setItem('last_connection_id', id);
        localStorage.setItem('last_connection_name', name);
    };
    const [results, setResults] = useState<{ prompt: string, data: QueryResult }[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('current_chat_results');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });
    const [generatingReport, setGeneratingReport] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('current_chat_results', JSON.stringify(results));
        }
    }, [results]);

    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    interface QueryResult {
        sql: string;
        explanation: string;
        rows: any[];
        columns: string[];
        metrics: {
            totalRows: number;
            approxSum: number;
        };
    }

    const [initialPrompt, setInitialPrompt] = useState<string>('');
    const scrollRef = React.useRef<HTMLDivElement>(null);
    // Track initial mount so we don't clear history on first load
    const isFirstMount = React.useRef(true);

    // Auto-scroll to latest result
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [results, isThinking]);

    // Clear history ONLY when the user actively switches to a different database
    useEffect(() => {
        // Skip on initial mount — we want to preserve localStorage history
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        setResults([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('current_chat_results');
        }
        setError(null);
    }, [selectedConnectionId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const promptParam = params.get('prompt');
            if (promptParam) {
                setInitialPrompt(promptParam);
                // Clean the URL without reloading the page
                window.history.replaceState({}, '', '/dashboard');
            }
        }
    }, []);

    // Try to auto-run the pre-filled prompt if we get a connection
    useEffect(() => {
        if (initialPrompt && selectedConnectionId && results.length === 0 && !isThinking && !error) {
            const run = async () => {
                await handleSearch(initialPrompt);
                setInitialPrompt(''); // Clear to prevent infinite loops on reconnect 
            };
            run();
        }
    }, [initialPrompt, selectedConnectionId]);

    const handleSearch = async (prompt: string) => {
        if (!selectedConnectionId) {
            setError("Please select a database connection first.");
            return;
        }

        setIsThinking(true);
        setError(null);

        try {
            const data = await runQuery(selectedConnectionId, prompt);
            setResults(prev => [...prev, { prompt, data }]);
        } catch (err: any) {
            console.error("Query failed", err);
            setError(err.response?.data?.error || err.message || "Failed to execute query.");
        } finally {
            setIsThinking(false);
        }
    };

    const handleGenerateReport = async (index: number) => {
        const res = results[index];
        if (!res) return;
        setGeneratingReport(index);
        try {
            const blob = await generateReport(res.data.rows, res.prompt);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Querion_Report_${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert('Report generation failed: ' + (err?.message || 'Unknown error'));
        } finally {
            setGeneratingReport(null);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] flex flex-col font-sans">
            <Navbar connectionName={selectedConnectionName} />

            <div className="flex pt-16 h-screen overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <div className="flex-1 ml-64 flex flex-col relative h-full">
                    
                    {/* Results / Scrollable Section */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-40 scroll-smooth">
                        <div className="max-w-7xl mx-auto space-y-8">
                            
                            {/* Top Bar: Title & Connection Selector */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--accent-primary)]">Ask Querion</h1>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all shadow-lg shadow-[var(--accent-glow)]/10"
                                                onClick={() => {
                                                    setResults([]);
                                                    localStorage.removeItem('current_chat_results');
                                                }}
                                                title="New Chat Session"
                                            >
                                                <Plus size={18} />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 uppercase tracking-widest opacity-70">
                                            {selectedConnectionId ? "Intelligent AI Assistant" : "Select a connection to start."}
                                        </p>
                                    </div>
                                </div>
                                <ConnectionSelector 
                                    onSelect={(conn) => {
                                        updateSelectedConnection(conn.id, conn.name);
                                    }} 
                                    selectedId={selectedConnectionId}
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/5 backdrop-blur-sm">
                                    <AlertCircle size={20} />
                                    <span className="font-semibold">{error}</span>
                                </div>
                            )}

                            {/* Results Section */}
                            {results.map((res, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    className="space-y-10 border-b border-[var(--border-color)] pb-16 last:border-0"
                                >
                                    {/* Query Header */}
                                    <div className="flex items-center justify-between bg-[var(--accent-glow)]/10 p-4 rounded-2xl border border-[var(--accent-primary)]/20 backdrop-blur-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[var(--accent-primary)]/10 p-2.5 rounded-xl text-[var(--accent-primary)]">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                                                    {res.prompt}
                                                </h2>
                                                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-60">User Query • #{index + 1}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="gap-2 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
                                            onClick={() => handleSearch(res.prompt)}
                                            disabled={isThinking}
                                        >
                                            <Zap size={14} />
                                            <span>Replay</span>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="gap-1.5 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 transition-all"
                                            onClick={() => handleGenerateReport(index)}
                                            disabled={generatingReport !== null}
                                        >
                                            {generatingReport === index ? (
                                                <><Loader2 size={14} className="animate-spin" /><span>Generating...</span></>
                                            ) : (
                                                <><FileDown size={14} /><span>Report</span></>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Metrics Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        <MetricCard
                                            label="Total Rows"
                                            value={res.data.metrics.totalRows.toLocaleString()}
                                            icon={Database}
                                            color="indigo"
                                        />
                                        <MetricCard
                                            label="Total Value (Approx)"
                                            value={res.data.metrics.approxSum > 0 ? res.data.metrics.approxSum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
                                            icon={DollarSign}
                                            color="emerald"
                                            subValue="Sum of first numeric column"
                                        />
                                        <MetricCard
                                            label="Columns"
                                            value={res.data.columns.length.toString()}
                                            icon={LayoutDashboard}
                                            color="blue"
                                        />
                                        <MetricCard
                                            label="Query Status"
                                            value="Success"
                                            icon={Calendar}
                                            color="violet"
                                            trend="up"
                                            trendValue="100%"
                                        />
                                    </div>

                                    {/* Generated SQL Section */}
                                    {res.data.sql && (
                                        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                                            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
                                                <div className="flex items-center gap-3 text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">
                                                    <Code size={16} className="text-[var(--accent-primary)]" />
                                                    <span>Generated Query</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-white/30 hover:text-white hover:bg-white/10 rounded-lg"
                                                    onClick={() => navigator.clipboard.writeText(res.data.sql)}
                                                >
                                                    <Copy size={16} />
                                                </Button>
                                            </div>
                                            <div className="p-8 overflow-x-auto custom-scrollbar bg-black/20">
                                                <pre className="font-mono text-sm text-cyan-400/90 leading-relaxed">
                                                    <code>{res.data.sql}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chart and Table Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 min-h-[450px]">
                                            <ChartPanel data={res.data.rows} columns={res.data.columns} />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <Card className="h-full min-h-[450px] border-0 glass-card flex flex-col p-0 overflow-hidden shadow-2xl">
                                                <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-r from-[var(--accent-glow)] to-transparent">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-[var(--accent-primary)] p-2 rounded-xl text-white shadow-lg shadow-[var(--accent-glow)]">
                                                            <Zap size={20} />
                                                        </div>
                                                        <h3 className="font-black text-[var(--text-primary)] tracking-tight">AI Analysis</h3>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-glow)] rounded-xl"
                                                        onClick={() => navigator.clipboard.writeText(res.data.explanation || "")}
                                                    >
                                                        <Copy size={16} />
                                                    </Button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                                    <div className="text-sm text-[var(--text-primary)] opacity-90 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                                                        {res.data.explanation || "No insights generated for this query."}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-[var(--bg-nav)] border-t border-[var(--border-color)] text-[9px] text-[var(--text-secondary)] text-center uppercase tracking-[0.3em] font-black opacity-60">
                                                    Generated by Querion AI Engine
                                                </div>
                                            </Card>
                                        </div>
                                    </div>

                                    <div className="w-full pb-10">
                                        <DataTable columns={res.data.columns} rows={res.data.rows} />
                                    </div>
                                </motion.div>
                            ))}
                            
                            {/* Thinking State in History */}
                            {isThinking && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-20 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 border-dashed"
                                >
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                                        <Zap size={40} className="text-indigo-400 animate-bounce relative z-10" />
                                    </div>
                                    <h3 className="mt-6 text-xl font-bold text-white tracking-tight">Querion is Thinking...</h3>
                                    <p className="text-sm text-slate-400 mt-2">Processing your natural language query into optimized SQL</p>
                                </motion.div>
                            )}

                            {/* Anchor for auto-scroll */}
                            <div ref={scrollRef} className="h-4" />

                            {results.length === 0 && !isThinking && !error && (
                                <div className="flex flex-col items-center justify-center py-24 text-[var(--text-secondary)] text-center">
                                    <div className="w-24 h-24 rounded-3xl bg-[var(--accent-glow)] flex items-center justify-center mb-8 border border-[var(--border-color)]">
                                        <Zap size={48} className="text-[var(--accent-primary)] opacity-50" />
                                    </div>
                                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-2">Ready to Query</h2>
                                    <p className="text-sm max-w-md mx-auto opacity-70 leading-relaxed font-medium capitalize font-mono">
                                        Ask me anything about your database datasets at the bottom.
                                    </p>
                                </div>
                            )}

                        </div>
                    </main>

                    {/* Chat Input: Fixed Bottom Section */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none z-50">
                        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
                            <ChatInterface
                                onSearch={handleSearch}
                                isThinking={isThinking}
                                initialQuery={initialPrompt}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
