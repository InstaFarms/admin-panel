import { Card, Badge, Button } from "flowbite-react";
import { notFound, redirect } from "next/navigation";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { isAdmin } from "@/utils/admin-only";
import { getElivaasBooking, updateElivaasBooking } from "@/actions/elivaasActions";
import type { ElvCancellationType, ElivaasRefundStatus, ElivaasBookingStatus } from "@/actions/elivaasActions";
import ElivaasBookingActions from "./ElivaasBookingActions";

export const dynamic = "force-dynamic";

function formatINR(n: number | null | undefined) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmt(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  CONFIRMED:              { color: "success",  label: "Confirmed" },
  CANCELLATION_REQUESTED: { color: "warning",  label: "Cancel Requested" },
  CANCELLED:              { color: "failure",  label: "Cancelled" },
  COMPLETED:              { color: "indigo",   label: "Completed" },
};

const REFUND_BADGE: Record<string, { color: string; label: string }> = {
  NOT_APPLICABLE: { color: "gray",    label: "No Refund" },
  PENDING:        { color: "warning", label: "Refund Pending" },
  COMPLETED:      { color: "success", label: "Refunded" },
};

export default async function ElivaasBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdmin();
  if (!admin) redirect("/");

  const { id } = await params;
  const booking = await getElivaasBooking(id);
  if (!booking) notFound();

  const st  = STATUS_BADGE[booking.status]  ?? STATUS_BADGE.CONFIRMED;
  const ref = REFUND_BADGE[booking.refundStatus] ?? REFUND_BADGE.NOT_APPLICABLE;

  return (
    <div className="flex w-full flex-col gap-4 max-w-4xl">
      <Card className="bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h5 className="text-xl font-bold text-gray-900 dark:text-white">
              {booking.propertyName ?? booking.propertyId}
            </h5>
            <PageBreadcrumb items={[
              { label: "Home", href: "/admin/dashboard" },
              { label: "Elivaas", href: "/admin/elivaas" },
              { label: "Bookings", href: "/admin/elivaas/bookings" },
              { label: booking.id, href: "#" },
            ]} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge color={st.color as any} className="text-sm px-3 py-1">{st.label}</Badge>
            <Badge color={ref.color as any} className="text-sm px-3 py-1">{ref.label}</Badge>
          </div>
        </div>
      </Card>

      {/* Booking Info */}
      <Card className="bg-white dark:bg-gray-800">
        <h6 className="text-sm font-semibold text-gray-700 mb-3">Booking Details</h6>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-400">Booking ID</p><p className="font-medium text-gray-800">{booking.id}</p></div>
          {booking.elivaasBookingId && <div><p className="text-xs text-gray-400">Elivaas ID</p><p className="font-medium text-gray-800">{booking.elivaasBookingId}</p></div>}
          <div><p className="text-xs text-gray-400">Property</p><p className="font-medium text-gray-800">{booking.propertyName ?? booking.propertyId}</p></div>
          <div><p className="text-xs text-gray-400">Check-in</p><p className="font-medium text-gray-800">{fmt(booking.checkinDate)}</p></div>
          <div><p className="text-xs text-gray-400">Check-out</p><p className="font-medium text-gray-800">{fmt(booking.checkoutDate)}</p></div>
          <div><p className="text-xs text-gray-400">Nights</p><p className="font-medium text-gray-800">{booking.nights ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400">Guests</p><p className="font-medium text-gray-800">{booking.adults} adults{booking.children ? `, ${booking.children} children` : ""}</p></div>
          <div><p className="text-xs text-gray-400">Rate Plan</p><p className="font-medium text-gray-800">{booking.ratePlanName ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400">Amount</p><p className="font-bold text-emerald-700 text-base">{formatINR(booking.amountAfterTax)}</p></div>
          <div><p className="text-xs text-gray-400">Booked On</p><p className="font-medium text-gray-800">{fmt(booking.createdAt)}</p></div>
        </div>
      </Card>

      {/* Guest Info */}
      <Card className="bg-white dark:bg-gray-800">
        <h6 className="text-sm font-semibold text-gray-700 mb-3">Guest Details</h6>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-400">Name</p><p className="font-medium text-gray-800">{booking.guestFirstName} {booking.guestLastName}</p></div>
          <div><p className="text-xs text-gray-400">Email</p><p className="font-medium text-gray-800">{booking.guestEmail ?? "—"}</p></div>
          <div><p className="text-xs text-gray-400">Phone</p><p className="font-medium text-gray-800">{booking.guestPhone ?? "—"}</p></div>
        </div>
      </Card>

      {/* Cancellation Info (if cancelled) */}
      {(booking.status === "CANCELLATION_REQUESTED" || booking.status === "CANCELLED") && (
        <Card className="bg-orange-50 border-orange-200">
          <h6 className="text-sm font-semibold text-orange-700 mb-3">Cancellation Details</h6>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-orange-400">Type</p><p className="font-medium text-orange-800">{booking.cancellationType?.replace(/_/g, " ") ?? "—"}</p></div>
            {booking.cancellationRequestedAt && <div><p className="text-xs text-orange-400">Requested On</p><p className="font-medium text-orange-800">{fmt(booking.cancellationRequestedAt)}</p></div>}
            {booking.cancelledAt && <div><p className="text-xs text-orange-400">Cancelled On</p><p className="font-medium text-orange-800">{fmt(booking.cancelledAt)}</p></div>}
            {booking.cancellationNote && <div className="col-span-2"><p className="text-xs text-orange-400">Note</p><p className="font-medium text-orange-800">{booking.cancellationNote}</p></div>}
          </div>
          {booking.status === "CANCELLATION_REQUESTED" && (
            <p className="text-xs text-orange-600 mt-3 bg-orange-100 rounded p-2">
              ⚠️ Contact Elivaas support at <strong>developers@elivaas.com</strong> to process this cancellation. Once confirmed, mark as Cancelled below.
            </p>
          )}
        </Card>
      )}

      {/* Refund Info */}
      {booking.refundStatus !== "NOT_APPLICABLE" && (
        <Card className="bg-white dark:bg-gray-800">
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Refund Details</h6>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Refund Status</p><p className="font-medium text-gray-800">{booking.refundStatus.replace(/_/g, " ")}</p></div>
            <div><p className="text-xs text-gray-400">Refund Amount</p><p className="font-bold text-orange-600 text-base">{formatINR(booking.refundAmount)}</p></div>
          </div>
        </Card>
      )}

      {/* Admin Notes */}
      {booking.adminNotes && (
        <Card className="bg-white dark:bg-gray-800">
          <h6 className="text-sm font-semibold text-gray-700 mb-2">Admin Notes</h6>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.adminNotes}</p>
        </Card>
      )}

      {/* Actions panel */}
      <ElivaasBookingActions booking={booking} />
    </div>
  );
}
