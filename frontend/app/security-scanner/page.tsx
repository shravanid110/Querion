"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Lock,
    ExternalLink,
    ChevronRight,
    Database,
    FileText,
    Fingerprint,
    Zap
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface ScanStep {
    id: string;
    label: string;
    status: 'pending' | 'scanning' | 'completed' | 'failed';
}

interface ScanResult {
    status: "safe" | "blocked";
    score: number;
    issues: string[];
    domain: string;
    fileSize: number;
    riskLevel: "Low" | "Medium" | "High";
}

export default function DatasetSecurityScanner() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [progress, setProgress] = useState(0);

    const steps: ScanStep[] = [
        { id: 'url', label: 'Validating URL structure', status: 'pending' },
        { id: 'domain', label: 'Checking domain trust level', status: 'pending' },
        { id: 'size', label: 'Verifying file size (max 5MB)', status: 'pending' },
        { id: 'script', label: 'Scanning for script injection', status: 'pending' },
        { id: 'sql', label: 'Detecting SQL keywords', status: 'pending' },
        { id: 'csv', label: 'Detecting CSV formula injection', status: 'pending' },
        { id: 'moderation', label: 'AI Content Moderation', status: 'pending' },
    ];

    const validateUrl = (value: string) => {
        if (!value) return "URL is required";
        if (!value.startsWith('https://')) return "Must be an HTTPS URL";
        if (!value.toLowerCase().endsWith('.csv')) return "Must be a .csv file";
        return "";
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUrl(val);
        setError(validateUrl(val));
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('source') === 'json') {
            const fileName = sessionStorage.getItem('pending_upload_name') || 'uploaded_file.json';
            setUrl(fileName);
            // Auto start scan for uploaded files
            setTimeout(() => {
                const btn = document.getElementById('initialize-scan-btn');
                btn?.click();
            }, 500);
        }
    }, [router]);

    const startScan = async () => {
        const isJsonUpload = new URLSearchParams(window.location.search).get('source') === 'json';
        
        if (!isJsonUpload) {
            const validationError = validateUrl(url);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        setIsScanning(true);
        setResult(null);
        setCurrentStepIndex(0);
        setProgress(0);

        // Simulate step-by-step progress UI
        for (let i = 0; i < steps.length; i++) {
            setCurrentStepIndex(i);
            setProgress((i + 1) * (100 / steps.length));
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        try {
            if (isJsonUpload) {
                const content = sessionStorage.getItem('pending_upload_json');
                const response = await axios.post('http://localhost:4000/api/security/scan-content', { 
                    content,
                    filename: url,
                    type: 'json'
                });
                setResult(response.data);
            } else {
                const response = await axios.post('http://localhost:4000/api/security/scan-url', { url });
                setResult(response.data);
            }
        } catch (err) {
            setError("Failed to connect to security backend.");
        } finally {
            setIsScanning(false);
            setProgress(100);
        }
    };

    const reset = () => {
        setResult(null);
        setCurrentStepIndex(-1);
        setProgress(0);
    };

    const proceed = () => {
        if (result?.status === 'safe') {
            const isJsonUpload = new URLSearchParams(window.location.search).get('source') === 'json';
            if (isJsonUpload) {
                // For JSON upload, we skip /connect and go straight to /interaction
                // But we need a connectionId. The 'scan-content' response should provide it.
                const cid = (result as any).connectionId;
                if (cid) {
                    router.push(`/interaction?id=${cid}`);
                } else {
                    // Fallback: manually connect it if scanning didn't (rare)
                    alert("Proceeding to dashboard...");
                    router.push('/dashboard');
                }
            } else {
                router.push(`/connect?url=${encodeURIComponent(url)}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4">
            {/* Background patterns */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [1, 0.8, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 mb-6"
                    >
                        <Shield className="w-12 h-12 text-blue-400" />
                    </motion.div>
                    <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                        Dataset Security Verification
                    </h1>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Your dataset is scanned for malicious scripts, SQL injections, and CSV formula vulnerabilities before processing.
                    </p>
                </div>

                {/* Main Content Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {!isScanning && !result ? (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Dataset URL (.csv)
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={handleUrlChange}
                                            placeholder="https://example.com/data.csv"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all font-mono text-sm"
                                        />
                                    </div>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="text-red-400 text-xs flex items-center gap-1.5 px-1 pt-1"
                                        >
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            {error}
                                        </motion.p>
                                    )}
                                </div>

                                <button
                                    id="initialize-scan-btn"
                                    onClick={startScan}
                                    disabled={(!!error && !new URLSearchParams(window.location.search).get('source')) || !url}
                                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 group"
                                >
                                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Initialize Security Scan
                                    <ChevronRight className="w-4 h-4 opacity-50" />
                                </button>
                            </motion.div>
                        ) : isScanning ? (
                            <motion.div
                                key="scanning"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full animate-pulse" />
                                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Analyzing Dataset Safety...</h3>
                                    <p className="text-slate-400 text-sm">Performing deep inspection on {url.startsWith('http') ? new URL(url).hostname : url}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <div className="grid gap-3">
                                        {steps.map((step, idx) => (
                                            <motion.div
                                                key={step.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${idx <= currentStepIndex
                                                        ? idx === currentStepIndex
                                                            ? 'bg-blue-500/10 border-blue-500/30'
                                                            : 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                                                        : 'bg-white/5 border-transparent opacity-30'
                                                    }`}
                                            >
                                                {idx < currentStepIndex ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : idx === currentStepIndex ? (
                                                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-slate-600" />
                                                )}
                                                <span className={`text-sm ${idx === currentStepIndex ? 'text-blue-100 font-medium' : 'text-slate-400'}`}>
                                                    {step.label}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className={`p-6 rounded-2xl border ${result.status === 'safe'
                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                        : 'bg-red-500/10 border-red-500/30'
                                    }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${result.status === 'safe' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                            }`}>
                                            {result.status === 'safe' ? (
                                                <ShieldCheck className={`w-8 h-8 ${result.status === 'safe' ? 'text-emerald-400' : 'text-red-400'}`} />
                                            ) : (
                                                <ShieldAlert className="w-8 h-8 text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold mb-1 ${result.status === 'safe' ? 'text-emerald-300' : 'text-red-300'
                                                }`}>
                                                {result.status === 'safe' ? 'Security Verification Passed' : 'Security Check Failed'}
                                            </h3>
                                            <p className="text-slate-400 text-sm">
                                                {result.status === 'safe'
                                                    ? 'This dataset appears safe to connect. All security protocols validated.'
                                                    : 'Potential risks were detected. Navigation blocked for safety reasons.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Score</p>
                                            <p className={`text-2xl font-bold ${result.score > 80 ? 'text-emerald-400' : result.score > 40 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                {result.score}%
                                            </p>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Risk Level</p>
                                            <p className={`text-2xl font-bold ${result.riskLevel === 'Low' ? 'text-emerald-400' : result.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                {result.riskLevel}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-black/30 p-2 px-3 rounded-lg border border-white/5 w-fit">
                                            <Fingerprint className="w-4 h-4" />
                                            Domain: <span className="text-slate-200 font-mono">{result.domain}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-black/30 p-2 px-3 rounded-lg border border-white/5 w-fit">
                                            <FileText className="w-4 h-4" />
                                            Size: <span className="text-slate-200">{result.fileSize} KB</span>
                                        </div>
                                    </div>

                                    {result.issues.length > 0 && (
                                        <div className="mt-6 p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                                            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Detected Issues</p>
                                            <ul className="space-y-2">
                                                {result.issues.map((issue, i) => (
                                                    <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                        {issue}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={reset}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-4 rounded-2xl transition-all border border-white/10"
                                    >
                                        Enter New URL
                                    </button>
                                    {result.status === 'safe' && (
                                        <button
                                            onClick={proceed}
                                            className="flex-[2] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                        >
                                            <Zap className="w-5 h-5" />
                                            Proceed to Connection
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer info */}
                <div className="mt-8 flex justify-center items-center gap-6 text-slate-500">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Lock className="w-3 h-3" />
                        AES-256 Encrypted
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="w-3 h-3" />
                        ISO 27001 Compliant
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <ExternalLink className="w-3 h-3" />
                        Veracode Verified
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
