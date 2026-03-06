"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit,
    AlertCircle,
    CheckCircle,
    Zap,
    Terminal,
    TrendingUp,
    ShieldAlert,
    Database,
    Globe,
    Cpu,
    FileWarning,
    ShoppingBag,
    Server,
    Clock
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface MappedChart {
    id: string;
    chart_type: string;
    panel: string;
    severity: string;
    title: string;
    description: string;
    metric_type: string;
    visualization: string;
    color: string;
    last_update?: string;
    ai_insight?: {
        reason: string;
        impact: string;
        suggested_fix: string;
    };
    value?: number | string;
}

// 60+ Backend Scenarios Mapping
const INITIAL_SCENARIOS: MappedChart[] = [
    // --- DATABASE & PERFORMANCE ---
    { id: 'db_timeout', title: 'DB Timeout', chart_type: 'gauge', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'connection', description: '', visualization: '' },
    { id: 'db_slow_query', title: 'DB Slow Query', chart_type: 'line', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'performance', description: '', visualization: '' },
    { id: 'db_duplicate', title: 'Duplicate Key Error', chart_type: 'table', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'integrity', description: '', visualization: '' },
    { id: 'db_deadlocks', title: 'Transaction Deadlock', chart_type: 'counter', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'concurrency', description: '', visualization: '' },
    { id: 'db_schema_err', title: 'DB Schema Mismatch', chart_type: 'table', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'validation', description: '', visualization: '' },
    { id: 'db_migration_fail', title: 'Migration Failure', chart_type: 'counter', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'deployment', description: '', visualization: '' },
    { id: 'redis_fail', title: 'Redis Connection', chart_type: 'gauge', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'cache', description: '', visualization: '' },
    { id: 'cache_overflow', title: 'Cache Overflow', chart_type: 'ring', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'memory', description: '', visualization: '' },
    { id: 'cache_conn_fail', title: 'Cache Conn Fail', chart_type: 'gauge', panel: 'DATABASE_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'availability', description: '', visualization: '' },

    // --- AUTH & SECURITY ---
    { id: 'auth_fail', title: 'Auth Failure', chart_type: 'pie', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'access', description: '', visualization: '' },
    { id: 'auth_expired', title: 'Expired Token', chart_type: 'line', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'session', description: '', visualization: '' },
    { id: 'auth_denied', title: 'Role Denied', chart_type: 'bar', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'authorization', description: '', visualization: '' },
    { id: 'auth_session_exp', title: 'Session Expired', chart_type: 'pie', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'session', description: '', visualization: '' },
    { id: 'auth_oauth_fail', title: 'OAuth Failure', chart_type: 'pie', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'external_auth', description: '', visualization: '' },
    { id: 'sec_sqli', title: 'SQL Injection Attempt', chart_type: 'securityTable', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'exploit', description: '', visualization: '' },
    { id: 'sec_brute', title: 'Brute Force Detection', chart_type: 'line', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'attack', description: '', visualization: '' },
    { id: 'sec_tamper', title: 'Token Tampering', chart_type: 'securityBar', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'integrity', description: '', visualization: '' },
    { id: 'sec_unauthorized', title: 'Unauthorized Access', chart_type: 'bar', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'access', description: '', visualization: '' },
    { id: 'sec_ssl_exp', title: 'SSL Expired', chart_type: 'badge', panel: 'SECURITY', severity: 'HEALTHY', color: 'green', metric_type: 'certificate', description: '', visualization: '' },

    // --- API & TRAFFIC ---
    { id: 'api_400', title: 'Bad Request (400)', chart_type: 'bar', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'http_error', description: '', visualization: '' },
    { id: 'api_500', title: 'Internal Error', chart_type: 'counter', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'http_error', description: '', visualization: '' },
    { id: 'api_503', title: 'Service Unavailable', chart_type: 'alertPanel', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'availability', description: '', visualization: '' },
    { id: 'api_429', title: 'Rate Limited', chart_type: 'line', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'throughput', description: '', visualization: '' },
    { id: 'api_slow_end', title: 'Slow Endpoint', chart_type: 'line', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'latency', description: '', visualization: '' },
    { id: 'api_high_rps', title: 'High RPS Traffic', chart_type: 'line', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'volume', description: '', visualization: '' },
    { id: 'api_user_spike', title: 'User Spike', chart_type: 'line', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'engagement', description: '', visualization: '' },
    { id: 'api_traffic_spike', title: 'Traffic Spike', chart_type: 'line', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'load', description: '', visualization: '' },
    { id: 'api_imbalance', title: 'Load Imbalance', chart_type: 'bar', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'distribution', description: '', visualization: '' },
    { id: 'api_method_inv', title: 'Invalid Method', chart_type: 'bar', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'http_bad', description: '', visualization: '' },
    { id: 'api_payload_large', title: 'Payload Too Large', chart_type: 'table', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'http_bad', description: '', visualization: '' },
    { id: 'api_unsupp_type', title: 'Unsupported Media', chart_type: 'table', panel: 'API_TRAFFIC', severity: 'HEALTHY', color: 'green', metric_type: 'http_bad', description: '', visualization: '' },

    // --- SYSTEM & INFRA ---
    { id: 'sys_cpu_over', title: 'CPU Overload', chart_type: 'ring', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'usage', description: '', visualization: '' },
    { id: 'sys_mem_leak', title: 'Memory Leak', chart_type: 'ring', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'usage', description: '', visualization: '' },
    { id: 'sys_disk_full', title: 'Disk Full', chart_type: 'gauge', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'usage', description: '', visualization: '' },
    { id: 'sys_docker_crash', title: 'Docker Container Crash', chart_type: 'counter', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'restart', description: '', visualization: '' },
    { id: 'sys_cont_restart', title: 'Container Restart', chart_type: 'counter', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'restart', description: '', visualization: '' },
    { id: 'sys_threads', title: 'Thread Exhaustion', chart_type: 'line', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'threads', description: '', visualization: '' },
    { id: 'sys_thread_dead', title: 'Thread Deadlock', chart_type: 'counter', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'deadlock', description: '', visualization: '' },
    { id: 'sys_dns_fail', title: 'DNS Failure', chart_type: 'timeline', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'network', description: '', visualization: '' },
    { id: 'sys_net_timeout', title: 'Network Timeout', chart_type: 'line', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'network', description: '', visualization: '' },
    { id: 'sys_queue_over', title: 'Queue Overflow', chart_type: 'gauge', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'load', description: '', visualization: '' },
    { id: 'sys_restarter', title: 'Service Restart', chart_type: 'counter', panel: 'SYSTEM_HEALTH', severity: 'HEALTHY', color: 'green', metric_type: 'lifecycle', description: '', visualization: '' },

    // --- ERRORS & EXCEPTIONS ---
    { id: 'err_file_corr', title: 'File Corrupt', chart_type: 'table', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'io_error', description: '', visualization: '' },
    { id: 'err_null_ptr', title: 'Null Pointer', chart_type: 'logViewer', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'runtime_error', description: '', visualization: '' },
    { id: 'err_div_zero', title: 'Division by Zero', chart_type: 'stackTrace', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'runtime_error', description: '', visualization: '' },
    { id: 'err_inv_input', title: 'Invalid Input', chart_type: 'table', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'logic_error', description: '', visualization: '' },
    { id: 'err_json_parse', title: 'JSON Parse Error', chart_type: 'table', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'format_error', description: '', visualization: '' },
    { id: 'err_timeout_exc', title: 'Timeout Exception', chart_type: 'table', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'runtime_error', description: '', visualization: '' },
    { id: 'err_unknown', title: 'Unknown Exception', chart_type: 'logConsole', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'runtime_error', description: '', visualization: '' },
    { id: 'err_config', title: 'Config Error', chart_type: 'logViewer', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'env_error', description: '', visualization: '' },
    { id: 'err_env_miss', title: 'Env Var Missing', chart_type: 'logViewer', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'env_error', description: '', visualization: '' },
    { id: 'err_high_error', title: 'High Error Rate', chart_type: 'ring', panel: 'APPLICATION_LOGS', severity: 'HEALTHY', color: 'green', metric_type: 'health_score', description: '', visualization: '' },

    // --- EXTERNAL & JOBS ---
    { id: 'ai_api_fail', title: 'AI API Failure', chart_type: 'counter', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'third_party', description: '', visualization: '' },
    { id: 'pay_timeout', title: 'Payment Timeout', chart_type: 'pie', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'third_party', description: '', visualization: '' },
    { id: 'web_fail', title: 'Webhook Failure', chart_type: 'line', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'outbound', description: '', visualization: '' },
    { id: 'web_retry_fail', title: 'Webhook Retry Fail', chart_type: 'counter', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'outbound', description: '', visualization: '' },
    { id: 'cron_fail', title: 'Cron Failure', chart_type: 'counter', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'scheduler', description: '', visualization: '' },
    { id: 'job_stuck', title: 'Background Job Stuck', chart_type: 'counter', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'workers', description: '', visualization: '' },
    { id: 'job_crash', title: 'Background Job Crash', chart_type: 'counter', panel: 'EXTERNAL_SERVICES', severity: 'HEALTHY', color: 'green', metric_type: 'workers', description: '', visualization: '' },
    { id: 'gen_trend', title: 'Log Activity Trend', chart_type: 'line', panel: 'GENERIC_MONITORING', severity: 'HEALTHY', color: 'green', metric_type: 'general_metric', description: '', visualization: '' },
];

export default function IntelligentChartRenderer() {
    const [scenarios, setScenarios] = useState<MappedChart[]>(INITIAL_SCENARIOS);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            const socket = new WebSocket('ws://localhost:4000/ws/monitor');
            socketRef.current = socket;

            socket.onopen = () => {
                setConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'mapped_chart') {
                        const mapping = data.mapping;
                        const ai = data.ai;

                        setScenarios(prev => prev.map(s => {
                            // Match by title or ID (fuzzy match for now)
                            if (s.title.toLowerCase().includes(mapping.title.toLowerCase()) ||
                                mapping.title.toLowerCase().includes(s.title.toLowerCase())) {
                                return {
                                    ...s,
                                    severity: mapping.severity,
                                    color: mapping.recommended_color,
                                    last_update: new Date().toISOString(),
                                    ai_insight: ai,
                                    description: mapping.description
                                };
                            }
                            return s;
                        }));
                    }
                } catch (err) {
                    console.error("Socket error", err);
                }
            };

            socket.onclose = () => {
                setConnected(false);
                setTimeout(connect, 3000);
            };
        };

        connect();
        return () => socketRef.current?.close();
    }, []);

    // Grouping scenarios by panel
    const groups = useMemo(() => {
        const g: { [key: string]: MappedChart[] } = {};
        scenarios.forEach(s => {
            if (!g[s.panel]) g[s.panel] = [];
            g[s.panel].push(s);
        });
        return g;
    }, [scenarios]);

    const panelIcons: any = {
        SYSTEM_HEALTH: <Cpu className="h-4 w-4" />,
        API_MONITORING: <Globe className="h-4 w-4" />,
        DATABASE_MONITORING: <Database className="h-4 w-4" />,
        AUTH_EVENTS: <ShieldAlert className="h-4 w-4" />,
        API_TRAFFIC: <Terminal className="h-4 w-4" />,
        STORAGE: <FileWarning className="h-4 w-4" />,
        SECURITY: <ShieldAlert className="h-4 w-4 text-red-500" />
    };

    return (
        <div className="mt-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-t border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-widest flex items-center gap-3">
                        <BrainCircuit className="text-indigo-400 h-8 w-8" />
                        INTELLIGENT OBSERVABILITY DASHBOARD V2
                    </h2>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em] mt-1">
                        60+ Scenarios · Automated Pattern Detection · AI Reasoner
                    </p>
                </div>
                <div className={cn(
                    "px-4 py-2 rounded-xl flex items-center gap-3 border text-[10px] font-black tracking-widest",
                    connected ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : "bg-red-500/5 text-red-500 border-red-500/20"
                )}>
                    <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {connected ? "LIVE CLOUD SYNC" : "DISCONNECTED"}
                </div>
            </div>

            {Object.entries(groups).map(([panelName, groupCharts]) => (
                <div key={panelName} className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                            {panelIcons[panelName] || <LayoutDashboard size={14} />}
                        </div>
                        <span className="text-xs font-black text-slate-400 tracking-[0.3em] uppercase">{panelName.replace('_', ' ')}</span>
                        <div className="flex-1 h-px bg-slate-800/50" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {groupCharts.map(chart => (
                            <LogChartItem key={chart.id} chart={chart} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function LogChartItem({ chart }: { chart: MappedChart }) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [showAI, setShowAI] = useState(false);

    useEffect(() => {
        if (!chartRef.current) return;

        const instance = echarts.init(chartRef.current, 'dark');

        const color = chart.color === 'red' ? '#ef4444' :
            chart.color === 'orange' ? '#f59e0b' :
                chart.color === 'yellow' ? '#fde047' : '#10b981';

        let option: any = {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 1000,
            tooltip: { show: false }
        };

        const chartType = chart.chart_type.toLowerCase();

        // ── Coordinate System Setup ──
        // Only add axes for types that require them
        const needsAxes = chartType.includes('line') || chartType.includes('bar') || chartType.includes('spike') || (!chartType.includes('pie') && !chartType.includes('donut') && !chartType.includes('ring') && !chartType.includes('gauge'));

        if (needsAxes) {
            option.grid = { top: 10, bottom: 10, left: 10, right: 10 };
            option.xAxis = { type: 'category', show: false };
            option.yAxis = { type: 'value', show: false };
        }

        if (chartType.includes('gauge') || chartType === 'radialgauge') {
            option.series = [{
                type: 'gauge',
                radius: '100%',
                center: ['50%', '55%'],
                startAngle: 180,
                endAngle: 0,
                progress: { show: true, width: 8, itemStyle: { color } },
                axisLine: { lineStyle: { width: 8, color: [[1, 'rgba(255,255,255,0.02)']] } },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                pointer: { show: false },
                detail: { fontSize: 14, offsetCenter: [0, '-10%'], valueAnimation: true, formatter: '{value}%', color: '#fff' },
                data: [{ value: chart.severity === 'HEALTHY' ? 30 : 85 }]
            }];
        } else if (chartType.includes('ring')) {
            option.series = [{
                type: 'pie',
                radius: ['65%', '90%'],
                avoidLabelOverlap: false,
                itemStyle: { borderRadius: 2, borderColor: '#0f172a', borderWidth: 2 },
                label: { show: false },
                data: [
                    { value: chart.severity === 'HEALTHY' ? 30 : 75, itemStyle: { color } },
                    { value: chart.severity === 'HEALTHY' ? 70 : 25, itemStyle: { color: 'rgba(255,255,255,0.02)' } }
                ]
            }];
        } else if (chartType.includes('line') || chartType.includes('spike') || chartType.includes('timeline')) {
            option.series = [{
                type: 'line',
                smooth: chartType.includes('timeline') ? false : true,
                step: chartType.includes('timeline') ? 'start' : undefined,
                data: Array(15).fill(0).map(() => Math.random() * 50 + (chart.severity === 'CRITICAL' ? 50 : 0)),
                lineStyle: { color, width: 2 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color }, { offset: 1, color: 'transparent' }]), opacity: 0.1 },
                symbol: chartType.includes('timeline') ? 'circle' : 'none',
                symbolSize: 4
            }];
        } else if (chartType.includes('pie') || chartType.includes('donut')) {
            option.series = [{
                type: 'pie',
                radius: chartType.includes('donut') ? ['55%', '85%'] : '80%',
                itemStyle: { borderRadius: 4 },
                label: { show: false },
                data: [
                    { value: 40, itemStyle: { color } },
                    { value: 30, itemStyle: { color: '#6366f1' } },
                    { value: 20, itemStyle: { color: '#0ea5e9' } }
                ]
            }];
        } else if (chartType.includes('bar')) {
            option.series = [{
                type: 'bar',
                data: [120, 200, 150, 80, 70, 110].map(v => v * Math.random()),
                itemStyle: { color, borderRadius: [2, 2, 0, 0] },
                barWidth: '40%'
            }];
        } else if (chartType.includes('counter') || chartType.includes('badge') || chartType.includes('panel')) {
            option.series = [{
                type: 'scatter',
                symbolSize: 0,
                data: [[0, 0]],
                label: {
                    show: true,
                    position: 'inside',
                    formatter: chart.severity === 'HEALTHY' ? '{@[0]}' : '{@[0]}',
                    rich: {
                        a: { fontSize: 24, fontWeight: 'bold', color: '#fff' }
                    }
                }
            }];
            // Use dummy data for display
            option.xAxis.min = -1; option.xAxis.max = 1;
            option.yAxis.min = -1; option.yAxis.max = 1;
            option.series[0].label.formatter = () => {
                return chart.severity === 'HEALTHY' ? 'ONLINE' : 'ALERT';
            };
            option.series[0].label.fontSize = 20;
        } else {
            // Table / Log / Trace view placeholder
            option.series = [{
                type: 'scatter',
                symbolSize: 0,
                data: [[0, 0]],
                label: {
                    show: true,
                    position: 'inside',
                    formatter: () => 'DATA GRID ENABLED\n[ STREAM ACTIVE ]',
                    color: '#6366f1',
                    fontSize: 8,
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    padding: [10, 20],
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(99, 102, 241, 0.2)'
                }
            }];
            option.xAxis.min = -1; option.xAxis.max = 1;
            option.yAxis.min = -1; option.yAxis.max = 1;
        }

        // Use requestAnimationFrame to ensure DOM is ready and avoid "main process" error
        const requestId = requestAnimationFrame(() => {
            instance.setOption(option);
        });

        const resizer = () => instance.resize();
        window.addEventListener('resize', resizer);

        return () => {
            cancelAnimationFrame(requestId);
            window.removeEventListener('resize', resizer);
            instance.dispose();
        };
    }, [chart]);

    const isUpdated = chart.last_update && (new Date().getTime() - new Date(chart.last_update).getTime() < 10000);

    return (
        <motion.div
            layout
            className={cn(
                "group bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col transition-all duration-300",
                isUpdated ? "ring-1 ring-indigo-500 bg-slate-800/50 shadow-lg shadow-indigo-500/10" : ""
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-[10px] font-black text-white tracking-widest uppercase truncate max-w-[150px]">{chart.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full",
                            chart.color === 'red' ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" :
                                chart.color === 'orange' ? "bg-orange-500" :
                                    chart.color === 'yellow' ? "bg-yellow-400" : "bg-emerald-500"
                        )} />
                        <span className={cn("text-[8px] font-black tracking-widest uppercase",
                            chart.color === 'red' ? "text-red-500" :
                                chart.color === 'orange' ? "text-orange-500" :
                                    chart.color === 'yellow' ? "text-yellow-400" : "text-emerald-500"
                        )}>{chart.severity}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {chart.ai_insight && (
                        <button
                            onClick={() => setShowAI(!showAI)}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                showAI ? "bg-indigo-600 text-white" : "bg-slate-950 text-indigo-400/50 hover:text-indigo-400 border border-indigo-500/10"
                            )}
                        >
                            <BrainCircuit size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="relative flex-1 min-h-[100px] flex items-center justify-center">
                <div ref={chartRef} className="absolute inset-0 w-full h-full" />

                <AnimatePresence>
                    {showAI && chart.ai_insight && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 bg-slate-950/98 backdrop-blur-md rounded-2xl p-4 z-20 flex flex-col justify-center border border-indigo-500/20"
                        >
                            <div className="space-y-2">
                                <div>
                                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest block">AI ANALYSIS</span>
                                    <p className="text-[9px] text-slate-100 font-bold leading-tight mt-1">{chart.ai_insight.reason}</p>
                                </div>
                                <div>
                                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest block">IMPACT</span>
                                    <p className="text-[9px] text-slate-400 leading-tight mt-1">{chart.ai_insight.impact}</p>
                                </div>
                                <div className="pt-2 border-t border-slate-800">
                                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest block">FIX</span>
                                    <p className="text-[9px] text-emerald-400 font-bold italic leading-tight mt-1">{chart.ai_insight.suggested_fix}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp size={10} className="text-slate-600" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{chart.metric_type}</span>
                </div>
                {chart.last_update && (
                    <div className="flex items-center gap-1.5 animate-pulse">
                        <Clock size={8} className="text-indigo-400" />
                        <span className="text-[8px] font-mono text-indigo-400">ACTIVE</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function LayoutDashboard({ size, className }: any) {
    return <TrendingUp size={size} className={className} />;
}
