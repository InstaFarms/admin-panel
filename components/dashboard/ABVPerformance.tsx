"use client";

import { Card } from "flowbite-react";

import { useEffect, useState } from "react";

import DashboardControlBar from "@/components/dashboard/DashboardControlBar";
import WeeklyABVChart from "@/components/dashboard/WeeklyABVChart";

import type { DashboardCityOption, DashboardFilters, DashboardStateOption, WeeklyABVData } from "@/utils/types";

import { getWeeklyABVAnalytics } from "@/actions/dashboardActions";

import { WEEKLY_PRESETS } from "@/constants/dashboard";

interface ABVPerformanceProps {
    initialFilters: DashboardFilters;
    states: DashboardStateOption[];
    cities: DashboardCityOption[];
}

export default function ABVPerformance({ initialFilters, states, cities }: ABVPerformanceProps) {
    const [filters, setFilters] = useState<DashboardFilters>(() => initialFilters);

    const [data, setData] = useState<WeeklyABVData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(false);
            try {
                const result = await getWeeklyABVAnalytics(filters);
                setData(result || []);
            } catch (err) {
                console.error("Failed to fetch ABV data:", err);
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
                        Weekly ABV Analytics
                    </h5>
                    <p className="text-sm text-gray-500 mt-1">
                        Weekly booking volume and average booking value
                    </p>
                </div>

                {/* Controls */}
                <DashboardControlBar
                    filters={filters}
                    onFilterChange={setFilters}
                    datePresets={WEEKLY_PRESETS}
                    states={states}
                    cities={cities}
                />

                {/* Chart */}
                <div className="mt-2">
                    <WeeklyABVChart
                        data={data}
                        loading={loading}
                        error={error}
                    />
                </div>
            </div>
        </Card>
    );
}
