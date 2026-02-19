"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { UrlChatInterface, Message } from '@/components/url/UrlChatInterface';
import { ChartPanel } from '@/components/dashboard/ChartPanel'; // Reusing
import { DataTable } from '@/components/dashboard/DataTable';   // Reusing
import { runUrlQuery, api } from '@/services/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, LayoutDashboard, FileText, Globe, Download, PieChart, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';

export default function InteractionPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const connectionId = searchParams.get('id');

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);

    // Load Session
    useEffect(() => {
        if (!connectionId) {
            router.push('/connect');
            return;
        }

        const fetchSession = async () => {
            try {
                const res = await api.get(`/url/session/${connectionId}`);
                setSessionData(res.data);
                // Add initial greeting based on data type
                setMessages([{
                    role: 'ai',
                    content: `I've analyzed the ${res.data.type} content from ${res.data.url}. Ask me anything about it!`
                }]);
            } catch (err) {
                console.error("Failed to load session", err);
                alert("Session expired or invalid.");
                router.push('/connect');
            } finally {
                setSessionLoading(false);
            }
        };

        fetchSession();
    }, [connectionId, router]);

    const handleSendMessage = async (text: string) => {
        if (!connectionId) return;

        // Optimistic update
        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const data = await runUrlQuery(connectionId, text);
            const aiMsg: Message = { role: 'ai', content: data.answer };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            console.error(err);
            const aiMsg: Message = { role: 'ai', content: "Sorry, I encountered an error processing your request." };
            setMessages(prev => [...prev, aiMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!sessionData) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let currentY = 20;

            const checkPageBreak = (neededHeight: number) => {
                if (currentY + neededHeight > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;
                    return true;
                }
                return false;
            };

            // 1. Header
            doc.setFontSize(24);
            doc.setTextColor(79, 70, 229); // Indigo-600
            doc.text("Official Intelligence Report", 14, currentY);
            currentY += 10;

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Querion Data Analysis • ${new Date().toLocaleString()}`, 14, currentY);
            currentY += 5;
            doc.text(`Source URL: ${sessionData.url}`, 14, currentY);
            currentY += 5;
            doc.line(14, currentY, pageWidth - 14, currentY);
            currentY += 10;

            // 2. Executive Summary (Grok)
            doc.setFontSize(16);
            doc.setTextColor(31, 41, 55);
            doc.text("1. Executive Summary", 14, currentY);
            currentY += 8;

            const summaryText = sessionData.summary || "No automated summary available.";
            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);
            const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 28);
            doc.text(splitSummary, 14, currentY);
            currentY += (splitSummary.length * 5) + 15;

            // 3. Analytics & Chat Insights
            checkPageBreak(20);
            doc.setFontSize(16);
            doc.setTextColor(31, 41, 55);
            doc.text("2. Analytical Deep-Dive", 14, currentY);
            currentY += 10;

            for (const msg of messages) {
                if (msg.role === 'user') {
                    checkPageBreak(15);
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.text("User Inquiry:", 14, currentY);
                    currentY += 5;
                    doc.setFontSize(10);
                    doc.setTextColor(31, 41, 55);
                    doc.setFont("helvetica", "bold");
                    doc.text(`"${msg.content}"`, 14, currentY);
                    doc.setFont("helvetica", "normal");
                    currentY += 10;
                } else {
                    // Check if content is a chart JSON
                    let isChart = false;
                    let chartContent = msg.content;
                    try {
                        let clean = msg.content.trim();
                        if (clean.startsWith('```json')) clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
                        else if (clean.startsWith('```')) clean = clean.replace(/^```/, '').replace(/```$/, '').trim();

                        if (clean.startsWith('{') && clean.includes('"isChart": true')) {
                            isChart = true;
                            const chartData = JSON.parse(clean);
                            checkPageBreak(30);
                            doc.setFontSize(10);
                            doc.setTextColor(79, 70, 229);
                            doc.text(`[Chart Generated: ${chartData.title}]`, 14, currentY);
                            currentY += 6;
                            doc.setFontSize(10);
                            doc.setTextColor(55, 65, 81);
                            const splitExpl = doc.splitTextToSize(`Insight: ${chartData.explanation}`, pageWidth - 28);
                            doc.text(splitExpl, 14, currentY);
                            currentY += (splitExpl.length * 5) + 10;
                        }
                    } catch (e) { }

                    if (!isChart) {
                        const splitAi = doc.splitTextToSize(msg.content, pageWidth - 28);
                        checkPageBreak(splitAi.length * 5 + 10);
                        doc.setFontSize(9);
                        doc.setTextColor(16, 185, 129); // Emerald
                        doc.text("AI Response:", 14, currentY);
                        currentY += 5;
                        doc.setFontSize(10);
                        doc.setTextColor(55, 65, 81);
                        doc.text(splitAi, 14, currentY);
                        currentY += (splitAi.length * 5) + 12;
                    }
                }
            }

            // 4. Capture Dashboard Chart
            if (chartRef.current) {
                checkPageBreak(100);
                doc.setFontSize(16);
                doc.setTextColor(31, 41, 55);
                doc.text("3. Data Visualization Dashboard", 14, currentY);
                currentY += 10;

                try {
                    const canvas = await html2canvas(chartRef.current, {
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        backgroundColor: "#ffffff",
                        onclone: (clonedDoc) => {
                            // Fix modern CSS color issues (lab, oklch) by stripping them from the clone
                            const elements = clonedDoc.getElementsByTagName('*');
                            for (let i = 0; i < elements.length; i++) {
                                const el = elements[i] as HTMLElement;
                                if (el.style && el.style.color && (el.style.color.includes('lab') || el.style.color.includes('oklch'))) {
                                    el.style.color = '#4f46e5'; // Fallback to Indigo
                                }
                                if (el.style && el.style.backgroundColor && (el.style.backgroundColor.includes('lab') || el.style.backgroundColor.includes('oklch'))) {
                                    el.style.backgroundColor = '#ffffff';
                                }
                            }
                        }
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 28;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
                    currentY += imgHeight + 20;
                } catch (chartErr) {
                    console.warn("Could not capture chart image", chartErr);
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text("[Visualization omitted due to rendering constraints]", 14, currentY);
                    currentY += 10;
                }
            }

            // 5. Full Dataset (The BIG Table)
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(31, 41, 55);
            doc.text("4. Complete Dataset Inventory", 14, 20);

            if (sessionData.structuredData && sessionData.columns) {
                const tableData = sessionData.structuredData.map((row: any) =>
                    sessionData.columns.map((col: string) => row[col]?.toString() || "")
                );

                autoTable(doc, {
                    startY: 28,
                    head: [sessionData.columns],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 1 },
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                    alternateRowStyles: { fillColor: [249, 250, 251] },
                    margin: { horizontal: 14 },
                    didDrawPage: (data) => {
                        // Footer on each table page
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`Page ${doc.internal.pages.length - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                    }
                });
            }

            doc.save(`QuerionAI_Full_Report_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Failed to export report. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    if (sessionLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <p className="text-gray-500 font-medium">Loading session context...</p>
                </div>
            </div>
        );
    }

    const hasStructuredData = sessionData?.structuredData && sessionData.structuredData.length > 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar connectionName={sessionData?.url ? `Connected: ${new URL(sessionData.url).hostname}` : "URL Interaction"} />

            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />

                <main className="flex-1 ml-64 p-6 overflow-y-auto pb-24 scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Header Info */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    {sessionData?.type === 'csv' ? <LayoutDashboard className="text-emerald-500" /> : <Globe className="text-blue-500" />}
                                    {sessionData?.type === 'csv' ? 'Data Analysis' : 'Content Chat'}
                                </h1>
                                <p className="text-sm text-gray-500 truncate max-w-xl" title={sessionData?.url}>
                                    Source: {sessionData?.url}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    variant="outline"
                                    className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                                >
                                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    Download Official PDF Report
                                </Button>
                                <div className="text-xs font-mono text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                    {sessionData?.type.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">

                            {/* Left Column: Charts/Data (if available) or Summary items */}
                            {hasStructuredData ? (
                                <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <LayoutDashboard size={20} className="text-indigo-500" />
                                            Data Visualization
                                        </h3>
                                        <div className="h-[350px]" ref={chartRef}>
                                            <ChartPanel
                                                data={sessionData.structuredData}
                                                columns={sessionData.columns || []}
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Raw Data Preview</h3>
                                        <div className="overflow-x-auto">
                                            <DataTable
                                                columns={sessionData.columns || []}
                                                rows={sessionData.structuredData.slice(0, 10)}
                                            />
                                            <p className="text-xs text-gray-400 mt-2 text-center">Showing first 10 rows</p>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                // If unstructured (HTML/Text), maybe show summary or just center the chat?
                                // Let's make the chat take full width but maybe centered context
                                <div className="hidden lg:block lg:col-span-1 space-y-4">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <FileText size={20} className="text-blue-500" />
                                            Source Content
                                        </h3>
                                        <div className="text-sm text-gray-600 space-y-2 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            <p className="italic text-gray-400">Content preview (truncated):</p>
                                            <p className="whitespace-pre-wrap font-mono text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                {/* We don't have rawContent in GET /session response to save bandwidth, 
                                                     but we could add a summary if AI generated one. For now, placeholder. */}
                                                No summary available yet. Ask the AI to summarize!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Right Column: Chat Interface */}
                            <div className={hasStructuredData ? "lg:col-span-1" : "lg:col-span-2 lg:col-start-2"}>
                                <UrlChatInterface
                                    messages={messages}
                                    onSend={handleSendMessage}
                                    loading={loading}
                                    className="h-full min-h-[600px] shadow-xl border-indigo-100"
                                />
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
