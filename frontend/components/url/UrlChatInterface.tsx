import React, { useRef, useEffect, useState } from 'react';
import { Send, User, Bot, Loader2, PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as echarts from 'echarts';

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#0ea5e9'];

const EChartComponent = ({ option, height = 450 }: { option: any; height?: number }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // Initialize chart
        chartInstance.current = echarts.init(chartRef.current);
        chartInstance.current.setOption(option);

        // Handle resizing
        const handleResize = () => {
            chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
        };
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
};

const renderChart = (chartData: any) => {
    if (!chartData || !chartData.data) return null;

    let option: any = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            padding: 15,
            textStyle: { color: '#1f2937', fontSize: 13 },
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)',
            borderWidth: 0,
            axisPointer: { type: 'shadow' }
        },
        grid: { top: '15%', left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: chartData.data.map((d: any) => d.name),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#64748b', fontSize: 11, interval: 0, rotate: chartData.data.length > 8 ? 30 : 0 }
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
            axisLabel: { color: '#64748b', fontSize: 11 }
        },
        animationDuration: 1500,
        animationEasing: 'cubicOut'
    };

    switch (chartData.type) {
        case 'bar':
            option.series = [{
                name: chartData.yAxisLabel || 'Value',
                type: 'bar',
                data: chartData.data.map((d: any) => d.value),
                barWidth: '40%',
                itemStyle: {
                    borderRadius: [10, 10, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#6366f1' },
                        { offset: 1, color: '#818cf8' }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#4f46e5' },
                            { offset: 1, color: '#6366f1' }
                        ])
                    }
                }
            }];
            break;
        case 'line':
        case 'area':
            option.xAxis.boundaryGap = false;
            option.series = [{
                name: chartData.yAxisLabel || 'Value',
                type: 'line',
                data: chartData.data.map((d: any) => d.value),
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { width: 4, color: '#8b5cf6' },
                itemStyle: { color: '#8b5cf6', borderColor: '#fff', borderWidth: 2 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
                        { offset: 1, color: 'rgba(139, 92, 246, 0)' }
                    ])
                }
            }];
            break;
        case 'pie':
            option.xAxis = undefined;
            option.yAxis = undefined;
            option.series = [{
                name: chartData.yAxisLabel || 'Value',
                type: 'pie',
                radius: ['45%', '75%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 12,
                    borderColor: '#fff',
                    borderWidth: 4
                },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{b}: {c}',
                    color: '#64748b'
                },
                data: chartData.data.map((d: any, i: number) => ({
                    name: d.name,
                    value: d.value,
                    itemStyle: { color: COLORS[i % COLORS.length] }
                }))
            }];
            break;
        default:
            return <p className="text-gray-500 italic">Unsupported chart type</p>;
    }

    return <EChartComponent option={option} />;
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

        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && cleanContent.includes('"isChart": true')) {
            try {
                const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
                let chartData = JSON.parse(jsonString);
                
                // Normalization Layer: Ensure data has name and value keys
                if (chartData.data && Array.isArray(chartData.data)) {
                    chartData.data = chartData.data.map((item: any) => ({
                        name: item.name || item.label || item.category || item.group || Object.values(item)[0],
                        value: Number(item.value || item.amount || item.count || item.total || Object.values(item)[1] || 0)
                    }));
                }
                
                return (
                    <div className="w-full mt-4 mb-6 space-y-4">
                        <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                            <PieChartIcon size={14} /> Data Visualization: {chartData.title}
                        </div>
                        <div className="w-full bg-white/50 p-4 rounded-3xl border border-indigo-50 shadow-sm mb-4">
                            {renderChart(chartData)}
                        </div>
                        
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl space-y-3">
                            <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                                <Bot size={18} className="text-emerald-500" />
                                Analytical Breakdown & Insights
                            </div>
                            <div className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                                {chartData.explanation}
                            </div>
                        </div>
                    </div>
                );
            } catch (innerError) {
                console.error("Deep JSON parse failed:", innerError);
            }
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
        <div className={`flex flex-col h-full w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden ${className}`}>
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
                    <div className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-4 max-w-[95%] w-full ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

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
