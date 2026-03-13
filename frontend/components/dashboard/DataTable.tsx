"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '@/utils/cn';
import axios from 'axios';

interface DataTableProps {
    columns: string[];
    rows: any[];
}

export const DataTable = ({ columns, rows }: DataTableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Filter and Sort data
    const sortedRows = React.useMemo(() => {
        let data = [...rows];

        // Search filter
        if (searchTerm) {
            data = data.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Sorting
        if (sortConfig) {
            data.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return data;
    }, [rows, searchTerm, sortConfig]);

    const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
    const currentRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const handleExportCSV = () => {
        if (!rows || rows.length === 0) return;
        const headers = columns.join(',');
        const csvContent = [
            columns.map(col => typeof col === 'object' ? (col as any).name : col).join(','),
            ...rows.map(row => columns.map(col => {
                const colKey = typeof col === 'object' ? (col as any).name : col;
                const val = row[colKey];
                if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                return val;
            }).join(','))
        ].join('\n');
        downloadFile(csvContent, 'query_results.csv', 'text/csv');
    };

    const handleExportExcel = () => {
        if (!rows || rows.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
        XLSX.writeFile(workbook, "query_results.xlsx");
    };

    const handleExportPDF = () => {
        if (!rows || rows.length === 0) return;
        const doc = new jsPDF('landscape');
        doc.text("Query Results", 14, 15);

        const tableColumn = columns.map(col => {
            const name = typeof col === 'object' ? (col as any).name : col;
            return String(name).replace(/_/g, ' ');
        });
        const tableRows = rows.map(row => columns.map(col => {
            const colKey = typeof col === 'object' ? (col as any).name : col;
            return row[colKey];
        }));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            margin: { top: 20 },
        });
        doc.save("query_results.pdf");
    };

    const downloadFile = (content: any, fileName: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportEnterpriseReport = async (format: string = 'pdf') => {
        if (!rows || rows.length === 0) return;

        try {
            const user_query = searchTerm || "General Data Report";
            const response = await axios.post('http://localhost:4000/api/report/generate', {
                data: rows,
                user_query: user_query,
                format: format
            }, {
                responseType: 'blob'
            });

            const contentDisposition = response.headers['content-disposition'];
            let filename = `Enterprise_Report_${new Date().getTime()}.${format}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename=(.+)/);
                if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
            }

            downloadFile(response.data, filename, response.headers['content-type']);
        } catch (error) {
            console.error("Failed to generate enterprise report", error);
            alert("Report generation failed. Please ensure the backend is running.");
        }
    };

    return (
        <Card className="border-0 shadow-lg shadow-gray-100 overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4 bg-white">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-lg font-bold text-gray-800 tracking-tight">Query Results</CardTitle>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Rows:</span>
                        <span className="text-xs font-bold text-indigo-600">{sortedRows.length}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Filter records..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-gray-50/50"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportEnterpriseReport('pdf')}
                            className="text-indigo-600 hover:bg-white hover:shadow-sm text-xs h-8 px-3 rounded-lg flex items-center gap-2 font-semibold"
                        >
                            <Download size={14} />
                            Report
                        </Button>
                        <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                        <Button variant="ghost" size="sm" onClick={handleExportCSV} className="text-gray-500 hover:bg-white hover:shadow-sm text-xs h-8 px-2 rounded-lg">CSV</Button>
                        <Button variant="ghost" size="sm" onClick={handleExportExcel} className="text-gray-500 hover:bg-white hover:shadow-sm text-xs h-8 px-2 rounded-lg">Excel</Button>
                        <Button variant="ghost" size="sm" onClick={handleExportPDF} className="text-gray-500 hover:bg-white hover:shadow-sm text-xs h-8 px-2 rounded-lg">PDF</Button>
                    </div>
                </div>
            </CardHeader>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50/80 border-y border-gray-100 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none min-w-[120px]"
                                    onClick={() => handleSort(col)}
                                >
                                    <div className="flex items-center gap-2">
                                        {typeof col === 'object' ? (col as any).name?.replace(/_/g, ' ') : String(col).replace(/_/g, ' ')}
                                        {sortConfig?.key === col && (
                                            <span className="text-indigo-500">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {currentRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                {columns.map((col, idx_col) => (
                                    <td key={idx_col} className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">
                                        {(() => {
                                            const colKey = typeof col === 'object' ? (col as any).name : col;
                                            const val = row[colKey];
                                            if (typeof val === 'object' && val !== null) {
                                                return <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded">{JSON.stringify(val)}</span>;
                                            }
                                            return val;
                                        })()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <Search size={32} className="opacity-20" />
                                        <p className="font-medium">No results found matching your criteria.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white border-t border-gray-100 gap-4">
                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span>Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedRows.length)} - {Math.min(currentPage * rowsPerPage, sortedRows.length)} of {sortedRows.length}</span>
                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-gray-400">View:</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 px-2 text-[10px] font-bold uppercase">First</Button>
                    <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentPage === 1} className="h-8 w-8 p-0">
                        <ChevronLeft size={14} />
                    </Button>
                    <div className="flex items-center px-4 h-8 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                        Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 p-0">
                        <ChevronRight size={14} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="h-8 px-2 text-[10px] font-bold uppercase">Last</Button>
                </div>
            </div>
        </Card>
    );
};
