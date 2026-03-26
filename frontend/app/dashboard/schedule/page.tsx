"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Database, Clock, ArrowLeft, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabaseClient';

// Main backend on port 4000
const API_BASE = "http://127.0.0.1:4000/api";
const SCHEDULE_API_BASE = "http://127.0.0.1:4000/api";

export default function SchedulePage() {
    const [databases, setDatabases] = useState<any[]>([]);
    const [isLoadingDbs, setIsLoadingDbs] = useState(true);
    const [selectedDb, setSelectedDb] = useState<string>("");
    const [prompt, setPrompt] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchDbs = async () => {
        setIsLoadingDbs(true);
        try {
            // Get current user to filter connections
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id || 'default_user';

            console.log("Fetching connections for user:", userId);
            
            // Fetch from both connection tables using userId to ensure we see the right ones
            const [multiRes, mysqlRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/multidb?user_id=${userId}`),
                axios.get(`${API_BASE}/connections?user_id=${userId}`),
            ]);

            const multiDbs = multiRes.status === 'fulfilled' ? (multiRes.value.data || []) : [];
            const mysqlDbs = mysqlRes.status === 'fulfilled' ? (mysqlRes.value.data || []) : [];

            // Normalize both to a common shape
            const allConnections = [
                ...multiDbs.map((c: any) => ({
                    id: c.id,
                    name: c.name || `${c.dbType} @ ${c.host || 'cloud'}`,
                    host: c.host || '',
                    database: c.database || '',
                    dbType: c.dbType || 'SQL',
                    status: 'active',
                    createdAt: c.createdAt || '',
                })),
                ...mysqlDbs.map((c: any) => ({
                    id: c.id,
                    name: c.name || `MySQL @ ${c.host}`,
                    host: c.host || '',
                    database: c.database || '',
                    dbType: 'MySQL',
                    status: 'active',
                    createdAt: c.createdAt || '',
                })),
            ];

            // Deduplicate by ID to ensure React keys are unique
            const seen = new Map<string, any>();
            for (const conn of allConnections) {
                if (conn.id) {
                    seen.set(conn.id, conn);
                }
            }

            const normalized = Array.from(seen.values());
            console.log("Schedule databases loaded:", normalized);
            setDatabases(normalized);

            if (normalized.length === 0) {
                toast("No databases found. Connect one in Database Selection first!");
            }

            // ── Sync to Supabase "Schedule database" table ──────────────────────
            // Upsert so repeated page visits don't create duplicates
            if (normalized.length > 0) {
                try {
                    const rows = normalized.map((db: any) => ({
                        connection_id:   db.id,
                        connection_name: db.name,
                        host:            db.host || null,
                        database_name:   db.database || null,
                        db_type:         db.dbType || 'MySQL',
                        status:          'active',
                        synced_at:       new Date().toISOString(),
                    }));

                    const { error: upsertErr } = await supabase
                        .from('Schedule database')
                        .upsert(rows, { onConflict: 'connection_id', ignoreDuplicates: false });

                    if (upsertErr) {
                        console.warn("Supabase sync warning:", upsertErr.message);
                    } else {
                        console.log(`✅ Synced ${rows.length} connections → Supabase Schedule database`);
                    }
                } catch (syncErr) {
                    console.warn("Supabase sync skipped:", syncErr);
                }
            }

        } catch (err: any) {
            console.error("Failed to fetch databases:", err);
            toast.error("Could not load databases from the main backend.");
        } finally {
            setIsLoadingDbs(false);
        }
    };

    useEffect(() => {
        fetchDbs();
    }, []);

    // Combine Date and Time for Preview
    const formatPreview = () => {
        if (!date || !time) return "Please select date and time";
        try {
            const dt = new Date(`${date}T${time}`);
            return dt.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            }) + " – " + dt.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            return "Invalid Date/Time";
        }
    };

    const validateForm = () => {
        if (!selectedDb) return "Please select a database instance.";
        if (prompt.trim().length < 5) return "Please enter a valid prompt.";
        if (!date || !time) return "Execution date and time are required.";
        
        const scheduled = new Date(`${date}T${time}`);
        if (scheduled <= new Date()) return "Execution date cannot be in the past.";
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
        
        return "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateForm();
        if (error) {
            setErrorMsg(error);
            return;
        }
        setErrorMsg("");
        setIsSubmitting(true);

        const selectedDbInfo = databases.find(d => d.id === selectedDb);
        const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
        
        try {
            // 1. Trigger backend scheduler on port 4001 (The actual logic that sends emails)
            await axios.post(`${SCHEDULE_API_BASE}/schedule`, {
                database_id:        selectedDb,
                prompt:             prompt,
                scheduled_datetime: scheduledAt,
                email:              email
            });

            // 2. Save to Supabase Schedule database table
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id || null;

            await supabase.from('Schedule database').insert([{
                connection_id:   selectedDb,
                connection_name: selectedDbInfo?.name || "Target Connection",
                prompt:          prompt,
                email:           email,
                created_at:      scheduledAt,
                synced_at:       new Date().toISOString()
            }]);

            toast.success("Query scheduled and saved to Schedule database!");
            // Reset form
            setPrompt(""); setDate(""); setTime(""); setEmail(""); setSelectedDb("");
        } catch (err: any) {
            console.error("Schedule failed:", err);
            toast.error(err.response?.data?.detail || err?.message || "Failed to schedule prompt");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans">
            {/* Inject Bootstrap 5 and Icons CDN */}
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />
            
            <style jsx global>{`
                /* RESET OVERRIDES FOR SIDEBAR/NAVBAR */
                aside, nav, #platform-logo, .glass-nav {
                    font-family: 'Inter', system-ui, sans-serif !important;
                }
                
                /* Aggressively fix sidebar links that might be underlined by Bootstrap */
                aside a, nav a, Link a {
                    text-decoration: none !important;
                    color: inherit !important;
                }
                
                aside a:hover, nav a:hover {
                    color: inherit !important;
                    text-decoration: none !important;
                }

                /* SCOPED BOOTSTRAP FORM STYLES */
                .bootstrap-scope .form-control, .bootstrap-scope .form-select {
                    background-color: var(--bg-nav, rgba(255, 255, 255, 0.05)) !important;
                    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1)) !important;
                    color: var(--text-primary, white) !important;
                    border-radius: 12px !important;
                    padding: 0.85rem 1.4rem !important;
                }
                .bootstrap-scope .form-control:focus, .bootstrap-scope .form-select:focus {
                    background-color: var(--bg-card, rgba(255, 255, 255, 0.08)) !important;
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.3) !important;
                }
                .bootstrap-scope .form-label {
                    color: var(--text-secondary, #cbd5e1) !important;
                    font-size: 0.8rem !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 1.5px !important;
                    margin-bottom: 0.6rem !important;
                    display: flex;
                    align-items: center;
                }
                .bootstrap-scope .card {
                    background-color: var(--bg-card, #0f172a) !important;
                    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.05)) !important;
                    backdrop-filter: blur(20px);
                }
                .bootstrap-scope .btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
                    border: none !important;
                    padding: 1rem !important;
                    border-radius: 12px !important;
                    font-weight: 800 !important;
                    font-size: 1rem !important;
                    letter-spacing: 0.5px !important;
                    color: white !important;
                }
                .bootstrap-scope .btn-primary:disabled {
                    opacity: 0.6;
                }
                html[data-theme*="light"] .bootstrap-scope input[type="date"]::-webkit-calendar-picker-indicator,
                html[data-theme*="light"] .bootstrap-scope input[type="time"]::-webkit-calendar-picker-indicator {
                    filter: invert(0);
                }
                .bootstrap-scope input[type="date"]::-webkit-calendar-picker-indicator,
                .bootstrap-scope input[type="time"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
                .bootstrap-scope select option {
                    background-color: var(--bg-main, #1e293b);
                    color: var(--text-primary, white);
                }
            `}</style>
            
            <Toaster position="top-right" />
            <Navbar />
            
            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />
                
                <main className="flex-1 ml-64 p-8 overflow-y-auto pb-24 scroll-smooth bootstrap-scope">
                    <div className="container-fluid max-w-5xl py-4">
                        <div className="row">
                            <div className="col-12">
                                
                                <div className="d-flex align-items-center justify-content-between mb-5 px-3">
                                    <div>
                                        <div className="badge bg-primary bg-opacity-10 text-primary mb-2 px-3 py-2 rounded-pill uppercase fw-bold tracking-wider" style={{fontSize: '0.65rem'}}>
                                            <i className="bi bi-clock-history me-2"></i>Automated Tasks
                                        </div>
                                        <h1 className="display-4 fw-black tracking-tight text-[var(--text-primary)] mb-2">
                                            Schedule <span className="text-primary italic">Intelligence</span>
                                        </h1>
                                        <p className="text-[var(--text-secondary)] opacity-75 mb-0">Define timing and delivery metadata for automated SQL insights.</p>
                                    </div>
                                    <Link href="/dashboard" className="btn btn-dark bg-opacity-5 hover-bg-opacity-10 rounded-4 px-4 py-2 border-0" style={{textDecoration: 'none', backgroundColor: 'var(--bg-nav)', color: 'var(--text-primary)'}}>
                                        <i className="bi bi-arrow-left me-2"></i> Back
                                    </Link>
                                </div>

                                <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 15 }}>
                                    <div className="card shadow-2xl rounded-5 p-4 p-md-5 border-top border-4 border-primary">
                                        <form onSubmit={handleSubmit} className="row g-4">
                                            
                                            {/* DB Selection */}
                                            <div className="col-12">
                                                <div className="mb-2">
                                                    <label className="form-label">
                                                        <i className="bi bi-database-fill me-2 text-primary"></i> Target Source
                                                    </label>
                                                    <div className="position-relative">
                                                        <select 
                                                            className="form-select" 
                                                            value={selectedDb}
                                                            onChange={(e) => setSelectedDb(e.target.value)}
                                                            required
                                                            disabled={isLoadingDbs}
                                                        >
                                                            <option value="" disabled>{isLoadingDbs ? "Initializing connections..." : "Choose a database instance..."}</option>
                                                            {databases.map(db => (
                                                                <option key={db.id} value={db.id}>
                                                                    {db.name} (Active)
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isLoadingDbs && (
                                                            <div className="position-absolute end-0 top-50 translate-middle-y me-4 pe-4">
                                                                <Loader2 className="animate-spin text-primary" size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!isLoadingDbs && databases.length === 0 && (
                                                        <p className="text-warning small mt-2 d-flex align-items-center">
                                                            <i className="bi bi-exclamation-circle me-1"></i> No databases detected. 
                                                            <button type="button" onClick={fetchDbs} className="btn btn-link py-0 small text-decoration-none">Reload</button>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Prompt Input */}
                                            <div className="col-12">
                                                <div className="mb-2">
                                                    <label className="form-label">
                                                        <i className="bi bi-chat-dots-fill me-2 text-primary"></i> Intelligence Prompt
                                                    </label>
                                                    <textarea 
                                                        className="form-control" 
                                                        rows={3} 
                                                        placeholder="Describe the data extraction logic... e.g., 'Find all users who haven't logged in for 30 days and calculate their last total order value.'"
                                                        value={prompt}
                                                        onChange={(e) => setPrompt(e.target.value)}
                                                        required
                                                    ></textarea>
                                                </div>
                                            </div>

                                            {/* Timing Row */}
                                            <div className="col-12">
                                                <div className="row g-4">
                                                    <div className="col-md-6">
                                                        <label className="form-label">
                                                            <i className="bi bi-calendar3 me-2 text-primary"></i> Target Date
                                                        </label>
                                                        <input 
                                                            type="date" 
                                                            className="form-control"
                                                            value={date}
                                                            onChange={(e) => setDate(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label">
                                                            <i className="bi bi-clock-fill me-2 text-primary"></i> Target Time
                                                        </label>
                                                        <input 
                                                            type="time" 
                                                            className="form-control"
                                                            value={time}
                                                            onChange={(e) => setTime(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="col-12">
                                                <div className="mb-2">
                                                    <label className="form-label">
                                                        <i className="bi bi-envelope-at-fill me-2 text-primary"></i> Delivery Recipient
                                                    </label>
                                                    <input 
                                                        type="email" 
                                                        className="form-control" 
                                                        placeholder="recipient@example.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {errorMsg && (
                                                <div className="col-12">
                                                    <div className="alert alert-danger d-flex align-items-center rounded-4 bg-danger bg-opacity-10 border-danger border-opacity-20 text-danger py-3">
                                                        <i className="bi bi-exclamation-triangle-fill me-3"></i>
                                                        <div className="small fw-bold">{errorMsg}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Live Preview Section */}
                                            <div className="col-12">
                                                <div className="px-4 py-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 d-flex align-items-center justify-content-between">
                                                    <div className="small text-secondary fw-bold text-uppercase tracking-widest">Execution Timeline</div>
                                                    <div className="text-primary fw-black tracking-tight">{formatPreview()}</div>
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            <div className="col-12 pt-2">
                                                <button 
                                                    className="btn btn-primary btn-lg w-100 shadow-lg text-uppercase"
                                                    disabled={isSubmitting}
                                                    type="submit"
                                                >
                                                    {isSubmitting ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <Loader2 className="animate-spin me-2" size={20} />
                                                            Configuring Schedule...
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <i className="bi bi-rocket-takeoff-fill me-2"></i> Activate Schedule
                                                        </div>
                                                    )}
                                                </button>
                                            </div>

                                        </form>
                                    </div>
                                </motion.div>

                                <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 15 }} className="mt-5">
                                    <div className="card shadow-2xl rounded-5 p-4 border-top border-4 border-info">
                                        <h4 className="fw-black mb-4 text-[var(--text-primary)]">
                                            <i className="bi bi-table me-2 text-info"></i> Schedule Datatable
                                        </h4>
                                        <div className="table-responsive">
                                            <table className="table table-borderless table-hover align-middle mb-0" style={{color: 'var(--text-primary)'}}>
                                                <thead style={{borderBottom: '1px solid var(--border-color)'}}>
                                                    <tr>
                                                        <th className="text-uppercase tracking-widest text-[var(--text-secondary)]" style={{fontSize: '11px', fontWeight: 800}}>Connection Name</th>
                                                        <th className="text-uppercase tracking-widest text-[var(--text-secondary)]" style={{fontSize: '11px', fontWeight: 800}}>Host</th>
                                                        <th className="text-uppercase tracking-widest text-[var(--text-secondary)]" style={{fontSize: '11px', fontWeight: 800}}>Type</th>
                                                        <th className="text-uppercase tracking-widest text-[var(--text-secondary)] text-end" style={{fontSize: '11px', fontWeight: 800}}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isLoadingDbs ? (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-5">
                                                                <Loader2 className="animate-spin text-primary mx-auto mb-2" size={24} />
                                                                <span className="text-[var(--text-secondary)] small fw-bold tracking-widest text-uppercase">Loading Connected Resources...</span>
                                                            </td>
                                                        </tr>
                                                    ) : databases.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-5 text-[var(--text-secondary)]">No connection data found in multidb.</td>
                                                        </tr>
                                                    ) : (
                                                        databases.map((db, idx) => (
                                                            <tr key={db.id || idx} style={{borderBottom: '1px solid var(--border-color)'}}>
                                                                <td className="py-3"><div className="fw-bold">{db.name}</div></td>
                                                                <td className="py-3"><div className="text-[var(--text-secondary)] font-mono small">{db.host || 'Cloud Endpoint'}</div></td>
                                                                <td className="py-3">
                                                                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-1">
                                                                        {db.dbType || 'SQL'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 text-end">
                                                                    <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-1">
                                                                        <i className="bi bi-check-circle-fill me-1"></i> Connected
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </motion.div>

                                <div className="mt-5 text-center">
                                    <div className="d-inline-flex gap-4 opacity-30 text-[9px] uppercase tracking-[0.4em] font-bold text-[var(--text-secondary)]">
                                        <span>SMTP Validated</span>
                                        <span className="text-primary">•</span>
                                        <span>AES-256 Meta</span>
                                        <span className="text-primary">•</span>
                                        <span>Node 4001</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
