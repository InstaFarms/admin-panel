/**
 * Instafarms Online bookings list: paginated table with search and filters.
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import { getAdminBookingsList } from "@/actions/bookingActions";
import BookingsFilterBar from "@/components/BookingsFilterBar";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BookingAge from "@/components/bookings/BookingAge";
import BookingActions from "@/components/bookings/BookingActions";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import {
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

function formatDateRange(checkin: string | null | undefined, checkout: string | null | undefined): string {
  if (!checkin || !checkout) return "N/A";
  return `${checkin} to ${checkout}`;
}

function getDisplayBookingId(booking: any): string {
  return booking.bookingId || booking.booking_id || booking.id || "N/A";
}

const SEARCH_KEYS = [
  "Property Code",
  "Property Name",
  "Booking Creator Name",
] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "#", label: "Instafarms Online" },
];

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  const bookingDateFrom = typeof params.bookingDateFrom === "string" ? params.bookingDateFrom : undefined;
  const bookingDateTo = typeof params.bookingDateTo === "string" ? params.bookingDateTo : undefined;
  const stayDateFrom = typeof params.stayDateFrom === "string" ? params.stayDateFrom : undefined;
  const stayDateTo = typeof params.stayDateTo === "string" ? params.stayDateTo : undefined;
  const propertySearch = typeof params.propertySearch === "string" ? params.propertySearch : undefined;
  const propertySearchType = typeof params.propertySearchType === "string" ? (params.propertySearchType as "code" | "name") : undefined;
  const presentOnMago = params.presentOnMago === "true";
  const excludeTest = params.excludeTest === "true";

  const result = await getAdminBookingsList({
    limit,
    offset,
    searchKey: filterParams?.searchKey,
    searchValue: filterParams?.searchValue?.toLowerCase(),
    bookingDateFrom,
    bookingDateTo,
    stayDateFrom,
    stayDateTo,
    propertySearch,
    propertySearchType,
    bookingType: "Online",
    bookingSource: "instafarms",
    presentOnMago,
    excludeTest,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const data = result.success || [];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("bookings", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <div id="booking-date-filter-picker" />
      <div id="stay-date-filter-picker" />

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Instafarms Online Bookings
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Property Name"}
                />
              </div>
              <Link href="/admin/bookings/create" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        <BookingsFilterBar hideBookingTypeSource={true} />

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking ID</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking Dates</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Type/Source</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Created</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length > 0 ? (
                  data.map((booking: any, index: number) => {
                    const displayBookingId = getDisplayBookingId(booking);
                    return (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={booking.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="block max-w-[150px] truncate text-blue-600 hover:underline dark:text-blue-400 sm:max-w-none"
                        >
                          {displayBookingId}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">
                          {booking.property?.id ? (
                            <Link
                              href={`/admin/properties/${booking.property.id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {booking.property?.propertyCode && `${booking.property.propertyCode} -`}{" "}
                              {booking.property?.propertyName}
                            </Link>
                          ) : (
                            <span>
                              {booking.property?.propertyCode && `${booking.property.propertyCode} -`}{" "}
                              {booking.property?.propertyName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatDateRange(booking.checkinDate, booking.checkoutDate)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {`${(booking.bookingType || "n/a").toLowerCase()}-${(booking.bookingSource || "n/a").toLowerCase()}`}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <BookingAge createdAt={booking.createdAt} />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {booking.status || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <BookingActions
                            bookingId={booking.id}
                            paidAmount={booking.bookingAmountPaidWithGst || 0}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
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

