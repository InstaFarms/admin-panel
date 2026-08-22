"use client";

import {
  calculateOfflineBookingQuote,
  createBooking,
  getBookingById,
  getPropertyAvailability,
  prepareBookingPaymentPage,
  sendBookingPaymentLink,
} from "@/actions/bookingActions";
import { fetchPropertyFullData } from "@/actions/propertyActions";
import {
  getCommissionBookingSources,
  type CommissionBookingSource,
} from "@/actions/sourceCommissionActions";
import CustomerSelector from "@/components/CustomerSelector";
import LabelWrapper from "@/components/LabelWrapper";
import MyButton from "@/components/MyButton";
import PropertySelector from "@/components/PropertySelector";
import PaymentRow from "@/components/bookings/PaymentRow";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import { useBookingHook } from "@/hooks/bookings/useBookingHook";
import { normalizePropertyFullData } from "@/lib/properties/fullPropertyData";
import { Button, Select, TabItem, Tabs, Textarea, TextInput, ToggleSwitch } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { captureError } from "@/lib/sentry";

interface CreateBookingEditorProps {
  brands: Array<{ id: string; name: string }>;
  /** Preselects Reservation Source, e.g. when arriving from a legacy link. */
  initialReservationSource?: ReservationSourceKind;
}

type BookingQuote = {
  rentalCharge?: number;
  baseRentalAmountWithGst?: number;
  extraGuestCharge?: number;
  extraAdultGuestChargeWithGst?: number;
  extraChildGuestChargeWithGst?: number;
  floatingGuestCharge?: number;
  bookingAmountWithGstBeforeDiscounts?: number;
  totalDiscount?: number;
  totalDiscountAmount?: number;
  totalDiscountPercentage?: number;
  ownerDiscount?: number;
  ownerDiscountValue?: number;
  ownerDiscountPercentage?: number;
  multipleNightsDiscount?: number;
  multipleNightsDiscountValue?: number;
  multipleNightsDiscountPercentage?: number;
  lastMinuteDiscount?: number;
  lastMinuteDiscountValue?: number;
  lastMinuteDiscountPercentage?: number;
  lastMinuteDiscountThresholdDays?: number | null;
  couponDiscount?: number;
  couponDiscountValue?: number;
  couponDiscountType?: string | null;
  couponDiscountCode?: string | null;
  couponId?: string | null;
  bookingAmountWithDiscountBeforeGst?: number;
  gstAmount?: number;
  totalGstCollected?: number;
  otaCommission?: number;
  instafarmsCommission?: number;
  netOwnerRevenue?: number;
  ownerRevenue?: number;
  tds?: number;
  amountPayableToOwnerAfterTDS?: number;
  paymentGatewayCharge?: number;
  daywiseBreakup?: Array<Record<string, unknown>>;
  fullBookingAmountWithGst?: number;
  finalAmount?: number;
  bookingDays?: number;
  pricingSummary?: {
    property?: {
      propertyId?: string;
      propertyName?: string | null;
      propertyCode?: string | null;
    };
    stay?: {
      checkinDate?: string;
      checkoutDate?: string;
      bookingDays?: number;
      guestCounts?: Record<string, number>;
    };
    payment?: {
      amountPaid?: number;
      remainingDue?: number;
    };
    coupon?: {
      applied?: boolean;
      code?: string | null;
      message?: string | null;
    };
    lastMinuteDiscount?: {
      thresholdDays?: number | null;
      percentage?: number | null;
      flatDiscount?: number | null;
      maxDiscountAmount?: number | null;
    } | null;
    breakdown?: {
      lineItems?: Array<{
        key: string;
        label: string;
        amount: number;
        code?: string | null;
        meta?: {
          guestUnits?: number;
          chargedNights?: number;
          maxGuestsPerNight?: number;
        } | null;
      }>;
      discountRows?: Array<{ key: string; label: string; amount: number; code?: string | null }>;
      totals?: {
        subtotalBeforeDiscount?: number;
        subtotalAfterDiscountBeforeGst?: number;
        gstAmount?: number;
        finalAmount?: number;
      };
    } | null;
  };
};

type PropertySummary = {
  name: string | null;
  code: string | null;
  baseGuestCount: number | null;
  maxGuestCount: number | null;
};

type CommercialPricingRecord = Record<string, unknown>;

type BookingExecutionType = "ONLINE" | "OFFLINE";
type BookingSourceCategory =
  | "DIRECT_BOOKING"
  | "OWNER_BOOKING"
  | "THIRD_PARTY_BOOKING";
type ReservationSourceKind =
  | "DIRECT"
  | "ASSISTED"
  | "OTA"
  | "CORPORATE"
  | "TRAVEL_AGENT";
type ReservationContextForm = {
  sourceKind: ReservationSourceKind;
  externalReference: string;
  assistedPurpose: string;
  assistedRequestDetails: string;
  otaGrossBookingAmount: string;
  otaBookingGstAmount: string;
  otaCommissionAmount: string;
  otaCommissionGstAmount: string;
  otaCleaningCharge: string;
  otaOtherCharge: string;
  corporateCompanyName: string;
  corporateGstNumber: string;
  corporateBillingContact: string;
  corporateInvoiceTo: string;
  corporatePurchaseOrderNumber: string;
  corporateCreditPeriodDays: string;
  travelAgentName: string;
  travelAgentVoucherNumber: string;
  travelAgentCommissionTerms: string;
  travelAgentSettlementTerms: string;
};

type SpecialDatePricing = {
  date?: string;
  price?: number | string | null;
  priceWithGST?: number | string | null;
  baseGuestCount?: number | string | null;
};

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const BOOKING_EXECUTION_TYPE_OPTIONS: Array<{
  value: BookingExecutionType;
  label: string;
}> = [
  { value: "OFFLINE", label: "Assisted Reservation" },
  { value: "ONLINE", label: "Website Reservation" },
];

const RESERVATION_SOURCE_OPTIONS: Array<{
  value: ReservationSourceKind;
  label: string;
}> = [
  { value: "DIRECT", label: "Guest (Direct)" },
  { value: "ASSISTED", label: "Assisted Booking" },
  { value: "OTA", label: "OTA (Airbnb, etc.)" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "TRAVEL_AGENT", label: "Travel Agent" },
];

const EMPTY_RESERVATION_CONTEXT: ReservationContextForm = {
  sourceKind: "DIRECT",
  externalReference: "",
  assistedPurpose: "",
  assistedRequestDetails: "",
  otaGrossBookingAmount: "",
  otaBookingGstAmount: "",
  otaCommissionAmount: "",
  otaCommissionGstAmount: "",
  otaCleaningCharge: "",
  otaOtherCharge: "",
  corporateCompanyName: "",
  corporateGstNumber: "",
  corporateBillingContact: "",
  corporateInvoiceTo: "",
  corporatePurchaseOrderNumber: "",
  corporateCreditPeriodDays: "",
  travelAgentName: "",
  travelAgentVoucherNumber: "",
  travelAgentCommissionTerms: "",
  travelAgentSettlementTerms: "",
};

const PAYMENT_LINK_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_LINK_PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const PAYMENT_LINK_STATUS_POLL_INTERVAL_MS = 4000;
const PAYMENT_LINK_STATUS_MAX_POLLS = 15;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatPriceLabel = (value: number | null) => {
  if (value === null || value <= 0) return null;
  return `Rs ${currencyFormatter.format(Math.round(value))}`;
};

const formatCurrency = (value: number | null | undefined) =>
  `Rs ${currencyFormatter.format(Math.round(value ?? 0))}`;

const formatChargeMeta = (
  item: {
    key: string;
    meta?: {
      guestUnits?: number;
      chargedNights?: number;
      maxGuestsPerNight?: number;
    } | null;
  },
  bookingDays: number
) => {
  const guestUnits = item.meta?.guestUnits ?? 0;
  const chargedNights = item.meta?.chargedNights ?? 0;
  const maxGuestsPerNight = item.meta?.maxGuestsPerNight ?? 0;

  if (guestUnits <= 0 || chargedNights <= 0) return null;

  const guestLabel = item.key === "extra_child_guests" ? "child" : "adult";
  const normalizedNights = bookingDays > 0 ? bookingDays : chargedNights;

  if (guestUnits % normalizedNights === 0) {
    const guestCount = guestUnits / normalizedNights;
    return `${guestCount} extra ${guestLabel}${guestCount === 1 ? "" : "s"} x ${normalizedNights} night${normalizedNights === 1 ? "" : "s"}`;
  }

  if (maxGuestsPerNight > 0) {
    return `Up to ${maxGuestsPerNight} extra ${guestLabel}${maxGuestsPerNight === 1 ? "" : "s"} per night across ${chargedNights} night${chargedNights === 1 ? "" : "s"}`;
  }

  return `${guestUnits} extra ${guestLabel} guest-night${guestUnits === 1 ? "" : "s"}`;
};

const formatDateFromIso = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return formatDisplayDate(date);
};

const formatDisplayDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const resolveBrandSlug = (brandName: string): "instafarms" | "mago" | "listing" => {
  const normalized = brandName.trim().toLowerCase();
  if (normalized.includes("mago")) return "mago";
  if (normalized.includes("listing")) return "listing";
  return "instafarms";
};

const resolveCommercialPricing = (
  payload: Record<string, unknown>,
  brandName: string
): CommercialPricingRecord | null => {
  const normalized = normalizePropertyFullData(payload);
  const brandSlug = resolveBrandSlug(brandName);
  const brandCommercial = asRecord(normalized.tabs.brandData[brandSlug]?.commercial);
  return brandCommercial ?? asRecord(normalized.tabs.commercial);
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMonths = (date: Date, months: number) => {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
};

const isSameDate = (a: Date | null, b: Date | null) => {
  return !!a && !!b && getDateKey(a) === getDateKey(b);
};

const isDateBeforeToday = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value < today;
};

const getMonthCells = (monthDate: Date) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const getDatePrice = (
  date: Date,
  commercialPricing: CommercialPricingRecord | null,
  specialDatePriceMap: Map<string, number>
) => {
  const dateKey = getDateKey(date);
  const specialDatePrice = specialDatePriceMap.get(dateKey);
  if (specialDatePrice !== undefined) {
    return specialDatePrice;
  }

  if (!commercialPricing) return null;

  const weekdayKey = WEEKDAY_KEYS[date.getDay()];
  const priceWithGst = asNumber(commercialPricing[`${weekdayKey}PriceWithGST`]);
  const basePrice = asNumber(commercialPricing[`${weekdayKey}Price`]);
  return priceWithGst ?? basePrice;
};

const getDateBaseGuestCount = (
  date: Date,
  commercialPricing: CommercialPricingRecord | null,
  specialDates: SpecialDatePricing[]
) => {
  const dateKey = getDateKey(date);
  const specialDate = specialDates.find((item) => item.date === dateKey);
  const specialBaseGuestCount = asNumber(specialDate?.baseGuestCount);
  if (specialBaseGuestCount !== null) {
    return specialBaseGuestCount;
  }

  if (!commercialPricing) return null;

  const weekdayKey = WEEKDAY_KEYS[date.getDay()];
  return asNumber(commercialPricing[`${weekdayKey}BaseGuestCount`]) ?? asNumber(commercialPricing.baseGuestCount);
};

type MinNightsInfo = {
  universal: number;
  peakRules: { id: string; label: string; startDate: string; endDate: string; minNights: number }[];
};

