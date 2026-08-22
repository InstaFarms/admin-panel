"use client";

import { Select, TextInput, Button } from "flowbite-react";
import type { CAReportRequestBody } from "@/actions/caReportsActions";
import type { CAReportFilters } from "@repo/services/reporting-service";

interface CAReportsFiltersProps {
  filters: CAReportRequestBody;
  onChange: (f: CAReportRequestBody) => void;
  onApply: () => void;
  loading: boolean;
}

const PRESETS: { value: CAReportFilters["preset"]; label: string }[] = [
  { value: "this_month",    label: "This Month" },
  { value: "last_month",    label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year",     label: "This Financial Year" },
  { value: "last_year",     label: "Last Financial Year" },
  { value: "custom",        label: "Custom Range" },
];

const GROUP_BY_OPTIONS: { value: CAReportFilters["groupBy"]; label: string }[] = [
  { value: "month",          label: "By Month" },
  { value: "quarter",        label: "By Quarter" },
  { value: "booking_source", label: "By Booking Source" },
  { value: "none",           label: "No Grouping" },
];

const SOURCES = ["Instafarms", "jarvis", "mago", "others"];

export default function CAReportsFilters({ filters, onChange, onApply, loading }: CAReportsFiltersProps) {
  const isCustom = filters.preset === "custom";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
        Report Filters
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Period Preset */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Period</label>
          <Select
            value={filters.preset}
            onChange={e => onChange({ ...filters, preset: e.target.value as CAReportFilters["preset"] })}
          >
            {PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </div>

        {/* Custom date range — only shown for "custom" */}
        {isCustom && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">From</label>
              <TextInput
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">To</label>
              <TextInput
                type="date"
                value={filters.dateTo ?? ""}
                onChange={e => onChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </>
        )}

        {/* Group By */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Group By</label>
          <Select
            value={filters.groupBy}
            onChange={e => onChange({ ...filters, groupBy: e.target.value as CAReportFilters["groupBy"] })}
          >
            {GROUP_BY_OPTIONS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </Select>
        </div>

        {/* Booking Source filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Booking Source</label>
          <Select
            value={filters.bookingSource ?? ""}
            onChange={e => onChange({ ...filters, bookingSource: e.target.value || undefined })}
          >
            <option value="">All Sources</option>
            {SOURCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
          <Select
            value={filters.status?.[0] ?? ""}
            onChange={e => {
              const v = e.target.value;
              onChange({ ...filters, status: v ? [v] : undefined });
            }}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING">Pending</option>
          </Select>
        </div>

        {/* Apply button */}
        <div className="flex flex-col justify-end">
          <Button
            color="blue"
            onClick={onApply}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Loading…" : "Generate Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}