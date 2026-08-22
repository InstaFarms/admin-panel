"use client";

import { hasStaffActivityFilters } from "@/lib/staffActivityUtils";
import type {
  StaffActivityFilters,
  StaffActivityLogsResponse,
  StaffActivityPropertyOption,
  StaffActivityStaffOption,
} from "@/types/staffActivity";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import ActivityLogFilters from "./ActivityLogFilters";
import ActivityLogTable from "./ActivityLogTable";
import ActivitySummaryCards from "./ActivitySummaryCards";

interface ActivityLogsClientProps {
  logs: StaffActivityLogsResponse;
  filters: StaffActivityFilters;
  staffOptions: StaffActivityStaffOption[];
  propertyOptions: StaffActivityPropertyOption[];
  optionsWarning?: string;
}

export default function ActivityLogsClient({
  logs,
  filters,
  staffOptions,
  propertyOptions,
  optionsWarning,
}: ActivityLogsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRetrying, startRetry] = useTransition();

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (filters.limit !== 50) next.set("limit", String(filters.limit));
    router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-4">
      <ActivityLogFilters
        filters={filters}
        staffOptions={staffOptions}
        propertyOptions={propertyOptions}
      />

      {optionsWarning ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {optionsWarning} Existing activity is still available below.
          </span>
        </div>
      ) : null}

      {!logs.success ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-red-900 dark:text-red-100">
                  Staff activity could not be loaded
                </h2>
                <p className="mt-1 text-sm text-red-700 dark:text-red-200">
                  {logs.error ||
                    logs.message ||
                    "The audit service is temporarily unavailable."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => startRetry(() => router.refresh())}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:ring-2 focus:ring-red-500/40 focus:outline-none disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <ActivitySummaryCards summary={logs.summary} />
          <ActivityLogTable
            rows={logs.data}
            pagination={logs.pagination}
            hasFilters={hasStaffActivityFilters(filters)}
            onClearFilters={clearFilters}
          />
        </>
      )}
    </div>
  );
}
