"use client";

import React from 'react';
import { cn } from '@/utils/cn';
import { LayoutDashboard, Database, History, Settings, FileBarChart, Link as LinkIcon, Activity, Shield, LifeBuoy, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Clock, label: 'Schedule prompt', href: '/dashboard/schedule' },
    { icon: LinkIcon, label: 'Connect URL', href: '/connect' },
    { icon: History, label: 'Query History', href: '/dashboard/history' },
    { icon: FileBarChart, label: 'Saved Reports', href: '/dashboard/reports' },
];

export const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className="w-64 glass-nav border-r border-white/5 flex-shrink-0 flex flex-col h-full fixed left-0 top-16 bottom-0 z-40 transition-all duration-300">
            <div className="flex flex-col py-8 space-y-1">
                <div className="px-6 mb-6">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Platform</h4>
                </div>
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-all duration-300 border-l-[3px]",
                                isActive
                                    ? "border-indigo-500 text-white bg-indigo-500/10 shadow-[inset_1px_0_0_0_rgba(99,102,241,0.2)]"
                                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={18} className={cn("transition-colors duration-300", isActive ? "text-indigo-400" : "text-slate-500")} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto p-6 space-y-6">
                {/* Intel Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Shield size={60} className="text-cyan-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-cyan-400" />
                        <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">Live Intel</span>
                    </div>
                    <p className="text-[10px] text-slate-300 mb-3 leading-relaxed">System operating at 99.8% efficiency.</p>
                    <Link href="/monitoring">
                        <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all border-0">
                            View Dashboard
                        </button>
                    </Link>
                </div>

                <div className="space-y-3">
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        <Settings size={16} />
                        Settings
                    </Link>
                    <Link
                        href="/support"
                        className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                        <LifeBuoy size={16} />
                        Support
                    </Link>
                </div>
            </div>
        </aside>
    );
};
