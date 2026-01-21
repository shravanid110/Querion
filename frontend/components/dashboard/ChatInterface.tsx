import React, { useState, useEffect } from 'react';
import { Send, Eraser, Sparkles, ChevronDown, ChevronUp, Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ChatInterfaceProps {
    onSearch: (query: string) => void;
    isThinking?: boolean;
    generatedSql?: string | null;
    explanation?: string | null;
}

export const ChatInterface = ({ onSearch, isThinking = false, generatedSql, explanation }: ChatInterfaceProps) => {
    const [query, setQuery] = useState('');
    const [showSql, setShowSql] = useState(false);

    // Auto-show SQL when valid one arrives
    useEffect(() => {
        if (generatedSql) setShowSql(true);
    }, [generatedSql]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleClear = () => {
        setQuery('');
        // We don't clear generatedSql here as that comes from parent
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-focus-within:opacity-40 transition duration-500 blur-md"></div>
                    <div className="relative bg-white rounded-xl shadow-xl shadow-indigo-100/50 flex flex-col md:flex-row items-stretch overflow-hidden border border-gray-100">
                        <div className="flex-1 flex items-center p-2">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask something like: Show total sales by region for last 6 months..."
                                className="w-full h-14 md:h-16 px-4 py-4 text-base md:text-lg text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent resize-none leading-relaxed"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                title="Clear"
                                className="text-gray-400 hover:text-red-500"
                            >
                                <Eraser size={18} />
                            </Button>
                            <Button
                                type="submit"
                                disabled={!query.trim() || isThinking}
                                className="h-10 md:h-12 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all w-full md:w-auto"
                            >
                                {isThinking ? (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="animate-spin" size={18} />
                                        <span>Thinking...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Send size={18} />
                                        <span>Ask Query</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            <AnimatePresence>
                {(generatedSql || explanation) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-2"
                    >
                        {explanation && (
                            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded-lg text-sm">
                                <span className="font-semibold">AI Analysis: </span>{explanation}
                            </div>
                        )}

                        {generatedSql && (
                            <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
                                <div
                                    onClick={() => setShowSql(!showSql)}
                                    className="flex items-center justify-between px-4 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                        <Code size={14} className="text-indigo-400" />
                                        <span>Generated SQL</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            className="text-gray-400 hover:text-white transition-colors"
                                            title="Copy SQL"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(generatedSql);
                                            }}
                                        >
                                            <Copy size={14} />
                                        </button>
                                        {showSql ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </div>
                                {showSql && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-4 overflow-x-auto"
                                    >
                                        <pre className="font-mono text-sm text-blue-300">
                                            <code>{generatedSql}</code>
                                        </pre>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
