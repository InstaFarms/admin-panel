/**
 * Notification Event Log list: paginated table with search (Event ID, Event Type, Status).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { formatAdminDateTimeLong } from "@/lib/dateUtils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getEventLogs } from "@/actions/notificationActions";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
const SEARCH_KEYS = ["Event ID", "Event Type", "Status"] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "#", label: "Event Log" },
];

function getStatusBadgeColor(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "failed":
      return "failure";
    case "processing":
      return "warning";
    case "pending":
      return "info";
    default:
      return "gray";
  }
}

function formatDate(dateStr: string | null) {
  return formatAdminDateTimeLong(dateStr);
}

function formatRecipients(recipients: Array<{ id: string; type: string }> | null) {
  if (!recipients || recipients.length === 0) return "N/A";
  if (recipients.length === 1) {
    return `${recipients[0].type} (${recipients[0].id.substring(0, 8)}...)`;
  }
  return `${recipients.length} recipients`;
}

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  let data: Awaited<ReturnType<typeof getEventLogs>> = [];
  try {
    data = await getEventLogs(searchParams);
  } catch (err) {
    console.error("Error fetching event logs:", err);
    throw new Error("Failed to fetch event logs");
  }
  const list = Array.isArray(data) ? data : [];

  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("event log entries", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Notification Event Log
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="w-full max-w-[320px] sm:max-w-[520px]">
              <Searchbar
                searchKeys={[...SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Event ID"}
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Event ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Event Type</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Recipients</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Created At</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Updated At</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {list.length > 0 ? (
                  list.map((event, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={event.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate font-mono text-xs sm:max-w-none">
                          {event.eventId}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {event.eventType}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {formatRecipients(event.recipients)}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={getStatusBadgeColor(event.status)}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDate(event.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDate(event.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}
