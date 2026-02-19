import React, { useRef, useEffect, useState } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const renderChart = (chartData: any) => {
    if (!chartData || !chartData.data) return null;

    const CommonTooltip = () => (
        <Tooltip
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        />
    );

    switch (chartData.type) {
        case 'bar':
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <CommonTooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} name={chartData.yAxisLabel || 'Value'} />
                    </BarChart>
                </ResponsiveContainer>
            );
        case 'line':
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.data}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <CommonTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={chartData.yAxisLabel || 'Value'} />
                    </LineChart>
                </ResponsiveContainer>
            );
        case 'pie':
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <CommonTooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            );
        default:
            return <p className="text-gray-500 italic">Unsupported chart type</p>;
    }
};

const MessageContent = ({ content }: { content: string }) => {
    // Try to parse as JSON chart data
    try {
        let cleanContent = content.trim();
        // Remove markdown code blocks if present
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '').trim();
        }

        if (cleanContent.startsWith('{') && cleanContent.includes('"isChart": true')) {
            const chartData = JSON.parse(cleanContent);
            return (
                <div className="w-full mt-2 mb-2">
                    <p className="font-semibold text-gray-800 mb-2">{chartData.title}</p>
                    <div className="w-full bg-white p-2 rounded-lg border border-gray-100 mb-2">
                        {renderChart(chartData)}
                    </div>
                    <p className="text-sm text-gray-600 italic border-l-2 border-indigo-200 pl-2">
                        AI Insight: {chartData.explanation}
                    </p>
                </div>
            );
        }
    } catch (e) {
        // Not valid JSON, ignore and render text
    }

    return <p className="whitespace-pre-wrap">{content}</p>;
};

export interface Message {
    role: 'user' | 'ai';
    content: string;
}

interface UrlChatInterfaceProps {
    messages: Message[];
    onSend: (msg: string) => void;
    loading: boolean;
    className?: string; // for custom styling
}

export const UrlChatInterface: React.FC<UrlChatInterfaceProps> = ({ messages, onSend, loading, className }) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !loading) {
            onSend(input);
            setInput('');
        }
    };

    return (
        <div className={`flex flex-col h-[600px] w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-gray-50/50"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-60">
                        <Bot size={48} className="mb-4 text-emerald-300" />
                        <p className="text-lg font-medium">Ask anything about the content</p>
                        <p className="text-sm">I'll answer based strictly on the URL source.</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-3 max-w-[85%] md:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm 
                                ${m.role === 'user'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`px-5 py-3 text-sm md:text-base leading-relaxed shadow-sm break-words
                                ${m.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm w-full'
                                }`}>
                                <MessageContent content={m.content} />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {loading && (
                    <div className="flex justify-start w-full animate-pulse">
                        <div className="flex items-end gap-3 max-w-[85%]">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                <Bot size={16} />
                            </div>
                            <div className="px-5 py-3 bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                                <Loader2 className="animate-spin text-emerald-500" size={16} />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
                <form onSubmit={handleSubmit} className="flex-1 flex gap-2 relative">
                    <input
                        className="flex-1 w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all pr-12 text-sm md:text-base"
                        placeholder="Type your question..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className={`absolute right-1 top-1 bottom-1 aspect-square rounded-full transition-all 
                            ${!input.trim() || loading ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'}`}
                    >
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
};
