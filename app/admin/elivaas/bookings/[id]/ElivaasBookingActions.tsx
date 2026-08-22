"use client";

import { useState, useTransition } from "react";
import { Card, Button, Select, Textarea, Label } from "flowbite-react";
import { useRouter } from "next/navigation";
import { updateElivaasBooking, retryElivaasBooking } from "@/actions/elivaasActions";
import type { ElivaasBookingFull, ElivaasBookingStatus, ElvCancellationType, ElivaasRefundStatus } from "@/actions/elivaasActions";

const CANCELLATION_TYPES: { value: ElvCancellationType; label: string }[] = [
  { value: "CUSTOMER_CANCELLED", label: "Customer Cancelled" },
  { value: "OWNER_CANCELLED",    label: "Owner Cancelled" },
  { value: "ADMIN_CANCELLED",    label: "Admin Cancelled" },
  { value: "NO_SHOW",            label: "No Show" },
];

export default function ElivaasBookingActions({ booking }: { booking: ElivaasBookingFull }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRetrying, startRetry] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paymentStatus = (booking as any).paymentStatus as string | null;
  const retryCount    = (booking as any).retryCount   as number | null;
  const nextRetryAt   = (booking as any).nextRetryAt  as string | null;

  // Cancel form state
  const [cancelType, setCancelType] = useState<ElvCancellationType>("CUSTOMER_CANCELLED");
  const [cancelNote, setCancelNote] = useState("");

  // Refund form state
  const [refundStatus, setRefundStatus] = useState<ElivaasRefundStatus>(booking.refundStatus as ElivaasRefundStatus);
  const [refundAmount, setRefundAmount] = useState<string>(booking.refundAmount?.toString() ?? "");

  // Notes state
  const [notes, setNotes] = useState(booking.adminNotes ?? "");

  // Status quick actions
  const [statusLoading, setStatusLoading] = useState(false);

  async function patch(updates: Parameters<typeof updateElivaasBooking>[1], msg: string) {
    setError(null);
    setSuccess(null);
    const res = await updateElivaasBooking(booking.id, updates);
    if (res.success) {
      setSuccess(msg);
      router.refresh();
    } else {
      setError(res.message ?? "Something went wrong");
    }
  }

  function handleRequestCancel() {
    if (!cancelNote.trim() && !window.confirm("Cancel request without a note?")) return;
    startTransition(() =>
      patch(
        { status: "CANCELLATION_REQUESTED", cancellationType: cancelType, cancellationNote: cancelNote || null },
        "Cancellation request raised. Contact Elivaas support to process it."
      )
    );
  }

  function handleConfirmCancelled() {
    startTransition(() =>
      patch({ status: "CANCELLED" }, "Booking marked as Cancelled.")
    );
  }

  function handleMarkCompleted() {
    startTransition(() =>
      patch({ status: "COMPLETED" }, "Booking marked as Completed.")
    );
  }

  function handleSaveRefund() {
    const amount = refundAmount ? parseInt(refundAmount, 10) : undefined;
    startTransition(() =>
      patch({ refundStatus, refundAmount: amount }, "Refund status updated.")
    );
  }

  function handleSaveNotes() {
    startTransition(() =>
      patch({ adminNotes: notes }, "Notes saved.")
    );
  }

  function handleRetry() {
    setError(null); setSuccess(null);
    startRetry(async () => {
      const r = await retryElivaasBooking(booking.id);
      if (r.success) {
        setSuccess(`Retry succeeded on attempt ${r.attempt} — booking is now CONFIRMED.`);
        router.refresh();
      } else {
        setError(r.message ?? "Retry failed");
      }
    });
  }

  const isActive = booking.status === "CONFIRMED" || booking.status === "CANCELLATION_REQUESTED";

  return (
    <div className="flex flex-col gap-4">
      {error   && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* BOOKING_FAILED — retry panel */}
      {paymentStatus === "BOOKING_FAILED" && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">⚠ Vendor Booking Failed</p>
              <p className="text-xs text-red-600 mt-0.5">
                Payment captured but Elivaas booking could not be created.
                Attempt {retryCount ?? 0}/3 done.
                {nextRetryAt && ` Auto-retry scheduled at ${new Date(nextRetryAt).toLocaleString()}.`}
              </p>
              {booking.adminNotes && (
                <p className="text-xs text-red-500 mt-1 font-mono">{booking.adminNotes}</p>
              )}
            </div>
            <Button color="failure" size="sm" onClick={handleRetry} disabled={isRetrying || isPending}>
              {isRetrying ? "Retrying…" : "Retry Vendor Booking"}
            </Button>
          </div>
        </Card>
      )}

      {/* REFUND_REQUIRED — escalation alert */}
      {paymentStatus === "REFUND_REQUIRED" && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
          <p className="font-semibold text-orange-700 dark:text-orange-400">🔴 Refund Required</p>
          <p className="text-xs text-orange-600 mt-1">
            All {retryCount ?? 3} retry attempts failed. Payment of ₹{booking.amountAfterTax?.toLocaleString("en-IN")} was captured
            but vendor booking was never confirmed. Customer must be refunded immediately.
          </p>
          {booking.adminNotes && (
            <p className="text-xs text-orange-500 mt-1 font-mono">{booking.adminNotes}</p>
          )}
        </Card>
      )}

      {/* Status Actions */}
      <Card className="bg-white dark:bg-gray-800">
        <h6 className="text-sm font-semibold text-gray-700 mb-3">Booking Status</h6>

        {booking.status === "CONFIRMED" && (
          <div className="flex gap-3 flex-wrap">
            <Button color="success" size="sm" disabled={isPending} onClick={handleMarkCompleted}>
              Mark Completed
            </Button>
          </div>
        )}

        {booking.status === "CANCELLATION_REQUESTED" && (
          <div className="flex gap-3 flex-wrap">
            <Button color="failure" size="sm" disabled={isPending} onClick={handleConfirmCancelled}>
              Confirm Cancelled
            </Button>
          </div>
        )}

        {booking.status === "CANCELLED" && (
          <p className="text-sm text-gray-500">This booking has been cancelled.</p>
        )}

        {booking.status === "COMPLETED" && (
          <p className="text-sm text-gray-500">This booking is completed.</p>
        )}
      </Card>

      {/* Cancellation Request (only when CONFIRMED) */}
      {booking.status === "CONFIRMED" && (
        <Card className="bg-white dark:bg-gray-800">
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Request Cancellation</h6>
          <p className="text-xs text-gray-500 mb-3">
            Since Elivaas cancellations are handled via support, this raises a request internally.
            You will then need to contact <strong>developers@elivaas.com</strong> to cancel on their end.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1 block text-xs">Cancellation Type</Label>
              <Select value={cancelType} onChange={(e) => setCancelType(e.target.value as ElvCancellationType)} sizing="sm">
                {CANCELLATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Note (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Reason for cancellation..."
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
              />
            </div>
            <Button color="warning" size="sm" disabled={isPending} onClick={handleRequestCancel}>
              {isPending ? "Saving..." : "Raise Cancellation Request"}
            </Button>
          </div>
        </Card>
      )}

      {/* Refund Management */}
      {(booking.status === "CANCELLATION_REQUESTED" || booking.status === "CANCELLED") && (
        <Card className="bg-white dark:bg-gray-800">
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Refund Management</h6>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1 block text-xs">Refund Status</Label>
              <Select
                value={refundStatus}
                onChange={(e) => setRefundStatus(e.target.value as ElivaasRefundStatus)}
                sizing="sm"
              >
                <option value="NOT_APPLICABLE">No Refund</option>
                <option value="PENDING">Refund Pending</option>
                <option value="COMPLETED">Refund Completed</option>
              </Select>
            </div>
            {refundStatus !== "NOT_APPLICABLE" && (
              <div>
                <Label className="mb-1 block text-xs">Refund Amount (₹)</Label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter refund amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
            )}
            <Button color="blue" size="sm" disabled={isPending} onClick={handleSaveRefund}>
              {isPending ? "Saving..." : "Save Refund Status"}
            </Button>
          </div>
        </Card>
      )}

      {/* Admin Notes */}
      <Card className="bg-white dark:bg-gray-800">
        <h6 className="text-sm font-semibold text-gray-700 mb-3">Admin Notes</h6>
        <Textarea
          rows={3}
          placeholder="Internal notes about this booking..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button color="light" size="sm" className="mt-2" disabled={isPending} onClick={handleSaveNotes}>
          {isPending ? "Saving..." : "Save Notes"}
        </Button>
      </Card>
    </div>
  );
}
