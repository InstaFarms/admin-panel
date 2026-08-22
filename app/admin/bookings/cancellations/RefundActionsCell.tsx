"use client";

import { processCancellationRefund } from "@/actions/bookingActions";
import { formatCurrency } from "@/lib/currencyUtils";
import { Badge, Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiCheckCircle, HiExclamation, HiX } from "react-icons/hi";

interface RefundActionsCellProps {
  cancellationId: string | null | undefined;
  bookingId: string;
  guestName: string;
  propertyLabel: string;
  razorpayPaymentReference?: string | null;
  amountPaid: number | string | null | undefined;
  cancellationFee: number | string | null | undefined;
  refundStatus: string | null | undefined;
  refundAmount: number | string | null | undefined;
}

type ModalStep = "confirm" | "success";

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-medium text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default function RefundActionsCell({
  cancellationId,
  bookingId,
  guestName,
  propertyLabel,
  razorpayPaymentReference,
  amountPaid,
  cancellationFee,
  refundStatus,
  refundAmount,
}: RefundActionsCellProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<ModalStep>("confirm");
  const [localStatus, setLocalStatus] = useState(refundStatus);
  const [razorpayRefundId, setRazorpayRefundId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amount = Number(refundAmount ?? 0);
  const paid = Number(amountPaid ?? 0);
  const fee = Number(cancellationFee ?? Math.max(0, paid - amount));
  const status = String(localStatus || refundStatus || "").toUpperCase();
  const canProcess =
    Boolean(cancellationId) &&
    amount > 0 &&
    (status === "NOT_INITIATED" || status === "INITIATED");

  useEffect(() => {
    setLocalStatus(refundStatus);
  }, [refundStatus]);

  const openModal = () => {
    setStep("confirm");
    setErrorMessage(null);
    setRazorpayRefundId(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (loading) return;
    const wasSuccess = step === "success";
    setShowModal(false);
    setStep("confirm");
    setErrorMessage(null);
    if (wasSuccess) {
      router.refresh();
    }
  };

  const handleProcessRefund = () => {
    if (!cancellationId || !canProcess || loading) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await processCancellationRefund(cancellationId);
        if (result.error || !result.success) {
          throw new Error(result.error || "Failed to process Razorpay refund");
        }

        setLocalStatus("COMPLETED");
        setRazorpayRefundId(result.data?.razorpayRefundId ?? null);
        setStep("success");
        toast.success(result.success);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to process Razorpay refund";
        setErrorMessage(message);
        toast.error(message);
      }
    });
  };

  if (status === "COMPLETED") {
    return (
      <Badge color="success" size="sm" className="inline-flex items-center gap-1">
        <HiCheckCircle className="h-3.5 w-3.5" />
        Refunded
      </Badge>
    );
  }

  if (!amount || amount <= 0) {
    return <span className="text-xs text-gray-500 dark:text-gray-400">No refund</span>;
  }

  if (!cancellationId) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Missing cancellation id
      </span>
    );
  }

  if (!canProcess) {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Not actionable
      </span>
    );
  }

  return (
    <>
      <Button size="xs" color="purple" disabled={loading} onClick={openModal}>
        Process Razorpay Refund
      </Button>

      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-[2px]"
            onClick={closeModal}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-refund-title"
              className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#0F1B2D] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            >
              {step === "success" ? (
                <div className="px-6 py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <HiCheckCircle className="h-8 w-8" />
                  </div>
                  <h3
                    id="confirm-refund-title"
                    className="text-xl font-bold text-white"
                  >
                    Refund Processed Successfully
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    The Razorpay refund has been initiated and the cancellation
                    status is now marked as Refunded.
                  </p>
                  {razorpayRefundId && (
                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-left">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        Razorpay Refund ID
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-emerald-300">
                        {razorpayRefundId}
                      </p>
                    </div>
                  )}
                  <Button
                    color="blue"
                    className="mt-6 w-full"
                    onClick={closeModal}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          id="confirm-refund-title"
                          className="text-lg font-bold text-white"
                        >
                          Confirm Refund Processing
                        </h3>
                        <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/40">
                          Live Transaction
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={closeModal}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                      aria-label="Close"
                    >
                      <HiX className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 px-5 py-4">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-400/10 px-3.5 py-3 text-amber-200">
                      <HiExclamation className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                      <p className="text-sm leading-5 min-w-0 flex-1 break-words whitespace-normal">
                        Warning: This action will permanently initiate a transfer
                        of funds via Razorpay. This cannot be undone.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3.5">
                      <DetailItem
                        label="Booking ID"
                        value={bookingId ? `#${bookingId.slice(0, 8)}` : "N/A"}
                        mono
                      />
                      <DetailItem label="Guest Name" value={guestName || "N/A"} />
                      <DetailItem
                        label="Property"
                        value={propertyLabel || "N/A"}
                      />
                      <DetailItem
                        label="Original Razorpay Payment ID"
                        value={razorpayPaymentReference || "Not linked"}
                        mono
                      />
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-300">Total Amount Paid</span>
                          <span className="font-medium text-white">
                            {formatCurrency(paid)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-300">
                            Cancellation Fee (System Calculated)
                          </span>
                          <span className="font-medium text-rose-300">
                            −{formatCurrency(fee)}
                          </span>
                        </div>
                        <div className="border-t border-slate-600 pt-3">
                          <div className="flex items-end justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-200">
                              Final Refund to Initiate
                            </span>
                            <span className="text-2xl font-bold tracking-tight text-emerald-400">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {errorMessage && (
                      <div
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200"
                        role="alert"
                      >
                        {errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-700 px-5 py-4">
                    <Button
                      color="gray"
                      outline
                      disabled={loading}
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      color="success"
                      disabled={loading}
                      onClick={handleProcessRefund}
                      className="min-w-[160px] flex-1 sm:flex-none"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner size="sm" light />
                          Processing...
                        </span>
                      ) : (
                        `Process Refund of ${formatCurrency(amount)}`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
