"use client";

import { format, parseISO } from "date-fns";

const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const bookings = payload.find((p: any) => p.dataKey === "bookings");
        const movingAvg = payload.find((p: any) => p.dataKey === "movingAverage");

        return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{format(parseISO(label), "MMM d, yyyy")}</p>
                <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Daily Bookings: <span className="font-semibold text-gray-700 dark:text-gray-300">{bookings?.value ?? 0}</span>
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        7-Day Average: <span className="font-bold">{movingAvg?.value ?? 0}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default ChartTooltip;
