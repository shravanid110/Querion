"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Database, Globe, LogIn, LogOut, ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
    connectionName?: string | null;
}

export const Navbar = ({ connectionName }: NavbarProps) => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        router.push('/');
        setDropdownOpen(false);
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] glass-nav px-6 py-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                        <Zap size={20} className="stroke-[2.5] fill-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-white tracking-tight leading-none group-hover:text-cyan-400 transition-colors">Querion</span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">AI Intelligence</span>
                    </div>
                </Link>

                <div className="hidden lg:flex items-center gap-8 ml-8">
                    <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</Link>
                    <Link href="/docs" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Documentation</Link>
                    <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">About</Link>
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

                {user ? (
                    /* ── Logged-in user profile ── */
                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-indigo-500/20">
                                {initials}
                            </div>
                            <div className="hidden sm:flex flex-col items-start leading-none">
                                <span className="text-white text-xs font-bold">{user.name}</span>
                                <span className="text-slate-500 text-[10px]">{user.email}</span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-white font-bold text-sm">{user.name}</p>
                                    <p className="text-slate-500 text-xs truncate">{user.email}</p>
                                </div>
                                <div className="p-2">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                                        <LogOut size={14} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Guest buttons ── */
                    <div className="flex items-center gap-2">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-300 hover:text-white hover:bg-white/10 gap-2 border border-white/5 bg-white/5 backdrop-blur-sm px-4">
                                <LogIn size={16} />
                                <span>Login</span>
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="hidden sm:flex bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white border-0 px-4 font-semibold shadow-lg shadow-indigo-500/20">
                                Sign Up
                            </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                            <Globe size={20} />
                        </Button>
                    </div>
                )}
            </div>
        </nav>
    );
};
