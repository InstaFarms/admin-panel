import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BookingRequestsTable, { type BookingRequestRow } from "@/components/bookings/BookingRequestsTable";
import BrandFilterSelect from "@/components/BrandFilterSelect";
import { getAdminBookingRequestsList } from "@/actions/bookingActions";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { Card } from "flowbite-react";

export const dynamic = "force-dynamic";
const SEARCH_KEYS = ["Property Code", "Property Name"] as const;
type RequestSearchKey = (typeof SEARCH_KEYS)[number];

export default async function BookingRequestsPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const normalizedSearchKey = SEARCH_KEYS.includes(filterParams?.searchKey as RequestSearchKey)
    ? (filterParams?.searchKey as RequestSearchKey)
    : undefined;
  const selectedBrandId = typeof params.brandId === "string" ? params.brandId : "all";

  const result = await getAdminBookingRequestsList({
    limit,
    offset,
    searchKey: normalizedSearchKey,
    searchValue: filterParams?.searchValue?.toLowerCase(),
    statuses: ["AWAITING_APPROVAL", "CONFIRMED", "REJECTED"],
  });

  const rows = (result.success ?? []) as BookingRequestRow[];
  const error = result.error ?? null;

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Booking Requests</h5>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Track and process approval requests from the bookings table.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb
              items={[
                { href: "/", label: "Home" },
                { href: "/admin", label: "Admin" },
                { href: "/admin/bookings", label: "Bookings" },
                { href: "/admin/bookings/booking-requests", label: "Booking Requests" },
              ]}
              className="w-full shrink-0 sm:w-auto"
            />
            <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <BrandFilterSelect
                brands={[
                  { id: "instafarms", name: "Instafarms" },
                  { id: "mago", name: "Mago" },
                ]}
                selectedBrandId={selectedBrandId}
              />
              <div className="min-w-0 flex-1 sm:w-125">
                <Searchbar
                  searchKeys={[...SEARCH_KEYS]}
                  defaultSearchKey={normalizedSearchKey ?? "Property Name"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : (
            <BookingRequestsTable initialData={rows} offset={offset} brandId={selectedBrandId} />
          )}
        </div>

        <Pagination />
      </Card>
    </div>
  );
}
