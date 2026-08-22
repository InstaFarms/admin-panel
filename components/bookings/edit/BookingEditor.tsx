"use client";

import {
  cancelBooking,
  cancelPendingOfflineBooking,
  getBookingById,
  prepareBookingPaymentPage,
  sendBookingPaymentLink,
  updateBooking,
} from "@/actions/bookingActions";
import MyButton from "@/components/MyButton";
import PaymentRow from "@/components/bookings/PaymentRow";
import { useBookingHook } from "@/hooks/bookings/useBookingHook";
import { formatAdminDate, formatAdminDateTime } from "@/lib/dateUtils";
import { parseServerActionResult } from "@/utils/utils";
import { Button, TabItem, Tabs, TextInput } from "flowbite-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { captureError } from "@/lib/sentry";
import Link from "next/link";
import CommercialsTab from "./components/CommercialsTab";
import ChangeBookingSourceModal from "./components/ChangeBookingSourceModal";
import BookingFinanceCorrectionHistoryPanel from "./components/BookingFinanceCorrectionHistoryPanel";
import GuestIdCardsPanel from "./components/GuestIdCardsPanel";
import ReservationOperationsPanel from "./components/ReservationOperationsPanel";
import BookingAdjustmentsTab from "@/components/bookings/adjustments/BookingAdjustmentsTab";
import { useDarkMode } from "@/hooks/bookings/useDarkMode";
import {
  HiArrowTopRightOnSquare,
  HiBanknotes,
  HiBuildingOffice2,
  HiCalendarDays,
  HiCheckBadge,
  HiClock,
  HiEnvelope,
  HiPhone,
  HiUsers,
} from "react-icons/hi2";

interface BookingEditorProps {
  bookingId: string;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const PAYMENT_LINK_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_LINK_PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const PAYMENT_LINK_STATUS_POLL_INTERVAL_MS = 4000;
const PAYMENT_LINK_STATUS_MAX_POLLS = 15;

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  return currency.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: unknown) {
  return formatAdminDate(value, "N/A");
}

function formatDateTime(value: unknown) {
  return formatAdminDateTime(value, { fallback: "N/A" });
}

