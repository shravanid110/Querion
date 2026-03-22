"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
    Database, Globe, LogIn, LogOut, ChevronDown, Zap, 
    Palette, Moon, Sun, Monitor, Sparkles, LayoutDashboard,
    Layers, BookOpen, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
    connectionName?: string | null;
}

export const Navbar = ({ connectionName }: NavbarProps) => {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [themeOpen, setThemeOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/');
        setDropdownOpen(false);
    };

    const themes = [
        { id: 'dark-classic', name: 'Dark Classic', icon: <Moon size={14} />, colors: ['#020617', '#6366f1'] },
        { id: 'dark-neon', name: 'Dark Neon', icon: <Zap size={14} />, colors: ['#0B0B0F', '#3b82f6'] },
        { id: 'light-minimal', name: 'Light Minimal', icon: <Sun size={14} />, colors: ['#F8FAFC', '#2563eb'] },
        { id: 'light-elegant', name: 'Light Elegant', icon: <Sparkles size={14} />, colors: ['#FFFDF8', '#9f7aea'] },
        { id: 'aurora-ai', name: 'Aurora AI', icon: <Layers size={14} />, colors: ['#0F172A', '#2dd4bf'] },
    ];

    const navLinks = [
        { name: 'Home', href: '/', icon: <Zap size={16} /> },
        { name: 'Features', href: '/#features', icon: <Layers size={16} /> },
        { name: 'Database Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
        { name: 'Docs / API', href: '/docs', icon: <BookOpen size={16} /> },
        { name: 'About Us', href: '/about', icon: <Info size={16} /> },
    ];

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 ${scrolled ? 'py-3 glass-nav shadow-lg' : 'py-5 bg-transparent'}`}>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 group">
                        <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 p-2 rounded-xl text-white shadow-xl shadow-indigo-500/20">
                            <Zap size={20} className="stroke-[2.5] fill-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--accent-primary)] tracking-tighter leading-none">Querion</span>
                            <span className="text-[10px] text-[var(--text-secondary)] font-black tracking-widest uppercase mt-1 opacity-70">An Intelligent Platform</span>
                        </div>
                    </Link>

                    <div className="hidden xl:flex items-center gap-1 ml-6">
                        {navLinks.map((link) => (
                            <Link 
                                key={link.name} 
                                href={link.href} 
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold tracking-tight transition-all duration-300 
                                    ${pathname === link.href 
                                        ? 'text-[var(--accent-primary)] bg-[var(--accent-glow)]' 
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]'}`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Connection Status */}
                    {connectionName && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                            <span>Connected: {connectionName}</span>
                        </div>
                    )}

                    {/* Theme Switcher */}
                    <div className="relative">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setThemeOpen(!themeOpen)}
                            className="rounded-full w-10 h-10 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] relative"
                            title="Change Theme"
                        >
                            <Palette size={20} />
                        </Button>

                        <AnimatePresence>
                            {themeOpen && (
                                <>
                                    <div className="fixed inset-0 z-[-1]" onClick={() => setThemeOpen(false)} />
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-64 rounded-2xl glass-card p-2 shadow-2xl z-50 border border-[var(--border-color)]"
                                    >
                                        <div className="px-3 py-2 mb-1">
                                            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Select Theme</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            {themes.map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setTheme(t.id as any);
                                                        setThemeOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group
                                                        ${theme === t.id ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)]' : 'hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-main)] border border-[var(--border-color)] group-hover:border-[var(--accent-primary)]/50 transition-colors">
                                                            {t.icon}
                                                        </div>
                                                        <span className="text-sm font-semibold">{t.name}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {t.colors.map((c, i) => (
                                                            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                                                        ))}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-indigo-500/20">
                                    {initials}
                                </div>
                                <div className="hidden sm:flex flex-col items-start leading-none">
                                    <span className="text-[var(--text-primary)] text-xs font-bold">{user.name}</span>
                                    <span className="text-[var(--text-secondary)] text-[10px]">{user.email}</span>
                                </div>
                                <ChevronDown size={14} className={`text-[var(--text-secondary)] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[-1]" onClick={() => setDropdownOpen(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-56 rounded-2xl glass-card overflow-hidden shadow-2xl z-50 border border-[var(--border-color)]"
                                        >
                                            <div className="px-4 py-3 border-b border-[var(--border-color)]">
                                                <p className="text-[var(--text-primary)] font-bold text-sm">{user.name}</p>
                                                <p className="text-[var(--text-secondary)] text-xs truncate">{user.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                                                    <LogOut size={14} />
                                                    Sign out
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="hidden sm:flex text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] gap-2 border border-[var(--border-color)] bg-white/5 backdrop-blur-sm px-4">
                                    <LogIn size={16} />
                                    <span>Login</span>
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm" className="hidden sm:flex bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white border-0 px-4 font-semibold shadow-lg shadow-indigo-500/20">
                                    Sign Up
                                </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]">
                                <Globe size={20} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
