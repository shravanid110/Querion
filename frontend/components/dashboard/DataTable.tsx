"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '@/utils/cn';

interface DataTableProps {
    columns: string[];
    rows: any[];
}

export const DataTable = ({ columns, rows }: DataTableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const rowsPerPage = 10;

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
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
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
            headers,
            ...rows.map(row => columns.map(col => {
                const val = row[col];
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
        const doc = new jsPDF();
        doc.text("Query Results", 14, 15);

        const tableColumn = columns.map(col => col.replace(/_/g, ' '));
        const tableRows = rows.map(row => columns.map(col => row[col]));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });
        doc.save("query_results.pdf");
    };

    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Card className="border-0 shadow-lg shadow-gray-100 overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
                <CardTitle className="text-lg font-semibold text-gray-800">Query Results</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search results..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs h-9">CSV</Button>
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs h-9">Excel</Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs h-9">PDF</Button>
                    </div>
                </div>
            </CardHeader>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs font-semibold">
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    onClick={() => handleSort(col)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.replace(/_/g, ' ')}
                                        {sortConfig?.key === col && (
                                            <span className="text-gray-400 text-[10px]">
                                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                {columns.map(col => (
                                    <td key={col} className="px-6 py-4 text-gray-600">
                                        {typeof row[col] === 'object' && row[col] !== null ? JSON.stringify(row[col]) : row[col]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-400">
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                <span className="text-sm text-gray-500">Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedRows.length)} to {Math.min(currentPage * rowsPerPage, sortedRows.length)} of {sortedRows.length} entries</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentPage === 1} className="h-8 w-8 p-0">
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="flex items-center justify-center h-8 px-2 text-sm text-gray-600">
                        Page {currentPage}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
