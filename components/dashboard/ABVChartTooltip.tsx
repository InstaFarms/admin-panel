"use client";

import { format, parseISO } from "date-fns";

import { formatINRFull } from "@/lib/dashboardUtils";

const ABVChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        if (!data) return null;

        const weekStart = format(parseISO(data.weekStart), "MMM d");
        const weekEnd = format(parseISO(data.weekEnd), "MMM d");

        return (
            <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[220px]">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    📅 {weekStart} – {weekEnd}
                </p>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="space-y-1.5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        🏨 Bookings: <span className="font-semibold text-gray-900 dark:text-gray-100">{data.bookings}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        💰 Total Revenue (GBV): <span className="font-semibold text-gray-900 dark:text-gray-100">{formatINRFull(data.totalGBV)}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        🏷️ Avg Price (ABV): <span className="font-bold text-blue-600 dark:text-blue-400">{data.abv !== null ? formatINRFull(data.abv) : "—"}</span>
                    </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2"></div>
            </div>
        );
    }
    return null;
};

export default ABVChartTooltip;
