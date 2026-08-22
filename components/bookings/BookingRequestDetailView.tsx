"use client";

import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "flowbite-react";
import { HiArrowLeft, HiCheck, HiX } from "react-icons/hi";

import { approveBookingConfirmation, rejectBookingConfirmation } from "@/actions/bookingConfirmationActions";
import { formatAdminDate, formatAdminDateTime } from "@/lib/dateUtils";

type BookingRequestDetail = {
  id: string;
  status: string;
  brandId?: string | null;
  propertyId?: string | null;
  customerId?: string | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  durationNights?: number | null;
  totalGuestCount?: number | null;
  totalAmount?: number | null;
  gatewayFee?: number | null;
  decisionTakerType?: string | null;
  decisionTakerId?: string | null;
  decisionTimestamp?: string | null;
  decisionReason?: string | null;
  refundStatus?: string | null;
  refundReference?: string | null;
  refundTimestamp?: string | null;
  convertedBookingId?: string | null;
  remarks?: string | null;
  expiryTimestamp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  guestBreakup?: Record<string, unknown> | null;
  bookingPayload?: Record<string, any> | null;
  property?: {
    id: string | null;
    propertyName: string | null;
    propertyCode: string | null;
    bedroomCount?: number | null;
    bathroomCount?: number | null;
    baseGuestCount?: number | null;
    maxGuestCount?: number | null;
  } | null;
  customer?: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
    mobileNumber?: string | null;
    gender?: string | null;
  } | null;
  brand?: {
    id: string | null;
    name: string | null;
  } | null;
};

type Props = {
  request: BookingRequestDetail;
};

function formatDate(value: unknown, withTime = false) {
  return withTime
    ? formatAdminDateTime(value, { fallback: "N/A" })
    : formatAdminDate(value, "N/A");
}

function formatCurrency(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(amount)) return "N/A";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusMeta(status: string) {
  if (status === "PENDING") {
    return {
      label: "Pending Approval",
      className: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
    };
  }
  if (status === "APPROVED") {
    return {
      label: "Approved",
      className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
    };
  }

  return {
    label: status,
    className: "bg-slate-500/15 text-slate-200 ring-slate-400/30",
  };
}

