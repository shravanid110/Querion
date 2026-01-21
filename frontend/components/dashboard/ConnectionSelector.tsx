import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { getConnections } from '@/services/api';
import Link from 'next/link';

interface Connection {
    id: string;
    name: string;
    host: string;
    // We assume backend returns valid logic connections. Frontend status tracking is tricky without websockets,
    // so we'll assume "connected" if it exists for now, or just show blue.
}

interface ConnectionSelectorProps {
    onSelect: (connection: Connection) => void;
}

export const ConnectionSelector = ({ onSelect }: ConnectionSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selected, setSelected] = useState<Connection | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                                <button
                                    key={conn.id}
                                    onClick={() => handleSelect(conn)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <Database size={16} className="text-gray-400" />
                                        <div className="text-left">
                                            <p className={cn("text-sm font-medium", conn.id === selected.id ? "text-indigo-600" : "text-gray-700")}>
                                                {conn.name}
                                            </p>
                                            <p className="text-xs text-gray-500">{conn.host}</p>
                                        </div>
                                    </div>
                                    {conn.id === selected.id && <CheckCircle2 size={14} className="text-green-500" />}
                                </button>
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
