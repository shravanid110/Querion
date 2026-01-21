import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'indigo' | 'blue' | 'emerald' | 'violet';
}

const colorStyles = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
};

export const MetricCard = ({ label, value, subValue, icon: Icon, trend, trendValue, color = 'indigo' }: MetricCardProps) => {
    return (
        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{label}</p>
                        <div className="mt-1 flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                            {subValue && <span className="text-sm text-gray-400">{subValue}</span>}
                        </div>
                    </div>
                    <div className={cn("p-2 rounded-lg border", colorStyles[color])}>
                        <Icon size={20} />
                    </div>
                </div>
                {trend && (
                    <div className="mt-4 flex items-center gap-2">
                        <span className={cn(
                            "text-xs font-medium px-1.5 py-0.5 rounded",
                            trend === 'up' ? "bg-green-100 text-green-700" :
                                trend === 'down' ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                        )}>
                            {trendValue}
                        </span>
                        <span className="text-xs text-gray-400">vs last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
