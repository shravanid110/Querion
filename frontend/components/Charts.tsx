import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
    data: any[];
    columns: { name: string; type: string }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Charts = ({ data, columns }: Props) => {
    if (!data || data.length === 0) return null;

    // Heuristic to detect numeric columns for Y-axis and categorical for X-axis
    const numericCols = columns.filter(c => ['int', 'decimal', 'float', 'double', 'number'].some(t => c.type.toLowerCase().includes(t)) || typeof data[0][c.name] === 'number');
    const catCols = columns.filter(c => !numericCols.includes(c));

    if (numericCols.length === 0 || catCols.length === 0) return null;

    const xAxisKey = catCols[0].name; // Pick first categorical
    const dataKeys = numericCols.map(c => c.name); // All numeric columns

    // Decide chart type based on data shape (heuristic)
    // If only 1 row, maybe not useful to show trend, just stats.
    // If date in xAxis, Line Chart. Else Bar Chart.
    // For now simple switch or render Bar + Line if multiple series.

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Bar Chart */}
            <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg h-[400px]">
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Comparison</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey={xAxisKey} stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Legend />
                        {dataKeys.map((key, i) => (
                            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Pie Chart (if data < 10 rows) */}
            {data.length <= 10 && dataKeys.length === 1 && (
                <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg h-[400px]">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey={dataKeys[0]}
                                nameKey={xAxisKey}
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