function formatPercent(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0%";
  return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)}%`;
}

function formatBooleanLabel(
  value: unknown,
  trueLabel = "Yes",
  falseLabel = "No",
) {
  return value ? trueLabel : falseLabel;
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  if (
    normalized === "CONFIRMED" ||
    normalized === "COMPLETED" ||
    normalized === "PAID"
  ) {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }
  if (normalized === "CANCELLED" || normalized === "FAILED") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }
  if (normalized === "PENDING" || normalized === "PAYMENT_PENDING") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.92)_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.92)_0%,_rgba(17,24,39,0.82)_100%)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.45),transparent)] opacity-70" />
      <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-[15px] leading-6 font-semibold break-words text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.96)_100%)] p-6 shadow-sm dark:border-slate-700 dark:bg-[linear-gradient(180deg,_rgba(30,41,59,0.96)_0%,_rgba(30,41,59,0.88)_100%)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(59,130,246,0.95),rgba(14,165,233,0.55),transparent)]" />
      <div className="mb-5">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
          Detail View
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyInfo({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/35 dark:text-slate-400">
      {message}
    </div>
  );
}

function InlineMeta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold break-words text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

type GenericFinanceRow = Record<string, unknown>;

type PropertyCancellationPlan = {
  cancellationPlanId?: string | null;
  type?: string | null;
  policy?: string | null;
  cancellationPlan?: {
    id?: string | null;
    name?: string | null;
  } | null;
  percentages?: Array<{
    id?: string | null;
    days?: number | null;
    percentage?: number | string | null;
    lessThan?: boolean | null;
  }> | null;
};

type CancellationPreview = {
  policy_id?: string | null;
  policy_snapshot?:
    | {
        name?: string | null;
        planType?: string | null;
      }
    | Record<string, unknown>;
  applied_rule?: {
    days?: number | null;
    percentage?: number | null;
    lessThan?: boolean | null;
    planType?: string | null;
  } | null;
  days_until_checkin?: number | null;
  cancellation_percentage?: number | null;
  cancellation_amount_before_gst?: number | null;
  cancellation_amount_with_gst?: number | null;
  gst_rate?: number | null;
  gst_applicable?: boolean | null;
  total_deductions?: number | null;
  refund_amount?: number | null;
  refund_percentage?: number | null;
  gateway_fee?: number | null;
  gst_on_cancellation_fee?: number | null;
} | null;

type OwnerCancellationSummary = {
  booking?: {
    bookingId?: string | null;
    propertyName?: string | null;
    checkinDate?: string | null;
    checkoutDate?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    bookingStatus?: string | null;
    cancellationType?: string | null;
  } | null;
  guestMoney?: {
    amountPaid?: number | null;
    refundAmount?: number | null;
    refundedAmount?: number | null;
    refundStatus?: string | null;
    refundMethod?: string | null;
    refundGateway?: string | null;
    refundReference?: string | null;
    latestRefundAttemptStatus?: string | null;
    latestRefundAttemptTime?: string | null;
    latestRefundFailureReason?: string | null;
  } | null;
  ownerMoney?: {
    retainedGross?: number | null;
    baseCancellationAmount?: number | null;
    bookingGstOnRetention?: number | null;
    platformCommission?: number | null;
    platformCommissionGst?: number | null;
    tdsAmount?: number | null;
    netOwnerPayable?: number | null;
    retentionPercent?: number | null;
  } | null;
  ownerPosting?: {
    settlementStatus?: string | null;
    walletNetEffect?: number | null;
    walletPostingStatus?: string | null;
    walletPostingLabel?: string | null;
    walletEntryCount?: number | null;
    ownerWalletCurrentBalance?: number | null;
    platformLedgerNetEffect?: number | null;
  } | null;
  taxEvidence?: {
    bookingGstRows?: GenericFinanceRow[];
    commissionGstRows?: GenericFinanceRow[];
    tdsRows?: GenericFinanceRow[];
  } | null;
  auditEvidence?: {
    walletRows?: GenericFinanceRow[];
    platformLedgerRows?: GenericFinanceRow[];
    refundAttemptRows?: GenericFinanceRow[];
    ownerSettlementRows?: GenericFinanceRow[];
    ownerSettlementAdjustmentRows?: GenericFinanceRow[];
  } | null;
  policy?: {
    daysBeforeCheckin?: number | null;
    stayType?: string | null;
    retentionPercent?: number | null;
    policyName?: string | null;
    gstApplicable?: boolean | null;
  } | null;
  financeProof?: {
    ownerSettlement?: GenericFinanceRow | null;
    bookingRefund?: GenericFinanceRow | null;
    latestRefundAttempt?: GenericFinanceRow | null;
    allGstRecords?: GenericFinanceRow[];
    allTdsRecords?: GenericFinanceRow[];
    allPlatformLedgerRows?: GenericFinanceRow[];
    allOwnerWalletLedgerRows?: GenericFinanceRow[];
  } | null;
} | null;

function formatPolicyTierLabel(tier: {
  days?: number | null;
  percentage?: number | string | null;
  lessThan?: boolean | null;
}) {
  const days = Number(tier.days ?? 0);
  const dayLabel = `${days} day${days === 1 ? "" : "s"}`;
  const refund = formatPercent(tier.percentage);

  if (tier.lessThan) {
    return {
      eyebrow: "Closer to arrival",
      title: `${refund} refund within ${dayLabel} of check-in`,
      detail: "Late cancellation window",
    };
  }

  return {
    eyebrow: "Early cancellation",
    title: `${refund} refund before ${dayLabel} of check-in`,
    detail: "Advance planning window",
  };
}

function PropertyCancellationPolicySection({
  plans,
}: {
  plans: PropertyCancellationPlan[];
}) {
  const normalizedPlans = Array.isArray(plans)
    ? [...plans].sort((a, b) => {
        const order = { shortterm: 0, longterm: 1 } as const;
        const left =
          order[String(a?.type || "").toLowerCase() as keyof typeof order] ??
          99;
        const right =
          order[String(b?.type || "").toLowerCase() as keyof typeof order] ??
          99;
        return left - right;
      })
    : [];

  return (
    <DetailSection
      title="Property cancellation policy"
      subtitle="Assigned property policy text and refund tiers for this booking."
    >
      {normalizedPlans.length === 0 ? (
        <EmptyInfo message="No property cancellation policy is assigned to this property." />
      ) : (
        <div className="space-y-5">
          {normalizedPlans.map((plan, index) => {
            const percentages = Array.isArray(plan.percentages)
              ? [...plan.percentages].sort(
                  (a, b) => Number(a?.days ?? 0) - Number(b?.days ?? 0),
                )
              : [];
            const planType = String(plan.type || "").toLowerCase();
            const typeLabel =
              planType === "shortterm"
                ? "Short-term"
                : planType === "longterm"
                  ? "Long-term"
                  : "Assigned";
            const filledPolicy = plan.policy?.trim() || "";
            const bestRefundTier =
              percentages.length > 0
                ? [...percentages].sort(
                    (a, b) =>
                      Number(b?.percentage ?? 0) - Number(a?.percentage ?? 0),
                  )[0]
                : null;
            const strongestRefund = bestRefundTier
              ? formatPercent(bestRefundTier.percentage)
              : "N/A";
            const tierCount = percentages.length;

            return (
              <div
                key={
                  plan.cancellationPlanId ||
                  plan.cancellationPlan?.id ||
                  `${planType}-${index}`
                }
                className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.88)_100%)] shadow-sm dark:border-slate-700 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.74)_0%,_rgba(15,23,42,0.45)_100%)]"
              >
                <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(241,245,249,0.98)_100%)] px-5 py-5 dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_24%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.92)_100%)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase dark:bg-slate-100 dark:text-slate-900">
                          {typeLabel}
                        </span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-sky-700 uppercase dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
                          {tierCount} tier{tierCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                          {plan.cancellationPlan?.name || "Unnamed plan"}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {filledPolicy
                            ? "Policy copy and refund windows configured for this property."
                            : "Refund windows are configured, but no custom policy copy has been added yet."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
                      <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                          Best refund
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                          {strongestRefund}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                          Policy text
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                          {filledPolicy ? "Available" : "Missing"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                      Policy text
                    </div>
                    {filledPolicy ? (
                      <div className="mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {filledPolicy}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                        No custom policy text has been added yet.
                        <br />
                        Admins will still see the refund windows on the right.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                          Refund journey
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          From earliest cancellation window to latest.
                        </div>
                      </div>
                    </div>
                    {percentages.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {percentages.map((tier, tierIndex) => {
                          const tierLabel = formatPolicyTierLabel(tier);

                          return (
                            <div
                              key={
                                tier.id ||
                                `${tier.days}-${tier.percentage}-${tier.lessThan}`
                              }
                              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.96)_0%,_rgba(241,245,249,0.92)_100%)] p-4 dark:border-slate-700 dark:bg-[linear-gradient(135deg,_rgba(15,23,42,0.8)_0%,_rgba(30,41,59,0.7)_100%)]"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                                    {tierIndex + 1}
                                  </div>
                                  {tierIndex < percentages.length - 1 ? (
                                    <div className="mt-2 h-10 w-px bg-slate-300 dark:bg-slate-700" />
                                  ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:bg-emerald-950/30 dark:text-emerald-300">
                                      {tierLabel.eyebrow}
                                    </span>
                                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase dark:border-slate-700 dark:text-slate-300">
                                      {formatPercent(tier.percentage)}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-sm leading-6 font-semibold text-slate-900 dark:text-white">
                                    {tierLabel.title}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {tierLabel.detail}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                        No refund tiers configured for this plan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DetailSection>
  );
}

function BookingRefundPreviewSection({
  preview,
  amountPaid,
}: {
  preview: CancellationPreview;
  amountPaid: number;
}) {
  if (!preview) {
    return (
      <DetailSection
        title="Refund preview"
        subtitle="Booking-specific cancellation estimate based on current payment and policy."
      >
        <EmptyInfo message="Refund preview is unavailable for this booking right now." />
      </DetailSection>
    );
  }

  const appliedRule = preview.applied_rule;
  const planType = String(
    appliedRule?.planType ||
      (typeof preview.policy_snapshot === "object" && preview.policy_snapshot
        ? (preview.policy_snapshot as { planType?: string | null }).planType
        : "") ||
      "",
  ).toLowerCase();
  const planName =
    typeof preview.policy_snapshot === "object" && preview.policy_snapshot
      ? ((preview.policy_snapshot as { name?: string | null }).name ??
        "Assigned policy")
      : "Assigned policy";
  const ruleLabel = appliedRule
    ? `${formatPercent(appliedRule.percentage)} refund ${
        appliedRule.lessThan ? "within" : "before"
      } ${appliedRule.days ?? 0} day${Number(appliedRule.days ?? 0) === 1 ? "" : "s"} of check-in`
    : "No matching tier found";
  const policyTypeLabel =
    planType === "shortterm"
      ? "Short-term policy"
      : planType === "longterm"
        ? "Long-term policy"
        : "Assigned policy";
  const refundAmount = Number(preview.refund_amount ?? 0);
  const totalDeductions = Number(preview.total_deductions ?? 0);
  const refundPercent = Number(preview.refund_percentage ?? 0);
  const cancellationFeeWithGst = Number(
    preview.cancellation_amount_with_gst ?? 0,
  );
  const safeAmountPaid = Number(amountPaid ?? 0);
  const keptByPlatform = Math.max(0, totalDeductions);
  const refundRatio =
    safeAmountPaid > 0
      ? Math.min(100, Math.max(0, (refundAmount / safeAmountPaid) * 100))
      : 0;
  const deductionRows = [
    {
      label: "Amount paid",
      value: formatMoney(safeAmountPaid),
      tone: "neutral" as const,
    },
    {
      label: "Cancellation fee incl. GST",
      value: formatMoney(cancellationFeeWithGst),
      tone: "neutral" as const,
    },
    {
      label: "Total deductions",
      value: formatMoney(totalDeductions),
      tone: "danger" as const,
    },
    {
      label: "Final customer refund",
      value: formatMoney(refundAmount),
      tone: "success" as const,
    },
  ];

  return (
    <DetailSection
      title="Refund preview"
      subtitle="What the customer is expected to receive if the booking is cancelled right now."
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#f0fdf4_42%,_#ecfdf5_100%)] p-6 shadow-sm dark:border-emerald-900/40 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_22%),linear-gradient(135deg,_rgba(6,78,59,0.36)_0%,_rgba(15,23,42,0.96)_48%,_rgba(15,23,42,0.98)_100%)]">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase">
                  {policyTypeLabel}
                </span>
                <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-emerald-700 uppercase dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                  {preview.days_until_checkin ?? "N/A"} days to check-in
                </span>
              </div>
              <div>
                <h4 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {planName}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Applicable rule: {ruleLabel}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                      Refund outcome
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Customer receives{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatMoney(refundAmount)}
                      </span>{" "}
                      and
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {" "}
                        {formatMoney(keptByPlatform)}
                      </span>{" "}
                      is retained as fee or charge.
                    </div>
                  </div>
                  <div className="hidden h-24 w-24 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-center sm:flex dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div>
                      <div className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                        {Math.round(refundRatio)}%
                      </div>
                      <div className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700/80 uppercase dark:text-emerald-300/80">
                        Returned
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,_#10b981_0%,_#34d399_100%)]"
                    style={{ width: `${refundRatio}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/72">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                  Paid amount
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {formatMoney(safeAmountPaid)}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Current collected amount considered for this refund.
                </div>
              </div>
              <div className="rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,_rgba(236,253,245,0.95)_0%,_rgba(209,250,229,0.95)_100%)] p-4 shadow-sm dark:border-emerald-900/40 dark:bg-[linear-gradient(135deg,_rgba(6,95,70,0.35)_0%,_rgba(6,78,59,0.22)_100%)]">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-300">
                  Customer receives
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {formatMoney(refundAmount)}
                </div>
                <div className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Final estimated payout after fees and deductions.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
            <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
              Policy outcome
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InlineMeta
                label="Refund %"
                value={formatPercent(refundPercent)}
              />
              <InlineMeta
                label="Cancellation fee %"
                value={formatPercent(preview.cancellation_percentage ?? 0)}
              />
              <InlineMeta
                label="GST on fee"
                value={
                  preview.gst_applicable
                    ? `${preview.gst_rate ?? 0}%`
                    : "Not applicable"
                }
              />
              <InlineMeta label="Applied window" value={ruleLabel} />
            </div>
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/85 p-4 dark:border-slate-700 dark:bg-slate-900/55">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                Reading this estimate
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This preview uses the active cancellation rule for the
                booking&apos;s current stay duration and days remaining before
                check-in. If payment changes, this estimate can change too.
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                  Calculation breakdown
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Only the key customer-facing amounts for this cancellation.
                </div>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                4 items
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {deductionRows.map((row, index) => {
                const rowClass =
                  row.tone === "success"
                    ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/12"
                    : row.tone === "danger"
                      ? "border-rose-200/70 bg-rose-50/70 dark:border-rose-900/30 dark:bg-rose-950/12"
                      : row.tone === "neutral"
                        ? "border-slate-200/80 bg-slate-50/45 dark:border-slate-700 dark:bg-slate-900/40"
                        : "border-slate-200/80 bg-white/70 dark:border-slate-700 dark:bg-slate-900/55";
                const labelClass =
                  row.tone === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : row.tone === "danger"
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-slate-600 dark:text-slate-300";
                const valueClass =
                  row.tone === "success" || row.tone === "danger"
                    ? "text-base"
                    : "text-[15px]";
                const helperText =
                  index === 0
                    ? "Base amount"
                    : row.tone === "neutral"
                      ? "Included in deductions"
                      : row.tone === "danger"
                        ? "Total retained"
                        : row.tone === "success"
                          ? "Final payout"
                          : "Primary fee";

                return (
                  <div key={`${row.label}-${index}`}>
                    <div
                      className={`flex items-center justify-between rounded-[18px] border px-4 py-3.5 ${rowClass}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium ${labelClass}`}>
                          {row.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {helperText}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-right font-semibold text-slate-900 dark:text-white ${valueClass}`}
                      >
                        {row.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DetailSection>
  );
}

function getOwnerOutcomeLabel(amount: unknown) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || value === 0) return "No owner payout";
  if (value > 0) return "Owner earns from cancellation";
  return "Owner recovery/deduction";
}

function ProofTable({
  title,
  subtitle,
  rows,
  columns,
}: {
  title: string;
  subtitle: string;
  rows: GenericFinanceRow[];
  columns: Array<{
    key: string;
    label: string;
    render?: (row: GenericFinanceRow) => React.ReactNode;
  }>;
}) {
  return (
    <details className="group overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/70">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 border-b border-slate-800 bg-[linear-gradient(180deg,_rgba(39,52,73,0.7)_0%,_rgba(24,34,50,0.82)_100%)] px-6 py-5 marker:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-400">
            {subtitle}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-slate-200">
            {rows.length} row{rows.length === 1 ? "" : "s"}
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            View
          </div>
        </div>
      </summary>
      <div className="px-0 py-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyInfo message="No records found for this section." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left font-semibold tracking-[0.14em] whitespace-nowrap uppercase"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-200">
                {rows.map((row, index) => (
                  <tr key={String(row.id || row.referenceId || index)}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-4 align-top whitespace-nowrap"
                      >
                        {column.render
                          ? column.render(row)
                          : String(row[column.key] ?? "N/A")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function DetailDashboardSection({
  title,
  actionLabel,
  children,
  className = "",
}: {
  title: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[15px] border border-slate-800/90 bg-[linear-gradient(180deg,_rgba(21,31,47,0.98)_0%,_rgba(16,24,39,0.98)_100%)] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.75)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/90 bg-[linear-gradient(180deg,_rgba(39,52,73,0.95)_0%,_rgba(31,41,55,0.95)_100%)] px-6 py-5">
        <h3 className="text-xl text-[30px] font-semibold tracking-tight text-white">
          {title}
        </h3>
        {actionLabel ? (
          <span className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
            {actionLabel}
          </span>
        ) : null}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function DashboardMetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const accentClass =
    tone === "success"
      ? "text-emerald-300 bg-emerald-500/10"
      : tone === "warning"
        ? "text-amber-200 bg-amber-500/10"
        : "text-blue-200 bg-blue-500/10";

  return (
    <div className="rounded-[15px] border border-slate-800/90 bg-[linear-gradient(180deg,_rgba(26,37,54,0.98)_0%,_rgba(22,31,45,0.98)_100%)] p-5 shadow-[0_12px_35px_-26px_rgba(0,0,0,0.8)]">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${accentClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
            {label}
          </div>
          <div className="mt-2 text-[28px] leading-none font-semibold text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardInfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-800/80 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mt-0.5 text-lg text-slate-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
          {label}
        </div>
        <div className="mt-2 text-base font-medium text-slate-100">{value}</div>
      </div>
    </div>
  );
}

function ActivityTimelineItem({
  title,
  subtitle,
  timestamp,
  tone = "blue",
}: {
  title: string;
  subtitle?: string | null;
  timestamp?: string | null;
  tone?: "blue" | "green" | "rose" | "amber";
}) {
  const dotClass =
    tone === "green"
      ? "bg-emerald-300"
      : tone === "rose"
        ? "bg-rose-300"
        : tone === "amber"
          ? "bg-amber-300"
          : "bg-blue-300";

  return (
    <div className="relative pl-6">
      <div className="absolute top-2 left-[5px] h-full w-px bg-slate-800 last:hidden" />
      <div
        className={`absolute top-1.5 left-0 h-3 w-3 rounded-full ${dotClass}`}
      />
      <div className="pb-5">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs text-slate-400">
          {timestamp || "No timestamp available"}
        </div>
        {subtitle ? (
          <div className="mt-2 text-sm leading-6 text-slate-300">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreCancellationDashboard({
  bookingId,
  bookingData,
  preview,
  amountPaid,
  remainingAmount,
  canUseNormalCancellationFlow,
  cancellationLoading,
  hasRazorpayPaymentHistory,
  hasEligibleRazorpayRefundReference,
  propertyCancellationPlans,
  onCancelCash,
  onCancelRazorpay,
}: {
  bookingId: string;
  bookingData: GenericFinanceRow | null | undefined;
  preview: CancellationPreview;
  amountPaid: number;
  remainingAmount: number;
  canUseNormalCancellationFlow: boolean;
  cancellationLoading: boolean;
  hasRazorpayPaymentHistory: boolean;
  hasEligibleRazorpayRefundReference: boolean;
  propertyCancellationPlans: PropertyCancellationPlan[];
  onCancelCash: () => void;
  onCancelRazorpay: () => void;
}) {
  const appliedPolicyId = String(preview?.policy_id || "").trim();
  const appliedPlanType = String(
    preview?.applied_rule?.planType || preview?.policy_snapshot?.planType || "",
  ).toLowerCase();
  const policy =
    propertyCancellationPlans.find((plan) => {
      const planId = String(
        plan?.cancellationPlanId || plan?.cancellationPlan?.id || "",
      ).trim();
      const planType = String(plan?.type || "").toLowerCase();
      return (
        (appliedPolicyId.length > 0 && planId === appliedPolicyId) ||
        (appliedPlanType.length > 0 && planType === appliedPlanType)
      );
    }) ??
    propertyCancellationPlans[0] ??
    null;
  const policyName = policy?.cancellationPlan?.name || "Assigned policy";
  const policyType = String(
    policy?.type || preview?.applied_rule?.planType || "",
  ).toUpperCase();
  const refundAmount = Number(preview?.refund_amount ?? 0);
  const deductions = Number(preview?.total_deductions ?? 0);
  const gatewayFee = Number(preview?.gateway_fee ?? 0);
  const ownerRetainedEstimate = Math.max(0, deductions - gatewayFee);
  const refundRatio =
    amountPaid > 0
      ? Math.max(0, Math.min(100, (refundAmount / amountPaid) * 100))
      : 0;
  const guestShare = refundAmount;
  const ownerShare = ownerRetainedEstimate;
  const platformShare = Math.max(0, gatewayFee);
  const totalDistributed = Math.max(guestShare + ownerShare + platformShare, 1);
  const guestPercent = (guestShare / totalDistributed) * 100;
  const ownerPercent = (ownerShare / totalDistributed) * 100;
  const platformPercent = (platformShare / totalDistributed) * 100;
  const timelineRules = (policy?.percentages ?? [])
    .slice()
    .sort((a, b) => Number(b.days ?? 0) - Number(a.days ?? 0));
  const bookingStatusLabel = String(bookingData?.status || "N/A");

  return (
    <div className="space-y-6">
      <div className="rounded-[18px] border border-slate-800 bg-[linear-gradient(180deg,_#081728_0%,_#081321_100%)] p-6 shadow-[0_18px_55px_-28px_rgba(0,0,0,0.75)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Booking ID: {bookingId}
            </div>
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              Review impact before cancelling this booking
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">
              Carefully evaluate the financial and operational consequences of
              this cancellation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 xl:max-w-[420px] xl:justify-end">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.16em] uppercase ${getStatusBadgeClass(bookingStatusLabel)}`}
            >
              {bookingStatusLabel}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-slate-200 uppercase">
              {String(bookingData?.paymentStatus || "N/A")}
            </span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-blue-100 uppercase">
              {String(bookingData?.bookingType || "N/A")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <div className="space-y-6">
          <DetailDashboardSection title="Financial Overview">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                icon={<HiCheckBadge />}
                label="Booking Status"
                value={bookingStatusLabel}
                tone={canUseNormalCancellationFlow ? "success" : "warning"}
              />
              <DashboardMetricCard
                icon={<HiBanknotes />}
                label="Amount Paid"
                value={formatMoney(amountPaid)}
              />
              <DashboardMetricCard
                icon={<HiClock />}
                label="Remaining"
                value={formatMoney(remainingAmount)}
                tone={remainingAmount > 0 ? "warning" : "default"}
              />
              <DashboardMetricCard
                icon={<HiUsers />}
                label="Owner Revenue"
                value={formatMoney(bookingData?.ownerRevenue ?? 0)}
              />
            </div>
          </DetailDashboardSection>

          <DetailDashboardSection title="Final Disbursal Preview">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-[15px] border border-emerald-500/20 bg-emerald-500/8 p-5">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-emerald-300 uppercase">
                  Guest Receives
                </div>
                <div className="mt-3 text-4xl font-semibold text-emerald-300">
                  {formatMoney(refundAmount)}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Total refund back to the original payment path.
                </div>
              </div>
              <div className="rounded-[15px] border border-slate-700 bg-slate-900/40 p-5">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                  Owner Earnings
                </div>
                <div className="mt-3 text-4xl font-semibold text-white">
                  {formatMoney(ownerRetainedEstimate)}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Estimated retained value available after core cancellation
                  deductions.
                </div>
              </div>
              <div className="rounded-[15px] border border-amber-500/20 bg-amber-500/8 p-5">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-amber-200 uppercase">
                  Platform Fees
                </div>
                <div className="mt-3 text-4xl font-semibold text-amber-100">
                  {formatMoney(platformShare)}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Gateway and platform-linked fee impact visible before
                  cancellation.
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                <span>Disbursal Breakdown</span>
                <span>Total {formatMoney(amountPaid)}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                <div className="flex h-full w-full">
                  <div
                    className="bg-emerald-400"
                    style={{ width: `${guestPercent}%` }}
                  />
                  <div
                    className="bg-blue-300"
                    style={{ width: `${ownerPercent}%` }}
                  />
                  <div
                    className="bg-amber-300"
                    style={{ width: `${platformPercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
                <span>Guest ({Math.round(guestPercent)}%)</span>
                <span>Owner ({Math.round(ownerPercent)}%)</span>
                <span>Platform ({Math.round(platformPercent)}%)</span>
              </div>
            </div>
          </DetailDashboardSection>

          <DetailDashboardSection title="Refund Preview">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">
                  Policy: {policyName}
                </div>
                <div className="mt-3 text-5xl font-semibold text-emerald-300">
                  {Math.round(refundRatio)}%
                </div>
                <div className="mt-2 text-sm tracking-[0.16em] text-slate-400 uppercase">
                  Returned to guest
                </div>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[15px] border border-slate-800 bg-slate-950/35 p-4">
                  <div className="text-sm font-semibold text-white">
                    Eligibility Confirmed
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {canUseNormalCancellationFlow
                      ? "Confirmed booking can be cancelled from this tab."
                      : "Only confirmed bookings can be cancelled from this tab."}
                  </div>
                </div>
                <div className="rounded-[15px] border border-slate-800 bg-slate-950/35 p-4">
                  <div className="text-sm font-semibold text-white">
                    Expected Refund Basis
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    Deductions are computed from the paid amount and policy rule
                    currently in effect.
                  </div>
                </div>
              </div>
            </div>
          </DetailDashboardSection>

          <DetailDashboardSection title="Cancellation Refund Timeline">
            {timelineRules.length > 0 ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {timelineRules.map((rule, index) => (
                    <div
                      key={rule.id || `${rule.days}-${index}`}
                      className={`rounded-[15px] border px-4 py-4 ${
                        Number(preview?.applied_rule?.days ?? -1) ===
                          Number(rule.days ?? -2) &&
                        Number(preview?.applied_rule?.percentage ?? -1) ===
                          Number(rule.percentage ?? -2)
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-slate-800 bg-slate-950/30"
                      }`}
                    >
                      <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                        {rule.lessThan ? "Within" : "Before"}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {Number(rule.days ?? 0)} days
                      </div>
                      <div className="mt-3 text-sm font-medium text-emerald-300">
                        {formatPercent(rule.percentage ?? 0)} refund
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[15px] border border-slate-800 bg-slate-950/35 p-4 text-sm leading-6 text-slate-300">
                  Active rule:{" "}
                  <span className="font-semibold text-white">
                    {preview?.applied_rule
                      ? `${formatPercent(preview.applied_rule.percentage ?? 0)} refund ${preview.applied_rule.lessThan ? "within" : "before"} ${preview.applied_rule.days ?? 0} day(s) of check-in`
                      : "No matching rule found"}
                  </span>
                  {policyType
                    ? ` for the ${policyType.toLowerCase()} policy.`
                    : "."}
                </div>
              </div>
            ) : (
              <EmptyInfo message="No refund timeline tiers are configured for this policy." />
            )}
          </DetailDashboardSection>
        </div>

        <div className="space-y-6">
          <DetailDashboardSection title="Refund Calculation">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 text-slate-200">
                <span>Base Amount Paid</span>
                <span className="text-lg font-semibold text-white">
                  {formatMoney(amountPaid)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-amber-200 uppercase">
                  Deductions
                </div>
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <span>Cancellation Fee (incl. GST)</span>
                    <span className="font-semibold text-rose-300">
                      -{formatMoney(preview?.cancellation_amount_with_gst ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Service Processing</span>
                    <span className="font-semibold text-rose-300">
                      -{formatMoney(platformShare)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-[15px] border border-slate-800 bg-slate-950/45 px-4 py-4">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Total Deductions
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-rose-300">
                    {formatMoney(deductions)}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Final Guest Refund
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  Settlement via original payment method
                </div>
                <div className="mt-2 text-4xl font-semibold text-emerald-300">
                  {formatMoney(refundAmount)}
                </div>
              </div>
            </div>
          </DetailDashboardSection>

          <div className="space-y-3">
            {hasRazorpayPaymentHistory ? (
              <MyButton
                color="light"
                type="button"
                loading={cancellationLoading}
                onClick={onCancelRazorpay}
                disabled={!canUseNormalCancellationFlow}
                className="w-full !rounded-[15px] !border-0 !bg-[linear-gradient(90deg,_#ffbc8a_0%,_#f59e0b_100%)] !px-5 !py-4 !text-base !font-semibold !text-slate-950 hover:!opacity-95"
              >
                Cancel & Refund
              </MyButton>
            ) : null}
            <MyButton
              color={hasRazorpayPaymentHistory ? "light" : "red"}
              type="button"
              loading={cancellationLoading}
              onClick={onCancelCash}
              disabled={!canUseNormalCancellationFlow}
              className={`w-full !rounded-[15px] !px-5 !py-4 !text-base !font-semibold ${
                hasRazorpayPaymentHistory
                  ? "!border-slate-700 !bg-transparent !text-white"
                  : "!border-0 !bg-[linear-gradient(90deg,_#ffbc8a_0%,_#f59e0b_100%)] !text-slate-950"
              }`}
            >
              {hasRazorpayPaymentHistory
                ? "Refund with Cash"
                : "Cancel & Refund"}
            </MyButton>
          </div>

          <DetailDashboardSection title="Policy Enforcement Note">
            <div className="space-y-4">
              <div className="text-sm leading-6 text-slate-300">
                This cancellation follows the active property policy. Once
                confirmed, the booking will be cancelled, refund status will
                move to backend-computed flow, and owner/tax ledgers will be
                generated automatically.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[15px] border border-slate-800 bg-slate-950/35 p-4">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Stay Type
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {String(
                      preview?.applied_rule?.planType || policyType || "N/A",
                    ).replace("TERM", "")}
                  </div>
                </div>
                <div className="rounded-[15px] border border-slate-800 bg-slate-950/35 p-4">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Notice Period
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {String(preview?.days_until_checkin ?? "N/A")}
                  </div>
                </div>
              </div>
              <div className="rounded-[15px] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">
                {hasRazorpayPaymentHistory &&
                !hasEligibleRazorpayRefundReference
                  ? "Razorpay refund may fail because no valid payment reference is available for refund execution."
                  : "Finance rows for owner wallet, settlement, GST, TDS, and platform ledger will be auto-logged after cancellation."}
              </div>
            </div>
          </DetailDashboardSection>
        </div>
      </div>
    </div>
  );
}

function CancellationSummaryPanel({
  ownerSummary,
}: {
  ownerSummary: OwnerCancellationSummary;
}) {
  if (!ownerSummary) {
    return (
      <DetailSection
        title="Cancellation summary"
        subtitle="Owner-side cancellation data is not available for this booking yet."
      >
        <EmptyInfo message="We could not build the owner cancellation summary from the current finance rows." />
      </DetailSection>
    );
  }

  const booking = ownerSummary.booking ?? {};
  const guestMoney = ownerSummary.guestMoney ?? {};
  const ownerMoney = ownerSummary.ownerMoney ?? {};
  const ownerPosting = ownerSummary.ownerPosting ?? {};
  const taxEvidence = ownerSummary.taxEvidence ?? {};
  const auditEvidence = ownerSummary.auditEvidence ?? {};
  const financeProof = ownerSummary.financeProof ?? {};
  const policy = ownerSummary.policy ?? {};
  const ownerOutcomeLabel = getOwnerOutcomeLabel(ownerMoney.netOwnerPayable);

  const evidenceCards = [
    {
      title: "Owner wallet ledger",
      count: auditEvidence.walletRows?.length ?? 0,
      primary: ownerPosting.walletPostingLabel || "No wallet posting yet",
      secondary: `Net effect ${formatMoney(ownerPosting.walletNetEffect)}`,
    },
    {
      title: "Owner settlement",
      count: auditEvidence.ownerSettlementRows?.length ?? 0,
      primary: String(ownerPosting.settlementStatus || "NOT_CREATED"),
      secondary: `Net payable ${formatMoney(ownerMoney.netOwnerPayable)}`,
    },
    {
      title: "Tax proof",
      count:
        (taxEvidence.bookingGstRows?.length ?? 0) +
        (taxEvidence.commissionGstRows?.length ?? 0) +
        (taxEvidence.tdsRows?.length ?? 0),
      primary: `GST ${formatMoney(ownerMoney.bookingGstOnRetention)} | TDS ${formatMoney(ownerMoney.tdsAmount)}`,
      secondary: "Cancellation-tagged tax entries",
    },
    {
      title: "Refund activity",
      count: auditEvidence.refundAttemptRows?.length ?? 0,
      primary: String(guestMoney.latestRefundAttemptStatus || "No attempts"),
      secondary: String(guestMoney.refundMethod || "N/A"),
    },
  ];

  const totalTaxImpact =
    Number(ownerMoney.bookingGstOnRetention ?? 0) +
    Number(ownerMoney.platformCommissionGst ?? 0);
  const totalDeductionImpact =
    Number(ownerMoney.platformCommission ?? 0) +
    Number(ownerMoney.platformCommissionGst ?? 0) +
    Number(ownerMoney.tdsAmount ?? 0);
  const allOwnerWalletLedgerRows = Array.isArray(
    financeProof.allOwnerWalletLedgerRows,
  )
    ? financeProof.allOwnerWalletLedgerRows
    : [];
  const allPlatformLedgerRows = Array.isArray(
    financeProof.allPlatformLedgerRows,
  )
    ? financeProof.allPlatformLedgerRows
    : [];
  const allGstRows = Array.isArray(financeProof.allGstRecords)
    ? financeProof.allGstRecords
    : [];
  const allTdsRows = Array.isArray(financeProof.allTdsRecords)
    ? financeProof.allTdsRecords
    : [];
  const allRefundAttemptRows = Array.isArray(auditEvidence.refundAttemptRows)
    ? auditEvidence.refundAttemptRows
    : [];
  const allOwnerSettlementRows = financeProof.ownerSettlement
    ? [financeProof.ownerSettlement]
    : [];
  const allOwnerSettlementAdjustmentRows = Array.isArray(
    auditEvidence.ownerSettlementAdjustmentRows,
  )
    ? auditEvidence.ownerSettlementAdjustmentRows
    : [];
  const bookingRefundRows = financeProof.bookingRefund
    ? [financeProof.bookingRefund]
    : [];
  const verifiedLedgerRows = allOwnerWalletLedgerRows.map(
    (row: GenericFinanceRow, index: number) => ({
      accountingDate:
        row.accountingDate || row.createdAt || row.updatedAt || null,
      ledgerId:
        row.ledgerId || row.referenceId || row.id || `wallet-${index + 1}`,
      componentType: row.componentType || row.referenceType || "WALLET_ENTRY",
      entryType: row.entryType || "N/A",
      amount: row.amount,
      status: row.status || "VERIFIED",
    }),
  );
  const auditTimeline = [
    {
      title: "Cancelled",
      value: formatDateTime(booking.cancelledAt),
      helper: booking.cancelledBy
        ? `By ${booking.cancelledBy}`
        : "Source not available",
    },
    {
      title: "Refund status",
      value: String(guestMoney.refundStatus || "Pending"),
      helper: guestMoney.latestRefundAttemptTime
        ? `Latest attempt ${formatDateTime(guestMoney.latestRefundAttemptTime)}`
        : "No refund attempt timestamp available",
    },
    {
      title: "Settlement status",
      value: String(ownerPosting.settlementStatus || "NOT_CREATED"),
      helper: ownerPosting.walletPostingLabel || "No wallet posting yet",
    },
  ];
  const financeProofBlocks = [
    {
      label: "Settlement + wallet",
      count: allOwnerSettlementRows.length + allOwnerWalletLedgerRows.length,
      helper: "Owner posting records",
    },
    {
      label: "Tax evidence",
      count: allGstRows.length + allTdsRows.length,
      helper: "GST and TDS rows",
    },
    {
      label: "Refund + platform",
      count:
        allRefundAttemptRows.length +
        allPlatformLedgerRows.length +
        bookingRefundRows.length,
      helper: "Guest refund and platform proof",
    },
  ];

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,_rgba(7,15,31,0.98)_0%,_rgba(10,20,38,0.98)_100%)] p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="text-[12px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Auditing system / cancellation #{booking.bookingId || "N/A"}
            </div>
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-white">
                Audit trail: {booking.propertyName || "Booking cancellation"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Owner-first reconciliation of this cancellation: guest refund,
                owner payout, ledger effects, and tax proof in one view.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 xl:justify-end">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Refund status
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${getStatusBadgeClass(guestMoney.refundStatus)}`}
                >
                  {guestMoney.refundStatus || "Pending"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Payment status
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${getStatusBadgeClass(ownerPosting.settlementStatus)}`}
                >
                  {ownerPosting.settlementStatus || "NOT_CREATED"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <div className="rounded-[24px] border border-slate-700 bg-slate-900/75 p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Net owner impact
                </div>
                <div className="mt-3 text-4xl font-semibold text-white">
                  {formatMoney(ownerMoney.netOwnerPayable)}
                </div>
                <div className="mt-2 text-base text-slate-300">
                  {ownerOutcomeLabel}
                </div>
              </div>
              <div className="xl:text-right">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Audit timestamp
                </div>
                <div className="mt-3 text-sm font-semibold text-white">
                  {formatDateTime(booking.cancelledAt)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {booking.checkinDate && booking.checkoutDate
                    ? `${formatDate(booking.checkinDate)} to ${formatDate(booking.checkoutDate)}`
                    : "Stay window unavailable"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[18px] border border-slate-800 bg-slate-950/65 p-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Owner earnings
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {formatMoney(ownerMoney.netOwnerPayable)}
                </div>
              </div>
              <div className="rounded-[18px] border border-slate-800 bg-slate-950/65 p-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Refund amount
                </div>
                <div className="mt-2 text-3xl font-semibold text-rose-300">
                  -{formatMoney(guestMoney.refundAmount)}
                </div>
              </div>
              <div className="rounded-[18px] border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-emerald-200 uppercase">
                  Retained margin
                </div>
                <div className="mt-2 text-3xl font-semibold text-emerald-300">
                  {formatMoney(ownerMoney.retainedGross)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-700 bg-slate-900/75 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                <HiBanknotes className="h-5 w-5 text-slate-200" />
              </div>
              <div className="text-2xl font-semibold text-white">
                Wallet Balance Effect
              </div>
            </div>
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <span className="text-sm tracking-[0.14em] text-slate-400 uppercase">
                  Current wallet balance
                </span>
                <span className="text-2xl font-semibold text-white">
                  {formatMoney(ownerPosting.ownerWalletCurrentBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <span className="text-sm tracking-[0.14em] text-slate-400 uppercase">
                  Cancellation wallet effect
                </span>
                <span className="text-2xl font-semibold text-sky-300">
                  {formatMoney(ownerPosting.walletNetEffect)}
                </span>
              </div>
              <div className="rounded-[18px] border border-slate-800 bg-slate-950/85 p-4">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Post-audit estimate
                </div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {formatMoney(
                    Number(ownerPosting.ownerWalletCurrentBalance ?? 0) +
                      Number(ownerPosting.walletNetEffect ?? 0),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_360px]">
        <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-2xl font-semibold text-white">
            Pricing Evolution
          </div>
          <div className="mt-6 overflow-hidden rounded-[18px] border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                    Guest
                  </th>
                  <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-200">
                <tr>
                  <td className="px-4 py-4 font-medium text-white">
                    Guest paid
                  </td>
                  <td className="px-4 py-4">
                    {formatMoney(guestMoney.amountPaid)}
                  </td>
                  <td className="px-4 py-4">{formatMoney(0)}</td>
                  <td className="px-4 py-4 font-semibold text-white">
                    {formatMoney(guestMoney.amountPaid)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-white">
                    Refund target
                  </td>
                  <td className="px-4 py-4 text-emerald-300">
                    {formatMoney(guestMoney.refundAmount)}
                  </td>
                  <td className="px-4 py-4">{formatMoney(0)}</td>
                  <td className="px-4 py-4 font-semibold text-white">
                    {formatMoney(guestMoney.refundAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-white">
                    Retained on cancellation
                  </td>
                  <td className="px-4 py-4">{formatMoney(0)}</td>
                  <td className="px-4 py-4 text-emerald-300">
                    {formatMoney(ownerMoney.retainedGross)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-white">
                    {formatMoney(ownerMoney.retainedGross)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-white">
                    Net owner payout
                  </td>
                  <td className="px-4 py-4">{formatMoney(0)}</td>
                  <td className="px-4 py-4 text-sky-300">
                    {formatMoney(ownerMoney.netOwnerPayable)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-sky-300">
                    {formatMoney(ownerMoney.netOwnerPayable)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-base text-slate-400">
              Total before deductions
            </span>
            <span className="text-3xl font-semibold text-white">
              {formatMoney(guestMoney.amountPaid)}
            </span>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-2xl font-semibold text-white">
            Deduction Logic
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-[18px] border border-slate-800 bg-slate-950/65 p-4">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Platform commission
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-sm text-slate-300">
                  Commission charged on cancellation retention
                </div>
                <div className="text-3xl font-semibold text-rose-300">
                  -{formatMoney(ownerMoney.platformCommission)}
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-slate-800 bg-slate-950/65 p-4">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Tax reconciliation
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>TDS withheld</span>
                  <span>{formatMoney(ownerMoney.tdsAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>GST on retained fee</span>
                  <span>{formatMoney(ownerMoney.bookingGstOnRetention)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>GST on commission</span>
                  <span>{formatMoney(ownerMoney.platformCommissionGst)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-sky-500/30 bg-sky-500/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-sky-100">
                  Booking GST + deduction impact
                </span>
                <span className="text-lg font-semibold text-sky-200">
                  {formatMoney(totalTaxImpact)}
                </span>
              </div>
            </div>
            <div className="rounded-[18px] border border-slate-700 bg-slate-900/70 p-4">
              <div className="text-sm font-medium text-slate-300">
                Total payout deductions
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {formatMoney(totalDeductionImpact)}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-2xl font-semibold text-white">
            Policy Snapshot
          </div>
          <div className="mt-6 space-y-5">
            <div className="text-center">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Cancellation percentage applied
              </div>
              <div className="mt-3 text-6xl font-semibold text-emerald-300">
                {formatPercent(policy.retentionPercent)}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                {policy.policyName || "Policy not available"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-slate-800 bg-slate-950/65 p-4">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  Stay type
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {policy.stayType || "N/A"}
                </div>
              </div>
              <div className="rounded-[16px] border border-slate-800 bg-slate-950/65 p-4">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  Notice period
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {policy.daysBeforeCheckin !== undefined &&
                  policy.daysBeforeCheckin !== null
                    ? `${policy.daysBeforeCheckin} days`
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-slate-800 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
              This cancellation follows the saved property policy. GST
              applicable: {formatBooleanLabel(policy.gstApplicable)}. Refund
              method: {guestMoney.refundMethod || "N/A"}.
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-2xl font-semibold text-white">
              Verified Records (Wallet Ledger Copy)
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Cancellation-tagged rows that explain how this booking affected
              owner finance state.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {auditTimeline.map((item) => (
              <div
                key={item.title}
                className="rounded-[16px] border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  {item.title}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {item.value}
                </div>
                <div className="mt-1 text-xs text-slate-400">{item.helper}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[18px] border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Accounting date
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Ledger id
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Component type
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Entry type
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-[0.14em] uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-200">
              {verifiedLedgerRows.length > 0 ? (
                verifiedLedgerRows.map((row, index) => (
                  <tr key={`${row.ledgerId}-${index}`}>
                    <td className="px-4 py-4">
                      {formatDateTime(row.accountingDate)}
                    </td>
                    <td className="px-4 py-4 font-medium text-white">
                      {String(row.ledgerId || "N/A")}
                    </td>
                    <td className="px-4 py-4">
                      {String(row.componentType || "N/A")}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white">
                        {String(row.entryType || "N/A")}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-emerald-300">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="px-4 py-4 text-emerald-300">
                      {String(row.status || "VERIFIED")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    No owner wallet ledger rows were found for this cancellation
                    yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {evidenceCards.map((card) => (
          <div
            key={card.title}
            className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-5"
          >
            <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
              {card.title}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {card.count}
            </div>
            <div className="mt-4 text-sm font-medium text-slate-200">
              {card.primary}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              {card.secondary}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Audit evidence
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              Finance Proof
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Expandable evidence from settlement, wallet, refund, ledger, GST,
              and TDS rows.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {financeProofBlocks.map((block) => (
              <div
                key={block.label}
                className="rounded-[16px] border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  {block.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {block.count}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {block.helper}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <ProofTable
            title="Owner settlement"
            subtitle="Canonical owner-side settlement row for this booking."
            rows={allOwnerSettlementRows}
            columns={[
              { key: "status", label: "Status" },
              {
                key: "netPayableToOwner",
                label: "Net payable",
                render: (row) => formatMoney(row.netPayableToOwner),
              },
              {
                key: "ownerPayoutExclGst",
                label: "Owner payout excl GST",
                render: (row) => formatMoney(row.ownerPayoutExclGst),
              },
              {
                key: "commissionAmountExclCommissionGst",
                label: "Commission",
                render: (row) =>
                  formatMoney(row.commissionAmountExclCommissionGst),
              },
              {
                key: "commissionGst",
                label: "Commission GST",
                render: (row) => formatMoney(row.commissionGst),
              },
              {
                key: "tdsAmount",
                label: "TDS",
                render: (row) => formatMoney(row.tdsAmount),
              },
            ]}
          />
          <ProofTable
            title="Owner wallet ledger"
            subtitle="All owner wallet ledger rows recorded for this booking."
            rows={allOwnerWalletLedgerRows}
            columns={[
              {
                key: "createdAt",
                label: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
              { key: "entryType", label: "Entry" },
              { key: "componentType", label: "Component" },
              {
                key: "amount",
                label: "Amount",
                render: (row) => formatMoney(row.amount),
              },
              { key: "accountingDate", label: "Accounting date" },
              { key: "description", label: "Description" },
            ]}
          />
          <ProofTable
            title="Platform ledger"
            subtitle="All platform ledger rows recorded for this booking."
            rows={allPlatformLedgerRows}
            columns={[
              {
                key: "createdAt",
                label: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
              { key: "entryType", label: "Entry" },
              { key: "category", label: "Category" },
              {
                key: "amountExclCommissionGst",
                label: "Amount excl GST",
                render: (row) => formatMoney(row.amountExclCommissionGst),
              },
              {
                key: "commissionGstAmount",
                label: "GST",
                render: (row) => formatMoney(row.commissionGstAmount),
              },
              {
                key: "amountInclCommissionGst",
                label: "Amount incl GST",
                render: (row) => formatMoney(row.amountInclCommissionGst),
              },
              { key: "description", label: "Description" },
            ]}
          />
          <ProofTable
            title="GST records"
            subtitle="All GST rows recorded for this booking."
            rows={allGstRows}
            columns={[
              {
                key: "createdAt",
                label: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
              { key: "gstType", label: "GST type" },
              { key: "referenceType", label: "Reference" },
              {
                key: "taxableAmountExclGst",
                label: "Taxable",
                render: (row) => formatMoney(row.taxableAmountExclGst),
              },
              {
                key: "gstRate",
                label: "Rate",
                render: (row) => `${Number(row.gstRate ?? 0)}%`,
              },
              {
                key: "gstAmount",
                label: "GST amount",
                render: (row) => formatMoney(row.gstAmount),
              },
              { key: "liabilityHolder", label: "Liability" },
            ]}
          />
          <ProofTable
            title="TDS records"
            subtitle="All TDS rows recorded for this booking."
            rows={allTdsRows}
            columns={[
              {
                key: "createdAt",
                label: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
              { key: "entryType", label: "Entry" },
              { key: "referenceType", label: "Reference" },
              {
                key: "tdsBaseAmount",
                label: "TDS base",
                render: (row) => formatMoney(row.tdsBaseAmount),
              },
              {
                key: "tdsRate",
                label: "Rate",
                render: (row) => `${Number(row.tdsRate ?? 0)}%`,
              },
              {
                key: "tdsAmount",
                label: "TDS amount",
                render: (row) => formatMoney(row.tdsAmount),
              },
              { key: "remarks", label: "Remarks" },
            ]}
          />
          <ProofTable
            title="Booking refund"
            subtitle="Refund master row recorded for this booking."
            rows={bookingRefundRows}
            columns={[
              { key: "status", label: "Status" },
              {
                key: "refundAmount",
                label: "Refund amount",
                render: (row) => formatMoney(row.refundAmount),
              },
              {
                key: "totalRefundedAmount",
                label: "Refunded amount",
                render: (row) => formatMoney(row.totalRefundedAmount),
              },
              { key: "refundType", label: "Refund type" },
              { key: "refundReason", label: "Reason" },
              {
                key: "createdAt",
                label: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
          />
          <ProofTable
            title="Refund attempts"
            subtitle="All gateway or manual refund execution attempts for this booking."
            rows={allRefundAttemptRows}
            columns={[
              { key: "attemptNumber", label: "Attempt" },
              {
                key: "attemptedAt",
                label: "Attempted at",
                render: (row) => formatDateTime(row.attemptedAt),
              },
              { key: "refundMethod", label: "Method" },
              { key: "refundGateway", label: "Gateway" },
              {
                key: "attemptAmount",
                label: "Amount",
                render: (row) => formatMoney(row.attemptAmount),
              },
              { key: "status", label: "Status" },
              { key: "refundReference", label: "Reference" },
            ]}
          />
          {allOwnerSettlementAdjustmentRows.length > 0 ? (
            <ProofTable
              title="Owner settlement adjustments"
              subtitle="All owner settlement adjustments recorded for this booking."
              rows={allOwnerSettlementAdjustmentRows}
              columns={[
                { key: "adjustmentDate", label: "Date" },
                { key: "adjustmentType", label: "Type" },
                { key: "direction", label: "Direction" },
                {
                  key: "amountExclGst",
                  label: "Amount excl GST",
                  render: (row) => formatMoney(row.amountExclGst),
                },
                {
                  key: "gstAmount",
                  label: "GST",
                  render: (row) => formatMoney(row.gstAmount),
                },
                {
                  key: "amountInclGst",
                  label: "Amount incl GST",
                  render: (row) => formatMoney(row.amountInclGst),
                },
                { key: "description", label: "Description" },
              ]}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * A booking that fails to load is not a booking that is still loading. Without
 * this the tabs sat on "Loading booking details..." indefinitely whenever the
 * fetch failed — a deleted or mistyped id, an expired session, a 5xx — with
 * nothing on screen to say so.
 */
function BookingLoadState({ error }: { error?: string | null }) {
  if (error) {
    return (
      <div className="py-8 text-center text-red-600 dark:text-red-400">
        <p className="font-medium">Could not load this booking.</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }
  return (
    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
      Loading booking details...
    </div>
  );
}

export default function BookingEditor({ bookingId }: BookingEditorProps) {
  const [loading, startTransition] = useTransition();
  const [cancellationLoading, startCancellationTransition] = useTransition();
  const [pendingCancelLoading, startPendingCancelTransition] = useTransition();
  const [isSendingPaymentLink, startSendPaymentLinkTransition] =
    useTransition();
  const [isPreparingPaymentPage, startPreparePaymentPageTransition] =
    useTransition();
  const isDarkMode = useDarkMode();
  const hookData = useBookingHook(bookingId);
  const [paymentCollectionMode, setPaymentCollectionMode] = useState<
    "CASH" | "PAYMENT_LINK"
  >("PAYMENT_LINK");
  const [paymentLinkChannels, setPaymentLinkChannels] = useState<
    Array<"email" | "whatsapp">
  >(["email"]);
  const [paymentLinkNote, setPaymentLinkNote] = useState("");
  const [paymentLinkEmail, setPaymentLinkEmail] = useState("");
  const [paymentLinkWhatsappNumber, setPaymentLinkWhatsappNumber] =
    useState("");
  const [liveBookingStatus, setLiveBookingStatus] = useState<string | null>(
    null,
  );
  const [liveBookingStatusError, setLiveBookingStatusError] = useState<
    string | null
  >(null);
  const [liveBookingStatusLastCheckedAt, setLiveBookingStatusLastCheckedAt] =
    useState<string | null>(null);
  const [liveBookingStatusPollCount, setLiveBookingStatusPollCount] =
    useState(0);
  const [isRefreshingLiveBookingStatus, setIsRefreshingLiveBookingStatus] =
    useState(false);

  const remainingAmount = Number(
    hookData.bookingData?.remainingAmountToBePaidWithGst ?? 0,
  );
  const amountPaid = Number(
    hookData.bookingData?.bookingAmountPaidWithGst ?? 0,
  );
  const bookingStatus = String(
    hookData.bookingData?.status || "",
  ).toUpperCase();
  const isAlreadyCancelled = bookingStatus === "CANCELLED";
  const canUseNormalCancellationFlow = bookingStatus === "CONFIRMED";
  const isPendingOfflineBooking =
    String(hookData.bookingData?.bookingType || "").toUpperCase() ===
      "OFFLINE" && bookingStatus === "PENDING";
  const isAdminPanelOfflineBooking =
    String(hookData.bookingData?.bookingTechPlatform || "").toUpperCase() ===
    "ADMIN_PANEL";
  const canSendPaymentLink = isPendingOfflineBooking && remainingAmount > 0;
  const canInstantCancelPendingOfflineBooking =
    isPendingOfflineBooking && isAdminPanelOfflineBooking && amountPaid <= 0;
  const instantCancelBlockedReason = !isPendingOfflineBooking
    ? null
    : !isAdminPanelOfflineBooking
      ? "Instant cancel is only available for admin-panel offline bookings."
      : amountPaid > 0
        ? "Instant cancel is unavailable because payment has already been recorded for this booking."
        : null;
  const showPendingOfflineActions =
    isPendingOfflineBooking &&
    (canSendPaymentLink ||
      canInstantCancelPendingOfflineBooking ||
      !!instantCancelBlockedReason);
  const showPendingOfflinePaymentMethodSelector = isPendingOfflineBooking;
  const showPaymentPageSection =
    showPendingOfflineActions && paymentCollectionMode === "PAYMENT_LINK";
  const showManualPaymentSection =
    !isPendingOfflineBooking || paymentCollectionMode === "CASH";
  const shouldShowLiveStatusBlock =
    showPaymentPageSection && isAdminPanelOfflineBooking;
  const paymentLinkError = !canSendPaymentLink
    ? null
    : paymentLinkChannels.length === 0
      ? "Select at least one delivery channel to send the website checkout link"
      : paymentLinkChannels.includes("email") &&
          paymentLinkEmail.trim().length > 0 &&
          !PAYMENT_LINK_EMAIL_REGEX.test(paymentLinkEmail.trim())
        ? "Enter a valid override email for the website checkout link"
        : paymentLinkChannels.includes("whatsapp") &&
            paymentLinkWhatsappNumber.trim().length > 0 &&
            !PAYMENT_LINK_PHONE_REGEX.test(paymentLinkWhatsappNumber.trim())
          ? "Enter a valid override WhatsApp number for the website checkout link"
          : null;
  const cancellation = hookData.bookingV2Finance?.cancellation
    ? {
        ...(hookData.bookingData?.cancellation ?? {}),
        ...hookData.bookingV2Finance.cancellation,
      }
    : (hookData.bookingData?.cancellation ?? null);
  const cancellationPreview = (hookData.relatedData?.cancellationPreview ??
    null) as CancellationPreview;
  const ownerCancellationSummary = (hookData.relatedData
    ?.ownerCancellationSummary ?? null) as OwnerCancellationSummary;
  const propertyCancellationPlans = Array.isArray(
    hookData.relatedData?.propertyCancellationPlans,
  )
    ? (hookData.relatedData
        .propertyCancellationPlans as PropertyCancellationPlan[])
    : [];
  const paymentActivity =
    hookData.bookingV2Finance?.payments?.length > 0
      ? hookData.bookingV2Finance.payments
      : (hookData.paymentData ?? []);
  const transactionHistory = paymentActivity;
  const totalGuestsCount =
    Number(hookData.bookingData?.adultCount ?? 0) +
    Number(hookData.bookingData?.childrenCount ?? 0) +
    Number(hookData.bookingData?.infantCount ?? 0) +
    Number(hookData.bookingData?.floatingAdultCount ?? 0) +
    Number(hookData.bookingData?.floatingChildCount ?? 0) +
    Number(hookData.bookingData?.floatingInfantCount ?? 0);
  const reservationContext = (hookData.bookingData?.reservationContext ??
    null) as Record<string, unknown> | null;
  const latestPayment = paymentActivity.length > 0 ? paymentActivity[0] : null;
  const activityItems = (hookData.bookingLogs ?? []).slice(0, 5);
  const hasRazorpayPaymentHistory = paymentActivity.some(
    (payment: GenericFinanceRow) => {
      const paymentMethod = String(payment?.paymentMethod || "").toUpperCase();
      const paymentGateway = String(
        payment?.paymentGateway || "",
      ).toUpperCase();
      return paymentMethod === "PG" && paymentGateway === "RAZORPAY";
    },
  );
  const hasEligibleRazorpayRefundReference = paymentActivity.some(
    (payment: GenericFinanceRow) => {
      const paymentMethod = String(payment?.paymentMethod || "").toUpperCase();
      const paymentGateway = String(
        payment?.paymentGateway || "",
      ).toUpperCase();
      const paymentReference = String(payment?.paymentReference || "").trim();
      return (
        paymentMethod === "PG" &&
        paymentGateway === "RAZORPAY" &&
        paymentReference.length > 0
      );
    },
  );

  useEffect(() => {
    setLiveBookingStatus(bookingStatus || null);
  }, [bookingStatus]);

  useEffect(() => {
    if (!shouldShowLiveStatusBlock) {
      setLiveBookingStatusError(null);
      setLiveBookingStatusLastCheckedAt(null);
      setLiveBookingStatusPollCount(0);
    }
  }, [shouldShowLiveStatusBlock]);

  const refreshLiveBookingStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!shouldShowLiveStatusBlock) {
        return null;
      }

      setIsRefreshingLiveBookingStatus(true);
      if (!options?.silent) {
        setLiveBookingStatusError(null);
      }

      try {
        const result = await getBookingById(bookingId);
        if (!result.success || !result.data?.booking) {
          throw new Error(result.error || "Failed to refresh booking status");
        }

        const latestStatus = result.data.booking.status || null;
        setLiveBookingStatus(latestStatus);
        setLiveBookingStatusLastCheckedAt(new Date().toISOString());
        setLiveBookingStatusError(null);

        if (latestStatus === "CONFIRMED") {
          await hookData.refreshBookingData();
        }

        return latestStatus;
      } catch (error) {
        captureError(error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to refresh booking status";
        setLiveBookingStatusError(message);
        if (!options?.silent) {
          toast.error(message);
        }
        return null;
      } finally {
        setIsRefreshingLiveBookingStatus(false);
      }
    },
    [bookingId, hookData, shouldShowLiveStatusBlock],
  );

  useEffect(() => {
    if (
      !shouldShowLiveStatusBlock ||
      liveBookingStatus === "CONFIRMED" ||
      liveBookingStatusPollCount >= PAYMENT_LINK_STATUS_MAX_POLLS
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshLiveBookingStatus({ silent: true }).finally(() => {
        setLiveBookingStatusPollCount((current) => current + 1);
      });
    }, PAYMENT_LINK_STATUS_POLL_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    liveBookingStatus,
    liveBookingStatusPollCount,
    refreshLiveBookingStatus,
    shouldShowLiveStatusBlock,
  ]);

  const handleSubmit = () => {
    const formEl = document.getElementById(
      "bookingForm",
    ) as HTMLFormElement | null;
    if (!formEl) {
      toast.error("Form not found");
      return;
    }

    const formData = new FormData(formEl);

    hookData.payments.forEach((p) => {
      formData.set(`payment-${p.id}`, p.paymentDate);
      formData.set(
        `payment-paymentFor-${p.id}`,
        p.paymentFor || "FULL_PAYMENT",
      );
      formData.set(`payment-receiverType-${p.id}`, p.receiverType || "PLATFORM");
      formData.set(`payment-paymentMethod-${p.id}`, p.paymentMethod || "CASH");
      formData.set(
        `payment-paymentInstrument-${p.id}`,
        p.paymentInstrument || "OTHERS",
      );
      formData.set(
        `payment-paymentReference-${p.id}`,
        p.paymentReference || "",
      );
      formData.set(`payment-paymentGateway-${p.id}`, p.paymentGateway || "");
      formData.set(
        `payment-gatewayPaymentId-${p.id}`,
        p.gatewayPaymentId || "",
      );
      formData.set(`payment-gatewayFee-${p.id}`, String(p.gatewayFee || 0));
      formData.set(`bankName-${p.id}`, p.bankName || "");
      formData.set(
        `bankAccountHolderName-${p.id}`,
        p.bankAccountHolderName || "",
      );
      formData.set(`bankAccountNumber-${p.id}`, p.bankAccountNumber || "");
      formData.set(`bankIfsc-${p.id}`, p.bankIfsc || "");
      formData.set(`bankNickname-${p.id}`, p.bankNickname || "");
    });

    startTransition(() => {
      const editBookingWithId = updateBooking.bind(null, bookingId);
      const promise = parseServerActionResult(editBookingWithId(formData));

      toast.promise(promise, {
        loading: "Saving booking...",
        success: (data) => data,
        error: (err) => (err as Error).message,
      });
    });
  };

  const saveCancellationData = (refundMethodChoice: "RAZORPAY" | "CASH") => {
    if (isAlreadyCancelled) {
      toast.error("This booking is already cancelled");
      return;
    }

    if (!canUseNormalCancellationFlow) {
      toast.error(
        "Normal cancellation is only available for confirmed bookings",
      );
      return;
    }

    const formEl = document.getElementById(
      "bookingForm",
    ) as HTMLFormElement | null;
    if (!formEl) {
      toast.error("Form not found");
      return;
    }

    const formData = new FormData(formEl);
    const refundMethodLabel =
      refundMethodChoice === "RAZORPAY" ? "Razorpay refund" : "cash refund";
    const firstConfirmation = window.confirm(
      `Are you sure you want to cancel this booking with ${refundMethodLabel}?`,
    );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation = window.confirm(
      "This action will cancel the booking, post cancellation finance entries, and cannot be undone. Do you want to continue?",
    );

    if (!secondConfirmation) {
      return;
    }

    formData.set(
      "refundAmount",
      String(
        Number(
          hookData.bookingData?.cancellation?.refundAmount ?? amountPaid ?? 0,
        ),
      ),
    );
    formData.set(
      "refundStatus",
      String(hookData.bookingData?.cancellation?.refundStatus || "Pending"),
    );
    formData.set(
      "cancellationType",
      String(hookData.bookingData?.cancellation?.cancellationType || "Offline"),
    );
    formData.set(
      "cancellationReferencePersonId",
      hookData.cancellationReferencePerson || "",
    );
    formData.set("refundMethodChoice", refundMethodChoice);

    startCancellationTransition(() => {
      const cancelBookingWithId = cancelBooking.bind(null, bookingId);
      const promise = parseServerActionResult(
        cancelBookingWithId(formData),
      ).then(async (message) => {
        await hookData.refreshBookingData();
        return message;
      });

      toast.promise(promise, {
        loading: "Cancelling booking...",
        success: (data) => data,
        error: (err) => (err as Error).message,
      });
    });
  };

  const handleSendPaymentLink = () => {
    if (!canSendPaymentLink) {
      toast.error(
        "Website checkout is only available for pending offline bookings with an amount due",
      );
      return;
    }

    if (paymentLinkError) {
      toast.error(paymentLinkError);
      return;
    }

    startSendPaymentLinkTransition(() => {
      const promise = sendBookingPaymentLink({
        bookingId,
        brandId: hookData.bookingData?.brandId || undefined,
        deliveryChannels: paymentLinkChannels,
        customMessageNote: paymentLinkNote,
        paymentLinkEmail: paymentLinkEmail || undefined,
        paymentLinkWhatsappNumber: paymentLinkWhatsappNumber || undefined,
      }).then((result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        return result.success;
      });

      toast.promise(promise, {
        loading: "Sending website checkout link...",
        success: (result) => {
          const sentCount =
            result?.deliveryResults?.filter(
              (item: { status: string }) => item.status === "sent",
            ).length ?? 0;
          const skippedCount =
            result?.deliveryResults?.filter(
              (item: { status: string }) => item.status === "skipped",
            ).length ?? 0;
          const failedCount =
            result?.deliveryResults?.filter(
              (item: { status: string }) => item.status === "failed",
            ).length ?? 0;

          return `Website checkout link sent: ${sentCount}, skipped: ${skippedCount}, failed: ${failedCount}.`;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const loadPaymentPageUrl = async () => {
    const result = await prepareBookingPaymentPage({
      bookingId,
      brandId: hookData.bookingData?.brandId || undefined,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    const checkoutUrl = result.success?.checkoutUrl;
    if (!checkoutUrl) {
      throw new Error("Website checkout URL could not be prepared");
    }

    return checkoutUrl;
  };

  const handleCopyPaymentPageLink = () => {
    if (!canSendPaymentLink) {
      toast.error(
        "Payment page is only available for pending offline bookings with an amount due",
      );
      return;
    }

    startPreparePaymentPageTransition(() => {
      const promise = loadPaymentPageUrl().then(async (checkoutUrl) => {
        if (!navigator?.clipboard?.writeText) {
          throw new Error("Clipboard is not available in this browser");
        }

        await navigator.clipboard.writeText(checkoutUrl);
        return checkoutUrl;
      });

      toast.promise(promise, {
        loading: "Preparing website checkout...",
        success: () => "Website checkout link copied.",
        error: (err) => (err as Error).message,
      });
    });
  };

  const handleOpenPaymentPage = () => {
    if (!canSendPaymentLink) {
      toast.error(
        "Payment page is only available for pending offline bookings with an amount due",
      );
      return;
    }

    startPreparePaymentPageTransition(() => {
      const promise = loadPaymentPageUrl().then((checkoutUrl) => {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        return checkoutUrl;
      });

      toast.promise(promise, {
        loading: "Preparing website checkout...",
        success: () => "Website checkout opened in a new tab.",
        error: (err) => (err as Error).message,
      });
    });
  };

  const handleCancelPendingOfflineBooking = () => {
    if (!canInstantCancelPendingOfflineBooking) {
      toast.error(
        instantCancelBlockedReason ||
          "Instant cancel is only available for unpaid pending offline bookings.",
      );
      return;
    }

    startPendingCancelTransition(() => {
      const promise = cancelPendingOfflineBooking({
        bookingId,
        brandId: hookData.bookingData?.brandId || undefined,
      }).then((result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        return result.success;
      });

      toast.promise(promise, {
        loading: "Cancelling booking...",
        success: (result) =>
          result || "Pending offline booking cancelled successfully",
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <form id="bookingForm" className="flex w-full flex-col gap-5">
      <Tabs className="text-black dark:text-white">
        <TabItem title="Detail" className="align-center flex flex-col">
          <div className="w-full px-4">
            {hookData.bookingData ? (
              <>
                <div className="space-y-8 py-2">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                        <HiCalendarDays className="text-base text-slate-300" />
                        Booking ID #{hookData.bookingData.bookingId || "N/A"}
                      </div>
                      <div>
                        <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">
                          Booking Details
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-slate-300">
                          <span className="font-medium text-slate-100">
                            {hookData.bookingData.property?.propertyName ||
                              "Booking"}
                          </span>
                          <span className="hidden text-slate-500 sm:inline">
                            •
                          </span>
                          <span>
                            {formatDate(hookData.bookingData.checkinDate)} to{" "}
                            {formatDate(hookData.bookingData.checkoutDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {hookData.bookingData.property?.id ? (
                          <Link
                            href={`/admin/properties/${hookData.bookingData.property.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20"
                          >
                            Open Property
                            <HiArrowTopRightOnSquare className="text-base" />
                          </Link>
                        ) : null}
                        <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200">
                          Ref:{" "}
                          {hookData.bookingData.id ||
                            hookData.bookingData.bookingId ||
                            "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:justify-end xl:self-end">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.16em] uppercase ${getStatusBadgeClass(hookData.bookingData.status)}`}
                      >
                        {hookData.bookingData.status || "N/A"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.16em] uppercase ${getStatusBadgeClass(hookData.bookingData.paymentStatus)}`}
                      >
                        {hookData.bookingData.paymentStatus || "N/A"}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-slate-200 uppercase">
                        {hookData.bookingData.bookingType || "N/A"}
                      </span>
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-blue-100 uppercase">
                        {hookData.bookingData.bookingSource || "N/A"}
                      </span>
                      <ChangeBookingSourceModal
                        bookingId={bookingId}
                        currentSourceId={hookData.bookingData.bookingSourceId}
                        currentSourceLabel={hookData.bookingData.bookingSource}
                        disabled={isAlreadyCancelled}
                        onChanged={hookData.refreshBookingData}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    <DashboardMetricCard
                      icon={<HiBanknotes />}
                      label="Total Amount"
                      value={formatMoney(
                        hookData.bookingData.fullBookingAmountWithGst,
                      )}
                    />
                    <DashboardMetricCard
                      icon={<HiCheckBadge />}
                      label="Amount Paid"
                      value={formatMoney(
                        hookData.bookingData.bookingAmountPaidWithGst,
                      )}
                      tone="success"
                    />
                    <DashboardMetricCard
                      icon={<HiClock />}
                      label="Balance Due"
                      value={formatMoney(
                        hookData.bookingData.remainingAmountToBePaidWithGst,
                      )}
                      tone={
                        Number(
                          hookData.bookingData.remainingAmountToBePaidWithGst ??
                            0,
                        ) > 0
                          ? "warning"
                          : "default"
                      }
                    />
                    <DashboardMetricCard
                      icon={<HiUsers />}
                      label="Total Guests"
                      value={`${totalGuestsCount || 0} Guests`}
                    />
                  </div>

                  <ReservationOperationsPanel
                    bookingId={bookingId}
                    brandId={hookData.bookingData.brandId}
                    status={hookData.bookingData.status}
                    assignedExecutiveAdminId={
                      hookData.bookingData.assignedExecutiveAdminId
                    }
                    assignedSupervisorId={
                      hookData.bookingData.assignedSupervisorId
                    }
                    bookingLogs={hookData.bookingLogs ?? []}
                    onUpdated={hookData.refreshBookingData}
                  />

                  {reservationContext?.sourceKind ? (
                    <DetailDashboardSection
                      title="Reservation Source"
                      subtitle="Source-specific references and channel commercial data captured when this reservation was created."
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <DetailField
                          label="Source"
                          value={String(reservationContext.sourceKind).replace(/_/g, " ")}
                        />
                        {reservationContext.externalReference ? (
                          <DetailField
                            label="External Reference"
                            value={String(reservationContext.externalReference)}
                          />
                        ) : null}
                        {reservationContext.assistedPurpose ? (
                          <DetailField
                            label="Assisted Purpose"
                            value={String(reservationContext.assistedPurpose)}
                          />
                        ) : null}
                        {reservationContext.corporateCompanyName ? (
                          <DetailField
                            label="Company"
                            value={String(reservationContext.corporateCompanyName)}
                          />
                        ) : null}
                        {reservationContext.corporateBillingContact ? (
                          <DetailField
                            label="Billing Contact"
                            value={String(reservationContext.corporateBillingContact)}
                          />
                        ) : null}
                        {reservationContext.corporateInvoiceTo ? (
                          <DetailField
                            label="Invoice To"
                            value={String(reservationContext.corporateInvoiceTo)}
                          />
                        ) : null}
                        {reservationContext.travelAgentName ? (
                          <DetailField
                            label="Travel Agent"
                            value={String(reservationContext.travelAgentName)}
                          />
                        ) : null}
                        {reservationContext.travelAgentVoucherNumber ? (
                          <DetailField
                            label="Voucher"
                            value={String(reservationContext.travelAgentVoucherNumber)}
                          />
                        ) : null}
                        {reservationContext.sourceKind === "OTA" ? (
                          <>
                            <DetailField
                              label="OTA Booking Amount"
                              value={formatMoney(reservationContext.otaGrossBookingAmount)}
                            />
                            <DetailField
                              label="OTA Commission"
                              value={formatMoney(reservationContext.otaCommissionAmount)}
                            />
                            <DetailField
                              label="Net Channel Collection"
                              value={formatMoney(reservationContext.netChannelCollection)}
                            />
                            <DetailField
                              label="InstaFarms Commission"
                              value={formatMoney(hookData.bookingData?.instafarmsCommission)}
                            />
                          </>
                        ) : null}
                      </div>
                    </DetailDashboardSection>
                  ) : null}

                  <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.8fr)_360px]">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.05fr)_320px]">
                        <DetailDashboardSection
                          title="Property Info"
                          actionLabel="Edit"
                        >
                          <DashboardInfoRow
                            label="Property Code"
                            value={
                              hookData.bookingData.property?.propertyCode ||
                              "N/A"
                            }
                            icon={<HiBuildingOffice2 />}
                          />
                          <DashboardInfoRow
                            label="Layout"
                            value={`${hookData.bookingData.property?.bedroomCount ?? 0} Bedrooms / ${hookData.bookingData.property?.bathroomCount ?? 0} Bathrooms`}
                            icon={<HiCalendarDays />}
                          />
                          <DashboardInfoRow
                            label="Max Capacity"
                            value={`${hookData.bookingData.property?.baseGuestCount ?? 0} Base / ${hookData.bookingData.property?.maxGuestCount ?? 0} Total`}
                            icon={<HiUsers />}
                          />
                          <DashboardInfoRow
                            label="Bedding"
                            value={`${hookData.bookingData.property?.doubleBedCount ?? 0} Double / ${hookData.bookingData.property?.singleBedCount ?? 0} Single / ${hookData.bookingData.property?.mattressCount ?? 0} Mattress`}
                            icon={<HiBuildingOffice2 />}
                          />
                        </DetailDashboardSection>

                        <DetailDashboardSection
                          title="Guest Details"
                          actionLabel="Profile"
                        >
                          <div className="mb-5 flex items-start gap-4 rounded-[22px] bg-slate-950/35 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-xl text-blue-200">
                              <HiUsers />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xl font-semibold text-white">
                                {hookData.bookingData.customer
                                  ? `${hookData.bookingData.customer.firstName || ""} ${hookData.bookingData.customer.lastName || ""}`.trim() ||
                                    "N/A"
                                  : "N/A"}
                              </div>
                              <div className="mt-1 text-sm text-slate-400">
                                Gender:{" "}
                                {hookData.bookingData.customer?.gender || "N/A"}{" "}
                                | Stay Party: {totalGuestsCount || 0} guests
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-slate-100">
                              <HiPhone className="text-lg text-slate-400" />
                              <span>
                                {hookData.bookingData.customer?.mobileNumber ||
                                  "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-slate-100">
                              <HiEnvelope className="text-lg text-slate-400" />
                              <span className="break-all">
                                {hookData.bookingData.customer?.email || "N/A"}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 px-4 py-3">
                                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                  Stay Party
                                </div>
                                <div className="mt-2 text-sm text-slate-100">
                                  A:{hookData.bookingData.adultCount ?? 0} C:
                                  {hookData.bookingData.childrenCount ?? 0} I:
                                  {hookData.bookingData.infantCount ?? 0}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 px-4 py-3">
                                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                  Floating Guests
                                </div>
                                <div className="mt-2 text-sm text-slate-100">
                                  A:
                                  {hookData.bookingData.floatingAdultCount ??
                                    0}{" "}
                                  C:
                                  {hookData.bookingData.floatingChildCount ??
                                    0}{" "}
                                  I:
                                  {hookData.bookingData.floatingInfantCount ??
                                    0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </DetailDashboardSection>

                        <DetailDashboardSection title="Pricing Snapshot">
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                                <span>Rate Before Discount</span>
                                <span className="font-semibold text-white">
                                  {formatMoney(
                                    hookData.bookingData
                                      .bookingAmountWithGstBeforeDiscounts,
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                                <span>Total Discount</span>
                                <span className="font-semibold text-rose-300">
                                  -
                                  {formatMoney(
                                    hookData.bookingData.totalDiscountAmount,
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                                <span>GST (Calculated)</span>
                                <span className="font-semibold text-white">
                                  {formatMoney(
                                    hookData.bookingData.totalGstCollected,
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-slate-800 pt-4">
                              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                Grand Total
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-4">
                                <div className="text-4xl leading-none font-semibold text-blue-100">
                                  {formatMoney(
                                    hookData.bookingData
                                      .fullBookingAmountWithGst,
                                  )}
                                </div>
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-emerald-200 uppercase">
                                  {Number(
                                    hookData.bookingData
                                      .remainingAmountToBePaidWithGst ?? 0,
                                  ) > 0
                                    ? "Partially Paid"
                                    : "Paid In Full"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </DetailDashboardSection>
                      </div>

                      <DetailDashboardSection title="Stay Night Breakdown">
                        {Array.isArray(hookData.bookingData.daywiseBreakup) &&
                        hookData.bookingData.daywiseBreakup.length > 0 ? (
                          <div className="overflow-hidden rounded-[20px] border border-slate-800">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-left">
                                <thead className="bg-[#061221] text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                                  <tr>
                                    <th className="px-5 py-4 font-semibold">
                                      Night
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                      Date
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                      Base Price
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                      Discount
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                      Final Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/35">
                                  {hookData.bookingData.daywiseBreakup.map(
                                    (day: GenericFinanceRow, index: number) => (
                                      <tr
                                        key={`${day.date || day.day || index}`}
                                        className="text-slate-100"
                                      >
                                        <td className="px-5 py-4 text-lg font-semibold">
                                          Night {index + 1}
                                        </td>
                                        <td className="px-5 py-4 text-base text-slate-300">
                                          {formatDate(day.date || day.day)}
                                        </td>
                                        <td className="px-5 py-4 text-base">
                                          {formatMoney(
                                            day.baseRentalWithoutGst ??
                                              day.bookingAmountWithoutGstBeforeDiscounts,
                                          )}
                                        </td>
                                        <td className="px-5 py-4 text-base font-medium text-rose-300">
                                          -{formatMoney(day.discountForTheDay)}
                                        </td>
                                        <td className="px-5 py-4 text-base font-semibold text-emerald-300">
                                          {formatMoney(
                                            day.bookingAmountAfterDiscountWithGst,
                                          )}
                                          <span className="ml-2 text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">
                                            inc. GST
                                          </span>
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <EmptyInfo message="No day-wise pricing data is available for this booking." />
                        )}
                      </DetailDashboardSection>
                    </div>

                    <div className="space-y-6">
                      <DetailDashboardSection title="Payment Activity">
                        {latestPayment ? (
                          <div className="space-y-4">
                            <div className="rounded-[20px] border border-emerald-500/25 bg-emerald-500/8 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-3xl font-semibold text-white">
                                    {formatMoney(latestPayment.amount)}
                                  </div>
                                  <div className="mt-2 text-sm text-slate-300">
                                    {latestPayment.paymentMethod ||
                                      latestPayment.paymentMode ||
                                      "N/A"}{" "}
                                    payment
                                  </div>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                  {formatDate(
                                    latestPayment.paidAt ||
                                      latestPayment.paymentDate,
                                  )}
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                                <span>
                                  Method:{" "}
                                  <span className="font-medium text-slate-100">
                                    {latestPayment.paymentMethod ||
                                      latestPayment.paymentMode ||
                                      "N/A"}
                                  </span>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span>
                                  Status:{" "}
                                  <span className="font-medium text-emerald-300">
                                    {hookData.bookingData.paymentStatus ||
                                      "N/A"}
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3">
                                <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                  Reference
                                </div>
                                <div className="mt-2 text-sm break-all text-slate-100">
                                  {latestPayment.paymentReference ||
                                    latestPayment.gatewayPaymentId ||
                                    "N/A"}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3">
                                  <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                    Gateway Fee
                                  </div>
                                  <div className="mt-2 text-sm text-slate-100">
                                    {formatMoney(latestPayment.gatewayFee)}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3">
                                  <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                    Net Received
                                  </div>
                                  <div className="mt-2 text-sm text-slate-100">
                                    {formatMoney(
                                      latestPayment.netAmountReceived,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-center text-sm font-medium text-slate-200">
                              View all transactions in the Payments tab
                            </div>
                          </div>
                        ) : (
                          <EmptyInfo message="No payment records are available for this booking yet." />
                        )}
                      </DetailDashboardSection>

                      <DetailDashboardSection title="System Activity">
                        <div className="space-y-4">
                          <div>
                            {activityItems.length > 0 ? (
                              activityItems.map(
                                (log: GenericFinanceRow, index: number) => {
                                  const label = String(
                                    log.status || log.event || "",
                                  ).toLowerCase();
                                  const tone = label.includes("cancel")
                                    ? "rose"
                                    : label.includes("paid") ||
                                        label.includes("success")
                                      ? "green"
                                      : label.includes("pending")
                                        ? "amber"
                                        : "blue";

                                  return (
                                    <ActivityTimelineItem
                                      key={String(
                                        log.id || `${log.createdAt}-${index}`,
                                      )}
                                      title={String(
                                        log.event ||
                                          log.status ||
                                          "Booking activity",
                                      )}
                                      subtitle={String(
                                        log.message ||
                                          log.notes ||
                                          "No additional details available.",
                                      )}
                                      timestamp={formatDateTime(log.createdAt)}
                                      tone={tone}
                                    />
                                  );
                                },
                              )
                            ) : (
                              <EmptyInfo message="No booking activity logs are available yet." />
                            )}
                          </div>

                          <div className="grid gap-4 border-t border-slate-800 pt-4">
                            <div>
                              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                Guest Notes / Special Requests
                              </div>
                              <div className="mt-3 rounded-[18px] border border-slate-800 bg-slate-950/40 px-4 py-4 text-sm leading-7 text-slate-200 italic">
                                {hookData.bookingData.specialRequests ||
                                  "No guest notes or special requests were added for this booking."}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                                Internal Notes
                              </div>
                              <div className="mt-3 rounded-[18px] border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm leading-7 text-slate-200 italic">
                                {hookData.bookingData.bookingRemarks ||
                                  "No internal notes were added for this booking."}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DetailDashboardSection>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <BookingLoadState error={hookData.error} />
            )}
          </div>
        </TabItem>

        <TabItem title="Guest IDs" className="align-center flex flex-col">
          <div className="mx-auto w-full max-w-[1200px] px-4">
            {hookData.bookingData ? (
              <GuestIdCardsPanel bookingId={bookingId} />
            ) : (
              <BookingLoadState error={hookData.error} />
            )}
          </div>
        </TabItem>

        <TabItem title="Commercials" className="align-center flex flex-col">
          <div className="mx-auto w-full max-w-[1200px] px-4">
            {hookData.bookingData ? (
              <div className="space-y-4">
                <CommercialsTab
                  item={hookData.bookingData}
                  isDarkMode={isDarkMode}
                />
                <BookingFinanceCorrectionHistoryPanel bookingId={bookingId} />
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                Please save the booking first to view commercial details.
              </div>
            )}
          </div>
        </TabItem>

        <TabItem title="Adjustment" className="align-center flex flex-col">
          {hookData.bookingData ? (
            <BookingAdjustmentsTab bookingId={bookingId} />
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Please save the booking first to create adjustments.
            </div>
          )}
        </TabItem>

        <TabItem title="Payments" className="align-center flex flex-col">
          {showPendingOfflinePaymentMethodSelector ? (
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-6">
              <DetailSection
                title="Payment Method"
                subtitle="Choose whether you want to record a manual payment or send the customer to the website checkout."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentCollectionMode("CASH")}
                    className={`rounded-xl border p-4 text-left transition ${
                      paymentCollectionMode === "CASH"
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Cash / Manual Entry
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Record cash or manually received online payments for this
                      booking.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCollectionMode("PAYMENT_LINK")}
                    className={`rounded-xl border p-4 text-left transition ${
                      paymentCollectionMode === "PAYMENT_LINK"
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Website Checkout
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Send a website checkout link over email or WhatsApp for
                      the remaining due amount.
                    </p>
                  </button>
                </div>
              </DetailSection>
            </div>
          ) : null}

          <div className="mx-auto w-full max-w-[1200px] px-4 pb-6">
            <DetailSection
              title="Transaction History"
              subtitle="Completed payment entries already recorded for this booking."
            >
              {transactionHistory.length > 0 ? (
                <div className="space-y-3">
                  {transactionHistory.map((payment: GenericFinanceRow) => {
                    const paidAtValue = String(
                      payment.paidAt || payment.paymentDate || "",
                    ).trim();
                    const paymentMethod = String(
                      payment.paymentMethod || payment.paymentMode || "N/A",
                    );
                    const paymentFor = String(
                      payment.paymentFor || payment.paymentType || "N/A",
                    );
                    const paymentInstrument = String(
                      payment.paymentInstrument || "",
                    ).trim();
                    const paymentReference = String(
                      payment.paymentReference ||
                        payment.gatewayPaymentId ||
                        "",
                    ).trim();
                    const paymentGateway = String(
                      payment.paymentGateway || "",
                    ).trim();
                    const gatewayFee = Number(payment.gatewayFee ?? 0);
                    const netReceived =
                      payment.netAmountReceived !== undefined &&
                      payment.netAmountReceived !== null
                        ? Number(payment.netAmountReceived)
                        : Math.max(0, Number(payment.amount ?? 0) - gatewayFee);

                    return (
                      <div
                        key={String(
                          payment.id ||
                            `${paidAtValue}-${paymentReference}-${payment.amount}`,
                        )}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatMoney(payment.amount)}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {[
                                paymentMethod,
                                paymentInstrument || null,
                                paymentFor,
                                paymentGateway || null,
                              ]
                                .filter(Boolean)
                                .join(" | ")}
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Recorded
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <DetailField
                            label="Paid At"
                            value={
                              paidAtValue
                                ? formatDateTime(paidAtValue)
                                : "N/A"
                            }
                          />
                          <DetailField
                            label="Reference"
                            value={
                              <span className="break-all">
                                {paymentReference || "N/A"}
                              </span>
                            }
                          />
                          <DetailField
                            label="Gateway Fee"
                            value={formatMoney(gatewayFee)}
                          />
                          <DetailField
                            label="Net Received"
                            value={formatMoney(netReceived)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyInfo message="No older transactions are recorded for this booking yet." />
              )}
            </DetailSection>
          </div>

          {showPaymentPageSection ? (
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-6">
              <DetailSection
                title="Website Checkout"
                subtitle="Send the website checkout to the guest, copy the link for manual sharing, or open it directly for assisted collection."
              >
                <div className="space-y-5">
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Remaining to collect:{" "}
                    <strong>{formatMoney(remainingAmount)}</strong>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={paymentLinkChannels.includes("email")}
                        onChange={(event) => {
                          setPaymentLinkChannels((current) =>
                            event.target.checked
                              ? ([...new Set([...current, "email"])] as typeof current)
                              : current.filter((item) => item !== "email"),
                          );
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                          Email
                        </span>
                        <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                          Send the website checkout link to the guest email if
                          it is available.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={paymentLinkChannels.includes("whatsapp")}
                        onChange={(event) => {
                          setPaymentLinkChannels((current) =>
                            event.target.checked
                              ? ([...new Set([...current, "whatsapp"])] as typeof current)
                              : current.filter((item) => item !== "whatsapp"),
                          );
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                          WhatsApp
                        </span>
                        <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                          Send the same link on WhatsApp if the guest number is
                          available.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Override email
                      </label>
                      <TextInput
                        type="email"
                        value={paymentLinkEmail}
                        onChange={(event) =>
                          setPaymentLinkEmail(event.target.value)
                        }
                        placeholder="Leave blank to use customer email"
                        color={
                          paymentLinkChannels.includes("email") &&
                          paymentLinkEmail.trim().length > 0 &&
                          !PAYMENT_LINK_EMAIL_REGEX.test(
                            paymentLinkEmail.trim(),
                          )
                            ? "failure"
                            : undefined
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Override WhatsApp number
                      </label>
                      <TextInput
                        type="tel"
                        value={paymentLinkWhatsappNumber}
                        onChange={(event) =>
                          setPaymentLinkWhatsappNumber(event.target.value)
                        }
                        placeholder="Leave blank to use customer number"
                        color={
                          paymentLinkChannels.includes("whatsapp") &&
                          paymentLinkWhatsappNumber.trim().length > 0 &&
                          !PAYMENT_LINK_PHONE_REGEX.test(
                            paymentLinkWhatsappNumber.trim(),
                          )
                            ? "failure"
                            : undefined
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Optional email note
                    </label>
                    <textarea
                      value={paymentLinkNote}
                      onChange={(event) =>
                        setPaymentLinkNote(event.target.value)
                      }
                      rows={4}
                      placeholder="Add any short note to include in the email with the link."
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      This note is only included in email delivery, not
                      WhatsApp.
                    </p>
                  </div>

                  {paymentLinkError ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      {paymentLinkError}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      Use the website checkout in three ways: send it to the
                      guest, copy the link for manual sharing, or open it
                      directly and collect payment with the guest.
                    </div>
                  )}

                  <div className="flex justify-end">
                    <div className="flex flex-wrap justify-end gap-3">
                      {canInstantCancelPendingOfflineBooking ? (
                        <MyButton
                          color="red"
                          loading={pendingCancelLoading}
                          onClick={handleCancelPendingOfflineBooking}
                        >
                          Cancel Booking
                        </MyButton>
                      ) : instantCancelBlockedReason ? (
                        <div className="max-w-md rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                          {instantCancelBlockedReason}
                        </div>
                      ) : null}
                      {canSendPaymentLink ? (
                        <MyButton
                          type="button"
                          color="light"
                          loading={isPreparingPaymentPage}
                          onClick={handleCopyPaymentPageLink}
                          disabled={
                            isPreparingPaymentPage || isSendingPaymentLink
                          }
                        >
                          Copy Link
                        </MyButton>
                      ) : null}
                      {canSendPaymentLink ? (
                        <MyButton
                          type="button"
                          color="light"
                          loading={isPreparingPaymentPage}
                          onClick={handleOpenPaymentPage}
                          disabled={
                            isPreparingPaymentPage || isSendingPaymentLink
                          }
                        >
                          Open Website Checkout
                        </MyButton>
                      ) : null}
                      {canSendPaymentLink ? (
                        <MyButton
                          loading={isSendingPaymentLink}
                          onClick={handleSendPaymentLink}
                        >
                          Send Payment Link
                        </MyButton>
                      ) : null}
                    </div>
                  </div>

                  {shouldShowLiveStatusBlock ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">
                            Live booking status
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Keep this page open while the guest pays through the
                            website checkout. We will auto-check for
                            confirmation here.
                          </p>
                        </div>
                        <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                          Pending to collect: {formatMoney(remainingAmount)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
                          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                            Booking state
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                            {liveBookingStatus ||
                              hookData.bookingData?.status ||
                              "Unknown"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
                          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                            Last checked
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                            {liveBookingStatusLastCheckedAt
                              ? formatDateTime(
                                  liveBookingStatusLastCheckedAt,
                                )
                              : "Not checked yet"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
                          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
                            Check status
                          </p>
                          <div className="mt-2">
                            <MyButton
                              type="button"
                              color="light"
                              loading={isRefreshingLiveBookingStatus}
                              onClick={() => void refreshLiveBookingStatus()}
                              disabled={isRefreshingLiveBookingStatus}
                            >
                              Refresh Status
                            </MyButton>
                          </div>
                        </div>
                      </div>

                      {liveBookingStatusError ? (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                          {liveBookingStatusError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </DetailSection>
            </div>
          ) : null}

          {showManualPaymentSection ? (
            hookData.payments.length === 0 ? (
              <div className="my-5 text-center">
                <p className="mb-3 text-gray-600 dark:text-gray-400">
                  No payments added yet
                </p>
                <Button onClick={hookData.addPayment}>Add First Payment</Button>
              </div>
            ) : (
              <>
                <div className="mx-auto w-full max-w-[1200px] px-4 pb-6">
                  <DetailSection
                    title="Payment Details"
                    subtitle={
                      isPendingOfflineBooking
                        ? "Add recorded payments here. Partial payment is allowed and the remaining due stays visible on the booking. Keep one collection party per booking: Mago-held funds enter the wallet; owner-held funds do not."
                        : "Review or update recorded payments. Keep one collection party per booking: Mago-held funds enter the wallet; owner-held funds do not."
                    }
                  >
                    <div className="overflow-x-auto">
                      <table className="mx-auto mt-5 w-full border-separate border-spacing-3">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="rounded-l-lg p-3 text-left">
                              Payment Date
                            </th>
                            <th className="p-3">Collected by</th>
                            <th className="p-3">Payment For</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Payment Method</th>
                            <th className="p-3">Instrument</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Details</th>
                            <th className="rounded-r-lg p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hookData.payments.map((p, index) => (
                            <PaymentRow
                              payment={p}
                              update={hookData.updatePayment}
                              key={p.id}
                              showPlusButton={
                                hookData.payments.length === index + 1
                              }
                              addPayment={hookData.addPayment}
                              removePayment={hookData.removePayment}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DetailSection>
                </div>
                <div className="sticky bottom-0 mt-6 flex flex-row justify-end border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <MyButton loading={loading} onClick={handleSubmit}>
                    Save Payments
                  </MyButton>
                </div>
              </>
            )
          ) : null}
        </TabItem>

        <TabItem title="Cancellation" className="align-center flex flex-col">
          {amountPaid <= 0 && !cancellation && !isAlreadyCancelled ? (
            <div className="w-full px-4 py-2">
              <div className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.08),_transparent_30%),linear-gradient(180deg,_rgba(10,20,38,0.98)_0%,_rgba(12,22,40,0.96)_100%)] px-8 py-16 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.85)]">
                <div className="text-[12px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                  Cancellation status
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                  Not Payment Done.
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  No payment has been recorded for this booking yet, so there is
                  no refund path to review in the cancellation tab.
                </p>
              </div>
            </div>
          ) : isPendingOfflineBooking ? (
            <div className="w-full space-y-6 px-4 py-2">
              <div className="py-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Use the booking operations section on the Payments tab to
                  cancel this pending offline booking.
                </p>
              </div>
              <BookingRefundPreviewSection
                preview={cancellationPreview}
                amountPaid={amountPaid}
              />
              <PropertyCancellationPolicySection
                plans={propertyCancellationPlans}
              />
            </div>
          ) : cancellation || isAlreadyCancelled ? (
            <div className="w-full space-y-6 px-4">
              <CancellationSummaryPanel
                ownerSummary={ownerCancellationSummary}
              />
            </div>
          ) : (
            <div className="w-full space-y-6 px-4 py-2">
              <PreCancellationDashboard
                bookingId={bookingId}
                bookingData={hookData.bookingData as GenericFinanceRow}
                preview={cancellationPreview}
                amountPaid={amountPaid}
                remainingAmount={remainingAmount}
                canUseNormalCancellationFlow={canUseNormalCancellationFlow}
                cancellationLoading={cancellationLoading}
                hasRazorpayPaymentHistory={hasRazorpayPaymentHistory}
                hasEligibleRazorpayRefundReference={
                  hasEligibleRazorpayRefundReference
                }
                propertyCancellationPlans={propertyCancellationPlans}
                onCancelCash={() => saveCancellationData("CASH")}
                onCancelRazorpay={() => saveCancellationData("RAZORPAY")}
              />
            </div>
          )}
        </TabItem>
      </Tabs>
    </form>
  );
}
