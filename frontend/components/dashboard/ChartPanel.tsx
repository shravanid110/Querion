"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart as RechartsBarChart,
    Bar,
    LineChart as RechartsLineChart,
    Line,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart as RechartsAreaChart,
    Area
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, LineChart, PieChart, AreaChart as AreaChartIcon, Database } from 'lucide-react';
import { cn } from '@/utils/cn';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartPanelProps {
    data: any[];
    columns: any[];
    initialChartType?: ChartType;
}

export const ChartPanel = ({ data, columns, initialChartType = 'bar' }: ChartPanelProps) => {
    const [chartType, setChartType] = useState<ChartType>(initialChartType);

    useEffect(() => {
        if (initialChartType) {
            setChartType(initialChartType);
        }
    }, [initialChartType]);

    // Simple heuristic to determine axes
    const chartConfig = useMemo(() => {
        if (!data || data.length === 0 || !columns) return null;

        const firstRow = data[0];
        const colNames = columns.map(c => typeof c === 'string' ? c : c.name)
            .filter(name => name !== '_id' && name !== '__v');

        // 1. Find the best X Axis (categorical/string)
        // Prioritize columns that aren't IDs and have content
        const priorityXKeys = colNames.filter(name => {
            const low = name.toLowerCase();
            return !low.includes('id') && !low.includes('uuid') && !low.includes('key');
        });

        const xKey = priorityXKeys.find(name => {
            const val = firstRow[name];
            return val && typeof val === 'string' && val.length > 0;
        }) || colNames.find(name => {
            const val = firstRow[name];
            return typeof val === 'string' && val != null;
        }) || colNames[0];

        // 2. Find numeric columns for Y Axis
        let yKeys = colNames.filter(name => {
            if (name === xKey) return false;
            const val = firstRow[name];
            return typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val));
        });

        let processedData = [];
        let isCounting = false;

        // 3. Fallback: If no numeric columns, perform Categorical Counting
        if (yKeys.length === 0) {
            isCounting = true;
            const counts: Record<string, number> = {};
            data.forEach(row => {
                let val = row[xKey];
                if (val === null || val === undefined || String(val).trim() === '') {
                    val = '(No Data)';
                } else {
                    val = String(val);
                }
                counts[val] = (counts[val] || 0) + 1;
            });
            
            processedData = Object.entries(counts).map(([name, count]) => ({
                [xKey]: name,
                'Frequency': count
            }));
            yKeys = ['Frequency'];
        } else {
            // Standard numeric processing
            processedData = data.map(row => {
                const newRow = { ...row };
                yKeys.forEach(key => {
                    if (typeof newRow[key] === 'string') {
                        newRow[key] = parseFloat(newRow[key]);
                    }
                });
                return newRow;
            });
        }

        return { xKey, yKeys, processedData, isCounting };
    }, [data, columns]);

    if (!chartConfig || chartConfig.yKeys.length === 0) {
        return (
            <Card className="h-full border border-white/5 bg-[#0b101d] shadow-2xl flex flex-col items-center justify-center p-8 text-center rounded-2xl">
                <div className="p-4 bg-indigo-500/10 rounded-full mb-4">
                    <BarChart3 size={32} className="text-indigo-400 opacity-50" />
                </div>
                <h4 className="text-white font-bold mb-1">No Chartable Data</h4>
                <p className="text-slate-500 text-sm max-w-[200px]">We couldn't process this data into a visual format.</p>
            </Card>
        );
    }

    const { xKey, yKeys, processedData, isCounting } = chartConfig;

    return (
        <Card className="h-full border border-white/5 bg-[#0b101d] shadow-2xl overflow-hidden flex flex-col rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Database size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-white leading-tight">
                            {isCounting ? `Distribution of ${xKey}` : 'Data Performance'}
                        </CardTitle>
                        <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest font-bold">
                            {isCounting ? 'Categorical Frequency' : 'Numeric Analysis'}
                        </p>
                    </div>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                    {[
                        { id: 'bar', icon: BarChart3 },
                        { id: 'line', icon: LineChart },
                        { id: 'pie', icon: PieChart },
                        { id: 'area', icon: AreaChartIcon }
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setChartType(type.id as ChartType)}
                            className={cn(
                                "p-2 rounded-lg transition-all duration-300", 
                                chartType === type.id 
                                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <type.icon size={16} />
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="flex-1 w-full p-6 pt-10">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <RechartsBarChart data={processedData} margin={{ bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis 
                                dataKey={xKey} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                    color: '#fff'
                                }}
                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Legend 
                                iconType="circle" 
                                wrapperStyle={{ paddingTop: '30px', fontSize: '11px', color: '#64748b' }}
                            />
                            {yKeys.map((key, i) => (
                                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {processedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fillOpacity={0.8 + (index % 3) * 0.1} />
                                    ))}
                                </Bar>
                            ))}
                        </RechartsBarChart>
                    ) : chartType === 'line' ? (
                        <RechartsLineChart data={processedData} margin={{ bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis 
                                dataKey={xKey} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff'
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                            {yKeys.map((key, i) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={4} dot={{ r: 5, strokeWidth: 2, stroke: '#0b101d', fill: COLORS[i % COLORS.length] }} activeDot={{ r: 8, strokeWidth: 0 }} />
                            ))}
                        </RechartsLineChart>
                    ) : chartType === 'pie' ? (
                        <RechartsPieChart>
                            <Pie
                                data={processedData}
                                dataKey={yKeys[0]}
                                nameKey={xKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={75}
                                outerRadius={105}
                                paddingAngle={8}
                            >
                                {processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.3)" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                            />
                            <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />
                        </RechartsPieChart>
                    ) : (
                        <RechartsAreaChart data={processedData} margin={{ bottom: 20 }}>
                            <defs>
                                {COLORS.map((color, i) => (
                                    <linearGradient key={`grad-${i}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis 
                                dataKey={xKey} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#111827', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                            {yKeys.map((key, i) => (
                                <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fillOpacity={1} fill={`url(#color-${i % COLORS.length})`} strokeWidth={4} />
                            ))}
                        </RechartsAreaChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
