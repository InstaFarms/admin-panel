"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDarkMode } from "@/hooks/bookings/useDarkMode";
import "./wizard-theme.css";
import type { PaymentRow, WizardBrand, WizardCommissionSource, WizardState } from "./types";
import { WizardContext, useWizard, type WizardCtxValue } from "./WizardContext";
import WizardStepsBar from "./WizardStepsBar";
import SidebarRail from "./SidebarRail";
import { animatePanelIn, slideUpToast } from "./gsapHelpers";
import Step1TypeBrand from "./steps/Step1TypeBrand";
import OtaLoggingForm from "./steps/OtaLoggingForm";
import PropertyBlockForm from "./steps/PropertyBlockForm";
import ShortFlowDone from "./steps/ShortFlowDone";
import Step4Property from "./steps/Step4Property";
import Step5Stay from "./steps/Step5Stay";
import Step6Guest from "./steps/Step6Guest";
import Step7Commercials from "./steps/Step7Commercials";
import Step8Payment from "./steps/Step8Payment";
import Step9Review from "./steps/Step9Review";
import Step10Success from "./steps/Step10Success";
import {
  createBooking,
  createReservationPropertyBlock,
  logManualOtaBooking,
  saveReservationDraft,
} from "@/actions/bookingActions";

const DRAFT_KEY = "insta-booking-wizard-draft-v1";

function newPaymentRow(amount = ""): PaymentRow {
  return {
    id: Math.random().toString(36).slice(2, 10),
    amount,
    method: "CASH",
    date: new Date().toISOString().slice(0, 10),
    paymentFor: "FULL_PAYMENT",
    ref: "",
    receiverType: "PLATFORM",
    collectedBy: "",
    pgGateway: "",
    pgId: "",
    pgFee: "",
    bankName: "",
    bankRef: "",
  };
}

function initState(brands: WizardBrand[]): WizardState {
  return {
    theme: "light",
    step: 1,
    maxStep: 1,
    direction: 0,

    resType: "guest",
    brandId: brands[0]?.id || "",
    brandName: brands[0]?.name || "",

    blockMode: "",
    blockDuration: "",
    blockReason: "",
    blockReasonOther: "",
    blockCustId: null,
    blockCustName: "",
    blockCustPhone: "",
    blockCustEmail: "",
    blockCustCity: "",
    blockNewCust: false,
    blockRoomId: null,
    blockIsResort: false,

    enqName: "",
    enqPhone: "",
    enqEmail: "",
    enqInterest: "",

    propertyId: null,
    property: null,
    checkIn: null,
    checkOut: null,
    internalNotes: "",

    sourceCategory: "DIRECT_BOOKING",
    commissionBookingSourceId: "",
    sourceKind: null,
    pickedSourceId: null,
    agentName: "",
    agentVoucher: "",
    agentCommTerms: "",
    agentSettleTerms: "",

    tripPurpose: "",
    purposeOther: "",
    occasions: [],
    occasionOther: "",

    propQ: "",
    fArea: "All areas",
    fType: "All types",
    fCap: "Any size",
    fBudget: "Any budget",
    propSort: "recommended",
    propView: "list",

    adults: 2,
    children: 0,
    infants: 0,
    fAdults: 0,
    fChildren: 0,
    fInfants: 0,
    guestNotes: "",

    customerId: null,
    customer: null,
    custQ: "",
    newGuestOpen: false,
    ngName: "",
    ngPhone: "",
    ngEmail: "",

    quote: null,
    quoteLoading: false,
    quoteError: null,
    baseOverrideStr: "",
    quoteFinalTotal: 0,
    quoteGstAmount: 0,
    quoteGstPercentage: 0,
    quoteStayTotal: 0,
    taxType: "b2c",
    b2bGstin: "",
    b2bCompany: "",
    b2bCity: "",

    payMode: "",
    rows: [newPaymentRow()],
    linkEmail: true,
    linkWa: true,
    linkMsgOpen: false,
    linkNote: "",
    ovEmail: "",
    ovWa: "",
    linkStatus: "idle",
    pendingBookingId: null,

    icalSync: "",
    icalBooking: null,
    icalQuery: "",
    icalDate: "",
    icalShowAll: false,
    otaChannel: "Airbnb",
    ota: {
      channel: "Airbnb",
      ref: "",
      amountInputType: "INCLUSIVE",
      amount: "",
      commission: "",
      platformCommission: "",
      platformCommissionGst: "",
      commissionGstMode: "EXCLUSIVE",
      occTax: "",
      tds: "",
      notes: "",
    },

    bookingId: null,
    createdBookingRecordId: null,

    savedAt: null,
  };
}

