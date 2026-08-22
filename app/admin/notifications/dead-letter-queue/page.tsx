/**
 * Dead Letter Queue list: paginated table with search (Queue Name, Job ID, Resolution).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { formatAdminDateTimeLong } from "@/lib/dateUtils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getDeadLetterQueue } from "@/actions/notificationActions";
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
import Link from "next/link";

const SEARCH_KEYS = ["Queue Name", "Job ID", "Resolution"] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "#", label: "Dead Letter Queue" },
];

function getResolutionBadgeColor(resolution: string | null) {
  if (!resolution) return "gray";
  switch (resolution.toLowerCase()) {
    case "resolved":
      return "success";
    case "retried":
      return "warning";
    case "ignored":
      return "failure";
    default:
      return "gray";
  }
}

function formatDate(dateStr: string | null) {
  return formatAdminDateTimeLong(dateStr);
}

function truncateText(text: string | null, maxLength: number = 100) {
  if (!text) return "N/A";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  let data: Awaited<ReturnType<typeof getDeadLetterQueue>> = [];
  try {
    data = await getDeadLetterQueue(searchParams);
  } catch (err) {
    console.error("Error fetching dead letter queue:", err);
    throw new Error("Failed to fetch dead letter queue");
  }
  const list = Array.isArray(data) ? data : [];

  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("dead letter queue entries", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dead Letter Queue
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="w-full max-w-[320px] sm:max-w-[520px]">
              <Searchbar
                searchKeys={[...SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Queue Name"}
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
                  <TableHeadCell className="whitespace-nowrap">Queue Name</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Job ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Event Log ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Error Message</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Attempts Made</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Resolution</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Failed At</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Resolved At</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {list.length > 0 ? (
                  list.map((item, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={item.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {item.queueName}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate font-mono text-xs sm:max-w-none">
                          {item.jobId}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {item.bookingId ? (
                          <Link
                            href={`/admin/bookings/${item.bookingId}`}
                            className="font-mono text-xs text-blue-600 hover:underline hover:text-blue-800"
                          >
                            <div className="max-w-[120px] truncate sm:max-w-none">
                              {item.bookingId.substring(0, 8)}...
                            </div>
                          </Link>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {item.notificationEventLogId ? (
                          <Link
                            href={`/admin/notifications/event-log?searchKey=Event ID&searchValue=${item.notificationEventLogId}`}
                            className="font-mono text-xs text-blue-600 hover:underline hover:text-blue-800"
                          >
                            <div className="max-w-[120px] truncate sm:max-w-none">
                              {item.notificationEventLogId.substring(0, 8)}...
                            </div>
                          </Link>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium text-gray-900 dark:text-white">
                        <div
                          className="max-w-[200px] truncate sm:max-w-none"
                          title={item.errorMessage}
                        >
                          {truncateText(item.errorMessage, 50)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <Badge color="warning">{item.attemptsMade}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={getResolutionBadgeColor(item.resolution)}>
                          {item.resolution || "Unresolved"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDate(item.failedAt)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDate(item.resolvedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={10}
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
