import { getAdminBlockingById } from "@/actions/bookingActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ICalCommercialInfoEditor from "@/components/bookings/blocking/ICalCommercialInfoEditor";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/bookings/blocking", label: "Blocking" },
  { href: "#", label: "Detail" },
];

const OTA_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "AIRBNB":      { bg: "bg-rose-100 dark:bg-rose-900/40",    text: "text-rose-700 dark:text-rose-300",    dot: "bg-rose-500" },
  "BOOKING.COM": { bg: "bg-blue-100 dark:bg-blue-900/40",    text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500" },
  "MAKEMYTRIP":  { bg: "bg-orange-100 dark:bg-orange-900/40",text: "text-orange-700 dark:text-orange-300",dot: "bg-orange-500" },
};

export default async function BlockingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminBlockingById(id);

  if (result.error || !result.success) notFound();

  const blocking = result.success as any;
  const ota = blocking.iCalOTA as string | null;
  const otaStyle = ota ? OTA_COLORS[ota] ?? OTA_COLORS["AIRBNB"] : null;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageBreadcrumb items={BREADCRUMBS} />

      {/* ── Blocking Info Card ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Coloured top bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-blue-500 to-cyan-400" />

        <div className="p-6">
          {/* Header row */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Blocking Detail</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {blocking.blockingSource === "ICAL" ? "Imported from OTA iCal feed" : "Manually created blocking"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {blocking.blockingSource === "ICAL" && ota && otaStyle && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${otaStyle.bg} ${otaStyle.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${otaStyle.dot}`} />
                  {ota}
                </span>
              )}
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                blocking.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}>
                {blocking.status}
              </span>
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Property",
                value: `${blocking.property?.propertyCode ? blocking.property.propertyCode + " – " : ""}${blocking.property?.propertyName ?? "—"}`,
              },
              {
                label: "Date Range",
                value: (
                  <span className="inline-flex items-center gap-2 font-mono text-sm">
                    {blocking.startDate}
                    <span className="text-gray-400">→</span>
                    {blocking.endDate}
                  </span>
                ),
              },
              {
                label: "Brand",
                value: blocking.brand?.name ?? "—",
              },
              {
                label: "Blocking Type",
                value: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {blocking.blockingSource}
                    </span>
                    <span className="text-gray-400 text-xs">/</span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {blocking.blockingType}
                    </span>
                  </span>
                ),
              },
              {
                label: "External Booking ID",
                value: blocking.externalBookingId
                  ? <span className="break-all font-mono text-xs text-gray-700 dark:text-gray-300">{blocking.externalBookingId}</span>
                  : "—",
              },
              {
                label: "Summary",
                value: blocking.summary ?? "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Blocking ID — full width at the bottom */}
          <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Blocking ID
            </span>
            <p className="mt-0.5 break-all font-mono text-xs text-gray-600 dark:text-gray-300">
              {blocking.id}
            </p>
          </div>
        </div>
      </div>

      {/* ── Commercial Info — only for ICAL ── */}
      {blocking.blockingSource === "ICAL" && (
        <ICalCommercialInfoEditor
          blockingId={blocking.id}
          brandName={blocking.brand?.name}
          otaName={ota}
          initialCustomerId={blocking.customerId ?? null}
          initialIcalBookingAmountWithGst={blocking.icalBookingAmountWithGst ?? null}
          initialIcalBookingGst={blocking.icalBookingGst ?? null}
          initialIcalNetBookingAmount={blocking.icalNetBookingAmount ?? null}
          initialIcalOtaCommission={blocking.icalOtaCommission ?? null}
        />
      )}
    </div>
  );
}
