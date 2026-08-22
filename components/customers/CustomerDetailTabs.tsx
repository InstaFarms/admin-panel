"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Select, TextInput } from "flowbite-react";
import { DateTime } from "luxon";

import BookingAge from "@/components/bookings/BookingAge";
import { getPropertyImage } from "@/lib/propertyUtils";
import type { CustomerBookingListItem, SortableProperty } from "@/utils/types";

type CustomerTabKey = "details" | "bookings" | "favorites";

interface CustomerDetailTabsProps {
  activeTab: CustomerTabKey;
  detailsHref: string;
  bookingsHref: string;
  favoritesHref: string;
  bookings: CustomerBookingListItem[];
  favoriteProperties: SortableProperty[];
  bookingsError?: string | null;
  children: ReactNode;
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Rs 0";
  return `Rs ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatStayWindow(checkinDate: string | null, checkoutDate: string | null) {
  const checkin = checkinDate ? DateTime.fromSQL(checkinDate) : null;
  const checkout = checkoutDate ? DateTime.fromSQL(checkoutDate) : null;

  if (!checkin?.isValid || !checkout?.isValid) {
    return "Stay dates unavailable";
  }

  return `${checkin.toFormat("dd LLL yyyy")} to ${checkout.toFormat("dd LLL yyyy")}`;
}

function getGuestCount(booking: CustomerBookingListItem) {
  return (booking.adultCount ?? 0) + (booking.childrenCount ?? 0) + (booking.infantCount ?? 0);
}

function getBookingSearchBlob(booking: CustomerBookingListItem) {
  return [
    booking.bookingId,
    booking.id,
    booking.bookingExecutionType,
    booking.status,
    booking.property?.propertyCode,
    booking.property?.propertyName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function CustomerDetailTabs({
  activeTab,
  detailsHref,
  bookingsHref,
  favoritesHref,
  bookings,
  favoriteProperties,
  bookingsError,
  children,
}: CustomerDetailTabsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [sortMode, setSortMode] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || bookingDateFilter.length > 0;

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (sortMode === "amount_desc" || sortMode === "amount_asc") {
        const aAmount = Number(a.fullBookingAmountWithGst ?? 0);
        const bAmount = Number(b.fullBookingAmountWithGst ?? 0);
        return sortMode === "amount_desc" ? bAmount - aAmount : aAmount - bAmount;
      }

      const aTime = a.createdAt ? DateTime.fromISO(a.createdAt).toMillis() : 0;
      const bTime = b.createdAt ? DateTime.fromISO(b.createdAt).toMillis() : 0;
      return sortMode === "date_desc" ? bTime - aTime : aTime - bTime;
    });
  }, [bookings, sortMode]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(bookings.map((booking) => booking.status).filter(Boolean) as string[])).sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedDate = bookingDateFilter ? DateTime.fromISO(bookingDateFilter).startOf("day") : null;

    return sortedBookings.filter((booking) => {
      const matchesSearch = !query || getBookingSearchBlob(booking).includes(query);
      const matchesStatus = statusFilter === "all" || (booking.status || "N/A") === statusFilter;
      const checkin = booking.checkinDate ? DateTime.fromSQL(booking.checkinDate).startOf("day") : null;
      const checkout = booking.checkoutDate ? DateTime.fromSQL(booking.checkoutDate).startOf("day") : null;
      const matchesBookingDate =
        !selectedDate ||
        (!!checkin &&
          !!checkout &&
          checkin.isValid &&
          checkout.isValid &&
          selectedDate >= checkin &&
          selectedDate < checkout);

      return matchesSearch && matchesStatus && matchesBookingDate;
    });
  }, [bookingDateFilter, searchQuery, sortedBookings, statusFilter]);

  const visibleBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [bookingDateFilter, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      <section className="border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-end gap-8">
          <Link
            href={detailsHref}
            className={`border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
              activeTab === "details"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Customer Details
          </Link>
          <Link
            href={bookingsHref}
            className={`inline-flex items-center gap-2 border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
              activeTab === "bookings"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Bookings
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200">
              {bookings.length}
            </span>
          </Link>
          <Link
            href={favoritesHref}
            className={`inline-flex items-center gap-2 border-b-4 px-4 py-3 text-2xl font-medium transition-colors ${
              activeTab === "favorites"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Favorite Properties
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-200">
              {favoriteProperties.length}
            </span>
          </Link>
        </div>
      </section>

      {activeTab === "details" ? (
        children
      ) : activeTab === "favorites" ? (
        <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
          <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Favorite Properties</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
              Properties this customer has saved as favorites.
            </p>
          </div>

          <div className="p-5">
            {favoriteProperties.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {favoriteProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/admin/properties/${property.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                  >
                    <div
                      className="h-40 w-full bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${getPropertyImage(property)})` }}
                    />
                    <div className="space-y-2 p-4">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {property.propertyName || "Unnamed Property"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-slate-300">
                        {property.propertyCode ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-700">
                            {property.propertyCode}
                          </span>
                        ) : null}
                        {property.area ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-700">
                            {property.area}
                          </span>
                        ) : null}
                        {property.city ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-700">
                            {property.city}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-400">
                This customer has no favorite properties yet.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
          <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Bookings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
              Review bookings created for this customer and jump into the full booking record when needed.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto]">
              <TextInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by booking ID, property, status..."
              />
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <TextInput
                type="date"
                value={bookingDateFilter}
                onChange={(event) => setBookingDateFilter(event.target.value)}
              />
              <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
                <option value="date_desc">New to Old</option>
                <option value="date_asc">Old to New</option>
                <option value="amount_desc">Max Amount to Least</option>
                <option value="amount_asc">Least Amount to Max</option>
              </Select>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setBookingDateFilter("");
                }}
                disabled={!hasActiveFilters}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-slate-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:border-gray-600 dark:hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-slate-300">
              <span>
                Showing {visibleBookings.length} of {filteredBookings.length} matching bookings
                {` on page ${page} of ${totalPages}`}
              </span>
              <span>
                {bookingDateFilter
                  ? `Booked on ${DateTime.fromISO(bookingDateFilter).toFormat("dd LLL yyyy")} | ${
                      sortMode === "date_desc"
                        ? "Newest to oldest"
                        : sortMode === "date_asc"
                          ? "Oldest to newest"
                          : sortMode === "amount_desc"
                            ? "Highest amount to lowest"
                            : "Lowest amount to highest"
                    }`
                  : sortMode === "date_desc"
                    ? "Newest to oldest"
                    : sortMode === "date_asc"
                      ? "Oldest to newest"
                      : sortMode === "amount_desc"
                        ? "Highest amount to lowest"
                        : "Lowest amount to highest"}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                  <thead className="bg-slate-50 dark:bg-gray-900/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Booking
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Property
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Stay Dates
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Guests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                    {bookingsError ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-sm text-red-600 dark:text-red-300"
                        >
                          {bookingsError}
                        </td>
                      </tr>
                    ) : visibleBookings.length > 0 ? (
                      visibleBookings.map((booking) => (
                        <tr key={booking.id} className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-4 align-top">
                            <Link
                              href={`/admin/bookings/${booking.id}`}
                              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {booking.bookingId || booking.id}
                            </Link>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              {booking.bookingExecutionType || "Booking"}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {booking.property?.id ? (
                              <Link
                                href={`/admin/properties/${booking.property.id}`}
                                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {booking.property.propertyCode
                                  ? `${booking.property.propertyCode} - `
                                  : ""}
                                {booking.property.propertyName || "Unknown Property"}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900 dark:text-white">
                                {booking.property?.propertyCode ? `${booking.property.propertyCode} - ` : ""}
                                {booking.property?.propertyName || "Unknown Property"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-slate-300">
                            {formatStayWindow(booking.checkinDate, booking.checkoutDate)}
                          </td>
                          <td className="px-4 py-4 align-top text-sm font-medium text-gray-900 dark:text-white">
                            {getGuestCount(booking)}
                          </td>
                          <td className="px-4 py-4 align-top text-sm font-medium text-gray-900 dark:text-white">
                            {booking.status || "N/A"}
                          </td>
                          <td className="px-4 py-4 align-top text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(booking.fullBookingAmountWithGst)}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-gray-700 dark:text-slate-300">
                            <BookingAge createdAt={booking.createdAt} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-sm text-gray-500 dark:text-slate-400"
                        >
                          {bookings.length > 0
                            ? "No bookings match the current search or filter."
                            : "This customer has no bookings yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
