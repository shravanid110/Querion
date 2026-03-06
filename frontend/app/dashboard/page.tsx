"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { ConnectionSelector } from '@/components/dashboard/ConnectionSelector';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { DataTable } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Users, DollarSign, ShoppingCart, Calendar, Database, AlertCircle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { runQuery } from '@/services/api';

export default function DashboardPage() {
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [selectedConnectionName, setSelectedConnectionName] = useState<string | null>(null);
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

    const [result, setResult] = useState<QueryResult | null>(null);

    const handleSearch = async (prompt: string) => {
        if (!selectedConnectionId) {
            setError("Please select a database connection first.");
            return;
        }

        setIsThinking(true);
        setError(null);
        setResult(null);

        try {
            const data = await runQuery(selectedConnectionId, prompt);
            setResult(data);
        } catch (err: any) {
            console.error("Query failed", err);
            setError(err.response?.data?.error || err.message || "Failed to execute query.");
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar connectionName={selectedConnectionName} />

            <div className="flex pt-16 h-screen overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 ml-64 p-8 overflow-y-auto pb-24 scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* Top Bar: Title & Connection Selector */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedConnectionId ? "Ready to query." : "Select a connection to start."}
                                </p>
                            </div>
                            <ConnectionSelector onSelect={(conn) => {
                                setSelectedConnectionId(conn.id);
                                setSelectedConnectionName(conn.name);
                            }} />
                        </div>

                        {/* Chat Interface */}
                        <div className="py-4">
                            <ChatInterface
                                onSearch={handleSearch}
                                isThinking={isThinking}
                                generatedSql={result?.sql}
                                explanation={result?.explanation}
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-center gap-2">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Results Section */}
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="space-y-8"
                            >
                                {/* Metrics Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <MetricCard
                                        label="Total Rows"
                                        value={result.metrics.totalRows.toLocaleString()}
                                        icon={Database}
                                        color="indigo"
                                    />
                                    <MetricCard
                                        label="Total Value (Approx)"
                                        value={result.metrics.approxSum > 0 ? result.metrics.approxSum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
                                        icon={DollarSign}
                                        color="emerald"
                                        subValue="Sum of first numeric column"
                                    />
                                    {/* Placeholder metrics as real dynamic metrics require deeper analysis */}
                                    <MetricCard
                                        label="Columns"
                                        value={result.columns.length.toString()}
                                        icon={LayoutDashboard}
                                        color="blue"
                                    />
                                    <MetricCard
                                        label="Query Status"
                                        value="Success"
                                        icon={Calendar} // Using generic icon
                                        color="violet"
                                        trend="up"
                                        trendValue="100%"
                                    />
                                </div>

                                {/* Chart and Table Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 h-[450px]">
                                        <ChartPanel data={result.rows} columns={result.columns} />
                                    </div>
                                    <div className="lg:col-span-1 min-h-[450px]">
                                        <Card className="h-full border-0 shadow-lg shadow-gray-100 flex flex-col p-0 overflow-hidden">
                                            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-indigo-50/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                                        <LayoutDashboard size={20} />
                                                    </div>
                                                    <h3 className="font-bold text-gray-900 tracking-tight">AI Insights & Summary</h3>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600"
                                                    onClick={() => navigator.clipboard.writeText(result.explanation || "")}
                                                >
                                                    <Copy size={16} />
                                                </Button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                                                    {result.explanation || "No insights generated for this query."}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest font-semibold">
                                                Generated by Querion AI
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                <div className="w-full">
                                    <DataTable columns={result.columns} rows={result.rows} />
                                </div>
                            </motion.div>
                        )}

                        {!result && !isThinking && !error && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <LayoutDashboard size={48} className="mb-4 text-gray-200" />
                                <p className="text-lg font-medium">No query results yet</p>
                                <p className="text-sm">Ask a question above to see data visualization.</p>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}
