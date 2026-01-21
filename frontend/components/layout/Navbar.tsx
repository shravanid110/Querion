import React from 'react';
import { Database, User, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface NavbarProps {
    connectionName?: string | null;
}

export const Navbar = ({ connectionName }: NavbarProps) => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                        <Database size={24} className="stroke-[2.5]" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">
                        Querion
                    </span>
                </div>
                <div className="hidden md:block w-px h-6 bg-gray-200 mx-2" />
                <span className="hidden md:block text-sm text-gray-500 font-medium">
                    Ask your database questions in plain English
                </span>
            </div>

            <div className="flex items-center gap-4">
                {/* Connection Status Indicator */}
                <div className={cn(
                    "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300",
                    connectionName ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600"
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        connectionName ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-yellow-500 animate-pulse"
                    )} />
                    <span>{connectionName ? `Connected: ${connectionName}` : "Not Connected"}</span>
                </div>

                <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0 text-gray-500">
                    <Globe size={20} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full w-10 h-10 p-0 overflow-hidden border border-gray-100 shadow-sm">
                    <div className="bg-indigo-100 text-indigo-700 w-full h-full flex items-center justify-center font-bold">
                        U
                    </div>
                </Button>
            </div>
        </nav>
    );
};
