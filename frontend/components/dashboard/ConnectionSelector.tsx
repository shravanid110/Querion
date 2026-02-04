import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnections, deleteConnection } from '@/services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Connection {
    id: string;
    name: string;
    host: string;
}

interface ConnectionSelectorProps {
    onSelect: (connection: Connection) => void;
}

export const ConnectionSelector = ({ onSelect }: ConnectionSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selected, setSelected] = useState<Connection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const data = await getConnections();
                setConnections(data);
                if (data.length > 0) {
                    setSelected(data[0]);
                    onSelect(data[0]);
                }
            } catch (error) {
                console.error("Failed to load connections", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConnections();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSelect = (conn: Connection) => {
        setSelected(conn);
        onSelect(conn);
        setIsOpen(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this connection?')) {
            try {
                await deleteConnection(id);
                setConnections(prev => prev.filter(c => c.id !== id));
                // If we deleted the selected one, select another or null
                if (selected?.id === id) {
                    const remaining = connections.filter(c => c.id !== id);
                    if (remaining.length > 0) {
                        setSelected(remaining[0]);
                        onSelect(remaining[0]);
                    } else {
                        setSelected(null);
                        // Force navigating back to create page if no connections left?
                        // Just clearing state is safer for now.
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

    if (!selected) return (
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-medium px-4 py-2 border border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50">
            <Plus size={16} />
            <span>Connect Database</span>
        </Link>
    );

    return (
        <div className="relative z-30">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-white border border-gray-200 hover:border-indigo-300 rounded-xl px-4 py-2.5 transition-all duration-200 shadow-sm hover:shadow-md min-w-[240px] justify-between group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{selected.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[140px]">{selected.host}</p>
                    </div>
                </div>
                <ChevronDown size={16} className={cn("text-gray-400 transition-transform", isOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden"
                    >
                        <div className="py-1 max-h-[300px] overflow-y-auto">
                            {connections.map((conn) => (
                                <div
                                    key={conn.id}
                                    onClick={() => handleSelect(conn)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer group/item"
                                >
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <Database size={16} className="text-gray-400 shrink-0" />
                                        <div className="text-left overflow-hidden">
                                            <p className={cn("text-sm font-medium truncate", conn.id === selected.id ? "text-indigo-600" : "text-gray-700")}>
                                                {conn.name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{conn.host}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {conn.id === selected.id && <CheckCircle2 size={14} className="text-green-500" />}
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
                            <Link href="/" className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 w-full py-1">
                                <Plus size={12} />
                                Add New Connection
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
