/**
 * Notification Delivery Log list: paginated table with search (Channel, Status, Recipient Type, Notification Type).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { formatAdminDateTimeLong } from "@/lib/dateUtils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getDeliveryLogs } from "@/actions/notificationActions";
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

const SEARCH_KEYS = ["Channel", "Status", "Recipient Type", "Notification Type"] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "#", label: "Delivery Log" },
];

function getChannelBadgeColor(channel: string) {
  switch (channel.toLowerCase()) {
    case "email":
      return "blue";
    case "whatsapp":
      return "green";
    case "sms":
      return "yellow";
    case "app":
      return "purple";
    default:
      return "gray";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status.toLowerCase()) {
    case "sent":
    case "delivered":
      return "success";
    case "failed":
    case "bounced":
      return "failure";
    case "pending":
      return "warning";
    default:
      return "gray";
  }
}

function formatDate(dateStr: string | null) {
  return formatAdminDateTimeLong(dateStr);
}

function truncateText(text: string | null, maxLength: number = 50) {
  if (!text) return "N/A";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  let data: Awaited<ReturnType<typeof getDeliveryLogs>> = [];
  try {
    data = await getDeliveryLogs(searchParams);
  } catch (err) {
    console.error("Error fetching delivery logs:", err);
    throw new Error("Failed to fetch delivery logs");
  }
  const list = Array.isArray(data) ? data : [];

  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("delivery log entries", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Notification Delivery Log
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="w-full max-w-[320px] sm:max-w-[520px]">
              <Searchbar
                searchKeys={[...SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Channel"}
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
                  <TableHeadCell className="whitespace-nowrap">Channel</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Recipient Type</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Recipient ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Notification Type</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Event Log ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Subject/Title</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {list.length > 0 ? (
                  list.map((log, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={log.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={getChannelBadgeColor(log.channel)}>
                          {log.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={getStatusBadgeColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {log.recipientType}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[120px] truncate font-mono text-xs sm:max-w-none">
                          {log.recipientId}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {log.notificationType || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {log.bookingId ? (
                          <Link
                            href={`/admin/bookings/${log.bookingId}`}
                            className="font-mono text-xs text-blue-600 hover:underline hover:text-blue-800"
                          >
                            <div className="max-w-[120px] truncate sm:max-w-none">
                              {log.bookingId.substring(0, 8)}...
                            </div>
                          </Link>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {log.notificationEventLogId ? (
                          <Link
                            href={`/admin/notifications/event-log?searchKey=Event ID&searchValue=${log.notificationEventLogId}`}
                            className="font-mono text-xs text-blue-600 hover:underline hover:text-blue-800"
                          >
                            <div className="max-w-[120px] truncate sm:max-w-none">
                              {log.notificationEventLogId.substring(0, 8)}...
                            </div>
                          </Link>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div
                          className="max-w-[150px] truncate sm:max-w-none"
                          title={log.subject || log.title || ""}
                        >
                          {truncateText(log.subject || log.title, 30)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
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
