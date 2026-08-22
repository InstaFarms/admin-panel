"use client";

import { useState, useEffect } from "react";

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

import { Period, AnalyticsResult } from "@/types/dashboard";

import { formatCurrency, getDateRangeFromWeek } from "@/lib/dashboardUtils";

interface DashboardChartProps {
    title: string;
    metric: "bookings" | "revenue"; // Used for specific formatting if needed
    color: string;
    fetchAction: (period: Period) => Promise<AnalyticsResult>;
}

export default function DashboardChart({ title, metric, color, fetchAction }: DashboardChartProps) {
    const [period, setPeriod] = useState<Period>("daily");
    const [data, setData] = useState<AnalyticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchData(period);
    }, [period]);

    const fetchData = async (selectedPeriod: Period) => {
        setLoading(true);
        setError(false);
        try {
            const result = await fetchAction(selectedPeriod);
            // Sort data by date just in case
            if (result && result.chartData) {
                result.chartData.sort((a, b) => a.date.localeCompare(b.date));
            }
            setData(result);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Format date label
            let formattedDate = label;
            try {
                if (period === "daily") {
                    const d = new Date(label);
                    formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                } else if (period === "monthly") {
                    const [year, month] = label.split("-");
                    formattedDate = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                } else if (period === "weekly") {
                    const range = getDateRangeFromWeek(label);
                    if (range) {
                        const startStr = range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        const endStr = range.end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        formattedDate = `${startStr} - ${endStr}`;
                    }
                }
            } catch (e) {
                formattedDate = label;
            }

            const value = payload[0].value;
            const formattedValue = metric === "revenue" ? formatCurrency(value) : value;

            return (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 min-w-[150px] z-50">
                    <p className="text-sm font-medium text-gray-500 mb-2">📅 {formattedDate}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300 mr-4 font-medium">{title}:</span>
                        <span className="font-bold text-gray-900 dark:text-white" style={{ color }}>
                            {formattedValue}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const formattedTotal = data
        ? (metric === "revenue" ? formatCurrency(data.total) : data.total)
        : (metric === "revenue" ? "₹0" : "0");

    const bgClass = metric === "revenue"
        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
        : "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30";

    const textClass = metric === "revenue"
        ? "text-blue-600 dark:text-blue-400"
        : "text-green-600 dark:text-green-400";

    const totalClass = metric === "revenue"
        ? "text-blue-900 dark:text-blue-100"
        : "text-green-900 dark:text-green-100";

    return (
        <div className={`p-6 rounded-xl border ${bgClass}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                <div>
                    <p className={`text-sm font-medium ${textClass} mb-1`}>
                        {title} ({period === "daily" ? "Last 12 Days" : period === "weekly" ? "Last 12 Weeks" : "Last 12 Months"})
                    </p>
                    <h3 className={`text-3xl font-bold ${totalClass}`}>
                        {loading ? "..." : formattedTotal}
                    </h3>
                </div>

                {/* Independent Toggle */}
                <div className="bg-white/50 dark:bg-gray-800/50 p-1 rounded-full flex self-end sm:self-auto border border-gray-200 dark:border-gray-700">
                    {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 capitalize ${period === p
                                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2`} style={{ borderColor: color }}></div>
                    </div>
                ) : error ? (
                    <div className="h-full w-full flex items-center justify-center text-red-500">
                        Failed to load data
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data?.chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                stroke="#9ca3af"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => {
                                    if (!value) return "";
                                    try {
                                        if (period === "daily") {
                                            const d = new Date(value);
                                            return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
                                        } else if (period === "monthly") {
                                            const [year, month] = value.split("-");
                                            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                                        } else if (period === "weekly") {
                                            const range = getDateRangeFromWeek(value);
                                            if (range) {
                                                return range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                            }
                                            return value;
                                        }
                                    } catch {
                                        return value;
                                    }
                                    return value;
                                }}
                                dy={10}
                            />
                            <YAxis
                                orientation="left"
                                stroke={color}
                                tick={{ fill: color, fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => {
                                    if (metric === "revenue") {
                                        if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                    }
                                    return `${value}`;
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill={`url(#color${metric})`}
                                name={title}
                                activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
