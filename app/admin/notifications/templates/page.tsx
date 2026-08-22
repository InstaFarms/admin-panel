/**
 * Notification Templates list: paginated table with search (Template Name, Channel, Notification Type, Language).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getNotificationTemplates } from "@/actions/notificationActions";
import { formatAdminDateTimeLong } from "@/lib/dateUtils";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import Link from "next/link";
import { HiPencil } from "react-icons/hi";

const SEARCH_KEYS = ["Template Name", "Channel", "Notification Type", "Language"] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "#", label: "Templates" },
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

function formatDate(dateStr: string | null) {
  return formatAdminDateTimeLong(dateStr);
}

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  let data: Awaited<ReturnType<typeof getNotificationTemplates>> = [];
  try {
    data = await getNotificationTemplates(searchParams);
  } catch (err) {
    console.error("Error fetching notification templates:", err);
    throw new Error("Failed to fetch notification templates");
  }
  const list = Array.isArray(data) ? data : [];

  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("notification templates", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Notification Templates
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Template Name"}
                />
              </div>
              <Link href="/admin/notifications/templates/new" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Template Name</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Channel</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Notification Type</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Recipient Role</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Created At</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {list.length > 0 ? (
                  list.map((template, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={template.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">
                          {template.templateName}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={getChannelBadgeColor(template.channel)}>
                          {template.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {template.notificationType}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {template.recipientRole || "All Roles"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge color={template.isActive ? "success" : "failure"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDate(template.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <Link
                            href={`/admin/notifications/templates/${template.id}`}
                            className="w-fit"
                            title="Edit"
                          >
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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

