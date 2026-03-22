"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { listSavedReports, downloadSavedReport, deleteSavedReport } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileBarChart, Download, Trash2, Loader2,
    FileText, Calendar, HardDrive, Search, RefreshCcw
} from 'lucide-react';

interface ReportMeta {
    filename: string;
    report_id: string;
    created_at: string;
    size_kb: number;
}

export default function SavedReportsPage() {
    const [reports, setReports] = useState<ReportMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchReports = async () => {
        setLoading(true);
        try {
            const data = await listSavedReports();
            setReports(data);
        } catch (e) {
            console.error('Failed to load reports:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete report ${filename}?`)) return;
        setDeleting(filename);
        try {
            await deleteSavedReport(filename);
            setReports(prev => prev.filter(r => r.filename !== filename));
        } catch (e: any) {
            alert('Delete failed: ' + e.message);
        } finally {
            setDeleting(null);
        }
    };

    const filtered = reports.filter(r =>
        r.report_id.toLowerCase().includes(search.toLowerCase()) ||
        r.created_at.includes(search)
    );

    return (
        <div className="min-h-screen bg-[var(--bg-main)] flex flex-col font-sans">
            <Navbar connectionName={null} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />

                <main className="flex-1 ml-64 overflow-y-auto custom-scrollbar p-8 pb-24">
                    {/* Header */}
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-400">
                                    Saved Reports
                                </h1>
                                <p className="text-sm text-[var(--text-secondary)] mt-1 uppercase tracking-widest font-medium opacity-70">
                                    {reports.length} AI-generated report{reports.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={fetchReports}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
                            >
                                <RefreshCcw size={15} />
                                Refresh
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-6">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by report ID or date..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 text-sm"
                            />
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                                <Loader2 size={36} className="animate-spin mb-4 text-indigo-500" />
                                <p className="text-sm font-medium">Loading saved reports...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-slate-500 text-center">
                                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                                    <FileBarChart size={40} className="text-indigo-400 opacity-50" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">No Reports Found</h2>
                                <p className="text-sm max-w-sm opacity-70 leading-relaxed">
                                    Run a query on the dashboard and click <strong className="text-indigo-400">Report</strong> to generate your first AI-powered PDF report.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                <AnimatePresence>
                                    {filtered.map((report, i) => (
                                        <motion.div
                                            key={report.filename}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="group relative bg-[var(--bg-card)] border border-white/8 rounded-2xl p-6 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Ambient glow */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                                            {/* Icon */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                                    <FileText size={22} />
                                                </div>
                                                <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                                    PDF
                                                </span>
                                            </div>

                                            {/* Report info */}
                                            <h3 className="text-sm font-bold text-white mb-1 font-mono">
                                                Report_{report.report_id}
                                            </h3>

                                            <div className="space-y-1.5 mb-5">
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Calendar size={12} className="text-slate-500" />
                                                    {report.created_at}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <HardDrive size={12} className="text-slate-500" />
                                                    {report.size_kb} KB
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={downloadSavedReport(report.filename)}
                                                    download={report.filename}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                                                >
                                                    <Download size={14} />
                                                    Download
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(report.filename)}
                                                    disabled={deleting === report.filename}
                                                    className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-50"
                                                >
                                                    {deleting === report.filename
                                                        ? <Loader2 size={14} className="animate-spin" />
                                                        : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
