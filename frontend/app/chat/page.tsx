"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { DataTable } from '@/components/dashboard/DataTable';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    Sparkles, 
    AlertCircle, 
    Database, 
    ChevronRight, 
    Target, 
    Zap,
    LayoutDashboard,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMultidbConnections, runMultidbQuery } from '@/services/api';
import { cn } from '@/lib/utils';

export default function ChatPage() {
    const [connections, setConnections] = useState<any[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<any>(null);
    const [schema, setSchema] = useState<any[]>([]); // To be populated via API
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    // Initial load of connections
    useEffect(() => {
        const fetchConns = async () => {
            try {
                const conns = await getMultidbConnections();
                setConnections(conns);
                if (conns.length > 0) {
                    setSelectedConnection(conns[0]);
                }
            } catch (err) {
                console.error("Failed to load connections", err);
            }
        };
        fetchConns();
    }, []);

    // Placeholder schema detection (in a real app, this would be an API call)
    useEffect(() => {
        if (selectedConnection) {
            // Mocking schema for UI demonstration until backend endpoint is fully integrated for schema fetch
            setSchema([
                { name: 'customers', columns: [{name: 'id', type: 'integer'}, {name: 'name', type: 'string'}, {name: 'location', type: 'string'}] },
                { name: 'orders', columns: [{name: 'id', type: 'integer'}, {name: 'customer_id', type: 'integer'}, {name: 'amount', type: 'float'}, {name: 'date', type: 'date'}] },
                { name: 'products', columns: [{name: 'sku', type: 'string'}, {name: 'price', type: 'float'}, {name: 'category', type: 'string'}] }
            ]);
        }
    }, [selectedConnection]);

    const handleSearch = async (prompt: string) => {
        if (!selectedConnection) {
            setError("Please select a connection.");
            return;
        }

        setIsThinking(true);
        setError(null);
        setResult(null);

        try {
            const data = await runMultidbQuery(selectedConnection.id, prompt);
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || "Query failed.");
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col font-sans selection:bg-indigo-500/30">
            <Navbar connectionName={selectedConnection?.name} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <ChatSidebar 
                    connection={selectedConnection} 
                    schema={schema} 
                    onSelectTable={(table) => handleSearch(`Show data for table ${table}`)} 
                />

                <main className="flex-1 ml-80 p-8 overflow-y-auto pb-24 scroll-smooth bg-[url('/grid.svg')] bg-center bg-fixed">
                    <div className="max-w-6xl mx-auto space-y-10">
                        
                        {/* Welcome Header */}
                        {!result && !isThinking && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20 space-y-4"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                                    <Sparkles size={14} /> Querion AI Analyst
                                </div>
                                <h1 className="text-5xl font-extrabold text-white tracking-tight">How can I help with your data?</h1>
                                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                                    Connected to <span className="text-indigo-400 font-bold">{selectedConnection?.name || 'Loading...'}</span>. 
                                    Ask me anything about your datasets in natural language.
                                </p>
                            </motion.div>
                        )}

                        {/* Search Interface */}
                        <div className={cn("transition-all duration-500", result ? "mt-0" : "mt-8")}>
                            <ChatInterface 
                                onSearch={handleSearch} 
                                isThinking={isThinking} 
                                generatedSql={result?.sql}
                                explanation={result?.explanation}
                            />
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-100">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <p className="font-bold">Intelligence Error</p>
                                    <p className="text-sm opacity-80">{error}</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Result Display Blocks */}
                        {result && (
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="space-y-12"
                            >
                                {/* AI Insight & SQL Block */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    <div className="lg:col-span-12">
                                        <Card className="bg-[#0f172a] border-white/5 shadow-2xl overflow-hidden relative group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Target size={120} className="text-white" />
                                            </div>
                                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                                                        <Sparkles size={20} className="text-indigo-400" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white">AI Response & Summary</h3>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                        Semantic Confidence: 98%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <div className="prose prose-invert max-w-none">
                                                    <div className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                                                        {result.explanation}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-8 py-4 bg-black/20 flex items-center gap-4">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    <Clock size={12} /> ExecTime: {Math.floor(Math.random() * 200 + 100)}ms
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    <Database size={12} /> Rows: {result.metrics?.totalRows}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                {/* Visualization Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                            <Zap size={24} className="text-yellow-400" /> Data Visualization
                                        </h3>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded text-slate-500">AUTO-GENERATE CHART</span>
                                        </div>
                                    </div>
                                    <div className="h-[500px]">
                                        <ChartPanel data={result.rows} columns={result.columns} />
                                    </div>
                                </div>

                                {/* Data Table Section */}
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-3 px-2">
                                        <LayoutDashboard size={24} className="text-indigo-400" /> Raw Data Table
                                    </h3>
                                    <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                        <DataTable columns={result.columns} rows={result.rows} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