// Fields that don't represent persisted draft content -- excluded when
// comparing "current state" against "last saved state" so things like a
// re-fetched quote or the savedAt timestamp itself don't falsely mark the
// form dirty right after a successful save.
const DRAFT_COMPARE_OMIT = new Set(["quote", "quoteLoading", "quoteError", "savedAt", "direction", "theme"]);

function draftSnapshot(s: WizardState): string {
  const entries = Object.entries(s).filter(([k]) => !DRAFT_COMPARE_OMIT.has(k));
  return JSON.stringify(entries.sort(([a], [b]) => (a < b ? -1 : 1)));
}

function friendlyRefId(prefix: string): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

function extractRecordId(data: unknown, prefix: string): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const candidate = d.bookingId ?? d.reservationId ?? d.id ?? (d.booking as any)?.id ?? (d.data as any)?.id;
    if (typeof candidate === "string" && candidate) return candidate;
    if (typeof candidate === "number") return String(candidate);
  }
  return friendlyRefId(prefix);
}

function buildReservationContext(s: WizardState) {
  if (s.sourceKind === "TRAVEL_AGENT") {
    return {
      sourceKind: "TRAVEL_AGENT",
      travelAgentName: s.agentName,
      travelAgentVoucherNumber: s.agentVoucher || undefined,
      travelAgentCommissionTerms: s.agentCommTerms || undefined,
      travelAgentSettlementTerms: s.agentSettleTerms || undefined,
    };
  }
  return { sourceKind: "DIRECT" };
}

