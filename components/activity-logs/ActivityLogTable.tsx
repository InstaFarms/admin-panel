"use client";

import Pagination from "@/components/Pagination";
import {
  STAFF_ACTIVITY_CATEGORY_LABELS,
  STAFF_ACTIVITY_ROLE_LABELS,
} from "@/constants/staffActivity";
import {
  formatActivityDuration,
  formatStaffActivityTimestamp,
  maskedPhoneHint,
} from "@/lib/staffActivityUtils";
import type {
  StaffActivityPagination,
  StaffActivityRow,
} from "@/types/staffActivity";
import {
  Activity,
  Building2,
  ChevronRight,
  Eye,
  SearchX,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import ActivityLogDetailDrawer from "./ActivityLogDetailDrawer";

interface ActivityLogTableProps {
  rows: StaffActivityRow[];
  pagination: StaffActivityPagination;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function RolePill({ role }: { role: StaffActivityRow["actorRole"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
        role === "CARETAKER"
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200"
          : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"
      }`}
    >
      {STAFF_ACTIVITY_ROLE_LABELS[role]}
    </span>
  );
}

function OutcomePill({ outcome }: { outcome: StaffActivityRow["outcome"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold ${
        outcome === "SUCCESS"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200"
          : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200"
      }`}
    >
      {outcome === "SUCCESS" ? "Successful" : "Failed"}
    </span>
  );
}

export default function ActivityLogTable({
  rows,
  pagination,
  hasFilters,
  onClearFilters,
}: ActivityLogTableProps) {
  const [selected, setSelected] = useState<StaffActivityRow | null>(null);
  const firstItem = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <section
      aria-labelledby="activity-timeline-title"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
        <div>
          <h2
            id="activity-timeline-title"
            className="text-sm font-bold text-gray-900 dark:text-white"
          >
            Activity timeline
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Newest events first · all timestamps are shown in IST
          </p>
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {pagination.total
            ? `Showing ${firstItem}–${lastItem} of ${pagination.total.toLocaleString("en-IN")}`
            : "No events"}
        </p>
      </div>

      {!rows.length ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-4 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
            {hasFilters ? (
              <SearchX className="h-6 w-6" />
            ) : (
              <Activity className="h-6 w-6" />
            )}
          </span>
          <h3 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">
            {hasFilters ? "No matching activity" : "No staff activity yet"}
          </h3>
          <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {hasFilters
              ? "Try widening the dates, choosing another staff member, or clearing filters."
              : "Caretaker and supervisor actions will appear here as soon as the v3 apps send them."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-[11px] tracking-wide text-gray-500 uppercase dark:bg-gray-900/50 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Staff
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Activity
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Property
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Outcome
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Response
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-white transition hover:bg-blue-50/40 dark:bg-gray-800 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-3 align-top text-xs whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatStaffActivityTimestamp(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                          <UserRound className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="max-w-48 truncate font-semibold text-gray-900 dark:text-white">
                            {row.actorName}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <RolePill role={row.actorRole} />
                            <span className="text-[11px] text-gray-400">
                              {maskedPhoneHint(row.actorPhoneSuffix)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-3 align-top">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {row.actionLabel}
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-semibold dark:bg-gray-700">
                          {STAFF_ACTIVITY_CATEGORY_LABELS[row.category]}
                        </span>
                        <span className="truncate font-mono">
                          {row.httpMethod} {row.requestPath}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.propertyId ? (
                        <div className="flex items-start gap-1.5">
                          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <div className="min-w-0">
                            <div className="max-w-40 truncate font-medium text-gray-800 dark:text-gray-200">
                              {row.propertyName || "Unknown property"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-400">
                              {row.propertyCode || "No code"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <OutcomePill outcome={row.outcome} />
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        HTTP {row.statusCode}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {formatActivityDuration(row.durationMs)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        aria-label={`View details for ${row.actionLabel} by ${row.actorName}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-200"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-700">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className="block w-full px-4 py-4 text-left transition hover:bg-blue-50/50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none focus:ring-inset dark:hover:bg-gray-700/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {row.actionLabel}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {row.actorName} ·{" "}
                      {STAFF_ACTIVITY_ROLE_LABELS[row.actorRole]}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OutcomePill outcome={row.outcome} />
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {STAFF_ACTIVITY_CATEGORY_LABELS[row.category]}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    HTTP {row.statusCode} ·{" "}
                    {formatActivityDuration(row.durationMs)}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatStaffActivityTimestamp(row.createdAt)}</span>
                  {row.propertyName || row.propertyCode ? (
                    <span className="truncate">
                      {row.propertyName || "Property"}
                      {row.propertyCode ? ` · ${row.propertyCode}` : ""}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700">
            <Pagination
              totalItems={pagination.total}
              itemsPerPageParam="limit"
              defaultItemsPerPage={50}
              itemsPerPageOptions={[25, 50, 100]}
            />
          </div>
        </>
      )}

      <ActivityLogDetailDrawer
        activity={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
