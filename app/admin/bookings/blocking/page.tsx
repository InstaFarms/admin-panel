import { getAdminBlockingList } from "@/actions/bookingActions";
import BookingAge from "@/components/bookings/BookingAge";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BrandFilterSelect from "@/components/BrandFilterSelect";
import BookingsFilterBar from "@/components/BookingsFilterBar";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import {
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
  { href: "/admin/bookings", label: "Bookings" },
  { href: "#", label: "Blocking" },
];

export const dynamic = "force-dynamic";

function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate || !endDate) return "N/A";
  return `${startDate} to ${endDate}`;
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

export default async function BlockingPage({ searchParams }: ServerPageProps) {
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

  const result = await getAdminBlockingList({
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

  const visibleData = data.filter((row: any) => {
    const isPresentOnMago = !!row?.property?.isPresentOnMago;
    if (selectedBrandId === "mago") return isPresentOnMago;
    if (selectedBrandId === "instafarms") return !isPresentOnMago;
    return true;
  });

  const hasSearch = Boolean(filterParams?.searchValue);
  const hasBrandFilter = selectedBrandId !== "all";
  const emptyMessage = listError || getEmptyListMessage("blocking records", hasSearch || hasBrandFilter);

  return (
    <div className="flex w-full flex-col">
      <div id="booking-date-filter-picker" />
      <div id="stay-date-filter-picker" />

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Blocking
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
              <Link href="/admin/bookings/blocking/create" className="cursor-pointer shrink-0">
                <button className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">
                  New Blocking
                </button>
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
                  <TableHeadCell>ID</TableHeadCell>
                  <TableHeadCell>Property</TableHeadCell>
                  <TableHeadCell>Check-in/Check-out</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Creation Date</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {!listError && visibleData.length > 0 ? (
                  visibleData.map((row: any) => {
                    const brandTag = getBrandTagMeta(row.brand?.name, row.property?.isPresentOnMago);
                    return (
                      <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800" key={row.id}>
                        <TableCell className="min-w-0 max-w-[280px] break-all font-medium text-gray-900 dark:text-white">
                          <Link
                            href={`/admin/bookings/blocking/${row.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {row.id}
                          </Link>
                        </TableCell>
                        <TableCell className="min-w-0 max-w-90 wrap-break-word font-medium text-gray-900 dark:text-white">
                          {row.property?.id ? (
                            <Link
                              href={`/admin/properties/${row.property.id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {row.property?.propertyCode ? `${row.property.propertyCode} - ` : ""}
                              {row.property?.propertyName || "Unknown Property"}
                              {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                            </Link>
                          ) : (
                            <span>
                              {row.property?.propertyCode ? `${row.property.propertyCode} - ` : ""}
                              {row.property?.propertyName || "Unknown Property"}
                              {brandTag ? <span className={`ml-1 font-semibold ${brandTag.className}`}>{brandTag.label}</span> : null}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {formatDateRange(row.startDate, row.endDate)}
                        </TableCell>
                        <TableCell className="wrap-break-word font-medium text-gray-900 dark:text-white">
                          {row.status || "N/A"}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <BookingAge createdAt={row.createdAt} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-400">
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

