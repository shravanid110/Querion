"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Database, CheckCircle2, ChevronDown, Plus, Trash2, Lock, Eye, EyeOff, Unlock, AlertCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnections, deleteConnection, verifyMasterPassword } from '@/services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Connection {
    id: string;
    name: string;
    host: string;
    database?: string;
    port?: number;
}

interface ConnectionSelectorProps {
    onSelect: (connection: any) => void;
}

// ─── Master Password Modal ────────────────────────────────────────────────────
function MasterPasswordModal({
    connection,
    onVerified,
    onCancel,
}: {
    connection: Connection;
    onVerified: (data: any) => void;
    onCancel: () => void;
}) {
    const [masterPw, setMasterPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleVerify = async () => {
        if (!masterPw.trim()) {
            setError('Please enter your master password.');
            return;
        }
        setIsVerifying(true);
        setError('');
        try {
            const data = await verifyMasterPassword(connection.id, masterPw);
            if (data.success) {
                onVerified(data);
            }
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Invalid master password. Please try again.';
            setError(msg);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Lock size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Unlock Connection</h3>
                                <p className="text-indigo-200 text-xs mt-0.5">Secure credential verification</p>
                            </div>
                        </div>
                        <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Connection info */}
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <Database size={18} className="text-indigo-500 shrink-0" />
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gray-900 truncate">{connection.name}</p>
                            <p className="text-xs text-gray-500 truncate">{connection.host}</p>
                        </div>
                    </div>

                    {/* Master Password Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Unlock size={12} />
                            Master Password
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type={showPw ? 'text' : 'password'}
                                value={masterPw}
                                onChange={(e) => { setMasterPw(e.target.value); setError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); if (e.key === 'Escape') onCancel(); }}
                                placeholder="Enter your master password"
                                className="w-full bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm"
                            >
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || !masterPw.trim()}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                            {isVerifying ? (
                                <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                            ) : (
                                <><Unlock size={16} /> Unlock & Connect</>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                        AES-256 Secure Credential Sync
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Connection Selector ──────────────────────────────────────────────────────
export const ConnectionSelector = ({ onSelect }: ConnectionSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selected, setSelected] = useState<Connection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingConn, setPendingConn] = useState<Connection | null>(null); // waiting for password
    const router = useRouter();

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const data = await getConnections();
                setConnections(data);
                // Do NOT auto-select — user must verify password first
            } catch (error) {
                console.error("Failed to load connections", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConnections();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // When user clicks a connection — show the password modal
    const handleConnectionClick = (conn: Connection) => {
        setPendingConn(conn);
        setIsOpen(false);
    };

    // After password is verified → unlock & activate the connection
    const handleVerified = (data: any) => {
        if (!pendingConn) return;
        const enriched = {
            ...pendingConn,
            // Override with decrypted credentials from backend
            db_password: data.db_password,
            username: data.username,
            host: data.host,
            port: data.port,
            database: data.database,
        };
        setSelected(pendingConn);
        onSelect(enriched);
        setPendingConn(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this connection?')) {
            try {
                await deleteConnection(id);
                setConnections(prev => prev.filter(c => c.id !== id));
                if (selected?.id === id) {
                    const remaining = connections.filter(c => c.id !== id);
                    if (remaining.length > 0) {
                        setSelected(remaining[0]);
                        onSelect(remaining[0]);
                    } else {
                        setSelected(null);
                        router.refresh();
                    }
                }
            } catch (err) {
                console.error("Failed to delete connection", err);
                alert("Failed to delete connection.");
            }
        }
    };

    if (isLoading) return <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-xl" />;

    if (connections.length === 0) return (
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-medium px-4 py-2 border border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50">
            <Plus size={16} />
            <span>Connect Database</span>
        </Link>
    );

    return (
        <>
            <div className="relative z-30">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 bg-white border border-gray-200 hover:border-indigo-300 rounded-xl px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md min-w-[240px] justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            selected
                                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                                : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        )} />
                        <div className="text-left">
                            {selected ? (
                                <>
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{selected.name}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{selected.host}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-amber-600">Select Database</p>
                                    <p className="text-xs text-gray-400">No connection active</p>
                                </>
                            )}
                        </div>
                    </div>
                    <ChevronDown size={16} className={cn("text-gray-400 transition-transform", isOpen ? "rotate-180" : "")} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Click outside backdrop */}
                            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-2 w-[300px] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden z-30"
                            >
                                {/* Header */}
                                <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Lock size={11} />
                                        Password-Protected Connections
                                    </p>
                                </div>

                                <div className="py-1 max-h-[300px] overflow-y-auto">
                                    {connections.map((conn) => (
                                        <div
                                            key={conn.id}
                                            onClick={() => handleConnectionClick(conn)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 transition-colors border-b border-gray-50 last:border-0 cursor-pointer group/item",
                                                conn.id === selected?.id
                                                    ? "bg-indigo-50 hover:bg-indigo-100"
                                                    : "hover:bg-gray-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                <div className={cn(
                                                    "p-1.5 rounded-lg shrink-0",
                                                    conn.id === selected?.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                                                )}>
                                                    <Database size={14} />
                                                </div>
                                                <div className="text-left overflow-hidden">
                                                    <p className={cn("text-sm font-medium truncate", conn.id === selected?.id ? "text-indigo-600" : "text-gray-700")}>
                                                        {conn.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{conn.host}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {conn.id === selected?.id
                                                    ? <CheckCircle2 size={14} className="text-green-500" />
                                                    : <Lock size={12} className="text-gray-300 group-hover/item:text-indigo-400 transition-colors" />
                                                }
                                                <button
                                                    onClick={(e) => handleDelete(e, conn.id)}
                                                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 opacity-0 group-hover/item:opacity-100 transition-all"
                                                    title="Delete Connection"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-50 p-2 border-t border-gray-100 text-center">
                                    <Link
                                        href="/database-selection"
                                        className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 w-full py-1"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Plus size={12} />
                                        Add New Connection
                                    </Link>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Master Password Modal */}
            <AnimatePresence>
                {pendingConn && (
                    <MasterPasswordModal
                        connection={pendingConn}
                        onVerified={handleVerified}
                        onCancel={() => setPendingConn(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
