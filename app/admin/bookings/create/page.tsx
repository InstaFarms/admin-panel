import { Breadcrumb, BreadcrumbItem, Card } from "flowbite-react";
import CreateBookingEditor from "@/components/bookings/create/CreateBookingEditor";
import { getAllBrands } from "@/actions/brandActions";
import Link from "next/link";

// Mirrors RESERVATION_SOURCE_OPTIONS in CreateBookingEditor. Anything else in
// the query string is ignored rather than seeding an invalid source.
const RESERVATION_SOURCES = [
  "DIRECT",
  "ASSISTED",
  "OTA",
  "CORPORATE",
  "TRAVEL_AGENT",
] as const;

type ReservationSource = (typeof RESERVATION_SOURCES)[number];

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ reservationSource?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedSource = RESERVATION_SOURCES.find(
    (source) => source === params.reservationSource,
  ) as ReservationSource | undefined;
  const brandsRaw = await getAllBrands(["id", "name"]);
  const brands = Array.isArray(brandsRaw)
    ? brandsRaw
        .filter((brand: any) => brand?.id && brand?.name)
        .map((brand: any) => ({ id: String(brand.id), name: String(brand.name) }))
    : [];

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Bookings
          </h5>

          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/bookings">Bookings</BreadcrumbItem>
            <BreadcrumbItem href="#">Create</BreadcrumbItem>
          </Breadcrumb>
        </div>

        {/* Responsive form container */}
        <div className="w-full mx-auto rounded-xl bg-slate-100 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          <h6 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Create New Reservation
          </h6>
          <div className="mb-3 text-right">
            <Link href="/admin/bookings/drafts" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-300">View my reservation drafts</Link>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-100">
              <p className="font-semibold">Guest Reservation</p>
              <p className="mt-1 text-xs opacity-80">Direct, assisted, partner or OTA guest stay.</p>
            </div>
            <Link href="/admin/bookings/owner-reservation/create" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <p className="font-semibold">Owner Reservation</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Owner self stay or owner guest stay.</p>
            </Link>
            <Link href="/admin/bookings/blocking/create" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <p className="font-semibold">Property Block</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Inventory-only operational block.</p>
            </Link>
            <Link href="/admin/bookings/enquiry/create" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <p className="font-semibold">Booking Enquiry</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lead and follow-up without inventory hold.</p>
            </Link>
          </div>
          <CreateBookingEditor
            brands={brands}
            initialReservationSource={requestedSource}
          />
        </div>
      </Card>
    </div>
  );
}
