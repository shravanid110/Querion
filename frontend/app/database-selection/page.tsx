"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { DatabaseConnectionForm } from '@/components/connection/DatabaseConnectionForm';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const DATABASES = [
    { id: 'mysql', name: 'MySQL', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg', description: 'World\'s most popular open source database.' },
    { id: 'postgresql', name: 'PostgreSQL', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', description: 'Advanced open source relational database.' },
    { id: 'mongodb', name: 'MongoDB', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg', description: 'Flexible NoSQL document database.' },
    { id: 'sqlite', name: 'SQLite', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg', description: 'Small, fast, self-contained SQL engine.' },
    { id: 'redis', name: 'Redis', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg', description: 'Fast in-memory data store.' },
    { id: 'mariadb', name: 'MariaDB', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mariadb/mariadb-original.svg', description: 'Modern open source relational database.' },
    { id: 'supabase', name: 'Supabase', logo: 'https://raw.githubusercontent.com/supabase/supabase/master/packages/common/assets/images/supabase-logo.png', description: 'The open source Firebase alternative.' },
    { id: 'firebase', name: 'Firebase', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg', description: 'Google\'s mobile and web platform.' },
    { id: 'oracle', name: 'Oracle', logo: 'https://www.vectorlogo.zone/logos/oracle/oracle-icon.svg', description: 'Enterprise-grade relational database.' },
    { id: 'sqlserver', name: 'SQL Server', logo: 'https://www.vectorlogo.zone/logos/microsoft_sqlserver/microsoft_sqlserver-icon.svg', description: 'Enterprise database from Microsoft.' },
];

export default function DatabaseSelectionPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState<string | null>(null);

    const filteredDbs = DATABASES.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-mesh flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 flex flex-col pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="selection-view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full"
                    >
                        <div className="mb-12 space-y-4">
                            <Link href="/" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-bold uppercase tracking-widest w-fit mb-6">
                                <ArrowLeft size={16} /> Back to Home
                            </Link>
                            <h1 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Choose Your Database</h1>
                            <p className="text-[var(--text-secondary)] text-lg">Select the database you want Querion to connect with.</p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-12 max-w-2xl">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search size={20} className="text-[var(--text-secondary)]" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search databases..."
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-all text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Database Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredDbs.map((db, idx) => (
                                <motion.div
                                    key={db.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    whileHover={{ y: -5 }}
                                    onClick={() => {
                                        if (db.id === 'mysql') {
                                            setSelectedDb(db.name);
                                        } else {
                                            router.push(`/connect/${db.id}`);
                                        }
                                    }}
                                    className="group relative cursor-pointer flex flex-col p-6 rounded-[24px] glass-card border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 transition-all duration-300 shadow-xl"
                                >
                                    <div className="mb-6 bg-[var(--accent-glow)]/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-[var(--border-color)] group-hover:bg-[var(--accent-glow)]/20 transition-colors p-3">
                                        {db.logo.startsWith('http') ? (
                                            <img src={db.logo} alt={db.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Database size={32} className="text-[var(--accent-primary)]" />
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">{db.name}</h3>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 flex-1">
                                        {db.description}
                                    </p>

                                    <Button className="w-full h-11 rounded-xl bg-[var(--accent-glow)]/10 hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white border border-[var(--accent-primary)]/20 group-hover:border-[var(--accent-primary)] hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all duration-300 font-semibold text-sm">
                                        Connect
                                    </Button>

                                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-[24px] z-[-1] opacity-0 group-hover:opacity-10 transition-opacity" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Connection Modal */}
            <AnimatePresence>
                {selectedDb && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
                        onClick={() => setSelectedDb(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DatabaseConnectionForm
                                dbType={selectedDb}
                                onClose={() => setSelectedDb(null)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
