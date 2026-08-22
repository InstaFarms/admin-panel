import { Card, Badge } from "flowbite-react";
import Link from "next/link";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { isAdmin } from "@/utils/admin-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiGet } from "@/utils/api-utils";
import type { ElivaasBookingFull } from "@/actions/elivaasActions";

export const dynamic = "force-dynamic";

function formatINR(n: number | null) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  CONFIRMED:               { color: "success",  label: "Confirmed" },
  CANCELLATION_REQUESTED:  { color: "warning",  label: "Cancel Requested" },
  CANCELLED:               { color: "failure",  label: "Cancelled" },
  COMPLETED:               { color: "indigo",   label: "Completed" },
};

const REFUND_BADGE: Record<string, { color: string; label: string }> = {
  NOT_APPLICABLE: { color: "gray",    label: "" },
  PENDING:        { color: "warning", label: "Refund Pending" },
  COMPLETED:      { color: "success", label: "Refunded" },
};

const PAYMENT_BADGE: Record<string, { color: string; label: string }> = {
  PENDING:        { color: "gray",    label: "Awaiting Payment" },
  CAPTURED:       { color: "blue",    label: "Payment Captured" },
  CONFIRMED:      { color: "success", label: "Vendor Confirmed" },
  BOOKING_FAILED: { color: "failure", label: "⚠ Vendor Booking Failed" },
};

export default async function ElivaasBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  const sp = await searchParams;
  const filterStatus = sp?.status ?? "all";

  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value ?? "";

  let bookings: ElivaasBookingFull[] = [];
  try {
    const res = await apiGet<{ success: boolean; data: ElivaasBookingFull[] }>(
      "/api/elivaas/bookings", { token }
    );
    bookings = res.data ?? [];
  } catch {}

  const filtered = filterStatus === "all"
    ? bookings
    : bookings.filter((b) => b.status === filterStatus);

  const total = filtered.reduce((s, b) => s + (b.amountAfterTax ?? 0), 0);

  const statusTabs = [
    { key: "all",                  label: "All" },
    { key: "CONFIRMED",            label: "Confirmed" },
    { key: "CANCELLATION_REQUESTED", label: "Cancel Requested" },
    { key: "CANCELLED",            label: "Cancelled" },
    { key: "COMPLETED",            label: "Completed" },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Elivaas Bookings
            </h5>
            <PageBreadcrumb items={[
              { label: "Home", href: "/admin/dashboard" },
              { label: "Elivaas", href: "/admin/elivaas" },
              { label: "Bookings", href: "#" },
            ]} />
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>{filtered.length} bookings</span>
            {total > 0 && <span className="text-emerald-600 font-medium">Total: {formatINR(total)}</span>}
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mt-2">
          {statusTabs.map((t) => (
            <Link
              key={t.key}
              href={`/admin/elivaas/bookings?status=${t.key}`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === t.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[10px] opacity-60">
                ({t.key === "all" ? bookings.length : bookings.filter(b => b.status === t.key).length})
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500 text-center py-8">No bookings found.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((b) => {
            const st  = STATUS_BADGE[b.status]  ?? STATUS_BADGE.CONFIRMED;
            const ref = REFUND_BADGE[b.refundStatus] ?? REFUND_BADGE.NOT_APPLICABLE;
            const pay = PAYMENT_BADGE[(b as any).paymentStatus] ?? null;
            return (
              <Link key={b.id} href={`/admin/elivaas/bookings/${b.id}`}>
                <Card className="w-full bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h6 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {b.propertyName ?? b.propertyId}
                        </h6>
                        <Badge color={st.color as any} className="shrink-0">{st.label}</Badge>
                        {pay && pay.label && <Badge color={pay.color as any} className="shrink-0">{pay.label}</Badge>}
                        {ref.label && <Badge color={ref.color as any} className="shrink-0">{ref.label}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        <span>📅 {fmt(b.checkinDate)} → {fmt(b.checkoutDate)}{b.nights ? ` (${b.nights}N)` : ""}</span>
                        {b.adults != null && <span>👥 {b.adults} adult{b.adults !== 1 ? "s" : ""}{b.children ? `, ${b.children} child${b.children !== 1 ? "ren" : ""}` : ""}</span>}
                        {b.ratePlanName && <span>🏷 {b.ratePlanName}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        <span>👤 {b.guestFirstName} {b.guestLastName}</span>
                        {b.guestEmail && <span>✉ {b.guestEmail}</span>}
                        {b.guestPhone && <span>📞 {b.guestPhone}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-400 mt-1.5">
                        <span>ID: {b.id}</span>
                        {b.elivaasBookingId && <span>Elivaas: {b.elivaasBookingId}</span>}
                        <span>Booked: {fmt(b.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-700">{formatINR(b.amountAfterTax)}</p>
                      {b.refundAmount != null && (
                        <p className="text-xs text-orange-600">Refund: {formatINR(b.refundAmount)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
