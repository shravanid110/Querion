"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { getHistory } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Clock, Database, ChevronRight, MessageSquare, Loader2, Calendar, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { MetricCard } from '@/components/dashboard/MetricCard';

interface HistoryItem {
    id: string;
    conn_id: string;
    conn_name: string;
    prompt: string;
    sql_query: string;
    explanation: string;
    columns: string[];
    rows_data: any[];
    metrics: { totalRows: number; approxSum: number };
    created_at: string;
}

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getHistory();
                setHistory(data);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        }).format(date);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar connectionName={null} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />

                <main className="flex-1 ml-64 p-8 overflow-y-auto pb-24 scroll-smooth flex">
                    {/* History List Side */}
                    <div className={`w-full max-w-xl pr-6 border-r border-gray-200 transition-all ${selectedItem ? 'hidden lg:block' : 'block'}`}>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    <Clock className="text-indigo-600" /> Query History
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">Review your past conversations and generated data</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No history found</p>
                            </div>
                        ) : (
                            <div className="space-y-3 pr-2 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
                                {history.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setSelectedItem(item)}
                                        className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${selectedItem?.id === item.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                                            <div className="flex items-center gap-1"><Database size={12} className="text-indigo-500"/> {item.conn_name}</div>
                                            <div className="flex items-center gap-1"><Calendar size={12}/> {formatDate(item.created_at)}</div>
                                        </div>
                                        <p className="font-medium text-gray-900 line-clamp-2 text-sm">"{item.prompt}"</p>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Detail View Side */}
                    <div className={`flex-1 pl-6 ${!selectedItem ? 'hidden lg:flex' : 'block'} flex-col overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar`}>
                        {selectedItem ? (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedItem.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6 pb-20"
                                >
                                    <div className="flex lg:hidden mb-4">
                                        <button onClick={() => setSelectedItem(null)} className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                            <ChevronRight className="rotate-180" size={16}/> Back to list
                                        </button>
                                    </div>

                                    {/* Prompt header */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2 mb-3 max-w-[80%]">
                                                <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><MessageSquare size={20} /></div>
                                                <h2 className="text-xl font-bold text-gray-900 leading-snug">"{selectedItem.prompt}"</h2>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/dashboard?prompt=${encodeURIComponent(selectedItem.prompt)}`)}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                                            >
                                                <Play size={16} /> Replay Prompt
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <Database size={14}/> {selectedItem.conn_name} <span className="text-gray-300">•</span> {formatDate(selectedItem.created_at)}
                                        </p>
                                    </div>

                                    {/* SQL & Explanation */}
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="bg-gray-900 rounded-2xl p-4 overflow-hidden border border-gray-800 shadow-lg">
                                            <div className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">Generated SQL</div>
                                            <code className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{selectedItem.sql_query || "No SQL generated"}</code>
                                        </div>
                                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 shadow-sm max-h-64 overflow-y-auto custom-scrollbar">
                                            <div className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-wider">AI Insights</div>
                                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedItem.explanation || "No insights available"}</div>
                                        </div>
                                    </div>

                                    {/* Data Visualization */}
                                    {selectedItem.rows_data && selectedItem.rows_data.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="h-[400px]">
                                                <ChartPanel data={selectedItem.rows_data} columns={selectedItem.columns} />
                                            </div>
                                            <div className="w-full">
                                                <DataTable columns={selectedItem.columns} rows={selectedItem.rows_data} />
                                            </div>
                                        </div>
                                    )}

                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Clock size={64} className="mb-6 text-gray-200" />
                                <h3 className="text-xl font-semibold mb-2 text-gray-700">Select a history item</h3>
                                <p className="text-center max-w-sm">Choose a past conversation from the list to view its generated SQL, charts, and insights.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
