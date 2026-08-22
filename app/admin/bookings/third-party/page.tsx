import Link from "next/link";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getAdminImportedIcalBookings } from "@/actions/bookingActions";
import Searchbar from "@/components/Searchbar";
import Pagination from "@/components/Pagination";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { Button } from "flowbite-react";
import { Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";

export const dynamic = "force-dynamic";

function computeNights(checkinDate: string, checkoutDate: string): number {
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);
  const ms = checkout.getTime() - checkin.getTime();
  const nights = Math.floor(ms / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

export default async function ImportedIcalBookingsPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const successMessage = typeof params?.success === "string" ? params.success : "";
  const errorMessage = typeof params?.error === "string" ? params.error : "";
  const result = await getAdminImportedIcalBookings(searchParams);
  const data = result.success || [];
  const total = result.total || 0;
  const listError = result.error || null;

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Third Party Bookings
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb
              items={[
                { label: "Home", href: "/admin/dashboard" },
                { label: "Bookings", href: "/admin/bookings" },
                { label: "Third Party Bookings", href: "#" },
              ]}
              className="w-full shrink-0 sm:w-auto"
            />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[420px]">
                <Searchbar
                  searchKeys={["Property Name"]}
                  defaultSearchKey={filterParams?.searchKey ?? "Property Name"}
                />
              </div>
              <Link href="/admin/bookings/third-party/sources" className="cursor-pointer shrink-0">
                <Button color="light">Booking Sources</Button>
              </Link>
              <Link href="/admin/bookings/third-party/create" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        {listError && (
          <div className="py-2 text-center text-red-500 dark:text-red-400">{listError}</div>
        )}

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell>S. No.</TableHeadCell>
                  <TableHeadCell>Property</TableHeadCell>
                  <TableHeadCell>Source</TableHeadCell>
                  <TableHeadCell>Check In</TableHeadCell>
                  <TableHeadCell>Check Out</TableHeadCell>
                  <TableHeadCell>Summary</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {!listError && data.length > 0 ? (
                  data.map((row, index) => (
                    <TableRow key={row.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell>{offset + index + 1}</TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {row.propertyId ? (
                          <Link
                            href={`/admin/properties/${row.propertyId}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {row.propertyName || row.propertyId}
                          </Link>
                        ) : (
                          row.propertyName || "N/A"
                        )}
                      </TableCell>
                      <TableCell>{row.source || "N/A"}</TableCell>
                      <TableCell>{row.checkinDate}</TableCell>
                      <TableCell>{row.checkoutDate}</TableCell>
                      <TableCell>{row.summary || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const fillBookingId = row.thirdPartyBookingId || row.id;
                            const nextHref = `/admin/bookings/third-party-fill?thirdPartyBookingId=${encodeURIComponent(
                              fillBookingId
                            )}&propertyId=${encodeURIComponent(row.propertyId || "")}&checkinDate=${encodeURIComponent(
                              row.checkinDate
                            )}&checkoutDate=${encodeURIComponent(row.checkoutDate)}&totalNights=${encodeURIComponent(
                              String(computeNights(row.checkinDate, row.checkoutDate))
                            )}&guestName=${encodeURIComponent(row.guestName || "")}&guestPhone=${encodeURIComponent(
                              row.guestPhone || ""
                            )}&guestCount=${encodeURIComponent(
                              row.guestCount != null ? String(row.guestCount) : ""
                            )}&totalAmountInclGst=${encodeURIComponent(
                              row.totalAmountInclGst != null ? String(row.totalAmountInclGst) : ""
                            )}&gstRate=${encodeURIComponent(
                              row.gstRate != null ? String(row.gstRate) : ""
                            )}&thirdPartyCommissionPercentage=${encodeURIComponent(
                              row.thirdPartyCommissionPercentage != null
                                ? String(row.thirdPartyCommissionPercentage)
                                : ""
                            )}&platformCommissionPercentage=${encodeURIComponent(
                              row.platformCommissionPercentage != null
                                ? String(row.platformCommissionPercentage)
                                : ""
                            )}&tdsRate=${encodeURIComponent(row.tdsRate != null ? String(row.tdsRate) : "")}`;
                            const actionLabel =
                              (row as any).dataCompletionStatus === "COMPLETED" ? "Update Details" : "Fill Details";

                            return (
                              <Button size="xs" as={Link} href={nextHref}>
                                {actionLabel}
                              </Button>
                            );
                          })()}
                          <Link
                            href={`/admin/bookings/blocking/${row.id}`}
                            className="inline-flex h-6 items-center rounded px-2 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:ring-indigo-700 dark:hover:bg-indigo-900/30"
                          >
                            Commercial Info
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      {listError || "No imported iCal bookings found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination totalItems={total} />
        </div>
      </Card>
    </div>
  );
}
