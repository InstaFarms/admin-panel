"use client";

import { ResponsiveContainer, ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import { format, parseISO } from "date-fns";
import { useEffect, useRef } from "react";

import { TrendChartData } from "@/utils/types";

import ChartTooltip from "@/components/dashboard/ChartTooltip";

import { SkeletonChart } from "@/components/ui/Skeleton";

interface TrendChartProps {
    data: TrendChartData[];
    loading: boolean;
    error: boolean;
}

export default function TrendChart({ data, loading, error }: TrendChartProps) {
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
        return <SkeletonChart height="h-[400px]" />;
    }

    if (error) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="text-red-500">Failed to load chart data</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-gray-400">No data available for selected range</div>
            </div>
        );
    }

    // Compute max bookings for the weekend background bar height
    const maxBookings = Math.max(...data.map(d => Math.max(d.bookings, d.movingAverage)), 1);

    // Weekend background data: assign maxBookings for weekends, 0 otherwise
    const chartData = data.map(d => ({
        ...d,
        weekendBg: d.isWeekend ? maxBookings * 1.2 : 0,
    }));

    return (
        <div ref={cardRef} className="h-[400px] w-full bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Booking Trends</h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">7-Day Moving Avg</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-gray-300 rounded-full opacity-50"></div>
                        <span className="text-gray-500 dark:text-gray-500">Daily Bookings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-1.5 bg-gray-400/20 rounded-sm"></div>
                        <span className="text-gray-500 dark:text-gray-500">Weekend</span>
                    </div>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                    <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.6} />

                    {/* Weekend Shading via background Bar */}
                    <Bar dataKey="weekendBg" isAnimationActive={false} barSize={20}>
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`weekend-${index}`}
                                fill={entry.isWeekend ? "#9ca3af" : "transparent"}
                                fillOpacity={entry.isWeekend ? 0.08 : 0}
                            />
                        ))}
                    </Bar>

                    <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(parseISO(value), "MMM d")}
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        dy={20}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />

                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    {/* Layer 1: The Ghost Line (Daily Bookings) */}
                    <Line
                        type="monotone"
                        dataKey="bookings"
                        stroke="#9ca3af"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={false}
                        strokeOpacity={0.4}
                        isAnimationActive={false}
                    />

                    {/* Layer 2: The Hero Line (7-Day SMA) */}
                    <Line
                        type="monotone"
                        dataKey="movingAverage"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        isAnimationActive={true}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
