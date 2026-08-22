import Pagination from "@/components/Pagination";
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
} from "flowbite-react";
import ManualSettleButton from "../settlements/ManualSettleButton";
import Link from "next/link";
import { getFailedSettlements } from "@/actions/walletPageActions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/dateUtils";

export default async function Page({ searchParams }: ServerPageProps) {
  const { limit, offset } = parseLimitOffset(await searchParams);

  const data = await getFailedSettlements(searchParams);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    return formatAdminDate(dateString, "N/A");
  };

  const formatDateTime = (dateString: string | null) => {
    return formatAdminDateTime(dateString, { fallback: "N/A" });
  };

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full">
        <div className="space-between flex w-full flex-row items-center">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Failed Settlements
              </h5>
            </div>

            <div className="flex w-full flex-col lg:flex-row justify-between gap-3 pb-3">
              <div className="w-full md:w-1/3 lg:w-2/5">
                <Breadcrumb className="bg-white dark:bg-gray-800">
                  <BreadcrumbItem href="/">Home</BreadcrumbItem>
                  <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                  <BreadcrumbItem href="/admin/wallet/settlements">
                    Settlement Management
                  </BreadcrumbItem>
                  <BreadcrumbItem href="#">Failed Settlements</BreadcrumbItem>
                </Breadcrumb>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Failed Settlements:</strong> These settlements failed during the automatic
                cron run. Review the failure reason and retry manually once the issue is resolved.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full table-auto overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>S. No.</TableHeadCell>
                <TableHeadCell>Booking ID</TableHeadCell>
                <TableHeadCell>Property</TableHeadCell>
                <TableHeadCell>Owner</TableHeadCell>
                <TableHeadCell>Check-in</TableHeadCell>
                <TableHeadCell>Booking Amount</TableHeadCell>
                <TableHeadCell>Failed At</TableHeadCell>
                <TableHeadCell>Failure Reason</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No failed settlements found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data.map(({ booking, property, owner }, index) => {
                  const propertyName = property?.propertyName || "Unknown";
                  const totalAmount =
                    (booking.baseRentalAmountWithGst || 0) +
                    (booking.extraAdultGuestChargeWithGst || 0) +
                    (booking.extraChildGuestChargeWithGst || 0) +
                    (booking.floatingGuestCharge || 0);

                  return (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={booking.id}
                    >
                      <TableCell>{offset + index + 1}</TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {booking.id.slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{propertyName}</div>
                          {property && (
                            <div className="text-gray-500">
                              Code: {property.propertyCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {owner ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {owner.firstName} {owner.lastName}
                            </div>
                            <div className="text-gray-500">{owner.email}</div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(booking.checkinDate)}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(booking.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs">
                          {(booking as { settlementFailureReason?: string | null }).settlementFailureReason || "Unknown error"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ManualSettleButton bookingId={booking.id} />
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
