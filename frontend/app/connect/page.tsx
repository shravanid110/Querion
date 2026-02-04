"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { connectUrl } from '@/services/api';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, AlertCircle, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { DataTable } from '@/components/dashboard/DataTable';

export default function ConnectPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionData, setConnectionData] = useState<any>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) {
            setError("Please provide a valid URL.");
            return;
        }

        setLoading(true);
        setError(null);
        setConnectionData(null);

        try {
            const data = await connectUrl(url);
            // Don't redirect immediately, show success and preview
            setConnectionData(data);
        } catch (err: any) {
            console.error("Connection failed", err);
            const status = err.response?.status;
            let msg = err.response?.data?.error || err.message || "Failed to connect to URL.";

            if (status === 404) {
                msg = "Server endpoint not found (404). Please ensure the backend server has been restarted to apply the latest updates.";
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = () => {
        if (connectionData?.connectionId) {
            router.push(`/interaction?id=${connectionData.connectionId}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar connectionName="New Connection" />

            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />

                <main className="flex-1 ml-64 p-8 overflow-y-auto pb-24 scroll-smooth">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-full"
                        >
                            {!connectionData ? (
                                <Card className="max-w-lg mx-auto p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4">
                                            <LinkIcon size={32} />
                                        </div>
                                        <h1 className="text-2xl font-bold text-gray-900">Connect to Data Source</h1>
                                        <p className="text-gray-500 text-center mt-2">
                                            Enter a public URL (Webpage, CSV, JSON) to start analyzing.
                                        </p>
                                    </div>

                                    <form onSubmit={handleConnect} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Public URL
                                            </label>
                                            <input
                                                type="url"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                placeholder="https://example.com/data.csv"
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                                required
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-start gap-2">
                                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full py-6 text-lg font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                "Connect & Analyze"
                                            )}
                                        </Button>
                                    </form>
                                </Card>
                            ) : (
                                <div className="space-y-6">
                                    <Card className="p-6 border-l-4 border-l-green-500 shadow-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">Connection Successful!</h3>
                                                    <p className="text-gray-600">Successfully processed <strong>{connectionData.type.toUpperCase()}</strong> content from the URL.</p>
                                                </div>
                                            </div>
                                            <Button onClick={handleProceed} size="lg" className="shadow-lg shadow-indigo-200">
                                                Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>

                                    {connectionData.columns && connectionData.preview && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-gray-800 ml-1">Data Preview</h3>
                                            <DataTable
                                                columns={connectionData.columns}
                                                rows={connectionData.preview}
                                            />
                                            <p className="text-xs text-center text-gray-400">Showing first 5 rows of {connectionData.structuredData?.length || 'many'} records</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}
