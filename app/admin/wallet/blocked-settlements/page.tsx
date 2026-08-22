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
  Badge,
} from "flowbite-react";
import UnblockSettlementButton from "../settlements/UnblockSettlementButton";
import Link from "next/link";
import { getBlockedSettlements } from "@/actions/walletPageActions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/dateUtils";

export default async function Page({ searchParams }: ServerPageProps) {
  const { limit, offset } = parseLimitOffset(await searchParams);

  const data = await getBlockedSettlements(searchParams);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    return formatAdminDate(dateString, "N/A");
  };

  const formatDateTime = (dateString: string | null) => {
    return formatAdminDateTime(dateString, { fallback: "N/A" });
  };

  const resolveBreakdown = (booking: any, settlement: any) => {
    const fromSettlement = {
      totalAmount: Number(settlement?.totalBookingAmount || 0),
      commissionAmount: Number(settlement?.commissionAmountInclCommissionGst || 0),
      bookingGstAmount: Number(settlement?.bookingGstAmount || 0),
      ownerPayoutExclGst: Number(settlement?.ownerPayoutExclGst || 0),
      tdsAmount: Number(settlement?.tdsAmount || 0),
      netPayableToOwner: Number(settlement?.netPayableToOwner || 0),
    };
    const hasSettlementValues = Object.values(fromSettlement).some((v) => Math.abs(v) > 0.0001);
    if (hasSettlementValues) return fromSettlement;

    return {
      totalAmount: Number(
        booking?.fullBookingAmountWithGst ??
          booking?.bookingAmountWithGstBeforeDiscounts ??
          booking?.baseRentalAmountWithGst ??
          0,
      ),
      commissionAmount: Number(booking?.instafarmsCommission ?? 0),
      bookingGstAmount: Number(booking?.totalGstCollected ?? 0),
      ownerPayoutExclGst: Number(booking?.ownerRevenue ?? 0),
      tdsAmount: Number(booking?.tdsAmount ?? booking?.tds ?? 0),
      netPayableToOwner: Number(booking?.amountPayableToOwnerAfterTDS ?? 0),
    };
  };

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full">
        <div className="space-between flex w-full flex-row items-center">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Blocked Settlements
              </h5>
            </div>

            <div className="flex w-full flex-col lg:flex-row justify-between gap-3 pb-3">
              <div className="w-full md:w-1/3 lg:w-2/5">
                <Breadcrumb className="bg-white dark:bg-gray-800">
                  <BreadcrumbItem href="/">Home</BreadcrumbItem>
                  <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                  <BreadcrumbItem href="/admin/wallet/settlement-management">
                    Settlement Management
                  </BreadcrumbItem>
                  <BreadcrumbItem href="#">Blocked Settlements</BreadcrumbItem>
                </Breadcrumb>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Blocked Settlements:</strong> These settlements have been manually blocked
                and will not be processed by the automatic settlement cron. Unblock them to allow settlement.
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
                <TableHeadCell>Blocked At</TableHeadCell>
                <TableHeadCell>Blocked By</TableHeadCell>
                <TableHeadCell>Reason</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No blocked settlements found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data.map(({ booking, settlement, property, owner, blockedBy }, index) => {
                  const propertyName = property?.propertyName || "Unknown";
                  const {
                    totalAmount,
                    commissionAmount,
                    bookingGstAmount,
                    ownerPayoutExclGst,
                    tdsAmount,
                    netPayableToOwner,
                  } = resolveBreakdown(booking, settlement);

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
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-semibold text-green-600">
                            Total booking: {formatCurrency(totalAmount)}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            Commission: {formatCurrency(commissionAmount)}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            Booking GST: {formatCurrency(bookingGstAmount)}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            Owner payout (excl GST): {formatCurrency(ownerPayoutExclGst)}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            TDS: {formatCurrency(tdsAmount)}
                          </div>
                          <div className="text-blue-700 dark:text-blue-300">
                            Net payable: {formatCurrency(netPayableToOwner)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(booking.settlementBlockedAt)}
                      </TableCell>
                      <TableCell>
                        {blockedBy ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {blockedBy.firstName} {blockedBy.lastName}
                            </div>
                            <div className="text-gray-500">{blockedBy.email}</div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs">
                          {booking.settlementBlockReason || "No reason provided"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <UnblockSettlementButton bookingId={booking.id} />
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
