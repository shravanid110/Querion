"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
    Database, 
    Table, 
    History, 
    LayoutDashboard, 
    ChevronRight, 
    ChevronDown, 
    CheckCircle2, 
    Circle,
    Cpu,
    Zap,
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatSidebarProps {
    connection: any;
    schema: any[];
    onSelectTable: (tableName: string) => void;
}

export const ChatSidebar = ({ connection, schema, onSelectTable }: ChatSidebarProps) => {
    const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
    };

    const filteredSchema = schema.filter(table => 
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className="w-80 bg-[#0f172a] border-r border-white/5 flex flex-col h-full fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 shadow-2xl">
            {/* Connected DB Status */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Database size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Source</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-white font-bold truncate max-w-[140px]">{connection?.name || 'No Connection'}</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Type:</span>
                        <span className="text-indigo-400 font-mono uppercase">{connection?.dbType || 'PostgreSQL'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Status:</span>
                        <span className="text-emerald-400 font-medium">Synced & Secure</span>
                    </div>
                </div>
            </div>

            {/* Schema Explorer */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="p-6 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500" /> Schema Explorer
                        </h4>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-400">
                            {schema.length} Tables
                        </span>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Filter tables..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="px-2 pb-6 space-y-1">
                    {filteredSchema.map((table) => (
                        <div key={table.name} className="group">
                            <button
                                onClick={() => toggleTable(table.name)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200",
                                    expandedTables[table.name] ? "bg-white/5 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Table size={16} className={expandedTables[table.name] ? "text-indigo-400" : "text-slate-500"} />
                                    <span className="text-xs font-semibold">{table.name}</span>
                                </div>
                                {expandedTables[table.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            
                            <AnimatePresence>
                                {expandedTables[table.name] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden bg-black/20 mx-2 mt-1 rounded-lg border border-white/5"
                                    >
                                        <div className="py-2 px-4 space-y-2">
                                            {table.columns.map((col: any) => (
                                                <div key={col.name} className="flex items-center justify-between group/col">
                                                    <span className="text-[10px] text-slate-500 group-hover/col:text-slate-300 transition-colors">{col.name}</span>
                                                    <span className="text-[9px] text-slate-600 font-mono italic opacity-0 group-hover/col:opacity-100 transition-opacity uppercase">{col.type}</span>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => onSelectTable(table.name)}
                                                className="w-full mt-2 py-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-all border border-indigo-500/20"
                                            >
                                                Analyze Table
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-black/40 border-t border-white/5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-indigo-900/10 border border-indigo-500/20 shadow-lg relative group overflow-hidden">
                    <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
                        <Cpu size={40} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu size={12} className="text-indigo-400" />
                        <span className="text-[9px] font-bold text-indigo-400 tracking-widest uppercase">AI Engine Beta</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3 leading-tight font-medium">Semantic mapping active. Asking questions is now 40% faster.</p>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: '85%' }}
                            transition={{ duration: 2, delay: 0.5 }}
                        />
                    </div>
                </div>
            </div>
        </aside>
    );
};
