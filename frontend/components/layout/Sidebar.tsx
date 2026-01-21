import React from 'react';
import { cn } from '@/utils/cn';
import { LayoutDashboard, Database, History, Settings, FileBarChart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Database, label: 'Connections', href: '/dashboard/connections' },
    { icon: History, label: 'Query History', href: '/dashboard/history' },
    { icon: FileBarChart, label: 'Saved Reports', href: '/dashboard/reports' },
];

export const Sidebar = () => {
    // Mock active path logic since we only have /dashboard implemented for now
    const pathname = '/dashboard';

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

            <div className="mt-auto p-6 border-t border-gray-100">
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
