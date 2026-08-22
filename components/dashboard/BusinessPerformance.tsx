"use client";

import { Card } from "flowbite-react";

import { useEffect, useState } from "react";

import TrendChart from "@/components/dashboard/TrendChart";
import DashboardControlBar from "@/components/dashboard/DashboardControlBar";

import type { DashboardCityOption, DashboardFilters, DashboardStateOption, TrendChartData } from "@/utils/types";

import { getBookingsAnalytics } from "@/actions/dashboardActions";

interface BusinessPerformanceProps {
    initialFilters: DashboardFilters;
    states: DashboardStateOption[];
    cities: DashboardCityOption[];
}

export default function BusinessPerformance({ initialFilters, states, cities }: BusinessPerformanceProps) {
    const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters);

    const [data, setData] = useState<TrendChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const result = await getBookingsAnalytics(filters);
                setData(result || []);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    return (
        <Card className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div>
                    <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Booking Analytics
                    </h5>
                    <p className="text-sm text-gray-500 mt-1">
                        Track daily bookings and 7-day moving averages
                    </p>
                </div>

                {/* Controls */}
                <DashboardControlBar
                    filters={filters}
                    onFilterChange={setFilters}
                    states={states}
                    cities={cities}
                />

                {/* Chart */}
                <div className="mt-2">
                    <TrendChart
                        data={data}
                        loading={loading}
                        error={error}
                    />
                </div>
            </div>
        </Card>
    );
}
