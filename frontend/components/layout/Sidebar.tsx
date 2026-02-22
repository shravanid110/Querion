import React from 'react';
import { cn } from '@/utils/cn';
import { LayoutDashboard, Database, History, Settings, FileBarChart, Link as LinkIcon, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Database, label: 'Connections', href: '/dashboard/connections' },
    { icon: LinkIcon, label: 'Connect URL', href: '/connect' },
    { icon: History, label: 'Query History', href: '/dashboard/history' },
    { icon: FileBarChart, label: 'Saved Reports', href: '/dashboard/reports' },
];

export const Sidebar = () => {
    // Mock active path logic since we only have /dashboard implemented for now
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col h-full bg-white/80 backdrop-blur-xl fixed left-0 top-16 bottom-0 z-40 transition-all duration-300">
            <div className="flex flex-col py-6 space-y-1">
                <div className="px-6 mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</h4>
                </div>
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors duration-200 border-l-2",
                                isActive
                                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            <item.icon size={18} className={isActive ? "text-indigo-600" : "text-gray-400"} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto p-5 border-t border-gray-100 space-y-4">
                {/* Backend Monitoring Button */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tools</p>
                    <Link
                        href="/monitoring"
                        id="backend-monitoring-btn"
                        className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-200/60 group"
                    >
                        {/* Pulsing live indicator */}
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300"></span>
                        </span>
                        <span className="flex-1">Backend Monitoring</span>
                        <Activity className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </div>

                {/* Settings link */}
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <Settings size={18} />
                    Settings
                </Link>
            </div>
        </aside>
    );
};
