import {
  getStaffActivityLogs,
  searchStaffActivityProperties,
  searchStaffActivityStaff,
} from "@/actions/staffActivityActions";
import ActivityLogsClient from "@/components/activity-logs/ActivityLogsClient";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import {
  STAFF_ACTIVITY_BREADCRUMBS,
  STAFF_ACTIVITY_PROPERTY_SEARCH_LIMIT,
  STAFF_ACTIVITY_STAFF_SEARCH_LIMIT,
} from "@/constants/staffActivity";
import {
  getActivityStaffKey,
  parseStaffActivityFilters,
} from "@/lib/staffActivityUtils";
import type {
  StaffActivityPropertyOption,
  StaffActivityStaffOption,
} from "@/types/staffActivity";
import { Card } from "flowbite-react";
import { Activity, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff Activity | Jarvis Admin",
  description: "Review caretaker and supervisor activity across the v3 apps.",
};

interface ActivityLogsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ActivityLogsPage({
  searchParams,
}: ActivityLogsPageProps) {
  const filters = parseStaffActivityFilters((await searchParams) ?? {});
  const [logs, staffResult, propertyResult] = await Promise.all([
    getStaffActivityLogs(filters),
    searchStaffActivityStaff({
      role: filters.role,
      limit: STAFF_ACTIVITY_STAFF_SEARCH_LIMIT,
    }),
    searchStaffActivityProperties({
      limit: STAFF_ACTIVITY_PROPERTY_SEARCH_LIMIT,
    }),
  ]);

  const staffOptions = [...staffResult.data];
  const propertyOptions = [...propertyResult.data];

  if (
    filters.staff &&
    !staffOptions.some((option) => option.key === filters.staff)
  ) {
    const matchingRow = logs.data.find(
      (row) => getActivityStaffKey(row) === filters.staff,
    );
    if (matchingRow) {
      staffOptions.unshift({
        key: filters.staff as StaffActivityStaffOption["key"],
        id: matchingRow.actorId,
        role: matchingRow.actorRole,
        name: matchingRow.actorName,
        phone: matchingRow.actorPhoneSuffix,
        isActive: true,
        assignmentCount: 0,
        lastActivityAt: matchingRow.createdAt,
      });
    }
  }

  if (
    filters.property &&
    !propertyOptions.some((option) => option.id === filters.property)
  ) {
    const matchingRow = logs.data.find(
      (row) => row.propertyId === filters.property,
    );
    if (matchingRow?.propertyId) {
      propertyOptions.unshift({
        id: matchingRow.propertyId,
        name: matchingRow.propertyName || "Referenced property",
        code: matchingRow.propertyCode,
      } satisfies StaffActivityPropertyOption);
    }
  }

  const optionWarnings = [
    staffResult.success ? null : "Staff search could not be preloaded.",
    propertyResult.success ? null : "Property search could not be preloaded.",
  ].filter(Boolean);

  return (
    <div className="flex w-full flex-col gap-4 pb-6">
      <Card className="w-full overflow-hidden bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              <Activity className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Staff Activity
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                Search and review every recorded action by v3 caretakers and
                supervisors.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <LockKeyhole className="h-4 w-4" />
            Append-only · read-only audit trail
          </div>
        </div>
        <PageBreadcrumb
          items={STAFF_ACTIVITY_BREADCRUMBS}
          className="mt-3 w-full shrink-0 bg-transparent p-0"
        />
      </Card>

      <ActivityLogsClient
        logs={logs}
        filters={filters}
        staffOptions={staffOptions}
        propertyOptions={propertyOptions}
        optionsWarning={
          optionWarnings.length ? optionWarnings.join(" ") : undefined
        }
      />
    </div>
  );
}
