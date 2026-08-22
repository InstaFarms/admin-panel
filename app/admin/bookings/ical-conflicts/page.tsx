import { Card, Label, Select, TextInput } from "flowbite-react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import { getAdminBookingConflicts } from "@/actions/icalActions";
import BookingConflictsClient from "./BookingConflictsClient";
import { parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

export default async function ICalBookingConflictsPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { offset } = parseLimitOffset(params);
  const result = await getAdminBookingConflicts(searchParams);
  const fetchError = result.error;
  const rows = result.success || [];
  const total = result.total || 0;

  const propertySearch = typeof params.propertySearch === "string" ? params.propertySearch : "";
  const platform = typeof params.platform === "string" ? params.platform : "";
  const resolved = typeof params.resolved === "string" ? params.resolved : "";

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">iCal Booking Conflicts</h5>
          <PageBreadcrumb
            items={[
              { label: "Home", href: "/admin/dashboard" },
              { label: "Bookings", href: "/admin/bookings" },
              { label: "iCal Booking Conflicts", href: "#" },
            ]}
          />
        </div>

        <form className="grid gap-3 rounded-xl bg-slate-100 p-4 sm:grid-cols-4 dark:bg-gray-900">
          <div>
            <Label htmlFor="propertySearch" >Property</Label>
            <TextInput id="propertySearch" name="propertySearch" placeholder="Search property..." defaultValue={propertySearch} />
          </div>
          <div>
            <Label htmlFor="platform" >Platform</Label>
            <Select id="platform" name="platform" defaultValue={platform}>
              <option value="">All</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="resolved" >Status</Label>
            <Select id="resolved" name="resolved" defaultValue={resolved}>
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </Select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              Apply Filters
            </button>
          </div>
        </form>

        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Showing {rows.length} rows (offset {offset}) out of {total}
        </div>

        {fetchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {fetchError}
          </div>
        )}

        <BookingConflictsClient rows={rows} />
        <Pagination totalItems={total} />
      </Card>
    </div>
  );
}
