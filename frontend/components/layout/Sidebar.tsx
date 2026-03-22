"use client";

import React from 'react';
import { cn } from '@/utils/cn';
import { LayoutDashboard, Database, History, Settings, FileBarChart, Link as LinkIcon, Activity, Shield, LifeBuoy, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Ask Querion', href: '/dashboard' },
    { icon: Clock, label: 'Schedule prompt', href: '/dashboard/schedule' },
    { icon: LinkIcon, label: 'Connect URL', href: '/connect' },
    { icon: History, label: 'Query History', href: '/dashboard/history' },
    { icon: FileBarChart, label: 'Saved Reports', href: '/dashboard/reports' },
];

export const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className="w-64 glass-nav border-r border-[var(--border-color)] flex-shrink-0 flex flex-col h-full fixed left-0 top-16 bottom-0 z-40 transition-all duration-300">
            <div className="flex flex-col py-8 space-y-1">
                <div className="px-6 mb-6">
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">Platform</h4>
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
                                    ? "border-[var(--accent-primary)] text-[var(--text-primary)] bg-[var(--accent-glow)] shadow-[inset_1px_0_0_0_var(--accent-glow)]"
                                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                            )}
                        >
                            <item.icon size={18} className={cn("transition-colors duration-300", isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]")} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto p-6 space-y-6">
                {/* Intel Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl overflow-hidden relative group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Shield size={60} className="text-[var(--accent-primary)]" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-[var(--accent-primary)]" />
                        <span className="text-[10px] font-bold text-[var(--accent-primary)] tracking-widest uppercase">Live Intel</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] mb-3 leading-relaxed">System operating at 99.8% efficiency.</p>
                    <Link href="/monitoring">
                        <button className="w-full py-2 bg-[var(--accent-primary)] hover:opacity-90 text-white text-[10px] font-bold rounded-lg transition-all border-0 shadow-lg shadow-[var(--accent-glow)]">
                            View Dashboard
                        </button>
                    </Link>
                </div>

                <div className="space-y-3">
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest"
                    >
                        <Settings size={16} />
                        Settings
                    </Link>
                    <Link
                        href="/support"
                        className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest"
                    >
                        <LifeBuoy size={16} />
                        Support
                    </Link>
                </div>
            </div>
        </aside>
    );
};