function valueOrFallback(value: unknown, fallback = "N/A") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10"
        : "border-slate-700 bg-slate-900/70";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-slate-700 bg-slate-800/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.28)] ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/75 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function BookingRequestDetailView({ request }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const payload = (request.bookingPayload as Record<string, any> | null) ?? {};
  const booking = (payload.booking as Record<string, any> | undefined) ?? {};
  const guests = (payload.guests as Record<string, any> | undefined) ?? {};
  const pricing = (payload.pricing as Record<string, any> | undefined) ?? {};
  const daywiseBreakup = Array.isArray(pricing.daywiseBreakup) ? pricing.daywiseBreakup : [];
  const paymentData = Array.isArray(payload.paymentData) ? payload.paymentData : [];
  const statusMeta = getStatusMeta(request.status);
  const guestName =
    `${request.customer?.firstName || ""} ${request.customer?.lastName || ""}`.trim() || "Unknown Guest";
  const isAwaitingApproval = request.status === "PENDING";

  const onApprove = () => {
    if (!isAwaitingApproval) return;
    startTransition(async () => {
      await approveBookingConfirmation(request.id);
      router.refresh();
    });
  };

  const onReject = () => {
    if (!isAwaitingApproval || !rejectionReason.trim()) return;
    startTransition(async () => {
      await rejectBookingConfirmation(request.id, rejectionReason.trim());
      setRejectOpen(false);
      setRejectionReason("");
      router.refresh();
    });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Link href="/admin/bookings" className="hover:text-white">Bookings</Link>
              <span>/</span>
              <Link href="/admin/bookings/booking-requests" className="hover:text-white">Booking Requests</Link>
              <span>/</span>
              <span className="text-slate-200">Request Detail</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Booking Request Details</h1>
            <p className="mt-1 text-sm text-slate-400">
              Review request context, pricing intent, and decision history in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/bookings/booking-requests">
              <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">
                <HiArrowLeft className="mr-2 h-4 w-4" />
                Back to Requests
              </span>
            </Link>
            {isAwaitingApproval ? (
              <>
                <Button color="success" onClick={onApprove} disabled={isPending}>
                  <HiCheck className="mr-2 h-4 w-4" />
                  Approve Request
                </Button>
                <Button
                  color="failure"
                  outline
                  onClick={() => setRejectOpen(true)}
                  disabled={isPending}
                >
                  <HiX className="mr-2 h-4 w-4" />
                  Reject Request
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-700 bg-[linear-gradient(135deg,rgba(17,24,39,0.95),rgba(15,23,42,0.92))] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.38)]">
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">Request Overview</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-white">
                  {request.property?.propertyName || "Unknown Property"}
                </h2>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300">
                <span>{request.property?.propertyCode || "No property code"}</span>
                <span>{formatDate(request.checkinDate)} to {formatDate(request.checkoutDate)}</span>
                <span>{valueOrFallback(request.durationNights)} nights</span>
                <span>{request.brand?.name || "Unknown Brand"}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {request.property?.id ? (
                  <Link
                    href={`/admin/properties/${request.property.id}`}
                    className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/20"
                  >
                    Open Property
                  </Link>
                ) : null}
                {request.convertedBookingId ? (
                  <Link
                    href={`/admin/bookings/${request.convertedBookingId}`}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    Open Converted Booking
                  </Link>
                ) : null}
                <span className="rounded-full border border-slate-600 bg-slate-900/60 px-4 py-2 text-sm text-slate-200">
                  Request ID: {request.id}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Requested Amount" value={formatCurrency(request.totalAmount)} />
              <MetricCard
                label="Expected Collection"
                value={formatCurrency(pricing.fullBookingAmountWithGst ?? request.totalAmount)}
                tone={request.status === "APPROVED" ? "success" : "default"}
              />
              <MetricCard label="Guests" value={String(request.totalGuestCount ?? 0)} />
              <MetricCard
                label="Expires"
                value={formatDate(request.expiryTimestamp, true)}
                tone={request.status === "PENDING" ? "warning" : "default"}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <DetailCard title="Property Context" subtitle="Operational context for the requested stay.">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Property" value={request.property?.propertyName || "N/A"} />
              <DetailField label="Property Code" value={request.property?.propertyCode || "N/A"} />
              <DetailField
                label="Bedrooms / Bathrooms"
                value={`${valueOrFallback(request.property?.bedroomCount, "N/A")} / ${valueOrFallback(request.property?.bathroomCount, "N/A")}`}
              />
              <DetailField
                label="Base / Max Guests"
                value={`${valueOrFallback(request.property?.baseGuestCount, "N/A")} / ${valueOrFallback(request.property?.maxGuestCount, "N/A")}`}
              />
            </div>
          </DetailCard>

          <DetailCard title="Guest Context" subtitle="Primary customer and guest breakup captured on the request.">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Guest Name" value={guestName} />
              <DetailField label="Mobile" value={request.customer?.mobileNumber || "N/A"} />
              <DetailField label="Email" value={request.customer?.email || "N/A"} />
              <DetailField label="Gender" value={request.customer?.gender || "N/A"} />
              <DetailField
                label="Stay Party"
                value={`A:${valueOrFallback(guests.staysAdult ?? request.guestBreakup?.stayAdultCount, "0")} C:${valueOrFallback(guests.staysChild ?? request.guestBreakup?.stayChildCount, "0")} I:${valueOrFallback(guests.staysInfant ?? request.guestBreakup?.stayInfantCount, "0")}`}
              />
              <DetailField
                label="Floating Guests"
                value={`A:${valueOrFallback(guests.floatingAdults ?? request.guestBreakup?.floatingAdultCount, "0")} C:${valueOrFallback(guests.floatingChildren ?? request.guestBreakup?.floatingChildCount, "0")} I:${valueOrFallback(guests.floatingInfants ?? request.guestBreakup?.floatingInfantCount, "0")}`}
              />
            </div>
          </DetailCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <DetailCard title="Commercial Snapshot" subtitle="The exact request-side commercial values captured when the request was raised.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailField label="Before Discount" value={formatCurrency(pricing.bookingAmountWithGstBeforeDiscounts ?? pricing.totalBeforeDiscountExclGst ?? 0)} />
              <DetailField label="Discount" value={formatCurrency(pricing.totalDiscountAmount ?? pricing.totalDiscountAmountExclGst ?? 0)} />
              <DetailField label="GST Collected" value={formatCurrency(pricing.totalGstCollected ?? pricing.totalGstAmount ?? 0)} />
              <DetailField label="After Discount Before GST" value={formatCurrency(pricing.bookingAmountWithDiscountBeforeGst ?? pricing.totalAfterDiscountExclGst ?? 0)} />
              <DetailField label="Final Amount" value={formatCurrency(pricing.fullBookingAmountWithGst ?? request.totalAmount ?? 0)} />
              <DetailField label="Gateway Fee" value={formatCurrency(request.gatewayFee ?? 0)} />
            </div>
          </DetailCard>

          <DetailCard title="Decision & Audit" subtitle="Approval, rejection, expiry, and conversion state.">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Request Status" value={request.status} />
              <DetailField label="Expiry" value={formatDate(request.expiryTimestamp, true)} />
              <DetailField label="Decision Taken By" value={`${valueOrFallback(request.decisionTakerType)}${request.decisionTakerId ? ` | ${request.decisionTakerId}` : ""}`} />
              <DetailField label="Decision Time" value={formatDate(request.decisionTimestamp, true)} />
              <DetailField label="Decision Reason" value={request.decisionReason || "N/A"} />
              <DetailField label="Converted Booking ID" value={request.convertedBookingId || "Not converted yet"} />
              <DetailField label="Refund Status" value={request.refundStatus || "N/A"} />
              <DetailField label="Refund Reference" value={request.refundReference || "N/A"} />
              <DetailField label="Refund Time" value={formatDate(request.refundTimestamp, true)} />
              <DetailField label="Created / Updated" value={`${formatDate(request.createdAt, true)} / ${formatDate(request.updatedAt, true)}`} />
            </div>
          </DetailCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <DetailCard title="Day-wise Stay Preview" subtitle="Night-by-night pricing from the stored request payload.">
            {daywiseBreakup.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {daywiseBreakup.map((day: Record<string, any>, index: number) => (
                  <div key={`${day.date || day.day || index}`} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Night {index + 1}</p>
                        <p className="mt-1 text-lg font-semibold text-white">{formatDate(day.date || day.day)}</p>
                      </div>
                      <Badge color="info">GST {valueOrFallback(day.gstSlab, "0")}%</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <DetailField label="Base" value={formatCurrency(day.baseRentalWithoutGst ?? 0)} />
                      <DetailField label="Discount" value={formatCurrency(day.discountForTheDay ?? 0)} />
                      <DetailField label="GST" value={formatCurrency(day.gstAmount ?? 0)} />
                      <DetailField
                        label="Final"
                        value={formatCurrency(
                          day.bookingAmountAfterDiscountWithGst ??
                            day.finalPriceInclGst ??
                            ((Number(day.priceAfterDiscountExclGst || 0) + Number(day.bookingGstAmount || 0)) || 0)
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 px-5 py-10 text-center text-sm text-slate-400">
                No day-wise breakup was stored on this booking request.
              </div>
            )}
          </DetailCard>

          <DetailCard title="Notes & Payment Intent" subtitle="Context supplied with the request plus any pre-attached payment data.">
            <div className="space-y-3">
              <DetailField label="Remarks" value={request.remarks || booking.remarks || "N/A"} />
              <DetailField label="Special Requests" value={booking.specialRequests || "N/A"} />
              <DetailField label="Booking Source" value={booking.bookingSource || "N/A"} />
              <DetailField label="Execution Type" value={booking.bookingSourceType || "N/A"} />
              <DetailField label="Tech Platform" value={booking.bookingTechPlatform || "N/A"} />
              <DetailField label="Captured Payments" value={String(paymentData.length)} />
              {paymentData.length > 0 ? (
                <div className="space-y-3">
                  {paymentData.map((payment: Record<string, any>, index: number) => (
                    <div key={`${payment.paymentReference || payment.reference || index}`} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{formatCurrency(payment.amount ?? 0)}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          {valueOrFallback(payment.paymentMethod || payment.paymentMode || payment.paymentInstrument)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <DetailField label="Payment For" value={valueOrFallback(payment.paymentFor)} />
                        <DetailField label="Reference" value={valueOrFallback(payment.paymentReference)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DetailCard>
        </div>

        <DetailCard title="Raw Request Identifiers" subtitle="Operational IDs that help support and debugging.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Request ID" value={request.id} />
            <DetailField label="Brand ID" value={request.brandId || "N/A"} />
            <DetailField label="Property ID" value={request.propertyId || "N/A"} />
            <DetailField label="Customer ID" value={request.customerId || "N/A"} />
          </div>
        </DetailCard>
      </div>

      <Modal show={rejectOpen} onClose={() => setRejectOpen(false)} size="md">
        <ModalHeader>Reject Booking Request</ModalHeader>
        <ModalBody className="dark:bg-slate-900">
          <div className="space-y-4">
            <div>
              <Label htmlFor="booking-request-reason" >Reason for rejection</Label>
            </div>
            <Textarea
              id="booking-request-reason"
              rows={4}
              required
              value={rejectionReason}
              placeholder="Provide the reason that should be stored against this request..."
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="failure" onClick={onReject} disabled={!rejectionReason.trim() || isPending}>
            Reject request
          </Button>
          <Button color="gray" onClick={() => setRejectOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
