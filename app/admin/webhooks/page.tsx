import Pagination from "@/components/Pagination";
import { formatAdminDateTime } from "@/lib/dateUtils";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Badge,
} from "flowbite-react";
import { getRazorpayWebhookLogs } from "@/actions/webhookActions";

export default async function Page({ searchParams }: ServerPageProps) {
  const { offset } = parseLimitOffset(await searchParams);
  const logs = await getRazorpayWebhookLogs(searchParams);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full">
        <div className="flex w-full flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Razorpay Webhook Logs
          </h5>
          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="#">Webhooks</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className="w-full table-auto overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>S. No.</TableHeadCell>
                <TableHeadCell>Booking ID</TableHeadCell>
                <TableHeadCell>Event</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Payment ID</TableHeadCell>
                <TableHeadCell>Message</TableHeadCell>
                <TableHeadCell>Created At</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No webhook logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any, index: number) => {
                  const paymentId = log?.metadata?.paymentId || "-";
                  return (
                    <TableRow key={log.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell>{offset + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{log.bookingId}</TableCell>
                      <TableCell>{log.event}</TableCell>
                      <TableCell>
                        <Badge color={log.status === "success" ? "success" : log.status === "failed" ? "failure" : "warning"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{paymentId}</TableCell>
                      <TableCell>{log.message || "-"}</TableCell>
                      <TableCell>
                        {formatAdminDateTime(log.createdAt, { fallback: "-" })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}
