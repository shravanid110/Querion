"use client";

import React, { useState, useMemo } from 'react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart3, LineChart, PieChart, AreaChart as AreaChartIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartPanelProps {
    data: any[];
    columns: string[];
}

export const ChartPanel = ({ data, columns }: ChartPanelProps) => {
    const [chartType, setChartType] = useState<ChartType>('bar');

    // Simple heuristic to determine axes
    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        const firstRow = data[0];
        // Find string/date column for X Axis
        const xKey = columns.find(col => typeof firstRow[col] === 'string') || columns[0];
        // Find numeric columns for Y Axis
        const yKeys = columns.filter(col => typeof firstRow[col] === 'number');

        return { xKey, yKeys };
    }, [data, columns]);

    if (!chartConfig || chartConfig.yKeys.length === 0) {
        return (
            <Card className="h-full border-0 shadow-lg shadow-gray-100 flex items-center justify-center">
                <p className="text-gray-400">Not enough numeric data to chart.</p>
            </Card>
        );
    }

    const { xKey, yKeys } = chartConfig;

    return (
        <Card className="h-full border-0 shadow-lg shadow-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800">Visualization</CardTitle>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setChartType('bar')}
                        className={cn("p-1.5 rounded-md transition-all", chartType === 'bar' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <BarChart3 size={16} />
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        className={cn("p-1.5 rounded-md transition-all", chartType === 'line' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <LineChart size={16} />
                    </button>
                    <button
                        onClick={() => setChartType('pie')}
                        className={cn("p-1.5 rounded-md transition-all", chartType === 'pie' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <PieChart size={16} />
                    </button>
                    <button
                        onClick={() => setChartType('area')}
                        className={cn("p-1.5 rounded-md transition-all", chartType === 'area' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        <AreaChartIcon size={16} />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <RechartsBarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            {yKeys.map((key, i) => (
                                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={50} />
                            ))}
                        </RechartsBarChart>
                    ) : chartType === 'line' ? (
                        <RechartsLineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            {yKeys.map((key, i) => (
                                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                            ))}
                        </RechartsLineChart>
                    ) : chartType === 'pie' ? (
                        <RechartsPieChart>
                            <Pie
                                data={data}
                                dataKey={yKeys[0]} // Pie only supports one value usually
                                nameKey={xKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                        </RechartsPieChart>
                    ) : (
                        <RechartsAreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" />
                            {yKeys.map((key, i) => (
                                <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fillOpacity={1} fill={`url(#colorValue)`} strokeWidth={2} />
                            ))}
                        </RechartsAreaChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
