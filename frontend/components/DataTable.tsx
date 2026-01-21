import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface Props {
    data: any[];
    columns: { name: string; type: string }[];
}

export const DataTable = ({ data, columns }: Props) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const pageSize = 10;

    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No data to display</div>;

    // Sorting
    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const currentData = sortedData.slice(startIndex, startIndex + pageSize);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900/50 border-b border-gray-700">
                            {columns.map((col) => (
                                <th
                                    key={col.name}
                                    className="p-4 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition whitespace-nowrap"
                                    onClick={() => handleSort(col.name)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.name}
                                        <ArrowUpDown className="w-4 h-4 text-gray-500" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((row, i) => (
                            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                                {columns.map((col) => (
                                    <td key={col.name} className="p-4 text-sm text-gray-200 whitespace-nowrap">
                                        {typeof row[col.name] === 'object' ? JSON.stringify(row[col.name]) : String(row[col.name])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

