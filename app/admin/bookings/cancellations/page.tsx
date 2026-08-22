/**
 * Cancellations & Refunds list: paginated table with search.
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import { getAdminCancelledBookingsList } from "@/actions/bookingActions";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";

import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";

import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";

import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";

import RefundActionsCell from "@/app/admin/bookings/cancellations/RefundActionsCell";

const SEARCH_KEYS = [
  "Property Code",
  "Property Name",
  "Booking Creator Name",
  "Refund Status",
] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "#", label: "Cancellations" },
];

type CancellationListRow = {
  id: string;
  cancellationId?: string | null;
  bookingExecutionType: string | null;
  status: string | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  adultCount: number | null;
  childrenCount: number | null;
  infantCount: number | null;
  fullBookingAmountWithGst: number | string | null;
  refundStatus: string | null;
  refundAmount: number | string | null;
  cancellationType: string | null;
  cancellationTimestamp: string | null;
  cancelledById: string | null;
  daysBeforeCheckin: number | null;
  stayDurationNights: number | null;
  stayType: string | null;
  totalBookingAmount: number | string | null;
  totalAmountPaid: number | string | null;
  totalDeductions: number | string | null;
  cancellationAmountBeforeGst: number | string | null;
  gstRate: number | null;
  gstApplicable: boolean | null;
  gstOnCancellationFee: number | string | null;
  ownerEarningsFromCancellation: number | string | null;
  refundCompletionTimestamp: string | null;
  cancellationReason: string | null;
  remarks: string | null;
  razorpayPaymentReference?: string | null;
  property?: {
    id: string | null;
    propertyName: string | null;
    propertyCode: string | null;
  } | null;
  customer?: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    mobileNumber: string | null;
  } | null;
  bookingCreator?: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    mobileNumber: string | null;
  } | null;
};

export const dynamic = "force-dynamic";

function formatCurrency(value: unknown): string {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "Rs 0.00";
  return `Rs ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCancellationType(value: string | null | undefined): string {
  if (!value) return "N/A";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRefundStatusMeta(status: string | null | undefined): {
  label: string;
  color: "success" | "warning" | "failure" | "gray";
} {
  switch (status) {
    case "COMPLETED":
      return { label: "Refunded", color: "success" };
    case "INITIATED":
      return { label: "Initiated", color: "warning" };
    case "FAILED":
      return { label: "Failed", color: "failure" };
    case "NOT_INITIATED":
      return { label: "Not Initiated", color: "gray" };
    default:
      return { label: status || "N/A", color: "gray" };
  }
}

function getCancelledByLabel(row: CancellationListRow): string {
  if (row.cancellationType === "CUSTOMER_CANCELLED") return "Customer";
  if (row.cancellationType === "OWNER_CANCELLED") return "Owner";
  if (row.cancellationType === "ADMIN_CANCELLED") return "Admin";
  if (row.cancellationType === "NO_SHOW") return "No Show";
  if (row.cancelledById) return row.cancelledById.slice(0, 8);
  return "N/A";
}

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  const normalizedSearchKey = SEARCH_KEYS.includes(
    filterParams?.searchKey as (typeof SEARCH_KEYS)[number]
  )
    ? (filterParams?.searchKey as (typeof SEARCH_KEYS)[number])
    : undefined;

  const result = await getAdminCancelledBookingsList({
    limit,
    offset,
    searchKey: normalizedSearchKey,
    searchValue: filterParams?.searchValue,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const data = (result.success ?? []) as CancellationListRow[];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("cancelled bookings", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Cancellations & Refunds
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cancellation records from the latest booking schema, including refund snapshots.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={normalizedSearchKey ?? "Property Code"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 dark:bg-gray-900 sm:p-5">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Customer</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Guests</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Amounts</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Refund Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Cancellation</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Reason / Notes</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((booking, index) => {
                    const adultCount = booking.adultCount ?? 0;
                    const childrenCount = booking.childrenCount ?? 0;
                    const infantCount = booking.infantCount ?? 0;
                    const refundStatusMeta = getRefundStatusMeta(booking.refundStatus);
                    const bookingAmount =
                      booking.totalBookingAmount ?? booking.fullBookingAmountWithGst ?? 0;
                    const customerName =
                      [booking.customer?.firstName, booking.customer?.lastName]
                        .filter(Boolean)
                        .join(" ") || "N/A";
                    const creatorName =
                      [booking.bookingCreator?.firstName, booking.bookingCreator?.lastName]
                        .filter(Boolean)
                        .join(" ") || "N/A";

                    return (
                      <TableRow
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                        key={booking.id}
                      >
                        <TableCell className="whitespace-nowrap">
                          {offset + index + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="font-mono">{booking.id.slice(0, 8)}...</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.bookingExecutionType || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.checkinDate} to {booking.checkoutDate}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                          <div className="max-w-[220px] truncate sm:max-w-none">
                            {booking.property?.propertyCode
                              ? `${booking.property.propertyCode} - `
                              : ""}
                            {booking.property?.propertyName || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 whitespace-nowrap text-gray-900 dark:text-white">
                          <div className="max-w-[180px] truncate sm:max-w-none">
                            {customerName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.customer?.mobileNumber || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Creator: {creatorName}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center text-gray-900 dark:text-white">
                          <div>{adultCount + childrenCount + infantCount}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            A:{adultCount} C:{childrenCount} I:{infantCount}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.stayType || "N/A"} / {booking.stayDurationNights ?? 0} nights
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>Booking: {formatCurrency(bookingAmount)}</div>
                          <div>Paid: {formatCurrency(booking.totalAmountPaid)}</div>
                          <div>Refund: {formatCurrency(booking.refundAmount)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Deductions: {formatCurrency(booking.totalDeductions)}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <Badge color={refundStatusMeta.color}>
                              {refundStatusMeta.label}
                            </Badge>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Completed: {formatDateTime(booking.refundCompletionTimestamp)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div>
                            <Badge color="info">
                              {formatCancellationType(booking.cancellationType)}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            By: {getCancelledByLabel(booking)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            At: {formatDateTime(booking.cancellationTimestamp)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Days before check-in: {booking.daysBeforeCheckin ?? "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[260px] whitespace-normal break-words">
                            {booking.cancellationReason || booking.remarks || "N/A"}
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            GST on fee: {formatCurrency(booking.gstOnCancellationFee)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Owner earning: {formatCurrency(booking.ownerEarningsFromCancellation)}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <RefundActionsCell
                            cancellationId={booking.cancellationId}
                            bookingId={booking.id}
                            guestName={customerName}
                            propertyLabel={
                              [
                                booking.property?.propertyCode,
                                booking.property?.propertyName,
                              ]
                                .filter(Boolean)
                                .join(" - ") || "N/A"
                            }
                            razorpayPaymentReference={
                              booking.razorpayPaymentReference
                            }
                            amountPaid={booking.totalAmountPaid}
                            cancellationFee={booking.totalDeductions}
                            refundStatus={booking.refundStatus}
                            refundAmount={booking.refundAmount}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
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
