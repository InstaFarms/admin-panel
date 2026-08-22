"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "flowbite-react";

export default function ApprovalQueueTabs() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const currentTab = searchParams.get("tab") || "pending";

    const setTab = (tab: "pending" | "past") => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab);
        params.delete("page"); // Reset page on tab change
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="mb-4 flex space-x-2 border-b border-gray-200 dark:border-gray-700">
            <button
                onClick={() => setTab("pending")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${currentTab === "pending"
                        ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
            >
                Pending Requests
            </button>
            <button
                onClick={() => setTab("past")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${currentTab === "past"
                        ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
            >
                Past Requests
            </button>
        </div>
    );
}
