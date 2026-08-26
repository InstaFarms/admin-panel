/**
 * All bookings list: paginated table with search, filters, and brand toggle.
 * Shows core booking details from bookings table.
 */
import { getAdminBookingsList } from "@/actions/bookingActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BrandFilterSelect from "@/components/BrandFilterSelect";
import BookingsFilterBar from "@/components/BookingsFilterBar";
import BookingAge from "@/components/bookings/BookingAge";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
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

const SEARCH_KEYS = ["Property Code", "Property Name"] as const;

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Bookings" },
];

export const dynamic = "force-dynamic";

function formatBookingAmount(value: unknown): string {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "Rs 0";
  return `Rs ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getDisplayBookingId(booking: any): string {
  return booking.bookingId || booking.booking_id || booking.id || "N/A";
}

function getBrandTagMeta(
  brandName?: string | null,
  isPresentOnMago?: boolean
): { label: string; className: string } | null {
  const normalized = String(brandName || "").toLowerCase();
  if (normalized.includes("mago")) {
    return {
      label: "[MS]",
      className: "text-blue-600 dark:text-blue-400",
    };
  }
  if (normalized.includes("instafarm")) {
    return {
      label: "[IF]",
      className: "text-green-600 dark:text-green-400",
    };
  }
  if (isPresentOnMago === true) {
    return {
      label: "[MS]",
      className: "text-blue-600 dark:text-blue-400",
    };
  }
  if (isPresentOnMago === false) {
    return {
      label: "[IF]",
      className: "text-green-600 dark:text-green-400",
    };
  }
  return null;
}

export default async function BookingsPage({ searchParams }: ServerPageProps) {
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
  const selectedBrandId = typeof params.brandId === "string" ? params.brandId : "all";

  const normalizedSearchKey = SEARCH_KEYS.includes(filterParams?.searchKey as (typeof SEARCH_KEYS)[number])
    ? (filterParams?.searchKey as (typeof SEARCH_KEYS)[number])
    : undefined;

  const result = await getAdminBookingsList({
    limit,
    offset,
    includeAll: true,
    searchKey: normalizedSearchKey,
    searchValue: filterParams?.searchValue?.toLowerCase(),
    bookingDateFrom,
    bookingDateTo,
    stayDateFrom,
    stayDateTo,
    propertySearch,
    propertySearchType,
    presentOnMago,
    excludeTest,
  });

  const data = result.success ?? [];
  const listError = result.error ?? null;

  const visibleData = data.filter((booking: any) => {
    const source = String(booking.bookingSource || "").toLowerCase();
    if (selectedBrandId === "mago") return source.includes("mago");
    if (selectedBrandId === "instafarms") return !source.includes("mago");
    return true;
  });

  const hasSearch = Boolean(filterParams?.searchValue);
  const hasBrandFilter = selectedBrandId !== "all";
  const emptyMessage = listError || getEmptyListMessage("bookings", hasSearch || hasBrandFilter);

  return (
    <div className="flex w-full flex-col">
      <div id="booking-date-filter-picker" />
      <div id="stay-date-filter-picker" />

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Bookings
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <BrandFilterSelect
                brands={[
                  { id: "instafarms", name: "Instafarms" },
                  { id: "mago", name: "Mago" },
                ]}
                selectedBrandId={selectedBrandId}
              />
              <div className="min-w-0 flex-1 sm:w-[420px]">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={normalizedSearchKey ?? "Property Name"}
                />
              </div>
              <Link href="/admin/bookings/create" className="cursor-pointer shrink-0">
                <Button>Create Reservation</Button>
              </Link>
              <Link href="/admin/bookings/new-reservation" className="cursor-pointer shrink-0">
                <Button color="light">Create Reservation (New Wizard)</Button>
              </Link>
            </div>
          </div>
        </div>

        <BookingsFilterBar hideBookingTypeSource={true} />

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed">
              <TableHead>
                <TableRow>
                  <TableHeadCell>Booking ID</TableHeadCell>
                  <TableHeadCell>Property Name</TableHeadCell>
                  <TableHeadCell>Guest</TableHeadCell>
                  <TableHeadCell>booking_execution_type</TableHeadCell>
                  <TableHeadCell>Booking Amount</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Creation Date</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {!listError && visibleData.length > 0 ? (
                  visibleData.map((booking: any) => {
                    const displayBookingId = getDisplayBookingId(booking);
                    const guestName = `${booking.customer?.firstName || ""} ${booking.customer?.lastName || ""}`.trim() || "Unknown Guest";
                    const guestMobile = booking.customer?.mobileNumber || "N/A";
                    const adults = booking.adultCount || 0;
                    const children = booking.childrenCount || 0;
                    const infants = booking.infantCount || 0;
                    const totalGuests = adults + children + infants;
                    const bookingAmount =
                      booking.fullBookingAmountWithGst ??
                      booking.bookingAmountPaidWithGst ??
                      0;
                    const brandTag = getBrandTagMeta(booking.brand?.name, booking.property?.isPresentOnMago);

                    return (
                      <TableRow
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                        key={booking.id}
                      >
                        <TableCell className="min-w-0 max-w-[280px] break-all font-medium text-gray-900 dark:text-white">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="block text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {displayBookingId}
                          </Link>
                        </TableCell>
                        <TableCell className="min-w-0 max-w-[360px] break-words font-medium text-gray-900 dark:text-white">
                          <div>
                            {booking.property?.id ? (
                              <Link
                                href={`/admin/properties/${booking.property.id}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {booking.property?.propertyCode ? `${booking.property.propertyCode} - ` : ""}
                                {booking.property?.propertyName || "Unknown Property"}
                                {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                              </Link>
                            ) : (
                              <span>
                                {booking.property?.propertyCode ? `${booking.property.propertyCode} - ` : ""}
                                {booking.property?.propertyName || "Unknown Property"}
                                {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="break-words text-gray-700 dark:text-gray-300">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{guestName}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{guestMobile}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {totalGuests} (A:{adults} C:{children} I:{infants})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {booking.bookingExecutionType || "N/A"}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {formatBookingAmount(bookingAmount)}
                        </TableCell>
                        <TableCell className="break-words font-medium text-gray-900 dark:text-white">
                          {booking.status || "N/A"}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <BookingAge createdAt={booking.createdAt} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
