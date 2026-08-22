/**
 * Archived bookings list: paginated table with search.
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import { getAdminArchivedBookingsList } from "@/actions/bookingActions";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { BookingData, ServerPageProps } from "@/utils/types";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import ViewBookingButton from "./ViewBookingButton";

const SEARCH_KEYS = [
  "Property Code",
  "Property Name",
  "Booking Creator Name",
] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "#", label: "Archive" },
];

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  const result = await getAdminArchivedBookingsList({
    limit,
    offset,
    searchKey: filterParams?.searchKey,
    searchValue: filterParams?.searchValue,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const data = result.success || [];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("archived bookings", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Archive
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Property Code"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Customer Name</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Guest Count</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Booking Created by</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Checkin</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Checkout</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length > 0 ? (
                  data.map((booking: BookingData, index: number) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={booking.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">
                          {booking.property?.propertyCode &&
                            `${booking.property.propertyCode} -`}{" "}
                          {booking.property?.propertyName}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {booking.customer?.firstName} {booking.customer?.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {booking.adultCount}-{booking.childrenCount}-{booking.infantCount}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {booking.adminCreatedBy
                            ? `Admin: ${booking.adminCreatedBy.substring(0, 8)}...`
                            : booking.createdBy
                              ? `User: ${booking.createdBy.substring(0, 8)}...`
                              : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {booking.checkinDate}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {booking.checkoutDate}
                      </TableCell>
                      <TableCell>
                        <ViewBookingButton booking={booking} />
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

