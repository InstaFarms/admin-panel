"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

import { format, parseISO } from "date-fns";
import { useEffect, useRef } from "react";

import { WeeklyABVData } from "@/utils/types";

import { formatINR } from "@/lib/dashboardUtils";

import ABVChartTooltip from "@/components/dashboard/ABVChartTooltip";

import { SkeletonChart } from "@/components/ui/Skeleton";

interface WeeklyABVChartProps {
    data: WeeklyABVData[];
    loading: boolean;
    error: boolean;
}

export default function WeeklyABVChart({ data, loading, error }: WeeklyABVChartProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    // Fades/slides the chart card in every time it mounts fresh with real data -
    // covers first load and every subsequent filter change (loading swaps this
    // div out for SkeletonChart and back, so it's a genuine remount each time).
    useEffect(() => {
        if (loading || error || !data || data.length === 0 || !cardRef.current) return;
        import("gsap").then(({ gsap }) => {
            if (cardRef.current) {
                gsap.from(cardRef.current, { y: 16, opacity: 0, duration: 0.4, ease: "power3.out" });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    if (loading) {
        return <SkeletonChart height="h-[420px]" />;
    }

    if (error) {
        return (
            <div className="h-[420px] w-full flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="text-red-500">Failed to load weekly data</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[420px] w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-gray-400">No data available for selected range</div>
            </div>
        );
    }

    // Format week label for X-axis: "Apr 1 – Apr 7"
    const formatWeekLabel = (weekStart: string) => {
        const entry = data.find(d => d.weekStart === weekStart);
        if (!entry) return weekStart;
        const start = format(parseISO(entry.weekStart), "MMM d");
        const end = format(parseISO(entry.weekEnd), "MMM d");
        return `${start} – ${end}`;
    };

    return (
        <div ref={cardRef} className="h-[420px] w-full bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Bookings & Average Booking Value</h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400">Weekly Bookings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-blue-800 dark:bg-blue-300 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Booking Value</span>
                    </div>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%" minHeight={340}>
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.6} />

                    <XAxis
                        dataKey="weekStart"
                        tickFormatter={formatWeekLabel}
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        dy={20}
                        interval={0}
                        angle={-20}
                    />

                    {/* Left Y-Axis: Bookings count */}
                    <YAxis
                        yAxisId="left"
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        label={{ value: 'Bookings', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#9ca3af', fontSize: 11 } }}
                    />

                    {/* Right Y-Axis: ABV (₹) */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatINR}
                        label={{ value: 'ABV (₹)', angle: 90, position: 'insideRight', offset: 10, style: { fill: '#9ca3af', fontSize: 11 } }}
                    />

                    <Tooltip content={<ABVChartTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.06)' }} />

                    {/* Bars: Weekly bookings */}
                    <Bar
                        yAxisId="left"
                        dataKey="bookings"
                        fill="#60a5fa"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                        isAnimationActive={true}
                    />

                    {/* Line: ABV (broken when null) */}
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="abv"
                        stroke="#1e3a5f"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#1e3a5f', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        connectNulls={false}
                        isAnimationActive={true}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
