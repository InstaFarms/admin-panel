"use client";

import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface TrafficData {
    date: string;
    count: number;
}

export default function TrafficChart() {
    const [data, setData] = useState<TrafficData[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/analytics/traffic');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    setError(true);
                }
            } catch (e) {
                console.error(e);
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-80 w-full items-center justify-center rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <div className="flex h-80 w-full items-center justify-center rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">No traffic data available</p>
            </div>
        );
    }

    return (
        <div className="h-80 w-full rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Website Traffic (Last 7 Days)
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 20,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                color: '#f3f4f6',
                                borderRadius: '0.375rem'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            activeDot={{ r: 8 }}
                            dot={{ r: 4, strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
