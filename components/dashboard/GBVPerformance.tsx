"use client";

import { Card } from "flowbite-react";

import { useEffect, useState } from "react";

import GBVTrendChart from "@/components/dashboard/GBVTrendChart";
import DashboardControlBar from "@/components/dashboard/DashboardControlBar";

import type { DashboardCityOption, DashboardFilters, DashboardStateOption, GBVTrendChartData } from "@/utils/types";

import { getGBVAnalytics } from "@/actions/dashboardActions";

interface GBVPerformanceProps {
    initialFilters: DashboardFilters;
    states: DashboardStateOption[];
    cities: DashboardCityOption[];
}

export default function GBVPerformance({ initialFilters, states, cities }: GBVPerformanceProps) {
    const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters);

    const [gbvData, setGbvData] = useState<GBVTrendChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const result = await getGBVAnalytics(filters);
                setGbvData(result || []);
            } catch (err) {
                console.error("Failed to fetch GBV data:", err);
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
                        GBV Analytics
                    </h5>
                    <p className="text-sm text-gray-500 mt-1">
                        Track daily Gross Booking Value and 7-day moving averages
                    </p>
                </div>

                {/* Controls */}
                <DashboardControlBar
                    filters={filters}
                    onFilterChange={setFilters}
                    states={states}
                    cities={cities}
                />

                {/* GBV Chart */}
                <div className="mt-2">
                    <GBVTrendChart
                        data={gbvData}
                        loading={loading}
                        error={error}
                    />
                </div>
            </div>
        </Card>
    );
}