export function BookingStayCalendar({
  checkinDate,
  checkoutDate,
  blockedDates,
  checkinBlockedDates,
  disabled,
  isRefreshing,
  commercialPricing,
  specialDatePriceMap,
  minNightsInfo,
  onChange,
  onClear,
  onRefresh,
}: {
  checkinDate: Date | null;
  checkoutDate: Date | null;
  blockedDates: Date[];
  checkinBlockedDates: Date[];
  disabled: boolean;
  isRefreshing: boolean;
  commercialPricing: CommercialPricingRecord | null;
  specialDatePriceMap: Map<string, number>;
  minNightsInfo?: MinNightsInfo | null;
  onChange: (checkin: Date | null, checkout: Date | null) => void;
  onClear: () => void;
  onRefresh?: () => void;
}) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const months = [visibleMonth, addMonths(visibleMonth, 1)];
  const blockedDateKeys = useMemo(
    () => new Set(blockedDates.map((date) => getDateKey(date))),
    [blockedDates]
  );
  const checkinBlockedDateKeys = useMemo(
    () => new Set(checkinBlockedDates.map((date) => getDateKey(date))),
    [checkinBlockedDates]
  );
  const selectedNightCount =
    checkinDate && checkoutDate
      ? Math.max(0, Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
  const hasSelection = !!checkinDate || !!checkoutDate;

  const getActivePeakRule = (forDate: Date) => {
    if (!minNightsInfo?.peakRules?.length) return null;
    const dateStr = getDateKey(forDate);
    const matching = minNightsInfo.peakRules.filter(
      (r) => r.startDate <= dateStr && r.endDate > dateStr
    );
    if (!matching.length) return null;
    return matching.reduce((a, b) => (b.minNights > a.minNights ? b : a));
  };

  const hasStayConflict = (start: Date, end: Date) => {
    const startKey = getDateKey(start);
    const endKey = getDateKey(end);
    return blockedDates.some((blockedDate) => {
      const blockedKey = getDateKey(blockedDate);
      return blockedKey >= startKey && blockedKey < endKey;
    });
  };

  const isInRange = (date: Date) => {
    if (!checkinDate || !checkoutDate) return false;
    return date > checkinDate && date < checkoutDate;
  };

  const handleDateClick = (date: Date) => {
    if (disabled || isDateBeforeToday(date)) return;
    const dateKey = getDateKey(date);

    if (!checkinDate || checkoutDate) {
      if (blockedDateKeys.has(dateKey) || checkinBlockedDateKeys.has(dateKey)) return;
      onChange(date, null);
      return;
    }

    if (date <= checkinDate) {
      if (blockedDateKeys.has(dateKey) || checkinBlockedDateKeys.has(dateKey)) return;
      onChange(date, null);
      return;
    }

    if (hasStayConflict(checkinDate, date)) {
      onChange(null, null);
      toast.error("Selected dates include blocked dates. Please choose different dates.");
      return;
    }

    onChange(checkinDate, date);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setIsCalendarOpen((current) => !current)}
        className="flex w-full flex-col gap-4 border-b border-slate-100 bg-slate-50/80 p-4 text-left transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-950/70 md:flex-row md:items-center md:justify-between"
        disabled={disabled}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-200">
            Stay date range
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
            {hasSelection
              ? `${formatDisplayDate(checkinDate) ?? "Not selected"} to ${formatDisplayDate(checkoutDate) ?? "Not selected"}`
              : disabled
                ? "Select property to choose dates"
                : "Click to select check-in and check-out"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedNightCount > 0 ? `${selectedNightCount} night${selectedNightCount === 1 ? "" : "s"} selected` : "Prices appear inside each available date"}
          </p>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {isCalendarOpen ? "Hide Calendar" : "Select Dates"}
        </span>
      </button>

      <div className="grid gap-3 border-b border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Check-in
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
            {formatDisplayDate(checkinDate) ?? "Not selected"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Check-out
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
            {formatDisplayDate(checkoutDate) ?? "Not selected"}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/60 dark:bg-teal-950/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">
            Duration
          </p>
          <p className="mt-2 text-sm font-semibold text-teal-950 dark:text-teal-50">
            {selectedNightCount > 0 ? `${selectedNightCount} night${selectedNightCount === 1 ? "" : "s"}` : "Choose a range"}
          </p>
        </div>
      </div>

      {isCalendarOpen ? (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-teal-600" />
                Selected
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-teal-100 ring-1 ring-teal-200 dark:bg-teal-900" />
                In range
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                Unavailable
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onRefresh ? (
                <MyButton type="button" color="light" onClick={onRefresh} disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing..." : "Refresh Calendar"}
                </MyButton>
              ) : null}
              <MyButton type="button" color="light" onClick={onClear} disabled={!hasSelection}>
                Clear Dates
              </MyButton>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="rounded-full px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              disabled={disabled}
            >
              Prev
            </button>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {visibleMonth.toLocaleDateString("en-IN", { month: "short", year: "numeric" })} -{" "}
              {addMonths(visibleMonth, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="rounded-full px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              disabled={disabled}
            >
              Next
            </button>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {months.map((month) => (
              <div key={getDateKey(month)}>
                <div className="mb-3 text-center text-sm font-semibold text-slate-900 dark:text-white">
                  {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {getMonthCells(month).map((date) => {
                    const key = getDateKey(date);
                    const isOutsideMonth = date.getMonth() !== month.getMonth();
                    if (isOutsideMonth) {
                      return <div key={key} className="min-h-12 rounded-xl" aria-hidden="true" />;
                    }
                    const isCheckoutMode = !!checkinDate && !checkoutDate;
                    const isBlockedForCheckin = checkinBlockedDateKeys.has(key);
                    const isBlockedNight = blockedDateKeys.has(key);
                    const conflictsWithRange = checkinDate && isCheckoutMode ? hasStayConflict(checkinDate, date) : false;

                    // Min-nights check A: block checkin dates too close to a peak rule's end
                    const checkinPeakRule = !isCheckoutMode ? getActivePeakRule(date) : null;
                    const tooCloseToRangeEnd = !!checkinPeakRule && (() => {
                      const nightsLeft = Math.ceil(
                        (new Date(checkinPeakRule.endDate).getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return nightsLeft < checkinPeakRule.minNights;
                    })();

                    // Min-nights check B: block checkout dates with too few nights in range
                    const activePeakRuleForCheckin = isCheckoutMode && checkinDate ? getActivePeakRule(checkinDate) : null;
                    const tooFewNightsInRange = !!activePeakRuleForCheckin && isCheckoutMode && checkinDate && (() => {
                      const rangeEnd = new Date(activePeakRuleForCheckin.endDate);
                      const effectiveCheckout = date < rangeEnd ? date : rangeEnd;
                      const nightsInRange = Math.ceil(
                        (effectiveCheckout.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return nightsInRange < activePeakRuleForCheckin.minNights;
                    })();

                    // Universal min-nights check (when no peak rule applies to checkin)
                    const universalMin = minNightsInfo?.universal ?? 1;
                    const tooFewNightsUniversal = isCheckoutMode && !activePeakRuleForCheckin && checkinDate && universalMin > 1 && (() => {
                      const nights = Math.ceil((date.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
                      return nights < universalMin;
                    })();

                    const isDisabled =
                      disabled ||
                      isOutsideMonth ||
                      isDateBeforeToday(date) ||
                      (!isCheckoutMode && (isBlockedForCheckin || isBlockedNight || tooCloseToRangeEnd)) ||
                      (isCheckoutMode && (!checkinDate || date <= checkinDate || conflictsWithRange || tooFewNightsInRange || tooFewNightsUniversal));
                    const isStart = !isOutsideMonth && isSameDate(date, checkinDate);
                    const isEnd = !isOutsideMonth && isSameDate(date, checkoutDate);
                    const selected = isStart || isEnd;
                    const inRange = !isOutsideMonth && isInRange(date);
                    const priceLabel = formatPriceLabel(getDatePrice(date, commercialPricing, specialDatePriceMap));
                    const dayClasses = [
                      "min-h-12 rounded-xl px-1 py-1 text-sm transition",
                      "text-slate-700 dark:text-slate-200",
                      isDisabled && !selected && !inRange
                        ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through dark:bg-slate-800 dark:text-slate-600"
                        : isDisabled
                          ? "cursor-not-allowed"
                          : "hover:bg-teal-100 dark:hover:bg-teal-950/60",
                      inRange ? "bg-teal-100 font-medium text-teal-900 dark:bg-teal-900/70 dark:text-teal-50" : "",
                      selected ? "bg-teal-600 font-bold text-white shadow-sm ring-2 ring-teal-300 dark:bg-teal-500 dark:text-slate-950 dark:ring-teal-200" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDateClick(date)}
                        disabled={isDisabled}
                        className={dayClasses}
                        title={isBlockedNight ? "Unavailable" : formatDisplayDate(date) ?? undefined}
                      >
                        <span className="block leading-tight">{date.getDate()}</span>
                        <span className="block text-[10px] leading-tight opacity-75">
                          {priceLabel ?? (!isBlockedNight ? "--" : "")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            Select check-in first, then choose checkout. Inventory-blocked dates cannot be used as check-in or stay nights, but the checkout date may fall on a blocked date.
          </div>
        </>
      ) : null}
    </div>
  );
}

function BookingHeroTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/80">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

// sourceKind and sourceCategory have to agree: selectReservationSource derives
// one from the other, so seeding only sourceKind would leave an OTA reservation
// filed under DIRECT_BOOKING.
function categoryForSource(
  sourceKind: ReservationSourceKind,
): BookingSourceCategory {
  return sourceKind === "DIRECT" || sourceKind === "ASSISTED"
    ? "DIRECT_BOOKING"
    : "THIRD_PARTY_BOOKING";
}

export default function CreateBookingEditor({
  brands,
  initialReservationSource,
}: CreateBookingEditorProps) {
  const [isCreatingBooking, startCreateTransition] = useTransition();
  const [isSendingLink, startSendLinkTransition] = useTransition();
  const [isPreparingPaymentPage, startPreparePaymentPageTransition] = useTransition();
  const router = useRouter();
  const hookData = useBookingHook();
  const tabsRef = useRef<{ setActiveTab: (tab: number) => void } | null>(null);
  const quoteRequestSeqRef = useRef(0);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [activeTab, setActiveTab] = useState(0);
  const [commercialPricing, setCommercialPricing] = useState<CommercialPricingRecord | null>(null);
  const [propertySummary, setPropertySummary] = useState<PropertySummary>({
    name: null,
    code: null,
    baseGuestCount: null,
    maxGuestCount: null,
  });
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [minNightsInfo, setMinNightsInfo] = useState<MinNightsInfo | null>(null);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isNightlyPricingOpen, setIsNightlyPricingOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isQuoteInclusiveOfGst, setIsQuoteInclusiveOfGst] = useState(false);
  const [paymentCollectionMode, setPaymentCollectionMode] = useState<"CASH" | "PAYMENT_LINK">("CASH");
  const [paymentLinkChannels, setPaymentLinkChannels] = useState<Array<"email" | "whatsapp">>(["email"]);
  const [paymentLinkNote, setPaymentLinkNote] = useState("");
  const [paymentLinkEmail, setPaymentLinkEmail] = useState("");
  const [paymentLinkWhatsappNumber, setPaymentLinkWhatsappNumber] = useState("");
  const [bookingExecutionType, setBookingExecutionType] =
    useState<BookingExecutionType>("OFFLINE");
  const [sourceCategory, setSourceCategory] = useState<BookingSourceCategory>(
    categoryForSource(initialReservationSource ?? EMPTY_RESERVATION_CONTEXT.sourceKind),
  );
  const [reservationContext, setReservationContext] =
    useState<ReservationContextForm>(
      initialReservationSource
        ? { ...EMPTY_RESERVATION_CONTEXT, sourceKind: initialReservationSource }
        : EMPTY_RESERVATION_CONTEXT,
    );
  const [commissionBookingSourceId, setCommissionBookingSourceId] =
    useState("");
  const [commissionBookingSources, setCommissionBookingSources] = useState<
    CommissionBookingSource[]
  >([]);
  const [isLoadingCommissionSources, setIsLoadingCommissionSources] =
    useState(false);
  const [createdPendingBookingId, setCreatedPendingBookingId] = useState<string | null>(null);
  const [createdPendingBookingDraftKey, setCreatedPendingBookingDraftKey] = useState<string | null>(null);
  const [createdPendingBookingStatus, setCreatedPendingBookingStatus] = useState<string | null>(null);
  const [createdPendingBookingStatusError, setCreatedPendingBookingStatusError] = useState<string | null>(null);
  const [createdPendingBookingLastCheckedAt, setCreatedPendingBookingLastCheckedAt] = useState<string | null>(null);
  const [isRefreshingCreatedBookingStatus, setIsRefreshingCreatedBookingStatus] = useState(false);
  const [createdPendingBookingPollCount, setCreatedPendingBookingPollCount] = useState(0);

  const updateReservationContext = (
    field: Exclude<keyof ReservationContextForm, "sourceKind">,
    value: string,
  ) => {
    setReservationContext((current) => ({ ...current, [field]: value }));
  };
  const selectReservationSource = (sourceKind: ReservationSourceKind) => {
    setReservationContext((current) => ({ ...current, sourceKind }));
    setSourceCategory(
      sourceKind === "DIRECT" || sourceKind === "ASSISTED"
        ? "DIRECT_BOOKING"
        : "THIRD_PARTY_BOOKING",
    );
  };

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) || null,
    [brands, selectedBrandId]
  );
  const selectedBrandName = selectedBrand?.name || "";
  const selectedBrandAppType = useMemo(
    () =>
      selectedBrandName.toLowerCase().includes("mago")
        ? "MAGO_ADMIN"
        : "INSTAFARMS_ADMIN",
    [selectedBrandName]
  );
  const specialDatePriceMap = useMemo(() => {
    if (!commercialPricing) return new Map<string, number>();

    const specialDates = Array.isArray(commercialPricing.specialDates)
      ? (commercialPricing.specialDates as SpecialDatePricing[])
      : [];

    return specialDates.reduce((acc, specialDate) => {
      if (!specialDate?.date) return acc;

      const resolvedPrice = asNumber(specialDate.priceWithGST) ?? asNumber(specialDate.price);
      if (resolvedPrice !== null) {
        acc.set(specialDate.date, resolvedPrice);
      }
      return acc;
    }, new Map<string, number>());
  }, [commercialPricing]);
  const specialDatePricing = useMemo(
    () =>
      Array.isArray(commercialPricing?.specialDates)
        ? (commercialPricing.specialDates as SpecialDatePricing[])
        : [],
    [commercialPricing]
  );
  const hasSelectionsToClear = Boolean(
    hookData.entityId ||
    hookData.customerId ||
    hookData.checkinDate ||
    hookData.checkoutDate ||
    hookData.adultCount !== 1 ||
    hookData.childrenCount !== 0 ||
    hookData.infantCount !== 0 ||
    hookData.bookingRemarks ||
    hookData.specialRequests ||
    hookData.payments.length > 0
  );
  const bookingDetailsError = hookData.validateBookingDetails();
  const reservationContextError =
    reservationContext.sourceKind === "ASSISTED" &&
    !reservationContext.assistedPurpose.trim()
      ? "Enter the assisted reservation purpose"
      : reservationContext.sourceKind === "OTA" &&
          (!reservationContext.externalReference.trim() ||
            reservationContext.otaGrossBookingAmount === "")
        ? "Enter the OTA reference and booking amount"
        : reservationContext.sourceKind === "CORPORATE" &&
            (!reservationContext.corporateCompanyName.trim() ||
              !reservationContext.corporateBillingContact.trim() ||
              !reservationContext.corporateInvoiceTo.trim())
          ? "Enter company, billing contact and invoice recipient"
          : reservationContext.sourceKind === "TRAVEL_AGENT" &&
              !reservationContext.travelAgentName.trim()
            ? "Enter the travel-agent name"
            : null;
  const sourceSelectionError = !sourceCategory
    ? "Select reservation source"
    : !commissionBookingSourceId
      ? "Select source channel"
      : reservationContextError;
  const paymentError = paymentCollectionMode === "PAYMENT_LINK" ? null : hookData.validatePayments();
  const canMoveToPayments = !bookingDetailsError && !sourceSelectionError;
  const hasQuote = !!quote;
  const totalQuotedAmount = quote?.fullBookingAmountWithGst ?? quote?.finalAmount ?? 0;
  const amountPaid = hookData.payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0);
  const remainingAmount = Math.max(0, totalQuotedAmount - amountPaid);
  const canCreateBooking = !bookingDetailsError && !sourceSelectionError && !paymentError && hasQuote;
  const hasAnyPayment = hookData.payments.length > 0;
  const showPaymentValidationHint = activeTab === 1 && Boolean(paymentError);
  const totalGuests = hookData.adultCount + hookData.childrenCount + hookData.infantCount;
  const stayDatesLabel =
    hookData.checkinDate && hookData.checkoutDate
      ? `${formatDisplayDate(hookData.checkinDate)} to ${formatDisplayDate(hookData.checkoutDate)}`
      : "Not selected";
  const nightsCount =
    quote?.bookingDays ??
    (hookData.checkinDate && hookData.checkoutDate
      ? Math.ceil((hookData.checkoutDate.getTime() - hookData.checkinDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0);
  const propertyDisplayName = propertySummary.name ?? "Property not selected";
  const propertyDisplayCode = propertySummary.code ?? (hookData.entityId || null);
  const otaNetChannelCollection = useMemo(() => {
    const amount = (value: string) => Math.max(0, Number(value || 0) || 0);
    return Math.max(
      0,
      amount(reservationContext.otaGrossBookingAmount) +
        amount(reservationContext.otaCleaningCharge) +
        amount(reservationContext.otaOtherCharge) -
        amount(reservationContext.otaBookingGstAmount) -
        amount(reservationContext.otaCommissionAmount) -
        amount(reservationContext.otaCommissionGstAmount),
    );
  }, [reservationContext]);
  const quoteBreakdown = quote?.pricingSummary?.breakdown;
  const paymentLinkError =
    paymentCollectionMode !== "PAYMENT_LINK"
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
        : remainingAmount <= 0
          ? "Website checkout is only needed when there is a pending amount to collect"
          : null;
  const currentBookingDraftKey = JSON.stringify({
    brandId: selectedBrandId,
    propertyId: hookData.entityId || "",
    customerId: hookData.customerId || "",
    checkinDate: hookData.checkinDate ? getDateKey(hookData.checkinDate) : "",
    checkoutDate: hookData.checkoutDate ? getDateKey(hookData.checkoutDate) : "",
    adultCount: hookData.adultCount,
    childrenCount: hookData.childrenCount,
    infantCount: hookData.infantCount,
    floatingAdultCount: hookData.floatingAdultCount,
    floatingChildCount: hookData.floatingChildCount,
    floatingInfantCount: hookData.floatingInfantCount,
    bookingExecutionType,
    sourceCategory,
    commissionBookingSourceId,
    reservationContext,
    bookingRemarks: hookData.bookingRemarks || "",
    specialRequests: hookData.specialRequests || "",
  });
  const canSendCreatedBookingLink =
    paymentCollectionMode === "PAYMENT_LINK" &&
    !!createdPendingBookingId &&
    createdPendingBookingDraftKey === currentBookingDraftKey &&
    !paymentLinkError;
  const hasCreatedPendingBookingForCurrentDraft =
    paymentCollectionMode === "PAYMENT_LINK" &&
    !!createdPendingBookingId &&
    createdPendingBookingDraftKey === currentBookingDraftKey;
  const isCreatedPendingBookingConfirmed =
    hasCreatedPendingBookingForCurrentDraft && createdPendingBookingStatus === "CONFIRMED";
  const createdPendingBookingStatusTone = isCreatedPendingBookingConfirmed
    ? "Confirmed"
    : hasCreatedPendingBookingForCurrentDraft
      ? "Pending"
      : "Awaiting creation";
  const quoteLineItems = quoteBreakdown?.lineItems ?? [];
  const quoteDiscountRows = quoteBreakdown?.discountRows ?? [];
  const quoteTotals = quoteBreakdown?.totals;
  const quoteBookingPriceRows = quoteLineItems.filter((item) =>
    /base|rental|stay|night/i.test(`${item.key} ${item.label}`),
  );
  const quoteChargeRows = quoteLineItems.filter(
    (item) => !quoteBookingPriceRows.includes(item),
  );
  const summaryStayLabel =
    formatDateFromIso(quote?.pricingSummary?.stay?.checkinDate) &&
    formatDateFromIso(quote?.pricingSummary?.stay?.checkoutDate)
      ? `${formatDateFromIso(quote?.pricingSummary?.stay?.checkinDate)} to ${formatDateFromIso(
          quote?.pricingSummary?.stay?.checkoutDate
        )}`
      : stayDatesLabel;
  const includedGuestLimit = useMemo(() => {
    if (propertySummary.baseGuestCount !== null) {
      return propertySummary.baseGuestCount;
    }

    if (!commercialPricing) return null;

    if (hookData.checkinDate && hookData.checkoutDate) {
      const stayDates = [];
      for (
        const date = new Date(hookData.checkinDate);
        date < hookData.checkoutDate;
        date.setDate(date.getDate() + 1)
      ) {
        stayDates.push(new Date(date));
      }

      const nightlyBaseGuestCounts = stayDates
        .map((date) => getDateBaseGuestCount(date, commercialPricing, specialDatePricing))
        .filter((value): value is number => value !== null && value >= 0);

      if (nightlyBaseGuestCounts.length > 0) {
        return Math.min(...nightlyBaseGuestCounts);
      }
    }

    const fallbackBaseGuestCount = asNumber(commercialPricing.baseGuestCount);
    if (fallbackBaseGuestCount !== null) {
      return fallbackBaseGuestCount;
    }

    const weekdayBaseGuestCounts = WEEKDAY_KEYS.map((weekdayKey) =>
      asNumber(commercialPricing[`${weekdayKey}BaseGuestCount`])
    ).filter((value): value is number => value !== null && value >= 0);

    return weekdayBaseGuestCounts.length > 0 ? Math.min(...weekdayBaseGuestCounts) : null;
  }, [
    commercialPricing,
    hookData.checkinDate,
    hookData.checkoutDate,
    propertySummary.baseGuestCount,
    specialDatePricing,
  ]);
  const stayingGuestCount = hookData.adultCount + hookData.childrenCount;
  const maxGuestLimit = propertySummary.maxGuestCount;
  const extraAdultGuests =
    includedGuestLimit === null ? 0 : Math.max(0, hookData.adultCount - includedGuestLimit);
  const extraGuestCount =
    includedGuestLimit === null ? 0 : Math.max(0, stayingGuestCount - includedGuestLimit);
  const extraChildGuests = Math.max(0, extraGuestCount - extraAdultGuests);
  const remainingGuestCapacity =
    maxGuestLimit === null ? null : Math.max(0, maxGuestLimit - stayingGuestCount);

  const getLocalDateString = (date: Date) => {
    return getDateKey(date);
  };

  useEffect(() => {
    if (
      createdPendingBookingId &&
      createdPendingBookingDraftKey &&
      createdPendingBookingDraftKey !== currentBookingDraftKey
    ) {
      setCreatedPendingBookingId(null);
      setCreatedPendingBookingDraftKey(null);
      setCreatedPendingBookingStatus(null);
      setCreatedPendingBookingStatusError(null);
      setCreatedPendingBookingLastCheckedAt(null);
      setCreatedPendingBookingPollCount(0);
    }
  }, [createdPendingBookingDraftKey, createdPendingBookingId, currentBookingDraftKey]);

  useEffect(() => {
    if (paymentCollectionMode !== "PAYMENT_LINK" && createdPendingBookingId) {
      setCreatedPendingBookingId(null);
      setCreatedPendingBookingDraftKey(null);
      setCreatedPendingBookingStatus(null);
      setCreatedPendingBookingStatusError(null);
      setCreatedPendingBookingLastCheckedAt(null);
      setCreatedPendingBookingPollCount(0);
    }
  }, [createdPendingBookingId, paymentCollectionMode]);

  const refreshCreatedBookingStatus = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!createdPendingBookingId || createdPendingBookingDraftKey !== currentBookingDraftKey) {
        return null;
      }

      setIsRefreshingCreatedBookingStatus(true);
      if (!options?.silent) {
        setCreatedPendingBookingStatusError(null);
      }

      try {
        const result = await getBookingById(createdPendingBookingId);
        if (!result.success || !result.data?.booking) {
          throw new Error(result.error || "Failed to refresh booking status");
        }

        const latestStatus = result.data.booking.status || null;
        setCreatedPendingBookingStatus(latestStatus);
        setCreatedPendingBookingLastCheckedAt(new Date().toISOString());
        setCreatedPendingBookingStatusError(null);
        return latestStatus;
      } catch (error) {
        captureError(error);
        const message = error instanceof Error ? error.message : "Failed to refresh booking status";
        setCreatedPendingBookingStatusError(message);
        if (!options?.silent) {
          toast.error(message);
        }
        return null;
      } finally {
        setIsRefreshingCreatedBookingStatus(false);
      }
    },
    [createdPendingBookingDraftKey, createdPendingBookingId, currentBookingDraftKey]
  );

  useEffect(() => {
    if (
      !hasCreatedPendingBookingForCurrentDraft ||
      createdPendingBookingStatus === "CONFIRMED" ||
      createdPendingBookingPollCount >= PAYMENT_LINK_STATUS_MAX_POLLS
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshCreatedBookingStatus({ silent: true }).finally(() => {
        setCreatedPendingBookingPollCount((current) => current + 1);
      });
    }, PAYMENT_LINK_STATUS_POLL_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    createdPendingBookingPollCount,
    createdPendingBookingStatus,
    currentBookingDraftKey,
    hasCreatedPendingBookingForCurrentDraft,
    refreshCreatedBookingStatus,
  ]);

  const fetchQuote = async (
    options?: { couponCode?: string | null; preserveQuoteOnError?: boolean }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (
      !selectedBrandId ||
      !hookData.entityId ||
      !hookData.checkinDate ||
      !hookData.checkoutDate ||
      !sourceCategory ||
      !commissionBookingSourceId
    ) {
      quoteRequestSeqRef.current += 1;
      setQuote(null);
      setQuoteError(null);
      return { ok: false, error: "Booking details are incomplete" };
    }

    const requestSeq = quoteRequestSeqRef.current + 1;
    quoteRequestSeqRef.current = requestSeq;
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const result = await calculateOfflineBookingQuote({
        brandId: selectedBrandId,
        appType: selectedBrandAppType,
        propertyId: hookData.entityId,
        bookingExecutionType,
        bookingTechPlatform: "ADMIN_PANEL",
        sourceCategory,
        commissionBookingSourceId,
        checkinDate: getLocalDateString(hookData.checkinDate),
        checkoutDate: getLocalDateString(hookData.checkoutDate),
        adultCount: hookData.adultCount,
        childrenCount: hookData.childrenCount,
        infantCount: hookData.infantCount,
        floatingAdultCount: hookData.floatingAdultCount,
        floatingChildCount: hookData.floatingChildCount,
        floatingInfantCount: hookData.floatingInfantCount,
        couponCode: options?.couponCode ?? appliedCouponCode ?? undefined,
        isInclusiveOfGst: isQuoteInclusiveOfGst,
      });

      if (requestSeq !== quoteRequestSeqRef.current) {
        return { ok: false, error: "Stale quote ignored" };
      }

      if (result.error || !result.success) {
        if (!options?.preserveQuoteOnError) {
          setQuote(null);
        }
        const message = result.error || "Failed to calculate booking amount";
        setQuoteError(message);
        return { ok: false, error: message };
      }

      const calculatedQuote = result.success as BookingQuote;
      setQuote(calculatedQuote);
      setQuoteError(null);
      return { ok: true };
    } catch (error) {
      if (requestSeq !== quoteRequestSeqRef.current) {
        return { ok: false, error: "Stale quote ignored" };
      }
      captureError(error);
      console.error("Failed to fetch booking quote:", error);
      if (!options?.preserveQuoteOnError) {
        setQuote(null);
      }
      const message = error instanceof Error ? error.message : "Failed to calculate booking amount";
      setQuoteError(message);
      return { ok: false, error: message };
    } finally {
      if (requestSeq === quoteRequestSeqRef.current) {
        setIsLoadingQuote(false);
      }
    }
  };

  const removePaymentAndMetadata = (paymentId: string) => {
    hookData.removePayment(paymentId);
  };

  const applyCoupon = async () => {
    const normalizedCoupon = couponInput.trim().toUpperCase();
    if (!normalizedCoupon) {
      setCouponFeedback({ type: "error", message: "Enter a coupon code before applying it." });
      return;
    }

    setCouponFeedback(null);
    const result = await fetchQuote({ couponCode: normalizedCoupon, preserveQuoteOnError: true });
    if (!result.ok) {
      setCouponFeedback({ type: "error", message: result.error || "Failed to apply coupon." });
    } else {
      setAppliedCouponCode(normalizedCoupon);
      setCouponInput(normalizedCoupon);
      setCouponFeedback({ type: "success", message: `Coupon ${normalizedCoupon} applied.` });
    }
  };

  const removeCoupon = async () => {
    setAppliedCouponCode(null);
    setCouponInput("");
    setCouponFeedback(null);
    await fetchQuote({ couponCode: null, preserveQuoteOnError: false });
  };

  const buildBookingFormData = (options?: { createPendingBooking?: boolean; sendPaymentLink?: boolean }) => {
    const createPendingBooking = options?.createPendingBooking === true;
    const sendPaymentLink = options?.sendPaymentLink === true;

    if (!selectedBrandId) {
      toast.error("Please select a brand");
      return null;
    }

    const detailsError = hookData.validateBookingDetails();
    if (detailsError) {
      setActiveTab(0);
      tabsRef.current?.setActiveTab(0);
      toast.error(detailsError);
      return null;
    }

    if (sourceSelectionError) {
      setActiveTab(0);
      tabsRef.current?.setActiveTab(0);
      toast.error(sourceSelectionError);
      return null;
    }

    const paymentsError =
      paymentCollectionMode === "PAYMENT_LINK" || createPendingBooking
        ? null
        : hookData.validatePayments();
    if (paymentsError) {
      setActiveTab(1);
      tabsRef.current?.setActiveTab(1);
      toast.error(paymentsError);
      return null;
    }

    if (sendPaymentLink && paymentLinkError) {
      setActiveTab(1);
      tabsRef.current?.setActiveTab(1);
      toast.error(paymentLinkError);
      return null;
    }

    if (!quote) {
      setActiveTab(1);
      tabsRef.current?.setActiveTab(1);
      toast.error(quoteError || "Booking amount is still being calculated. Please wait a moment and try again.");
      return null;
    }

    const formEl = document.getElementById("bookingForm") as HTMLFormElement | null;
    if (!formEl) {
      toast.error("Form not found");
      return null;
    }

    const formData = new FormData(formEl);
    formData.set("brandId", selectedBrandId);
    formData.set("brandName", selectedBrandName);
    formData.set("bookingType", "Offline");
    formData.set("bookingExecutionType", bookingExecutionType);
    formData.set("bookingTechPlatform", "ADMIN_PANEL");
    formData.set("sourceCategory", sourceCategory);
    formData.set("commissionBookingSourceId", commissionBookingSourceId);
    formData.set("reservationContext", JSON.stringify(reservationContext));
    formData.set("propertyId", hookData.entityId || "");
    formData.set("customerId", hookData.customerId || "");
    formData.set("checkinDate", hookData.checkinDate ? getLocalDateString(hookData.checkinDate) : "");
    formData.set("checkoutDate", hookData.checkoutDate ? getLocalDateString(hookData.checkoutDate) : "");
    formData.set("adultCount", String(hookData.adultCount));
    formData.set("childrenCount", String(hookData.childrenCount));
    formData.set("infantCount", String(hookData.infantCount));
    formData.set("floatingAdultCount", String(hookData.floatingAdultCount));
    formData.set("floatingChildCount", String(hookData.floatingChildCount));
    formData.set("floatingInfantCount", String(hookData.floatingInfantCount));

    formData.set("baseRentalAmountWithGst", String(quote?.baseRentalAmountWithGst ?? 0));
    formData.set("rentalCharge", String(quote?.rentalCharge ?? quote?.baseRentalAmountWithGst ?? 0));
    formData.set("extraAdultGuestChargeWithGst", String(quote?.extraAdultGuestChargeWithGst ?? 0));
    formData.set("extraChildGuestChargeWithGst", String(quote?.extraChildGuestChargeWithGst ?? 0));
    formData.set("floatingGuestCharge", String(quote?.floatingGuestCharge ?? 0));
    formData.set("extraGuestCharge", String(quote?.extraGuestCharge ?? 0));
    formData.set("bookingAmountWithGstBeforeDiscounts", String(quote?.bookingAmountWithGstBeforeDiscounts ?? 0));
    formData.set("totalDiscount", String(quote?.totalDiscount ?? quote?.totalDiscountAmount ?? 0));
    formData.set("totalDiscountAmount", String(quote?.totalDiscountAmount ?? 0));
    formData.set("totalDiscountPercentage", String(quote?.totalDiscountPercentage ?? 0));
    formData.set("bookingAmountPaidWithGst", String(amountPaid));
    formData.set("fullBookingAmountWithGst", String(totalQuotedAmount));
    formData.set("remainingAmountToBePaidWithGst", String(remainingAmount));
    formData.set("paymentGatewayCharge", "0");
    formData.set("ownerDiscount", String(quote?.ownerDiscount ?? quote?.ownerDiscountValue ?? 0));
    formData.set("ownerDiscountValue", String(quote?.ownerDiscountValue ?? 0));
    formData.set("ownerDiscountPercentage", String(quote?.ownerDiscountPercentage ?? 0));
    formData.set("multipleNightsDiscount", String(quote?.multipleNightsDiscount ?? quote?.multipleNightsDiscountValue ?? 0));
    formData.set("multipleNightsDiscountValue", String(quote?.multipleNightsDiscountValue ?? 0));
    formData.set("multipleNightsDiscountPercentage", String(quote?.multipleNightsDiscountPercentage ?? 0));
    formData.set("lastMinuteDiscount", String(quote?.lastMinuteDiscount ?? quote?.lastMinuteDiscountValue ?? 0));
    formData.set("lastMinuteDiscountValue", String(quote?.lastMinuteDiscountValue ?? 0));
    formData.set("lastMinuteDiscountPercentage", String(quote?.lastMinuteDiscountPercentage ?? 0));
    formData.set("lastMinuteDiscountThresholdDays", String(quote?.lastMinuteDiscountThresholdDays ?? ""));
    formData.set("couponDiscount", String(quote?.couponDiscount ?? quote?.couponDiscountValue ?? 0));
    formData.set("couponDiscountValue", String(quote?.couponDiscountValue ?? 0));
    formData.set("couponDiscountType", String(quote?.couponDiscountType ?? ""));
    formData.set("couponDiscountCode", String(quote?.couponDiscountCode ?? ""));
    formData.set("couponId", String(quote?.couponId ?? ""));
    formData.set("otaCommission", String(quote?.otaCommission ?? quote?.instafarmsCommission ?? 0));
    formData.set("instafarmsCommission", String(quote?.instafarmsCommission ?? 0));
    formData.set("netOwnerRevenue", String(quote?.netOwnerRevenue ?? quote?.ownerRevenue ?? 0));
    formData.set("ownerRevenue", String(quote?.ownerRevenue ?? 0));
    formData.set("tds", String(quote?.tds ?? 0));
    formData.set("gstAmount", String(quote?.gstAmount ?? quote?.totalGstCollected ?? 0));
    formData.set("totalGstCollected", String(quote?.totalGstCollected ?? 0));
    formData.set("amountPayableToOwnerAfterTDS", String(quote?.amountPayableToOwnerAfterTDS ?? 0));
    formData.set("bookingAmountWithDiscountBeforeGst", String(quote?.bookingAmountWithDiscountBeforeGst ?? 0));
    formData.set("daywiseBreakup", JSON.stringify(quote?.daywiseBreakup ?? []));
    formData.set("createPendingBooking", String(createPendingBooking));
    formData.set("sendPaymentLink", String(sendPaymentLink));
    formData.delete("deliveryChannels");
    paymentLinkChannels.forEach((channel) => formData.append("deliveryChannels", channel));
    formData.set("customMessageNote", paymentLinkNote);
    formData.set("paymentLinkEmail", paymentLinkEmail.trim());
    formData.set("paymentLinkWhatsappNumber", paymentLinkWhatsappNumber.trim());
    formData.set("paymentsPayload", JSON.stringify(hookData.payments));

    for (const key of Array.from(formData.keys())) {
      if (
        key.startsWith("payment-") ||
        key.startsWith("bankName-") ||
        key.startsWith("bankAccountNumber-") ||
        key.startsWith("bankAccountHolderName-") ||
        key.startsWith("bankIfsc-") ||
        key.startsWith("bankNickname-")
      ) {
        formData.delete(key);
      }
    }

    hookData.payments.forEach((p) => {
      formData.set(`payment-${p.id}`, p.paymentDate);
      formData.set(`payment-amount-${p.id}`, String(p.amount || 0));
      formData.set(`payment-paymentFor-${p.id}`, p.paymentFor || "FULL_PAYMENT");
      formData.set(`payment-receiverType-${p.id}`, p.receiverType || "PLATFORM");
      formData.set(`payment-paymentMethod-${p.id}`, p.paymentMethod || "CASH");
      formData.set(`payment-paymentInstrument-${p.id}`, p.paymentInstrument || "OTHERS");
      formData.set(`payment-paymentReference-${p.id}`, p.paymentReference || "");
      formData.set(`payment-paymentGateway-${p.id}`, p.paymentGateway || "");
      formData.set(`payment-gatewayPaymentId-${p.id}`, p.gatewayPaymentId || "");
      formData.set(`payment-gatewayFee-${p.id}`, String(p.gatewayFee || 0));
      formData.set(`bankName-${p.id}`, p.bankName || "");
      formData.set(`bankAccountHolderName-${p.id}`, p.bankAccountHolderName || "");
      formData.set(`bankAccountNumber-${p.id}`, p.bankAccountNumber || "");
      formData.set(`bankIfsc-${p.id}`, p.bankIfsc || "");
      formData.set(`bankNickname-${p.id}`, p.bankNickname || "");
    });

    return formData;
  };

  const handleCreateBooking = () => {
    const isPendingCreateFlow = paymentCollectionMode === "PAYMENT_LINK";
    if (isPendingCreateFlow) {
      setCreatedPendingBookingId(null);
      setCreatedPendingBookingDraftKey(null);
      setCreatedPendingBookingStatus(null);
      setCreatedPendingBookingStatusError(null);
      setCreatedPendingBookingLastCheckedAt(null);
      setCreatedPendingBookingPollCount(0);
    }
    const formData = buildBookingFormData({
      createPendingBooking: isPendingCreateFlow,
      sendPaymentLink: false,
    });
    if (!formData) {
      return;
    }

    startCreateTransition(() => {
      const promise = createBooking(formData).then((result) => {
        if (result.error) {
          throw new Error(result.error);
        }
        return result;
      });
      toast.promise(promise, {
        loading: isPendingCreateFlow ? "Saving pending booking..." : "Saving booking...",
        success: (result) => {
          const bookingId = result.data?.bookingId;
          const status = result.data?.status;
          console.log("[Admin Booking Create] result", { bookingId, status });

          if (isPendingCreateFlow && bookingId && status === "PENDING") {
            setCreatedPendingBookingId(bookingId);
            setCreatedPendingBookingDraftKey(currentBookingDraftKey);
            setCreatedPendingBookingStatus(status);
            setCreatedPendingBookingStatusError(null);
            setCreatedPendingBookingLastCheckedAt(new Date().toISOString());
            setCreatedPendingBookingPollCount(0);
            return "Pending booking created. You can send the website checkout link now.";
          }

          router.push("/admin/bookings");
          return result.success || "Booking created.";
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const handleSendLink = () => {
    if (!createdPendingBookingId) {
      toast.error("Create the booking first before sending the website checkout link");
      return;
    }

    console.log("[Admin Booking Send Link] using bookingId", {
      bookingId: createdPendingBookingId,
      draftMatches: createdPendingBookingDraftKey === currentBookingDraftKey,
    });

    if (createdPendingBookingDraftKey !== currentBookingDraftKey) {
      toast.error("Booking details changed after creation. Create the booking again before sending the link.");
      return;
    }

    if (paymentLinkError) {
      setActiveTab(1);
      tabsRef.current?.setActiveTab(1);
      toast.error(paymentLinkError);
      return;
    }

    startSendLinkTransition(() => {
      const promise = sendBookingPaymentLink({
        bookingId: createdPendingBookingId,
        brandId: selectedBrandId || undefined,
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
            result?.deliveryResults?.filter((item: { status: string }) => item.status === "sent").length ?? 0;
          const skippedCount =
            result?.deliveryResults?.filter((item: { status: string }) => item.status === "skipped").length ?? 0;
          const failedCount =
            result?.deliveryResults?.filter((item: { status: string }) => item.status === "failed").length ?? 0;

          return `Website checkout link sent: ${sentCount}, skipped: ${skippedCount}, failed: ${failedCount}.`;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  const loadPreparedPaymentPageUrl = async () => {
    if (!createdPendingBookingId) {
      throw new Error("Create the booking first before opening the website checkout");
    }

    if (createdPendingBookingDraftKey !== currentBookingDraftKey) {
      throw new Error("Booking details changed after creation. Create the booking again before opening the website checkout.");
    }

    const result = await prepareBookingPaymentPage({
      bookingId: createdPendingBookingId,
      brandId: selectedBrandId || undefined,
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

  const handleCopyLink = () => {
    if (!canSendCreatedBookingLink) {
      toast.error("Create the booking first before using the website checkout");
      return;
    }

    startPreparePaymentPageTransition(() => {
      const promise = loadPreparedPaymentPageUrl().then(async (checkoutUrl) => {
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
    if (!canSendCreatedBookingLink) {
      toast.error("Create the booking first before using the website checkout");
      return;
    }

    startPreparePaymentPageTransition(() => {
      const promise = loadPreparedPaymentPageUrl().then((checkoutUrl) => {
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

  const handleRefreshCreatedBookingStatus = () => {
    if (!hasCreatedPendingBookingForCurrentDraft) {
      toast.error("Create the pending booking first before checking status");
      return;
    }

    void refreshCreatedBookingStatus();
  };

  const handleOpenCreatedBooking = () => {
    if (!createdPendingBookingId) {
      toast.error("Create the booking first before opening it");
      return;
    }

    router.push(`/admin/bookings/${createdPendingBookingId}`);
  };

  const fetchBlockedDates = async (
    propertyId: string,
    brandId?: string,
    appType?: string
  ) => {
    if (!propertyId) return;

    hookData.setIsLoadingAvailability(true);
    try {
      const result = await getPropertyAvailability(propertyId, brandId, appType);
      if (result.error) {
        console.error("Failed to fetch availability:", result.error);
        return;
      }

      if (result.success) {
        const allBlockedDates: Date[] = [];
        const inBlockedDates: Date[] = [];
        const outBlockedDates: Date[] = [];

        result.success.blockedDates.forEach((dateStr: string) => {
          allBlockedDates.push(new Date(`${dateStr}T00:00:00`));
        });

        result.success.bookedRanges.forEach((range: { checkinDate: string; checkoutDate: string }) => {
          const start = new Date(`${range.checkinDate}T00:00:00`);
          const end = new Date(`${range.checkoutDate}T00:00:00`);

          inBlockedDates.push(start);
          outBlockedDates.push(end);

          const startTime = start.getTime();
          const endTime = end.getTime();
          const oneDay = 24 * 60 * 60 * 1000;

          for (let time = startTime + oneDay; time < endTime; time += oneDay) {
            allBlockedDates.push(new Date(time));
          }
        });

        hookData.setBlockedDates(allBlockedDates);
        hookData.setCheckinBlockedDates(inBlockedDates);
        hookData.setCheckoutBlockedDates(outBlockedDates);
        if (result.success.minNightsInfo) {
          setMinNightsInfo(result.success.minNightsInfo as MinNightsInfo);
        }
      }
    } catch (error) {
      console.error("Failed to fetch blocked dates:", error);
      captureError(error);
    } finally {
      hookData.setIsLoadingAvailability(false);
    }
  };

  const moveToPayments = () => {
    const detailsError = hookData.validateBookingDetails();
    if (detailsError) {
      toast.error(detailsError);
      return;
    }

    if (sourceSelectionError) {
      toast.error(sourceSelectionError);
      return;
    }

    setActiveTab(1);
    tabsRef.current?.setActiveTab(1);
  };

  const fetchPropertyPricing = async (propertyId: string, brandName: string) => {
    if (!propertyId || !brandName) {
      setCommercialPricing(null);
      setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
      return;
    }

    setIsLoadingPricing(true);
    try {
      const result = await fetchPropertyFullData(propertyId, {
        includeGallery: false,
        appType: selectedBrandAppType,
      });
      if (result.error || !result.data) {
        console.error("Failed to fetch property pricing:", result.error || "Missing property data");
        setCommercialPricing(null);
        setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
        return;
      }

      const resolvedCommercialPricing = resolveCommercialPricing(result.data, brandName);
      setCommercialPricing(resolvedCommercialPricing);
      const normalized = normalizePropertyFullData(result.data);
      const property = normalized.property as Record<string, unknown>;
      const detail = (normalized.tabs.detail ?? {}) as Record<string, unknown>;
      const propertyName =
        (typeof property.propertyName === "string" && property.propertyName) ||
        (typeof property.name === "string" && property.name) ||
        (typeof property.heading === "string" && property.heading) ||
        null;
      const propertyCode =
        (typeof property.propertyCode === "string" && property.propertyCode) ||
        (typeof property.propertyCodeName === "string" && property.propertyCodeName) ||
        null;
      setPropertySummary({
        name: propertyName,
        code: propertyCode,
        baseGuestCount: asNumber(detail.baseGuestCount),
        maxGuestCount: asNumber(detail.maxGuestCount),
      });
    } catch (error) {
      console.error("Failed to fetch property pricing:", error);
      captureError(error);
      setCommercialPricing(null);
      setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const clearBookingSelections = () => {
    setActiveTab(0);
    tabsRef.current?.setActiveTab(0);
    hookData.setEntityId(null);
    hookData.setCustomerId(null);
    hookData.setCheckinDate(null);
    hookData.setCheckoutDate(null);
    hookData.setAdultCount(1);
    hookData.setChildrenCount(0);
    hookData.setInfantCount(0);
    hookData.setBookingRemarks("");
    hookData.setSpecialRequests("");
    hookData.setPayments([]);
    hookData.setBlockedDates([]);
    hookData.setCheckinBlockedDates([]);
    hookData.setCheckoutBlockedDates([]);
    setCommercialPricing(null);
    setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
    setQuote(null);
    setQuoteError(null);
    setCouponInput("");
    setAppliedCouponCode(null);
    setCouponFeedback(null);
    setPaymentCollectionMode("CASH");
    setBookingExecutionType("OFFLINE");
    setSourceCategory("DIRECT_BOOKING");
    setReservationContext(EMPTY_RESERVATION_CONTEXT);
    setCommissionBookingSourceId("");
  };

  useEffect(() => {
    hookData.setBookingType("Offline");
    // initialize once for create flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCommissionSources = async () => {
      setIsLoadingCommissionSources(true);
      try {
        const result = await getCommissionBookingSources({
          page: 1,
          limit: 100,
          status: "ACTIVE",
        });

        if (!isMounted) return;
        setCommissionBookingSources(result.data ?? []);
      } catch (error) {
        console.error("Failed to fetch commission booking sources:", error);
        captureError(error);
        if (isMounted) {
          setCommissionBookingSources([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCommissionSources(false);
        }
      }
    };

    void loadCommissionSources();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clears the form when the admin switches brand. It must not run on mount:
  // that would wipe initialReservationSource before anything is displayed.
  const brandChangeIsInitial = useRef(true);
  useEffect(() => {
    if (brandChangeIsInitial.current) {
      brandChangeIsInitial.current = false;
      return;
    }
    setActiveTab(0);
    tabsRef.current?.setActiveTab(0);
    hookData.setEntityId(null);
    hookData.setCustomerId(null);
    hookData.setCheckinDate(null);
    hookData.setCheckoutDate(null);
    hookData.setBlockedDates([]);
    hookData.setCheckinBlockedDates([]);
    hookData.setCheckoutBlockedDates([]);
    setCommercialPricing(null);
    setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
    setQuote(null);
    setQuoteError(null);
    setCouponInput("");
    setAppliedCouponCode(null);
    setCouponFeedback(null);
    setPaymentCollectionMode("CASH");
    setBookingExecutionType("OFFLINE");
    setSourceCategory("DIRECT_BOOKING");
    setReservationContext(EMPTY_RESERVATION_CONTEXT);
    setCommissionBookingSourceId("");
  }, [selectedBrandId]);

  useEffect(() => {
    if (hookData.entityId && selectedBrandId) {
      fetchBlockedDates(
        hookData.entityId,
        selectedBrandId || undefined,
        selectedBrandAppType
      );
      fetchPropertyPricing(hookData.entityId, selectedBrandName);
      return;
    }

    setCommercialPricing(null);
    setPropertySummary({ name: null, code: null, baseGuestCount: null, maxGuestCount: null });
  }, [hookData.entityId, selectedBrandId, selectedBrandName, selectedBrandAppType]);

  useEffect(() => {
    if (
      !selectedBrandId ||
      !hookData.entityId ||
      !hookData.checkinDate ||
      !hookData.checkoutDate ||
      !sourceCategory ||
      !commissionBookingSourceId
    ) {
      quoteRequestSeqRef.current += 1;
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchQuote();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    selectedBrandId,
    hookData.entityId,
    hookData.checkinDate,
    hookData.checkoutDate,
    hookData.adultCount,
    hookData.childrenCount,
    hookData.infantCount,
    hookData.floatingAdultCount,
    hookData.floatingChildCount,
    hookData.floatingInfantCount,
    bookingExecutionType,
    sourceCategory,
    commissionBookingSourceId,
    appliedCouponCode,
    selectedBrandAppType,
    isQuoteInclusiveOfGst,
  ]);

  return (
    <form id="bookingForm" className="flex w-full flex-col gap-6">
      <Tabs
        ref={tabsRef}
        className="text-black dark:text-white"
        onActiveTabChange={(tab) => setActiveTab(typeof tab === "number" ? tab : 0)}
      >
        <TabItem active={activeTab === 0} title="Detail" className="align-center flex flex-col">
          <div className="mx-auto w-full max-w-[1200px] px-4">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.34),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#134e4a_52%,_#172554_100%)] p-6 text-white shadow-xl">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] lg:items-end">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100/80">
                      Reservation Desk
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                      Create reservation
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100/80">
                      Build the reservation context, price the stay, collect manually, or prepare a customer website checkout from one guided workspace.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <BookingHeroTile label="Brand" value={selectedBrandName || "Not selected"} />
                    <BookingHeroTile label="Collection" value={paymentCollectionMode === "PAYMENT_LINK" ? "Website Checkout" : "Cash / Manual"} />
                    <BookingHeroTile label="Stay" value={stayDatesLabel} />
                    <BookingHeroTile
                      label="Guests"
                      value={`${totalGuests} guest${totalGuests === 1 ? "" : "s"}`}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Step 1
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    Basic Information
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Choose the reservation brand, property, guest, and source before selecting stay dates.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-3">
                  <LabelWrapper label="Brand *">
                    <Select
                      id="brandId"
                      name="brandId"
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      required
                    >
                      <option value="">Select brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </Select>
                  </LabelWrapper>

                  <LabelWrapper label="Property *">
                    <PropertySelector
                      propertyId={hookData.entityId}
                      update={hookData.setEntityId}
                      readOnly={!selectedBrandId}
                      brandId={selectedBrandId}
                    />
                  </LabelWrapper>

                  <LabelWrapper label="Customer *">
                    <CustomerSelector
                      customerId={hookData.customerId}
                      update={hookData.setCustomerId}
                      readOnly={!selectedBrandId}
                      brandName={
                        selectedBrandName.toLowerCase().includes("mago")
                          ? CUSTOMER_BRANDS.MAGO
                          : selectedBrandName
                            ? CUSTOMER_BRANDS.INSTAFARMS
                            : undefined
                      }
                    />
                  </LabelWrapper>

                  <LabelWrapper label="Reservation Type *">
                    <Select
                      id="bookingExecutionType"
                      name="bookingExecutionType"
                      value={bookingExecutionType}
                      onChange={(event) =>
                        setBookingExecutionType(
                          event.target.value as BookingExecutionType
                        )
                      }
                      required
                    >
                      {BOOKING_EXECUTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </LabelWrapper>

                  <LabelWrapper label="Reservation Source *">
                    <Select
                      id="reservationSourceKind"
                      value={reservationContext.sourceKind}
                      onChange={(event) =>
                        selectReservationSource(
                          event.target.value as ReservationSourceKind,
                        )
                      }
                      required
                    >
                      {RESERVATION_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </LabelWrapper>

                  <LabelWrapper label="Source Channel *">
                    <Select
                      id="commissionBookingSourceId"
                      name="commissionBookingSourceId"
                      value={commissionBookingSourceId}
                      onChange={(event) =>
                        setCommissionBookingSourceId(event.target.value)
                      }
                      disabled={isLoadingCommissionSources}
                      required
                    >
                      <option value="">
                        {isLoadingCommissionSources
                          ? "Loading sources..."
                          : "Select source channel"}
                      </option>
                      {commissionBookingSources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.sourceName}
                        </option>
                      ))}
                    </Select>
                  </LabelWrapper>

                  {reservationContext.sourceKind === "ASSISTED" ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 xl:col-span-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                        Assisted reservation details
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <LabelWrapper label="Purpose / event *">
                          <TextInput
                            value={reservationContext.assistedPurpose}
                            onChange={(event) =>
                              updateReservationContext("assistedPurpose", event.target.value)
                            }
                            placeholder="Event, custom request, or assisted sale"
                            required
                          />
                        </LabelWrapper>
                        <LabelWrapper label="Request details">
                          <TextInput
                            value={reservationContext.assistedRequestDetails}
                            onChange={(event) =>
                              updateReservationContext("assistedRequestDetails", event.target.value)
                            }
                            placeholder="Any fulfillment context"
                          />
                        </LabelWrapper>
                      </div>
                    </div>
                  ) : null}

                  {reservationContext.sourceKind === "OTA" ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 xl:col-span-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                        OTA collection details
                      </p>
                      <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                        OTA collection is recorded separately from the InstaFarms commission calculated in the reservation quote.
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <LabelWrapper label="External confirmation / reference *">
                          <TextInput
                            value={reservationContext.externalReference}
                            onChange={(event) =>
                              updateReservationContext("externalReference", event.target.value)
                            }
                            placeholder="Airbnb confirmation number"
                            required
                          />
                        </LabelWrapper>
                        <LabelWrapper label="OTA booking amount *">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaGrossBookingAmount}
                            onChange={(event) =>
                              updateReservationContext("otaGrossBookingAmount", event.target.value)
                            }
                            placeholder="0.00"
                            required
                          />
                        </LabelWrapper>
                        <LabelWrapper label="Booking GST">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaBookingGstAmount}
                            onChange={(event) =>
                              updateReservationContext("otaBookingGstAmount", event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </LabelWrapper>
                        <LabelWrapper label="OTA commission">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaCommissionAmount}
                            onChange={(event) =>
                              updateReservationContext("otaCommissionAmount", event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </LabelWrapper>
                        <LabelWrapper label="OTA commission GST">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaCommissionGstAmount}
                            onChange={(event) =>
                              updateReservationContext("otaCommissionGstAmount", event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </LabelWrapper>
                        <LabelWrapper label="Cleaning charge">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaCleaningCharge}
                            onChange={(event) =>
                              updateReservationContext("otaCleaningCharge", event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </LabelWrapper>
                        <LabelWrapper label="Other charge">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationContext.otaOtherCharge}
                            onChange={(event) =>
                              updateReservationContext("otaOtherCharge", event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </LabelWrapper>
                        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm dark:border-indigo-900 dark:bg-slate-900">
                          <p className="text-xs font-medium text-slate-500">Net channel collection</p>
                          <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(otaNetChannelCollection)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {reservationContext.sourceKind === "CORPORATE" ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 xl:col-span-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                        Corporate billing details
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <LabelWrapper label="Company name *">
                          <TextInput value={reservationContext.corporateCompanyName} onChange={(event) => updateReservationContext("corporateCompanyName", event.target.value)} required />
                        </LabelWrapper>
                        <LabelWrapper label="GST number">
                          <TextInput value={reservationContext.corporateGstNumber} onChange={(event) => updateReservationContext("corporateGstNumber", event.target.value)} />
                        </LabelWrapper>
                        <LabelWrapper label="Billing contact *">
                          <TextInput value={reservationContext.corporateBillingContact} onChange={(event) => updateReservationContext("corporateBillingContact", event.target.value)} required />
                        </LabelWrapper>
                        <LabelWrapper label="Invoice to *">
                          <TextInput value={reservationContext.corporateInvoiceTo} onChange={(event) => updateReservationContext("corporateInvoiceTo", event.target.value)} required />
                        </LabelWrapper>
                        <LabelWrapper label="PO number">
                          <TextInput value={reservationContext.corporatePurchaseOrderNumber} onChange={(event) => updateReservationContext("corporatePurchaseOrderNumber", event.target.value)} />
                        </LabelWrapper>
                        <LabelWrapper label="Credit period (days)">
                          <TextInput type="number" min="0" max="365" step="1" value={reservationContext.corporateCreditPeriodDays} onChange={(event) => updateReservationContext("corporateCreditPeriodDays", event.target.value)} placeholder="0" />
                        </LabelWrapper>
                      </div>
                    </div>
                  ) : null}

                  {reservationContext.sourceKind === "TRAVEL_AGENT" ? (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 xl:col-span-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                        Travel-agent settlement details
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <LabelWrapper label="Agent name *">
                          <TextInput value={reservationContext.travelAgentName} onChange={(event) => updateReservationContext("travelAgentName", event.target.value)} required />
                        </LabelWrapper>
                        <LabelWrapper label="Voucher number">
                          <TextInput value={reservationContext.travelAgentVoucherNumber} onChange={(event) => updateReservationContext("travelAgentVoucherNumber", event.target.value)} />
                        </LabelWrapper>
                        <LabelWrapper label="Commission terms">
                          <Textarea rows={3} value={reservationContext.travelAgentCommissionTerms} onChange={(event) => updateReservationContext("travelAgentCommissionTerms", event.target.value)} placeholder="Commission agreement or rate" />
                        </LabelWrapper>
                        <LabelWrapper label="Settlement terms">
                          <Textarea rows={3} value={reservationContext.travelAgentSettlementTerms} onChange={(event) => updateReservationContext("travelAgentSettlementTerms", event.target.value)} placeholder="Settlement schedule or conditions" />
                        </LabelWrapper>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Step 2
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    Stay Dates
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Pick check-in and check-out with availability and nightly pricing visible in one place.
                  </p>
                </div>
                <div className="p-6">
                  <BookingStayCalendar
                    checkinDate={hookData.checkinDate}
                    checkoutDate={hookData.checkoutDate}
                    blockedDates={hookData.blockedDates}
                    checkinBlockedDates={hookData.checkinBlockedDates}
                    disabled={!hookData.entityId || hookData.isLoadingAvailability}
                    isRefreshing={hookData.isLoadingAvailability || isLoadingPricing}
                    commercialPricing={commercialPricing}
                    specialDatePriceMap={specialDatePriceMap}
                    minNightsInfo={minNightsInfo}
                    onChange={(checkin, checkout) => {
                      hookData.setCheckinDate(checkin);
                      hookData.setCheckoutDate(checkout);
                    }}
                    onClear={() => {
                      hookData.setCheckinDate(null);
                      hookData.setCheckoutDate(null);
                    }}
                    onRefresh={
                      hookData.entityId
                        ? () => {
                            fetchBlockedDates(hookData.entityId!, selectedBrandId || undefined);
                            if (selectedBrandName) {
                              fetchPropertyPricing(hookData.entityId!, selectedBrandName);
                            }
                          }
                        : undefined
                    }
                  />

                  {!hookData.entityId ? (
                    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      Select a property first to unlock the stay-date calendar.
                    </p>
                  ) : (
                    <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      Calendar prices show nightly base rates for the selected property. Special dates override weekday pricing automatically.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Step 3
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    Guest Information
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Capture the staying guest mix used by pricing and property capacity checks.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
                  <LabelWrapper label="Adults">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      id="adultCount"
                      name="adultCount"
                      value={hookData.adultCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const nextAdults = Number.isNaN(val) ? 1 : Math.max(1, val);
                        const maxAdults =
                          maxGuestLimit === null ? Number.POSITIVE_INFINITY : Math.max(1, maxGuestLimit - hookData.childrenCount);
                        hookData.setAdultCount(Math.min(nextAdults, maxAdults));
                      }}
                      min="1"
                      max={maxGuestLimit === null ? undefined : Math.max(1, maxGuestLimit - hookData.childrenCount)}
                      required
                    />
                  </LabelWrapper>
                  <LabelWrapper label="Children">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      id="childrenCount"
                      name="childrenCount"
                      value={hookData.childrenCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const nextChildren = Number.isNaN(val) ? 0 : Math.max(0, val);
                        const maxChildren =
                          maxGuestLimit === null ? Number.POSITIVE_INFINITY : Math.max(0, maxGuestLimit - hookData.adultCount);
                        hookData.setChildrenCount(Math.min(nextChildren, maxChildren));
                      }}
                      min="0"
                      max={maxGuestLimit === null ? undefined : Math.max(0, maxGuestLimit - hookData.adultCount)}
                    />
                  </LabelWrapper>
                  <LabelWrapper label="Infants">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      id="infantCount"
                      name="infantCount"
                      value={hookData.infantCount}
                      onChange={(e) => hookData.setInfantCount(parseInt(e.target.value, 10) || 0)}
                      min="0"
                    />
                  </LabelWrapper>
                </div>
                <div className="mx-6 mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-slate-900 dark:text-white">
                      Total: {hookData.adultCount + hookData.childrenCount + hookData.infantCount}
                    </span>
                    {maxGuestLimit !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        Max {maxGuestLimit}
                      </span>
                    ) : null}
                    {includedGuestLimit !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        Covered till {includedGuestLimit}
                      </span>
                    ) : null}
                    {remainingGuestCapacity !== null ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        {remainingGuestCapacity} left
                      </span>
                    ) : null}
                  </div>
                  {extraGuestCount > 0 ? (
                    <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Extra charges apply for{" "}
                      {[
                        extraAdultGuests > 0
                          ? `${extraAdultGuests} adult${extraAdultGuests === 1 ? "" : "s"}`
                          : null,
                        extraChildGuests > 0
                          ? `${extraChildGuests} child${extraChildGuests === 1 ? "" : "ren"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" and ")}.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Up to {includedGuestLimit ?? "the covered limit"} guests are covered without extra charges. Infants are tracked separately.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Step 4
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                    Guest Notes and Internal Notes
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Keep guest-facing requests separate from internal operational context.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                  <LabelWrapper label="Guest Notes / Special Requests">
                    <Textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={hookData.specialRequests}
                      onChange={(e) => hookData.setSpecialRequests(e.target.value)}
                      rows={3}
                      placeholder="Guest preferences, arrival requests, or any stay-specific need..."
                    />
                  </LabelWrapper>
                  <LabelWrapper label="Internal Notes">
                    <Textarea
                      id="bookingRemarks"
                      name="bookingRemarks"
                      value={hookData.bookingRemarks}
                      onChange={(e) => hookData.setBookingRemarks(e.target.value)}
                      rows={3}
                      placeholder="Operational context for the reservation team..."
                    />
                  </LabelWrapper>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-row justify-end gap-3 max-w-[1200px] mx-auto px-4 sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
            <MyButton
              color="light"
              disabled={!hasSelectionsToClear}
              onClick={clearBookingSelections}
            >
              Clear Selection
            </MyButton>
            {canMoveToPayments ? (
              <MyButton onClick={moveToPayments}>
                Move to Payment
              </MyButton>
            ) : null}
          </div>
        </TabItem>

        <TabItem active={activeTab === 1} title="Payments" className="align-center flex flex-col">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-5">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_32%,#f8fafc_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.98)_45%,rgba(17,24,39,0.98)_100%)]">
              <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)] lg:p-8">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-300">
                        Payment Desk
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Reservation Amount Summary
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                        Review the stay total, collect the amount, and finish this reservation from one clean checkout panel.
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      {selectedBrandName || "Brand pending"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/40">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                          Selected Property
                        </p>
                        <p className="mt-3 truncate text-xl font-semibold text-slate-900 dark:text-white">
                          {propertyDisplayName}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {propertyDisplayCode ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {propertyDisplayCode}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                            Admin Panel
                          </span>
                        </div>
                      </div>
                      <div className="grid min-w-[220px] grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Stay</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{summaryStayLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Occupancy</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                            {nightsCount} night{nightsCount === 1 ? "" : "s"} • {totalGuests} guest{totalGuests === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/35">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Amount Payable
                    </p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      {isLoadingQuote ? "..." : formatCurrency(totalQuotedAmount)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Full booking amount including pricing adjustments.
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.95))] p-5 shadow-sm dark:border-emerald-800/60 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(2,44,34,0.55))]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                      Amount Paid
                    </p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
                      {formatCurrency(amountPaid)}
                    </p>
                    <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                      Cash entries and confirmed QR collections.
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.95))] p-5 shadow-sm dark:border-amber-800/60 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.2),rgba(69,26,3,0.55))]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                      Remaining Due
                    </p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-amber-900 dark:text-amber-100">
                      {formatCurrency(remainingAmount)}
                    </p>
                    <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-200/80">
                      Balance left to collect before checkout is complete.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/70 px-6 py-6 dark:border-slate-700/70 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/30">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                            Coupon
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Apply a coupon explicitly and refresh the server quote.
                          </p>
                        </div>
                        {appliedCouponCode ? (
                          <button
                            type="button"
                            onClick={() => void removeCoupon()}
                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
                          >
                            Remove Coupon
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 md:flex-row">
                        <TextInput
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Enter coupon code"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => void applyCoupon()}
                          disabled={isLoadingQuote || !couponInput.trim()}
                        >
                          {appliedCouponCode ? "Reapply Coupon" : "Apply Coupon"}
                        </Button>
                      </div>
                      {couponFeedback ? (
                        <div
                          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                            couponFeedback.type === "success"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300"
                          }`}
                        >
                          {couponFeedback.message}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/30">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                            GST Calculation
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Is the base rate inclusive of GST?
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={isQuoteInclusiveOfGst}
                          onChange={(checked) => setIsQuoteInclusiveOfGst(checked)}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/30">
                      <button
                        type="button"
                        onClick={() => setIsNightlyPricingOpen((current) => !current)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                            Nightly Stay Pricing
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Special dates are already included in this day-wise breakdown.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {quote?.daywiseBreakup?.length ?? 0} night rows
                          </div>
                          <span className="text-lg font-semibold text-slate-500 dark:text-slate-300">
                            {isNightlyPricingOpen ? "−" : "+"}
                          </span>
                        </div>
                      </button>
                      {isNightlyPricingOpen ? (
                        <div className="mt-4 space-y-3">
                          {(quote?.daywiseBreakup ?? []).map((day, index) => {
                            const bookingDay = day as Record<string, unknown>;
                            const stayDate = typeof bookingDay.date === "string" ? bookingDay.date : null;
                            const dayLabel = typeof bookingDay.day === "string" ? bookingDay.day : `Night ${index + 1}`;
                            const subtotal = asNumber(bookingDay.bookingAmountWithoutGstBeforeDiscounts) ?? 0;
                            const discount = asNumber(bookingDay.discountForTheDay) ?? 0;
                            const gst = asNumber(bookingDay.gstAmount) ?? 0;
                            const finalDayTotal = asNumber(bookingDay.bookingAmountAfterDiscountWithGst) ?? 0;

                            return (
                              <div
                                key={`${stayDate ?? index}`}
                                className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {dayLabel}
                                      {stayDate ? ` • ${formatDateFromIso(stayDate)}` : ""}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      Base {formatCurrency(asNumber(bookingDay.baseRentalWithoutGst) ?? 0)}
                                      {" • "}
                                      Extra guests{" "}
                                      {formatCurrency(
                                        (asNumber(bookingDay.extraAdultGuestChargesWithoutGst) ?? 0) +
                                          (asNumber(bookingDay.extraChildGuestChargesWithoutGst) ?? 0) +
                                          (asNumber(bookingDay.floatingGuestChargeWithoutGst) ?? 0)
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                      Final Night Total
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                      {formatCurrency(finalDayTotal)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-3 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-950/40">
                                    Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                  </div>
                                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-950/40">
                                    Discounts: <span className="font-semibold">-{formatCurrency(discount)}</span>
                                  </div>
                                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-950/40">
                                    GST: <span className="font-semibold">{formatCurrency(gst)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/30">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Checkout Breakdown
                      </p>
                      <div className="mt-4 space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/45">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            1. Booking Price
                          </p>
                          <div className="mt-3 space-y-2">
                            {quoteBookingPriceRows.length > 0 ? quoteBookingPriceRows.map((item) => (
                              <div key={item.key} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                              </div>
                            )) : (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-300">Nightly stay price</span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(quoteTotals?.subtotalBeforeDiscount ?? quote?.bookingAmountWithGstBeforeDiscounts ?? 0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/45">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            2. Charges
                          </p>
                          <div className="mt-3 space-y-2">
                            {quoteChargeRows.length > 0 ? quoteChargeRows.map((item) => (
                              <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-600 dark:text-slate-300">
                                  {item.label}
                                  {formatChargeMeta(item, nightsCount) ? (
                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                      {formatChargeMeta(item, nightsCount)}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                              </div>
                            )) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">No additional charges apply.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/65 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                            3. Discounts
                          </p>
                          <div className="mt-3 space-y-2">
                            {quoteDiscountRows.length > 0 ? quoteDiscountRows.map((item) => (
                              <div key={item.key} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700 dark:text-slate-200">
                                  {item.label}{item.code ? ` (${item.code})` : ""}
                                </span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">-{formatCurrency(item.amount)}</span>
                              </div>
                            )) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">No discount is applied.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50/65 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                            4. Taxes
                          </p>
                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-slate-700 dark:text-slate-200">GST</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(quoteTotals?.gstAmount ?? quote?.totalGstCollected ?? 0)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            5. Summary
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-300">Subtotal before discounts</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(quoteTotals?.subtotalBeforeDiscount ?? quote?.bookingAmountWithGstBeforeDiscounts ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-300">Subtotal after discounts</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(quoteTotals?.subtotalAfterDiscountBeforeGst ?? quote?.bookingAmountWithDiscountBeforeGst ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white dark:bg-slate-100 dark:text-slate-900">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Final Amount Payable</span>
                            <span className="text-xl font-semibold">
                              {formatCurrency(quoteTotals?.finalAmount ?? totalQuotedAmount)}
                            </span>
                          </div>
                        </div>
                        {quote?.lastMinuteDiscountValue ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                            Last Minute Discount applied
                            {quote.lastMinuteDiscountThresholdDays
                              ? ` within ${quote.lastMinuteDiscountThresholdDays} day${quote.lastMinuteDiscountThresholdDays === 1 ? "" : "s"} of check-in`
                              : ""}.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {quoteError ? (
                <div className="mx-6 mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 lg:mx-8">
                  {quoteError}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Step 1
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                  Payment Method
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Choose whether this assisted reservation is collected manually or through a customer website checkout.
                </p>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentCollectionMode("CASH")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    paymentCollectionMode === "CASH"
                      ? "border-teal-300 bg-teal-50 shadow-sm ring-2 ring-teal-100 dark:border-teal-700 dark:bg-teal-950/40 dark:ring-teal-900/60"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Cash / Manual Entry</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Record cash or manually received online payments.
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {paymentCollectionMode === "CASH" ? "Selected" : "Manual collection"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentCollectionMode("PAYMENT_LINK")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    paymentCollectionMode === "PAYMENT_LINK"
                      ? "border-teal-300 bg-teal-50 shadow-sm ring-2 ring-teal-100 dark:border-teal-700 dark:bg-teal-950/40 dark:ring-teal-900/60"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Website Checkout</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Create a pending booking first, then send, copy, or open the 10-minute website checkout.
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {paymentCollectionMode === "PAYMENT_LINK" ? "Selected" : "Customer payment"}
                  </p>
                </button>
              </div>
            </div>

            {paymentCollectionMode === "PAYMENT_LINK" ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Step 2
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Website Checkout</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Create the booking first. Once it is saved in pending state, you can send the website checkout link, copy it, or open it directly from here.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      Remaining to collect: <strong>{formatCurrency(remainingAmount)}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={paymentLinkChannels.includes("email")}
                      onChange={(event) => {
                        setPaymentLinkChannels((current) =>
                          event.target.checked
                            ? ([...new Set([...current, "email"])] as typeof current)
                            : current.filter((item) => item !== "email")
                        );
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-white">Email</span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        Send the website checkout link to the customer email if it is available.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={paymentLinkChannels.includes("whatsapp")}
                      onChange={(event) => {
                        setPaymentLinkChannels((current) =>
                          event.target.checked
                            ? ([...new Set([...current, "whatsapp"])] as typeof current)
                            : current.filter((item) => item !== "whatsapp")
                        );
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-white">WhatsApp</span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        Send the same link on WhatsApp if the customer number is available.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Override email
                    </label>
                    <TextInput
                      type="email"
                      value={paymentLinkEmail}
                      onChange={(event) => setPaymentLinkEmail(event.target.value)}
                      placeholder="Leave blank to use customer email"
                      color={
                        paymentLinkChannels.includes("email") &&
                        paymentLinkEmail.trim().length > 0 &&
                        !PAYMENT_LINK_EMAIL_REGEX.test(paymentLinkEmail.trim())
                          ? "failure"
                          : undefined
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      If filled, email goes here instead of the customer profile email.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Override WhatsApp number
                    </label>
                    <TextInput
                      type="tel"
                      value={paymentLinkWhatsappNumber}
                      onChange={(event) => setPaymentLinkWhatsappNumber(event.target.value)}
                      placeholder="Leave blank to use customer number"
                      color={
                        paymentLinkChannels.includes("whatsapp") &&
                        paymentLinkWhatsappNumber.trim().length > 0 &&
                        !PAYMENT_LINK_PHONE_REGEX.test(paymentLinkWhatsappNumber.trim())
                          ? "failure"
                          : undefined
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      If filled, WhatsApp goes here instead of the customer mobile number.
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Optional email note
                  </label>
                  <textarea
                    value={paymentLinkNote}
                    onChange={(event) => setPaymentLinkNote(event.target.value)}
                    rows={4}
                    placeholder="Add any short note to include in the email with the link."
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    This note is only included in email delivery, not WhatsApp.
                  </p>
                </div>

                {paymentLinkError ? (
                  <div className="mx-6 mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {paymentLinkError}
                  </div>
                ) : (
                  <div className="mx-6 mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    Sending the link is a separate step. Delivery failures on one selected channel will not affect the saved booking.
                  </div>
                )}

                {createdPendingBookingId && createdPendingBookingDraftKey === currentBookingDraftKey ? (
                  <div
                    className={`mx-6 mb-6 rounded-2xl px-4 py-4 text-sm ${
                      isCreatedPendingBookingConfirmed
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold">
                          {isCreatedPendingBookingConfirmed
                            ? "Booking confirmed successfully."
                            : "Pending booking created successfully."}
                        </div>
                        <div className="mt-1">
                          {isCreatedPendingBookingConfirmed
                            ? "Payment is complete and this booking is now in the normal confirmed flow."
                            : "You can now copy the website checkout link, open it directly, or send it to the guest."}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isCreatedPendingBookingConfirmed ? (
                          <MyButton type="button" onClick={handleOpenCreatedBooking}>
                            Open Booking
                          </MyButton>
                        ) : (
                          <>
                            <MyButton
                              type="button"
                              color="light"
                              loading={isPreparingPaymentPage}
                              onClick={handleCopyLink}
                              disabled={!canSendCreatedBookingLink || isCreatingBooking || isSendingLink}
                            >
                              Copy Link
                            </MyButton>
                            <MyButton
                              type="button"
                              color="light"
                              loading={isPreparingPaymentPage}
                              onClick={handleOpenPaymentPage}
                              disabled={!canSendCreatedBookingLink || isCreatingBooking || isSendingLink}
                            >
                              Open Website Checkout
                            </MyButton>
                            <MyButton
                              type="button"
                              loading={isSendingLink}
                              onClick={handleSendLink}
                              disabled={!canSendCreatedBookingLink || isCreatingBooking || isPreparingPaymentPage}
                            >
                              Send Link
                            </MyButton>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mx-6 mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Live booking status</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Create the pending booking, then track here when guest payment changes it to confirmed.
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        isCreatedPendingBookingConfirmed
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                      }`}
                    >
                      {isCreatedPendingBookingConfirmed ? (
                        <>Booking status: <strong>Confirmed</strong></>
                      ) : (
                        <>Pending to collect: <strong>{formatCurrency(remainingAmount)}</strong></>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
                      <p className="font-medium text-slate-900 dark:text-white">Booking state</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{createdPendingBookingStatusTone}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
                      <p className="font-medium text-slate-900 dark:text-white">Manual payment entry</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">Skipped for this flow</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
                      <p className="font-medium text-slate-900 dark:text-white">Last checked</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        {createdPendingBookingLastCheckedAt
                          ? new Date(createdPendingBookingLastCheckedAt).toLocaleString("en-IN")
                          : "Waiting for the first booking status check"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasCreatedPendingBookingForCurrentDraft && !isCreatedPendingBookingConfirmed ? (
                      <MyButton
                        type="button"
                        color="light"
                        onClick={handleRefreshCreatedBookingStatus}
                        loading={isRefreshingCreatedBookingStatus}
                        disabled={isCreatingBooking || isSendingLink || isPreparingPaymentPage}
                      >
                        Refresh Status
                      </MyButton>
                    ) : null}
                    {isCreatedPendingBookingConfirmed ? (
                      <MyButton type="button" onClick={handleOpenCreatedBooking}>
                        Open Booking
                      </MyButton>
                    ) : null}
                  </div>

                  {createdPendingBookingStatusError ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      {createdPendingBookingStatusError}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {paymentCollectionMode !== "PAYMENT_LINK" ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Step 2
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Payment Details</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Add recorded payments here. Partial payment is allowed and the remaining due stays visible above. Use one collection party for the booking: Mago creates the owner wallet settlement; owner-collected payments do not.
                    </p>
                  </div>
                  {!hasAnyPayment ? (
                    <Button type="button" onClick={hookData.addPayment}>
                      Add First Payment
                    </Button>
                  ) : null}
                </div>

                <div className="p-6">
                  {hookData.payments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      No payments added yet. Record a cash payment or another manual payment to continue.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full min-w-[980px] border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                            <th className="p-3 text-left">Payment Date</th>
                            <th className="p-3">Collected by</th>
                            <th className="p-3">Payment For</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Payment Method</th>
                            <th className="p-3">Instrument</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Details</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hookData.payments.map((p, index) => (
                            (() => {
                              const otherPaymentsTotal = hookData.payments.reduce(
                                (sum, payment) => sum + (payment.id === p.id ? 0 : Math.max(0, Number(payment.amount || 0))),
                                0
                              );
                              const suggestedFullPaymentAmount = Math.max(0, totalQuotedAmount - otherPaymentsTotal);

                              return (
                            <PaymentRow
                              payment={p}
                              update={hookData.updatePayment}
                              key={p.id}
                              showPlusButton={hookData.payments.length === index + 1}
                              addPayment={hookData.addPayment}
                              removePayment={removePaymentAndMetadata}
                              suggestedFullPaymentAmount={suggestedFullPaymentAmount}
                            />
                              );
                            })()
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {showPaymentValidationHint ? (
            <div className="mx-auto mt-4 w-full max-w-[1200px] px-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {paymentError}
              </div>
            </div>
          ) : null}

          {activeTab === 1 && paymentCollectionMode === "PAYMENT_LINK" && paymentLinkError ? (
            <div className="mx-auto mt-4 w-full max-w-[1200px] px-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {paymentLinkError}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-row justify-between gap-3 sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              color="light"
              onClick={() => {
                setActiveTab(0);
                tabsRef.current?.setActiveTab(0);
              }}
            >
              Back to Details
            </Button>
            <div className="flex flex-row gap-3">
              {!hasAnyPayment && paymentCollectionMode !== "PAYMENT_LINK" ? (
                <Button type="button" onClick={hookData.addPayment}>
                  Add First Payment
                </Button>
              ) : null}
              {!hasCreatedPendingBookingForCurrentDraft ? (
                <MyButton
                  loading={isCreatingBooking}
                  onClick={handleCreateBooking}
                  disabled={!canCreateBooking}
                >
                  {paymentCollectionMode === "PAYMENT_LINK" ? "Create Pending Reservation" : "Create Reservation"}
                </MyButton>
              ) : null}
            </div>
          </div>
        </TabItem>
      </Tabs>
    </form>
  );
}