function numOrUndef(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

// Step 1's "Reason" cards (tripPurpose/occasions) have no dedicated field
// anywhere in the booking API -- reservationContext only carries
// sourceKind-specific details (assisted/OTA/corporate/travel-agent), not a
// general stay reason. Rather than silently collecting a required field and
// discarding it, fold it into the internal remarks so it's at least visible
// on the booking record.
const PURPOSE_LABELS: Record<string, string> = {
  friends: "Night Stay – Friends",
  family: "Night Stay – Family",
  event: "Event",
  corporate: "Corporate Outing",
  shooting: "Shooting",
  other: "Others",
};

function purposeSummary(s: WizardState): string | null {
  if (!s.tripPurpose) return null;
  const label = s.tripPurpose === "other" ? s.purposeOther || "Others" : PURPOSE_LABELS[s.tripPurpose] || s.tripPurpose;
  const occasions = s.tripPurpose === "event" && s.occasions.length ? ` (${s.occasions.map((o) => (o === "Other" ? s.occasionOther || "Other" : o)).join(", ")})` : "";
  return `Reason: ${label}${occasions}`;
}

function buildGuestBookingFormData(s: WizardState): FormData {
  const fd = new FormData();
  const q: Record<string, unknown> = s.quote || {};
  const num = (...keys: string[]): number => {
    for (const k of keys) {
      const v = q[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return 0;
  };

  fd.set("brandId", s.brandId);
  fd.set("brandName", s.brandName);
  fd.set("bookingType", "Offline");
  fd.set("bookingExecutionType", "OFFLINE");
  fd.set("bookingTechPlatform", "ADMIN_PANEL");
  fd.set("sourceCategory", s.sourceCategory);
  fd.set("commissionBookingSourceId", s.commissionBookingSourceId);
  fd.set("reservationContext", JSON.stringify(buildReservationContext(s)));
  fd.set("propertyId", s.propertyId || "");
  fd.set("customerId", s.customerId || "");
  fd.set("checkinDate", s.checkIn || "");
  fd.set("checkoutDate", s.checkOut || "");
  fd.set("adultCount", String(s.adults));
  fd.set("childrenCount", String(s.children));
  fd.set("infantCount", String(s.infants));
  fd.set("floatingAdultCount", String(s.fAdults));
  fd.set("floatingChildCount", String(s.fChildren));
  fd.set("floatingInfantCount", String(s.fInfants));

  const baseOverride = s.baseOverrideStr.trim() !== "" ? Number(s.baseOverrideStr) : NaN;
  const baseAmt = Number.isFinite(baseOverride) ? baseOverride : num("baseRentalAmountWithGst");
  fd.set("baseRentalAmountWithGst", String(baseAmt));
  fd.set("rentalCharge", String(Number.isFinite(baseOverride) ? baseOverride : num("rentalCharge", "baseRentalAmountWithGst")));
  fd.set("extraAdultGuestChargeWithGst", String(num("extraAdultGuestChargeWithGst")));
  fd.set("extraChildGuestChargeWithGst", String(num("extraChildGuestChargeWithGst")));
  fd.set("floatingGuestCharge", String(num("floatingGuestCharge")));
  fd.set("extraGuestCharge", String(num("extraGuestCharge")));
  fd.set("bookingAmountWithGstBeforeDiscounts", String(s.quoteStayTotal || num("bookingAmountWithGstBeforeDiscounts")));
  // No discounts are surfaced in Commercials, and its totals don't subtract
  // any -- keep the submitted discount fields at zero to match what's shown.
  fd.set("totalDiscount", "0");
  fd.set("totalDiscountAmount", "0");
  fd.set("totalDiscountPercentage", "0");
  const full = s.quoteFinalTotal || num("fullBookingAmountWithGst", "bookingAmountWithGstBeforeDiscounts");
  const paid = s.payMode === "manual" ? s.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) : s.payMode === "link" && s.linkStatus === "confirmed" ? full : 0;
  fd.set("bookingAmountPaidWithGst", String(paid));
  fd.set("fullBookingAmountWithGst", String(full));
  fd.set("remainingAmountToBePaidWithGst", String(Math.max(0, full - paid)));
  fd.set("paymentGatewayCharge", "0");
  fd.set("ownerDiscount", "0");
  fd.set("multipleNightsDiscount", "0");
  fd.set("lastMinuteDiscount", "0");
  fd.set("couponDiscount", "0");
  fd.set("couponDiscountCode", "");
  fd.set("couponId", "");
  fd.set("otaCommission", String(num("otaCommission", "instafarmsCommission")));
  fd.set("instafarmsCommission", String(num("instafarmsCommission")));
  fd.set("netOwnerRevenue", String(num("netOwnerRevenue", "ownerRevenue")));
  fd.set("gstAmount", String(s.quoteGstAmount || num("gstAmount", "totalGstCollected")));
  fd.set("totalGstCollected", String(s.quoteGstAmount || num("totalGstCollected")));
  fd.set("daywiseBreakup", JSON.stringify(q.daywiseBreakup ?? []));
  const remarksParts = [purposeSummary(s), s.internalNotes].filter((v): v is string => !!v);
  fd.set("bookingRemarks", remarksParts.join(" — "));
  fd.set("specialRequests", s.guestNotes || "");
  fd.set("taxType", s.taxType);
  if (s.taxType === "b2b") {
    fd.set("gstin", s.b2bGstin);
    fd.set("billingCompanyName", s.b2bCompany);
    fd.set("billingCity", s.b2bCity);
  }

  const createPendingBooking = s.payMode === "link";
  fd.set("createPendingBooking", String(createPendingBooking));
  fd.set("sendPaymentLink", String(createPendingBooking && (s.linkEmail || s.linkWa)));
  fd.set("customMessageNote", s.linkNote || "");
  fd.set("paymentLinkEmail", s.ovEmail || s.customer?.email || "");
  fd.set("paymentLinkWhatsappNumber", s.ovWa || s.customer?.phone || "");
  if (s.linkEmail) fd.append("deliveryChannels", "email");
  if (s.linkWa) fd.append("deliveryChannels", "whatsapp");

  if (s.payMode === "manual") {
    s.rows.forEach((p) => {
      fd.set(`payment-${p.id}`, p.date);
      fd.set(`payment-amount-${p.id}`, String(Number(p.amount) || 0));
      fd.set(`payment-paymentFor-${p.id}`, p.paymentFor);
      fd.set(`payment-paymentMethod-${p.id}`, p.method);
      fd.set(`payment-paymentInstrument-${p.id}`, "OTHERS");
      fd.set(`payment-paymentReference-${p.id}`, p.ref);
      fd.set(`payment-receiverType-${p.id}`, p.receiverType || "PLATFORM");
      fd.set(`payment-paymentGateway-${p.id}`, p.pgGateway);
      fd.set(`payment-gatewayPaymentId-${p.id}`, p.pgId);
      fd.set(`payment-gatewayFee-${p.id}`, String(Number(p.pgFee) || 0));
      fd.set(`bankName-${p.id}`, p.bankName);
      fd.set(`bankAccountHolderName-${p.id}`, "");
      fd.set(`bankAccountNumber-${p.id}`, "");
      fd.set(`bankIfsc-${p.id}`, "");
      fd.set(`bankNickname-${p.id}`, p.bankRef);
    });
  }

  return fd;
}

// "Completed OTA Booking" -- this stay was already confirmed and paid for
// on the OTA's own platform, so it's not a bookings-pipeline reservation
// at all. Goes to logManualOtaBooking (blocking + thirdPartyBookings),
// never createBooking (bookings + payments + GST/commission ledgers).
function buildOtaBookingInput(s: WizardState) {
  const totalGuests = s.adults + s.children + s.infants;
  const enteredGross = Math.max(0, Number(s.ota.amount) || 0);
  const bookingGst = Math.max(0, Number(s.ota.occTax) || 0);
  const totalAmountInclGst =
    s.ota.amountInputType === "EXCLUSIVE"
      ? enteredGross + bookingGst
      : enteredGross;
  const commissionInput = Math.max(0, Number(s.ota.platformCommission) || 0);
  const commissionGst = Math.max(0, Number(s.ota.platformCommissionGst) || 0);
  const platformCommissionAmount =
    s.ota.commissionGstMode === "INCLUSIVE"
      ? Math.max(0, commissionInput - commissionGst)
      : commissionInput;
  return {
    brandId: s.brandId,
    brandName: s.brandName,
    propertyId: s.propertyId || "",
    channel: s.ota.channel || s.otaChannel,
    externalBookingId: s.ota.ref || undefined,
    checkinDate: s.checkIn || "",
    checkoutDate: s.checkOut || "",
    guestName: s.customer?.name || undefined,
    guestPhone: s.customer?.phone || undefined,
    guestCount: totalGuests > 0 ? totalGuests : undefined,
    totalAmountInclGst,
    thirdPartyCommissionAmount: Number(s.ota.commission) || 0,
    platformCommissionAmount,
    platformCommissionGst: commissionGst,
    gstAmount: bookingGst,
    tdsAmount: Number(s.ota.tds) || 0,
    notes: s.ota.notes || undefined,
    daywiseBreakup: s.ota.daywiseBreakup || [],
  };
}

function createLabelFor(s: WizardState): string {
  if (s.resType === "owner") return "Log OTA Booking";
  if (s.resType === "block") return "Create Blocking";
  return "Create Reservation";
}

function totalStepsFor(resType: WizardState["resType"]) {
  return resType === "guest" ? 8 : 3;
}

function stepValid(s: WizardState): boolean {
  if (s.resType !== "guest") {
    if (s.step === 1) return !!s.brandId && !!s.resType;
    if (s.step === 2) {
      if (s.resType === "owner") {
        // No commissionBookingSourceId here -- logManualOtaBooking writes
        // to blocking/thirdPartyBookings, which don't reference it at all
        // (that's a bookings-pipeline concept).
        const base = !!s.propertyId && !!s.checkIn && !!s.checkOut && !!s.otaChannel && !!s.customerId;
        return base && !!s.ota.amount.trim();
      }
      if (s.resType === "block") {
        const base = !!s.propertyId && !!s.checkIn && !!s.checkOut && !!s.blockMode;
        if (!base) return false;
        if (s.blockIsResort && !s.blockRoomId) return false;
        if (s.blockMode === "temp") return !!s.blockDuration && (!!s.blockCustId || (!!s.blockCustName.trim() && !!s.blockCustPhone.trim()));
        return !!s.blockReason && (s.blockReason !== "OTHER" || !!s.blockReasonOther.trim());
      }
    }
    return true;
  }

  switch (s.step) {
    case 1: {
      if (!s.brandId || !s.resType) return false;
      if (!s.sourceKind) return false;
      if (!s.commissionBookingSourceId) return false;
      if (s.sourceKind === "TRAVEL_AGENT" && !s.agentName.trim()) return false;
      if (!s.tripPurpose) return false;
      if (s.tripPurpose === "other" && !s.purposeOther.trim()) return false;
      if (s.tripPurpose === "event" && s.occasions.length === 0) return false;
      if (s.occasions.includes("Other") && !s.occasionOther.trim()) return false;
      return true;
    }
    case 2:
      return !!s.propertyId;
    case 3:
      return !!s.checkIn && !!s.checkOut && s.adults + s.children > 0;
    case 4:
      return !!s.customerId;
    case 5:
      return !!s.quote && !s.quoteLoading;
    case 6:
      if (s.payMode === "manual") return s.rows.some((r) => Number(r.amount) > 0);
      if (s.payMode === "link") return s.linkEmail || s.linkWa;
      if (s.payMode === "skip") return true;
      return false;
    case 7:
      return true;
    default:
      return true;
  }
}

function gateMessage(s: WizardState): string | null {
  if (stepValid(s)) return null;
  if (s.resType !== "guest") {
    if (s.step === 1) return "Pick a brand to continue.";
    if (s.step === 2) return "Fill in the required fields marked with *.";
    return null;
  }
  switch (s.step) {
    case 1:
      return "Pick a brand, reservation type, booking source and reason to continue.";
    case 2:
      return "Pick a property to continue.";
    case 3:
      return "Pick check-in and check-out dates, and at least one guest.";
    case 4:
      return "Search and select a guest, or create a new one.";
    case 5:
      return s.quoteError || "Waiting for the price quote to finish calculating.";
    case 6:
      return s.payMode === "manual"
        ? "Enter at least one payment amount, or choose a different payment option."
        : s.payMode === "link"
          ? "Pick at least one delivery channel for the payment link."
          : "Choose how you want to handle payment.";
    default:
      return null;
  }
}

export default function CreateBookingWizard({
  brands,
  commissionSources,
  draftId,
  draftPayload,
}: {
  brands: WizardBrand[];
  commissionSources: WizardCommissionSource[];
  draftId: string | null;
  draftPayload: Record<string, unknown> | null;
}) {
  const [s, setS] = useState<WizardState>(() => initState(brands));
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const isDarkMode = useDarkMode();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const toastIdRef = useRef(0);
  const restoredRef = useRef(false);
  // Snapshot of wizard state as of the last successful "Save as Draft" (or
  // the restored draft on mount) -- null means nothing has ever been saved.
  // Compared against current state to decide whether there's anything that
  // would actually be lost on refresh/close.
  const lastSavedSnapshotRef = useRef<string | null>(null);

  const patch = useCallback((p: Partial<WizardState>) => {
    setS((prev) => ({ ...prev, ...p }));
  }, []);

  const toast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  // Follow the app's own navbar dark-mode toggle instead of having a separate one.
  useEffect(() => {
    setS((prev) => (prev.theme === (isDarkMode ? "dark" : "light") ? prev : { ...prev, theme: isDarkMode ? "dark" : "light" }));
  }, [isDarkMode]);

  // Restore a draft on mount ONLY when explicitly navigated to via a
  // ?draftId= link (the drafts page's "Resume" button) -- draftPayload is
  // fetched server-side for that specific id. A plain page load/refresh
  // must NOT silently resume progress; it starts a fresh reservation.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (draftPayload && typeof draftPayload === "object") {
      // theme always follows the navbar toggle, never a persisted draft value.
      const { theme: _ignoredTheme, ...restoredRest } = draftPayload as Partial<WizardState>;
      setS((prev) => {
        const next = { ...prev, ...restoredRest, quote: null, quoteLoading: false };
        lastSavedSnapshotRef.current = draftSnapshot(next);
        return next;
      });
      toast("Restored your in-progress reservation draft.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No local-storage autosave -- refreshing or reopening this page always
  // starts fresh. Use "Save as Draft" to persist progress explicitly and
  // resume it later via the drafts page. Leaving/refreshing mid-flow is
  // guarded by the beforeunload warning below, which gives a chance to
  // cancel and hit "Save as Draft" first.

  // Step-panel transition animation -- only replays on an actual step change,
  // matching the design mock's own `componentDidUpdate` guard (`ps.step !==
  // this.state.step`). Must NOT fire on resType changes (e.g. switching
  // between type cards while still on step 1) or every click would re-fade
  // the whole panel instead of the type cards just re-styling in place.
  useEffect(() => {
    animatePanelIn(contentRef.current, s.direction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.step]);

  const totalSteps = totalStepsFor(s.resType);
  const isTerminal = s.resType === "guest" ? s.step >= 8 : s.step >= 3;

  const goTo = useCallback(
    (n: number) => {
      setS((prev) => {
        if (n > prev.maxStep) return prev;
        return { ...prev, step: n, direction: n > prev.step ? 1 : n < prev.step ? -1 : 0 };
      });
    },
    [],
  );

  const goNext = useCallback(() => {
    setS((prev) => {
      if (!stepValid(prev)) return prev;
      const next = prev.step + 1;
      return { ...prev, step: next, maxStep: Math.max(prev.maxStep, next), direction: 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setS((prev) => (prev.step <= 1 ? prev : { ...prev, step: prev.step - 1, direction: -1 }));
  }, []);

  // Keyboard shortcuts: Escape=back, Enter=advance, 1-9=quick pick on relevant steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isTerminal) return;
      if (e.key === "Escape" && !typing) {
        e.preventDefault();
        goBack();
      } else if (e.key === "Enter" && !typing) {
        e.preventDefault();
        if (s.step >= totalSteps - 1) {
          if (stepValid(s) && !submitting) doCreate();
        } else {
          goNext();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminal, goBack, goNext, s, totalSteps, submitting]);

  // Warn on tab close/refresh only when there's progress that hasn't been
  // saved as a draft yet -- if the current state already matches the last
  // save, refreshing is safe (nothing would be lost) so no prompt.
  useEffect(() => {
    const isDirty = s.maxStep > 1 && !isTerminal && draftSnapshot(s) !== lastSavedSnapshotRef.current;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [s, isTerminal]);

  const saveDraft = useCallback(async () => {
    const branchKind = s.resType === "guest" ? "GUEST" : s.resType === "owner" ? "OWNER" : s.resType === "block" ? "PROPERTY_BLOCK" : "ENQUIRY";
    const { quote, quoteLoading, quoteError, ...payload } = s;
    const result = await saveReservationDraft({
      draftId: draftId || undefined,
      brandId: s.brandId || null,
      branchKind,
      payload,
    });
    if ("error" in result && result.error) {
      toast(result.error);
    } else {
      lastSavedSnapshotRef.current = draftSnapshot(s);
      patch({ savedAt: Date.now() });
      toast("Saved as draft.");
    }
  }, [s, draftId, patch, toast]);

  const brandAppType = useMemo(() => undefined, []);

  const doCreate = useCallback(() => {
    setSubmitting(true);
    (async () => {
      try {
        if (s.resType === "owner") {
          const res = await logManualOtaBooking(buildOtaBookingInput(s));
          if (res.error) {
            toast(res.error);
            return;
          }
          const blockingId = (res.data as { blockingId?: string } | undefined)?.blockingId;
          patch({
            bookingId: blockingId || friendlyRefId("BLK"),
            step: 3,
            maxStep: 3,
            direction: 1,
          });
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {}
        } else if (s.resType === "block") {
          const fd = new FormData();
          fd.set("brandId", s.brandId);
          fd.set("propertyId", s.propertyId || "");
          fd.set("startDate", s.checkIn || "");
          fd.set("endDate", s.checkOut || "");
          fd.set("blockingType", s.blockMode === "temp" ? "TEMPORARY" : "PERMANENT");
          fd.set("reason", s.blockMode === "temp" ? `Temporary hold (${s.blockDuration})` : s.blockReason === "OTHER" ? s.blockReasonOther : s.blockReason);
          if (s.blockRoomId) fd.set("roomId", s.blockRoomId);
          const notesParts = [
            s.blockMode === "temp" ? `Held for ${s.blockCustName}${s.blockCustPhone ? ` (${s.blockCustPhone})` : ""}` : "",
            s.internalNotes,
          ].filter(Boolean);
          if (notesParts.length) fd.set("notes", notesParts.join(" — "));
          const res = await createReservationPropertyBlock(fd);
          if (res.error) {
            toast(res.error);
            return;
          }
          patch({ bookingId: extractRecordId(res.data, "BLK"), step: 3, maxStep: 3, direction: 1 });
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {}
        } else {
          if (!s.quote) {
            toast("Quote is not ready yet.");
            return;
          }
          const fd = buildGuestBookingFormData(s);
          const res = await createBooking(fd);
          if (res.error) {
            toast(res.error);
            return;
          }
          patch({ bookingId: extractRecordId(res.data, "RES"), step: 8, maxStep: 8, direction: 1 });
          try {
            window.localStorage.removeItem(DRAFT_KEY);
          } catch {}
        }
      } finally {
        setSubmitting(false);
      }
    })();
  }, [s, patch, toast]);

  const ctxValue: WizardCtxValue = useMemo(
    () => ({ s, patch, brands, commissionSources, brandAppType, toast, goNext, goBack, goTo, doCreate, submitting }),
    [s, patch, brands, commissionSources, brandAppType, toast, goNext, goBack, goTo, doCreate, submitting],
  );

  const savedLabel = useMemo(() => {
    if (!s.savedAt) return null;
    const secs = Math.round((Date.now() - s.savedAt) / 1000);
    if (secs < 5) return "Saved just now";
    if (secs < 60) return `Saved ${secs}s ago`;
    return `Saved ${Math.round(secs / 60)}m ago`;
  }, [s.savedAt]);

  useEffect(() => {
    toasts.forEach(() => {
      /* entrance handled per-toast below via ref callback */
    });
  }, [toasts]);

  return (
    <WizardContext.Provider value={ctxValue}>
      <div className="ibw-root" data-theme={s.theme}>
        <div className="flex w-full flex-wrap items-start gap-5 px-6 pb-10 pt-5">
          <div ref={contentRef} className="min-w-0" style={{ flex: "999 1 620px" }}>
            {!isTerminal && (
              <>
                <div className="mb-3.5 flex flex-wrap items-start gap-3.5">
                  <div className="flex-1" style={{ minWidth: 260 }}>
                    <div className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: "var(--mut)" }}>
                      STEP {s.step} OF {s.resType === "guest" ? totalSteps - 1 : totalSteps}
                    </div>
                    <div className="my-0.5 text-[26px] font-extrabold tracking-tight">{stepTitleFor(s)}</div>
                    <div className="text-[13.5px]" style={{ color: "var(--mut)" }}>
                      {stepDescFor(s)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={saveDraft}
                        className="whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-bold"
                        style={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--txt)", boxShadow: "var(--shadow)" }}
                      >
                        🗎 Save as Draft
                      </button>
                      {(() => {
                        const lastActionStep = totalSteps - 1;
                        if (s.step < lastActionStep) {
                          return (
                            <button
                              onClick={goNext}
                              disabled={!stepValid(s)}
                              className="whitespace-nowrap rounded-xl px-5 py-2.5 text-[13px] font-bold disabled:opacity-40"
                              style={{ background: "var(--acc)", color: "var(--accOn)" }}
                            >
                              Continue ›
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={doCreate}
                            disabled={!stepValid(s) || submitting}
                            className="whitespace-nowrap rounded-xl px-5 py-2.5 text-[13px] font-bold disabled:opacity-40"
                            style={{ background: "var(--green)", color: "var(--accOn)" }}
                          >
                            {submitting ? "Creating…" : createLabelFor(s)}
                          </button>
                        );
                      })()}
                    </div>
                    <div className="mt-1.5 flex items-center justify-end gap-2.5">
                      {savedLabel && (
                        <span className="text-[11.5px] font-semibold" style={{ color: "var(--green)" }}>
                          ● {savedLabel}
                        </span>
                      )}
                      <a href="/admin/bookings/drafts" className="text-[12px] font-semibold">
                        View my reservation drafts
                      </a>
                    </div>
                    {gateMessage(s) && (
                      <div className="mt-1 text-[12px]" style={{ color: "var(--mut)" }}>
                        {gateMessage(s)}
                      </div>
                    )}
                  </div>
                </div>
                <WizardStepsBar />
              </>
            )}

            <StepSwitch />
          </div>

          {!isTerminal && s.resType !== "block" && s.step >= 2 && <SidebarRail />}
        </div>

        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          {toasts.map((t) => (
            <ToastBubble key={t.id} message={t.message} />
          ))}
        </div>
      </div>
    </WizardContext.Provider>
  );
}

function ToastBubble({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    slideUpToast(ref.current);
  }, []);
  return (
    <div
      ref={ref}
      className="mb-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-lg"
      style={{ background: "var(--txt)", color: "var(--bg)" }}
    >
      {message}
    </div>
  );
}

function stepTitleFor(s: WizardState): string {
  if (s.resType !== "guest") {
    if (s.step === 1) return "Booking Basics";
    if (s.resType === "owner") return "Log Completed OTA Booking";
    return "Create Property Block";
  }
  return (
    {
      1: "Booking Basics",
      2: "Property Selection",
      3: "Stay Details (Dates & Guests)",
      4: "Guest Details",
      5: "Commercials — Pricing & Quote",
      6: "Payment Collection",
      7: "Review & Confirm",
    } as Record<number, string>
  )[s.step] || "";
}

function stepDescFor(s: WizardState): string {
  if (s.resType !== "guest") {
    if (s.step === 1) return "Choose what you want to create — this decides the flow and fields.";
    if (s.resType === "owner") return "Record the channel, the synced (or fresh) stay dates and the platform money trail.";
    return "Hold dates on the calendar for maintenance, cleaning or inspection.";
  }
  return (
    {
      1: "Choose what you want to create — this decides the flow and fields.",
      2: "Search-select the property — or browse with filters and the map.",
      3: "Pick dates on the live availability calendar and set the guest mix.",
      4: "Search for an existing guest or create a new profile.",
      5: "The live server-calculated quote with every charge and discount.",
      6: "Record received payments, or send the guest a website checkout link.",
      7: "Check everything once — then create the reservation.",
    } as Record<number, string>
  )[s.step] || "";
}

function StepSwitch() {
  const { s } = useWizard();
  if (s.resType !== "guest") {
    if (s.step === 1) return <Step1TypeBrand />;
    if (s.step === 2) {
      if (s.resType === "owner") return <OtaLoggingForm />;
      return <PropertyBlockForm />;
    }
    return <ShortFlowDone />;
  }
  switch (s.step) {
    case 1:
      return <Step1TypeBrand />;
    case 2:
      return <Step4Property />;
    case 3:
      return <Step5Stay />;
    case 4:
      return <Step6Guest />;
    case 5:
      return <Step7Commercials />;
    case 6:
      return <Step8Payment />;
    case 7:
      return <Step9Review />;
    default:
      return <Step10Success />;
  }
}
