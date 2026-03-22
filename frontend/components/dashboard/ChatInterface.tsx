import React, { useState, useEffect } from 'react';
import { Send, Eraser, Sparkles, ChevronDown, ChevronUp, Code, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ChatInterfaceProps {
    onSearch: (query: string) => void;
    isThinking?: boolean;
    generatedSql?: string | null;
    explanation?: string | null;
    initialQuery?: string;
    dbType?: string;
}

export const ChatInterface = ({ onSearch, isThinking = false, generatedSql, explanation, initialQuery = '', dbType = 'SQL' }: ChatInterfaceProps) => {
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
        }
    }, [initialQuery]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleClear = () => {
        setQuery('');
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-10 group-focus-within:opacity-30 transition duration-500 blur-lg"></div>
                    <div className="relative bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col md:flex-row items-stretch overflow-hidden border border-[var(--border-color)]">
                        <div className="flex-1 flex items-center p-2">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={dbType === 'redis' ? "Ask something like: List all keys..." : "Ask me anything about your data..."}
                                className="w-full h-14 md:h-16 px-6 py-4 text-base md:text-lg text-[var(--test-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none bg-transparent resize-none leading-relaxed font-medium"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-[var(--accent-glow)]/30 border-t md:border-t-0 md:border-l border-[var(--border-color)]">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                title="Clear"
                                className="text-[var(--text-secondary)] hover:text-red-500"
                            >
                                <Eraser size={18} />
                            </Button>
                            <Button
                                type="submit"
                                disabled={!query.trim() || isThinking}
                                className="h-10 md:h-12 px-6 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--accent-glow)] transition-all w-full md:w-auto font-bold"
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
        </div>
    );
};
