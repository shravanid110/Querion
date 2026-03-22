"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { 
    Search, ChevronRight, Copy, Check, Terminal, 
    Book, Shield, Zap, Database, Activity, 
    Code, Server, Globe, Cpu, Lock, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const sidebarSections = [
    {
        title: "Getting Started",
        items: [
            { id: "intro", title: "Introduction", icon: <Book size={16} /> },
            { id: "how-it-works", title: "How Querion Works", icon: <Cpu size={16} /> }
        ]
    },
    {
        title: "Database Connection",
        items: [
            { id: "mysql", title: "MySQL", icon: <Database size={16} /> },
            { id: "postgres", title: "PostgreSQL", icon: <Database size={16} /> },
            { id: "mongodb", title: "MongoDB", icon: <Database size={16} /> }
        ]
    },
    {
        title: "AI Query System",
        items: [
            { id: "nl-to-sql", title: "Natural Language to SQL", icon: <MessageCircle size={16} /> },
            { id: "example-queries", title: "Example Queries", icon: <Zap size={16} /> }
        ]
    },
    {
        title: "Data Visualization",
        items: [
            { id: "charts", title: "Charts", icon: <Activity size={16} /> },
            { id: "insights", title: "Insights", icon: <Zap size={16} /> }
        ]
    },
    {
        title: "Security",
        items: [
            { id: "encryption", title: "SHA-256 Encryption", icon: <Lock size={16} /> },
            { id: "privacy", title: "Data Privacy", icon: <Shield size={16} /> }
        ]
    },
    {
        title: "API Reference",
        items: [
            { id: "auth", title: "Authentication", icon: <Lock size={16} /> },
            { id: "endpoints", title: "Endpoints", icon: <Server size={16} /> },
            { id: "request-response", title: "Request & Response", icon: <Terminal size={16} /> }
        ]
    },
    {
        title: "Support",
        items: [
            { id: "faq", title: "FAQ", icon: <HelpCircle size={16} /> }
        ]
    }
];

function MessageCircle({ size, className }: { size?: number, className?: string }) {
    return <Globe size={size} className={className} />; // Placeholder as MessageCircle was missing in import
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("intro");
    const [activeTab, setActiveTab] = useState("javascript");
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const codeExamples: any = {
        javascript: `fetch('https://api.querion.ai/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    query: "Show patients age below 52",
    database_id: "123"
  })
})
.then(res => res.json())
.then(data => console.log(data));`,
        python: `import requests

url = "https://api.querion.ai/v1/query"
payload = {
    "query": "Show patients age below 52",
    "database_id": "123"
}
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
        curl: `curl -X POST https://api.querion.ai/v1/query \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "query": "Show patients age below 52",
    "database_id": "123"
  }'`
    };

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans">
            <Navbar />
            
            <div className="flex pt-20 h-screen overflow-hidden">
                {/* ─── LEFT SIDEBAR ─────────────────────────────────────── */}
                <aside className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-nav)] backdrop-blur-xl hidden lg:block custom-scrollbar overflow-y-auto">
                    <div className="p-8 space-y-8">
                        {sidebarSections.map((section) => (
                            <div key={section.title} className="space-y-3">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] px-2">
                                    {section.title}
                                </h5>
                                <ul className="space-y-1">
                                    {section.items.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => setActiveSection(item.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group
                                                    ${activeSection === item.id 
                                                        ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)]' 
                                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
                                            >
                                                <span className={`${activeSection === item.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]'} transition-colors`}>
                                                    {item.icon}
                                                </span>
                                                {item.title}
                                                {activeSection === item.id && (
                                                    <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-[var(--accent-primary)] rounded-full" />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ─── MAIN CONTENT AREA ────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-main)] p-8 lg:p-12">
                    <div className="max-w-4xl mx-auto space-y-16 pb-24">
                        
                        {/* ── Top section: Search & Breadcrumbs ── */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[var(--border-color)]">
                            <nav className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                <span className="hover:text-[var(--text-primary)] cursor-pointer">Docs</span>
                                <ChevronRight size={12} />
                                <span className="hover:text-[var(--text-primary)] cursor-pointer">API</span>
                                <ChevronRight size={12} />
                                <span className="text-[var(--text-primary)]">Query Endpoint</span>
                            </nav>
                            
                            <div className="relative group max-w-sm w-full">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search Docs..." 
                                    className="w-full h-11 pl-12 pr-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* ── Section: Introduction ── */}
                        <section id="intro" className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--text-primary)]">
                                Welcome to Querion Documentation
                            </h1>
                            <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                                Querion is an AI-powered data intelligence platform designed for developers and data-driven organizations. 
                                We provide a unified interface to securely interact with any database using natural language, monitor your backend infrastructure, and visualize results instantly.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="p-6 rounded-2xl glass-card space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <Zap size={20} className="text-indigo-400" />
                                    </div>
                                    <h4 className="font-bold">Next-Gen AI</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">State-of-the-art models for precise SQL generation and intelligent system analysis.</p>
                                </div>
                                <div className="p-6 rounded-2xl glass-card space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                        <Shield size={20} className="text-cyan-400" />
                                    </div>
                                    <h4 className="font-bold">Enterprise Security</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">Your data never leaves your infrastructure. Secure API handling and isolation at every layer.</p>
                                </div>
                            </div>
                        </section>

                        {/* ── Section: How It Works ── */}
                        <section id="how-it-works" className="space-y-8">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <Cpu size={28} className="text-[var(--accent-primary)]" />
                                How It Works
                            </h2>
                            <p className="text-[var(--text-secondary)]">
                                Querion acts as an intelligent bridge between you and your data. Here is the lifecycle of a query:
                            </p>
                            
                            <div className="relative py-12 px-6 rounded-3xl bg-[var(--bg-nav)] border border-[var(--border-color)] overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-glow)] to-transparent pointer-events-none" />
                                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 py-4">
                                    {[
                                        { label: "User Query", icon: <MessageCircle size={20} />, color: "bg-indigo-500" },
                                        { label: "AI Translation", icon: <Cpu size={20} />, color: "bg-purple-500" },
                                        { label: "SQL Execution", icon: <Terminal size={20} />, color: "bg-blue-500" },
                                        { label: "DB Engine", icon: <Database size={20} />, color: "bg-cyan-500" },
                                        { label: "Visualization", icon: <Activity size={20} />, color: "bg-emerald-500" }
                                    ].map((step, i, arr) => (
                                        <React.Fragment key={step.label}>
                                            <div className="flex flex-col items-center gap-4 text-center group">
                                                <div className={`w-14 h-14 rounded-2xl ${step.color} shadow-lg shadow-${step.color.split('-')[1]}-500/20 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                                                    {step.icon}
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{step.label}</span>
                                            </div>
                                            {i < arr.length - 1 && (
                                                <div className="hidden md:block">
                                                    <ChevronRight size={24} className="text-[var(--text-secondary)] opacity-30" />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ── Section: API Example ── */}
                        <section id="api-example" className="space-y-8">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <Code size={28} className="text-[var(--accent-primary)]" />
                                API Reference
                            </h2>
                            <p className="text-[var(--text-secondary)]">
                                Use our REST API to integrate Querion intelligence directly into your own applications and workflows.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-lg">POST</span>
                                    <span className="font-mono text-sm">/api/v1/query</span>
                                </div>
                                
                                <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[#0d1117]">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-slate-900/50">
                                        <div className="flex gap-4">
                                            {['javascript', 'python', 'curl'].map(tab => (
                                                <button 
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-[var(--accent-primary)]' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => copyToClipboard(codeExamples[activeTab])}
                                            className="text-slate-400 hover:text-white transition-colors"
                                            title="Copy Code"
                                        >
                                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <pre className="text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto custom-scrollbar">
                                            {codeExamples[activeTab]}
                                        </pre>
                                    </div>
                                </div>
                                
                                <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Terminal size={16} className="text-purple-400" />
                                        Expected Response
                                    </h4>
                                    <pre className="text-xs font-mono text-slate-400 bg-black/20 p-4 rounded-xl leading-relaxed">
{`{
  "status": "success",
  "data": {
    "sql": "SELECT * FROM patients WHERE age < 52",
    "execution_time": "142ms",
    "results": [
      { "id": 1, "name": "John Doe", "age": 45 },
      { "id": 2, "name": "Jane Smith", "age": 31 }
    ]
  }
}`}
                                    </pre>
                                </div>
                            </div>
                        </section>

                        {/* ── Section: Security ── */}
                        <section id="security" className="space-y-8">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <Shield size={28} className="text-emerald-400" />
                                Built with Security
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { title: "SHA-256 Encryption", desc: "All sensitive credentials and database strings are encrypted at rest using industry-standard protocols.", icon: <Lock className="text-indigo-400" /> },
                                    { title: "Secure API Access", desc: "Signed API tokens with granular scoping ensure only authorized services can interact with your data.", icon: <Server className="text-cyan-400" /> },
                                    { title: "Data Isolation", desc: "Queries are executed in isolated environments to prevent cross-contamination and ensure privacy.", icon: <Globe className="text-purple-400" /> }
                                ].map(item => (
                                    <div key={item.title} className="p-8 rounded-3xl bg-[var(--bg-nav)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 transition-all group">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            {item.icon}
                                        </div>
                                        <h4 className="font-bold text-lg mb-3 tracking-tight">{item.title}</h4>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── Section: FAQ ── */}
                        <section id="faq" className="space-y-8">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <HelpCircle size={28} className="text-indigo-400" />
                                Frequently Asked Questions
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { q: "Is my database data stored by Querion?", a: "No. Querion only processes your queries and temporary results to generate visualizations. Your actual data remains in your database." },
                                    { q: "Which databases are supported?", a: "Currently we support MySQL, PostgreSQL, and MongoDB. We are working on adding support for Redis and Snowflake soon." },
                                    { q: "Can I use the API for free?", a: "Yes, our Developer plan includes up to 1,000 API calls per month for testing and small projects." }
                                ].map(faq => (
                                    <div key={faq.q} className="p-6 rounded-2xl glass-card space-y-2 border border-[var(--border-color)] hover:border-indigo-500/20 transition-all">
                                        <h4 className="font-black text-[var(--text-primary)]">{faq.q}</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--text-secondary);
                }
            `}</style>
        </div>
    );
}
