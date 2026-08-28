"use server";

import { isAdmin } from "@/utils/admin-only";
import { parseBookingFormData, parseCancellationFormData, parseFilterParams, parsePaymentFormData } from "@/utils/server-utils";
import { CustomerBookingListItem, ServerActionResult } from "@/utils/types";
import { apiPost, apiPatch, apiGet, apiDelete } from "@/utils/api-utils";
import { BOOKINGS_ERRORS, BOOKINGS_VALIDATION } from "@/constants/bookings";
import { CUSTOMER_BRANDS, type CustomerBrandName } from "@/constants/customerBrands";
import { parseLimitOffset } from "@/utils/server-utils";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { captureError } from "@/lib/sentry";

// Helper function to get Firebase token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

function pickFirstNumber(...values: Array<number | null | undefined>): number | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

const bookingExecutionTypeValues = ["ONLINE", "OFFLINE"] as const;
const bookingSourceCategoryValues = [
  "DIRECT_BOOKING",
  "OWNER_BOOKING",
  "THIRD_PARTY_BOOKING",
] as const;
const reservationSourceKindValues = [
  "DIRECT",
  "ASSISTED",
  "OTA",
  "CORPORATE",
  "TRAVEL_AGENT",
] as const;

type BookingExecutionType = (typeof bookingExecutionTypeValues)[number];
type BookingSourceCategory = (typeof bookingSourceCategoryValues)[number];
type ReservationSourceKind = (typeof reservationSourceKindValues)[number];
type ReservationBookingContext = {
  sourceKind: ReservationSourceKind;
  externalReference?: string;
  assistedPurpose?: string;
  assistedRequestDetails?: string;
  otaGrossBookingAmount?: number;
  otaBookingGstAmount?: number;
  otaCommissionAmount?: number;
  otaCommissionGstAmount?: number;
  otaCleaningCharge?: number;
  otaOtherCharge?: number;
  corporateCompanyName?: string;
  corporateGstNumber?: string;
  corporateBillingContact?: string;
  corporateInvoiceTo?: string;
  corporatePurchaseOrderNumber?: string;
  corporateCreditPeriodDays?: number;
  travelAgentName?: string;
  travelAgentVoucherNumber?: string;
  travelAgentCommissionTerms?: string;
  travelAgentSettlementTerms?: string;
};

function parseEnumValue<T extends readonly string[]>(
  value: FormDataEntryValue | null,
  options: T,
): T[number] | null {
  const text = typeof value === "string" ? value.trim() : "";
  return (options as readonly string[]).includes(text) ? (text as T[number]) : null;
}

function parseReservationBookingContext(
  value: FormDataEntryValue | null,
): ReservationBookingContext {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Select a reservation source.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new Error("Reservation source details are invalid.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Reservation source details are invalid.");
  }

  const data = raw as Record<string, unknown>;
  const sourceKind = data.sourceKind;
  if (
    typeof sourceKind !== "string" ||
    !(reservationSourceKindValues as readonly string[]).includes(sourceKind)
  ) {
    throw new Error("Select a valid reservation source.");
  }

  const text = (key: string) => {
    const item = data[key];
    return typeof item === "string" && item.trim() ? item.trim() : undefined;
  };
  const amount = (key: string) => {
    const item = data[key];
    if (item === "" || item === undefined || item === null) return undefined;
    const numeric = typeof item === "number" ? item : Number(item);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new Error("Reservation source amounts must be non-negative numbers.");
    }
    return numeric;
  };
  const days = amount("corporateCreditPeriodDays");
  if (days !== undefined && (!Number.isInteger(days) || days > 365)) {
    throw new Error("Corporate credit period must be a whole number up to 365 days.");
  }

  const context: ReservationBookingContext = {
    sourceKind: sourceKind as ReservationSourceKind,
    externalReference: text("externalReference"),
    assistedPurpose: text("assistedPurpose"),
    assistedRequestDetails: text("assistedRequestDetails"),
    otaGrossBookingAmount: amount("otaGrossBookingAmount"),
    otaBookingGstAmount: amount("otaBookingGstAmount"),
    otaCommissionAmount: amount("otaCommissionAmount"),
    otaCommissionGstAmount: amount("otaCommissionGstAmount"),
    otaCleaningCharge: amount("otaCleaningCharge"),
    otaOtherCharge: amount("otaOtherCharge"),
    corporateCompanyName: text("corporateCompanyName"),
    corporateGstNumber: text("corporateGstNumber"),
    corporateBillingContact: text("corporateBillingContact"),
    corporateInvoiceTo: text("corporateInvoiceTo"),
    corporatePurchaseOrderNumber: text("corporatePurchaseOrderNumber"),
    corporateCreditPeriodDays: days,
    travelAgentName: text("travelAgentName"),
    travelAgentVoucherNumber: text("travelAgentVoucherNumber"),
    travelAgentCommissionTerms: text("travelAgentCommissionTerms"),
    travelAgentSettlementTerms: text("travelAgentSettlementTerms"),
  };

  if (context.sourceKind === "ASSISTED" && !context.assistedPurpose) {
    throw new Error("Assisted reservations require a purpose.");
  }
  if (
    context.sourceKind === "OTA" &&
    (!context.externalReference || context.otaGrossBookingAmount === undefined)
  ) {
    throw new Error("OTA reservations require an external reference and OTA booking amount.");
  }
  if (
    context.sourceKind === "CORPORATE" &&
    (!context.corporateCompanyName ||
      !context.corporateBillingContact ||
      !context.corporateInvoiceTo)
  ) {
    throw new Error("Corporate reservations require company, billing contact and invoice recipient.");
  }
  if (context.sourceKind === "TRAVEL_AGENT" && !context.travelAgentName) {
    throw new Error("Travel-agent reservations require an agent name.");
  }

  return context;
}

export const createBooking = async (formData: FormData) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const brandId = formData.get("brandId")?.toString().trim() || "";
    const brandName = formData.get("brandName")?.toString().trim() || "";

    if (!brandId) {
      return { error: "Please select a brand." };
    }

    // Parse form data
    let bookingData;
    try {
      bookingData = parseBookingFormData(formData);
    } catch (err) {
      console.error('[Admin Panel] Error parsing booking form data:', err);
      captureError(err);
      const errorMessage = err instanceof Error ? err.message : "Invalid form data";

      if (errorMessage.includes("Invalid Value")) {
        return { error: BOOKINGS_VALIDATION.validNumbers };
      }
      if (errorMessage.includes("propertyId") || errorMessage.includes("entityId")) {
        return { error: BOOKINGS_VALIDATION.selectProperty };
      }
      if (errorMessage.includes("customerId")) {
        return { error: BOOKINGS_VALIDATION.selectCustomer };
      }
      if (errorMessage.includes("bookingType")) {
        return { error: BOOKINGS_VALIDATION.selectBookingType };
      }
      if (errorMessage.includes("checkinDate") || errorMessage.includes("checkoutDate")) {
        return { error: BOOKINGS_VALIDATION.validCheckinCheckout };
      }

      return { error: `${BOOKINGS_VALIDATION.formValidation}: ${errorMessage}` };
    }

    if (!bookingData.customerId?.trim()) {
      return { error: "Please select a customer." };
    }

    if ((bookingData.adultCount ?? 0) < 1) {
      return { error: "At least 1 adult is required." };
    }

    let payments;
    try {
      payments = parsePaymentFormData(formData);
    } catch (err) {
      console.error('[Admin Panel] Error parsing payment form data:', err);
      captureError(err);
      return { error: BOOKINGS_ERRORS.invalidPaymentData };
    }

    if ((!payments || payments.length === 0) && formData.has("paymentsPayload")) {
      try {
        const rawPaymentsPayload = formData.get("paymentsPayload")?.toString() || "[]";
        const parsedPaymentsPayload = JSON.parse(rawPaymentsPayload);
        if (Array.isArray(parsedPaymentsPayload)) {
          payments = parsedPaymentsPayload;
        }
      } catch (err) {
        console.error("[Admin Panel] Error parsing paymentsPayload fallback:", err);
        captureError(err);
      }
    }

    const sendPaymentLink = formData.get("sendPaymentLink")?.toString() === "true";
    const createPendingBooking = formData.get("createPendingBooking")?.toString() === "true";
    const bookingExecutionType =
      parseEnumValue(formData.get("bookingExecutionType"), bookingExecutionTypeValues) ??
      "OFFLINE";
    const sourceCategory = parseEnumValue(
      formData.get("sourceCategory"),
      bookingSourceCategoryValues,
    );
    const commissionBookingSourceId =
      formData.get("commissionBookingSourceId")?.toString().trim() || "";
    const reservationContext = parseReservationBookingContext(
      formData.get("reservationContext"),
    );

    if (!sourceCategory) {
      return { error: "Please select source category." };
    }

    if (!commissionBookingSourceId) {
      return { error: "Please select source type." };
    }

    const deliveryChannels = formData
      .getAll("deliveryChannels")
      .map((value) => value.toString())
      .filter((value): value is "email" | "whatsapp" => value === "email" || value === "whatsapp");
    const customMessageNote = formData.get("customMessageNote")?.toString().trim() || undefined;
    const paymentLinkEmail = formData.get("paymentLinkEmail")?.toString().trim() || undefined;
    const paymentLinkWhatsappNumber =
      formData.get("paymentLinkWhatsappNumber")?.toString().trim() || undefined;

    // Get Firebase token for API authentication
    const token = await getAuthToken();

    // Prefer canonical shared-calculator fields, but keep legacy admin form
    // keys as fallbacks so older screens keep working during the refactor.
    const rentalCharge = pickFirstNumber(bookingData.rentalCharge, bookingData.baseRentalAmountWithGst) ?? 0;
    const extraGuestCharge =
      pickFirstNumber(
        bookingData.extraGuestCharge,
        (bookingData.extraAdultGuestChargeWithGst ?? 0) + (bookingData.extraChildGuestChargeWithGst ?? 0)
      ) ?? 0;
    const ownerDiscount = pickFirstNumber(bookingData.ownerDiscount, bookingData.ownerDiscountValue) ?? 0;
    const multipleNightsDiscount =
      pickFirstNumber(bookingData.multipleNightsDiscount, bookingData.multipleNightsDiscountValue) ?? 0;
    const lastMinuteDiscount =
      pickFirstNumber(bookingData.lastMinuteDiscount, bookingData.lastMinuteDiscountValue) ?? 0;
    const couponDiscount = pickFirstNumber(bookingData.couponDiscount, bookingData.couponDiscountValue) ?? 0;
    const totalDiscount = pickFirstNumber(bookingData.totalDiscount, bookingData.totalDiscountAmount) ?? 0;
    const gstAmount = pickFirstNumber(bookingData.gstAmount, bookingData.totalGstCollected) ?? 0;
    const bookingAmountWithDiscountBeforeGst =
      pickFirstNumber(bookingData.bookingAmountWithDiscountBeforeGst, rentalCharge + extraGuestCharge - totalDiscount) ?? 0;
    const gstPercentage = bookingAmountWithDiscountBeforeGst > 0 ? (gstAmount / bookingAmountWithDiscountBeforeGst) * 100 : 0;
    const otaCommission = pickFirstNumber(bookingData.otaCommission, bookingData.instafarmsCommission) ?? 0;
    const netOwnerRevenue = pickFirstNumber(bookingData.netOwnerRevenue, bookingData.ownerRevenue) ?? 0;

    const propertyId = bookingData.propertyId || bookingData.entityId;
    if (!propertyId) {
      throw new Error("Property ID is required. Please select a property.");
    }

    // Prepare request body
    const requestBody = {
      brandId,
      propertyId,
      customerId: bookingData.customerId?.trim() || undefined,
      bookingType: "Offline",
      bookingSource: "ADMIN_PANEL",
      bookingExecutionType,
      bookingTechPlatform: "ADMIN_PANEL",
      sourceCategory,
      commissionBookingSourceId,
      reservationContext,
      adultCount: bookingData.adultCount,
      childrenCount: bookingData.childrenCount,
      infantCount: bookingData.infantCount,
      floatingAdultCount: bookingData.floatingAdultCount ?? undefined,
      floatingChildCount: bookingData.floatingChildCount ?? undefined,
      floatingInfantCount: bookingData.floatingInfantCount ?? undefined,
      checkinDate: new Date(bookingData.checkinDate).toISOString(),
      checkoutDate: new Date(bookingData.checkoutDate).toISOString(),
      bookingRemarks: bookingData.bookingRemarks ?? undefined,
      specialRequests: bookingData.specialRequests ?? undefined,
      rentalCharge,
      extraGuestCharge,
      ownerDiscount,
      multipleNightsDiscount,
      lastMinuteDiscount,
      lastMinuteDiscountPercentage: bookingData.lastMinuteDiscountPercentage ?? undefined,
      lastMinuteDiscountThresholdDays: bookingData.lastMinuteDiscountThresholdDays ?? undefined,
      couponDiscount,
      totalDiscount,
      gstAmount,
      gstPercentage,
      daywiseBreakup: Array.isArray(bookingData.daywiseBreakup) ? bookingData.daywiseBreakup : undefined,
      otaCommission,
      paymentGatewayCharge: bookingData.paymentGatewayCharge ?? 0,
      netOwnerRevenue,
      payments: createPendingBooking || sendPaymentLink
        ? []
        : payments.map((p) => ({
            transactionType: "Credit" as const,
            amount: p.amount,
            paymentDate: new Date(p.paymentDate).toISOString(),
            referencePersonId: undefined,
            paymentType: p.paymentFor === "ADJUSTMENT" ? "Security Deposit" as const : "Rent" as const,
            paymentMode: p.paymentMethod === "CASH" ? "Cash" as const : "Online" as const,
            receiverType: p.receiverType ?? "PLATFORM",
            bankName: p.bankName ?? undefined,
            bankAccountNumber: p.bankAccountNumber ?? undefined,
            bankAccountHolderName: p.bankAccountHolderName ?? undefined,
            bankIfsc: p.bankIfsc ?? undefined,
            bankNickname: p.paymentReference ?? p.bankNickname ?? undefined,
            gateway: p.paymentMethod === "PG" ? p.paymentGateway ?? "RAZORPAY" : undefined,
            gatewayPaymentId: p.gatewayPaymentId ?? undefined,
            gatewayFee: p.gatewayFee ?? undefined,
          })),
      sendPaymentLink,
      deliveryChannels,
      customMessageNote,
      paymentLinkEmail,
      paymentLinkWhatsappNumber,
    };

    console.log("[Admin Panel] createBooking debug", {
      resolvedBrandId: brandId,
      resolvedPropertyId: propertyId,
      resolvedCustomerId: bookingData.customerId?.trim() || undefined,
      bookingType: "Offline",
      bookingSource: "ADMIN_PANEL",
      bookingExecutionType,
      bookingTechPlatform: "ADMIN_PANEL",
      sourceCategory,
      commissionBookingSourceId,
      reservationSourceKind: reservationContext.sourceKind,
      checkinDate: requestBody.checkinDate,
      checkoutDate: requestBody.checkoutDate,
      paymentsCount: requestBody.payments.length,
      paymentsPreview: requestBody.payments,
      appTypeHint: brandName,
    });

    console.log(`[Admin Panel] Creating booking via API: /api/booking/admin/create`);

    // Call if-api endpoint using apiPost utility (same pattern as createActivity)
    const appType = brandName.toLowerCase().includes("mago")
      ? "MAGO_ADMIN"
      : "INSTAFARMS_ADMIN";

    const result = await apiPost("/api/booking/admin/create", requestBody, {
      token,
      appType,
    });

    console.log('[Admin Panel] Booking API response:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('[Admin Panel] Booking creation failed:', result);
      const errorMsg = typeof result.message === 'string'
        ? result.message
        : JSON.stringify(result.message || result);
      throw new Error(errorMsg || 'Failed to create booking');
    }

    console.log(`[Admin Panel] ✅ Booking created successfully: ${result.data?.bookingId}`);

    const responseData = result.data as
      | {
          bookingId?: string;
          status?: string;
          checkoutUrl?: string | null;
          deliveryResults?: Array<{
            channel: string;
            status: string;
            reason?: string;
          }>;
        }
      | undefined;

    const sentCount =
      responseData?.deliveryResults?.filter((item) => item.status === "sent").length ?? 0;
    const skippedCount =
      responseData?.deliveryResults?.filter((item) => item.status === "skipped").length ?? 0;
    const failedCount =
      responseData?.deliveryResults?.filter((item) => item.status === "failed").length ?? 0;

    let successMessage = "Booking created.";
    if (sendPaymentLink) {
      successMessage =
        responseData?.status === "PENDING"
          ? `Pending booking created. Website checkout link sent: ${sentCount}, skipped: ${skippedCount}, failed: ${failedCount}.`
          : "Booking created and already confirmed.";
    }

    revalidatePath("/admin");
    return {
      success: successMessage,
      data: responseData,
    };
  } catch (err) {
    console.error('[Admin Panel] Error creating booking:', err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.createFailed };
  }
};

export const sendBookingPaymentLink = async (input: {
  bookingId: string;
  brandId?: string;
  deliveryChannels: Array<"email" | "whatsapp">;
  customMessageNote?: string;
  paymentLinkEmail?: string;
  paymentLinkWhatsappNumber?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!input.bookingId) {
      throw new Error("Booking id is required");
    }

    const token = await getAuthToken();
    const result = await apiPost(
      `/api/booking/admin/${input.bookingId}/send-payment-link`,
      {
        brandId: input.brandId,
        deliveryChannels: input.deliveryChannels,
        customMessageNote: input.customMessageNote?.trim() || undefined,
        paymentLinkEmail: input.paymentLinkEmail?.trim() || undefined,
        paymentLinkWhatsappNumber: input.paymentLinkWhatsappNumber?.trim() || undefined,
      },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to send website checkout link");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error sending booking website checkout link:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to send website checkout link" };
  }
};

export const prepareBookingPaymentPage = async (input: {
  bookingId: string;
  brandId?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!input.bookingId) {
      throw new Error("Booking id is required");
    }

    const token = await getAuthToken();
    const result = await apiPost(
      `/api/booking/admin/${input.bookingId}/payment-page`,
      {
        brandId: input.brandId,
      },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to prepare website checkout");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error preparing booking website checkout:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to prepare website checkout" };
  }
};

export const getPropertyAvailability = async (
  propertyId: string,
  brandId?: string,
  appType?: string
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const result = await apiGet(`/api/booking/admin/availability/${propertyId}${query}`, {
      token,
      appType,
    });

    if (!result.success) {
      throw new Error(result.message || BOOKINGS_ERRORS.fetchAvailabilityFailed);
    }

    return { success: result.data };
  } catch (err) {
    console.error('[Admin Panel] Error fetching availability:', err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchAvailabilityFailed };
  }
};

export const getBlockingReasonsForProperty = async (propertyId: string, brandId?: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const result = await apiGet(`/api/booking/admin/blocking/reasons/${propertyId}${query}`, { token });

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch blocking reasons");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error fetching blocking reasons:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to fetch blocking reasons" };
  }
};

export const calculateOfflineBookingQuote = async (input: {
  brandId: string;
  appType?: string;
  propertyId: string;
  bookingExecutionType?: BookingExecutionType;
  bookingTechPlatform?: "ADMIN_PANEL";
  sourceCategory?: BookingSourceCategory;
  commissionBookingSourceId?: string;
  checkinDate: string;
  checkoutDate: string;
  adultCount: number;
  childrenCount: number;
  infantCount: number;
  floatingAdultCount?: number;
  floatingChildCount?: number;
  floatingInfantCount?: number;
  couponCode?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const { appType, ...requestBody } = input;
    const result = await apiPost("/api/booking/admin/calculate", requestBody, {
      token,
      appType,
    });
    if (!result.success) {
      throw new Error(result.message || "Failed to calculate booking quote");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error calculating offline booking quote:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to calculate booking quote" };
  }
};

export const updateBooking = async (
  bookingId: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!bookingId) {
      return { error: BOOKINGS_ERRORS.invalidBookingId };
    }

    // Check which fields are actually provided in the form (for partial updates)
    const getFormValue = (key: string): string => {
      const value = formData.get(key);
      return value instanceof File ? "" : (value?.toString() || "");
    };

    const hasBookingType = formData.has("bookingType") && getFormValue("bookingType").trim().length > 0;
    const hasCustomerId = formData.has("customerId") && getFormValue("customerId").trim().length > 0;
    const hasAdultCount = formData.has("adultCount") && getFormValue("adultCount").trim().length > 0;
    const hasCheckinDate = formData.has("checkinDate") && getFormValue("checkinDate").trim().length > 0;
    const hasCheckoutDate = formData.has("checkoutDate") && getFormValue("checkoutDate").trim().length > 0;

    const bookingFields = parseBookingFormData(formData);
    const paymentData = parsePaymentFormData(formData);

    // Get Firebase token for API authentication
    const token = await getAuthToken();

    // Map parsed fields to API expected field names
    // Only calculate if values are actually provided (not defaults)
    const hasRentalAmount = bookingFields.baseRentalAmountWithGst !== undefined && bookingFields.baseRentalAmountWithGst !== null;
    const hasExtraAdult = bookingFields.extraAdultGuestChargeWithGst !== undefined && bookingFields.extraAdultGuestChargeWithGst !== null;
    const hasExtraChild = bookingFields.extraChildGuestChargeWithGst !== undefined && bookingFields.extraChildGuestChargeWithGst !== null;

    const rentalCharge = hasRentalAmount
      ? (pickFirstNumber(bookingFields.rentalCharge, bookingFields.baseRentalAmountWithGst) ?? 0)
      : undefined;
    const extraGuestCharge = (hasExtraAdult || hasExtraChild)
      ? (pickFirstNumber(
          bookingFields.extraGuestCharge,
          (bookingFields.extraAdultGuestChargeWithGst ?? 0) + (bookingFields.extraChildGuestChargeWithGst ?? 0)
        ) ?? 0)
      : undefined;
    const ownerDiscount = bookingFields.ownerDiscount !== undefined && bookingFields.ownerDiscount !== null
      ? bookingFields.ownerDiscount
      : bookingFields.ownerDiscountValue !== undefined && bookingFields.ownerDiscountValue !== null
      ? bookingFields.ownerDiscountValue
      : undefined;
    const multipleNightsDiscount = bookingFields.multipleNightsDiscount !== undefined && bookingFields.multipleNightsDiscount !== null
      ? bookingFields.multipleNightsDiscount
      : bookingFields.multipleNightsDiscountValue !== undefined && bookingFields.multipleNightsDiscountValue !== null
      ? bookingFields.multipleNightsDiscountValue
      : undefined;
    const couponDiscount = bookingFields.couponDiscount !== undefined && bookingFields.couponDiscount !== null
      ? bookingFields.couponDiscount
      : bookingFields.couponDiscountValue !== undefined && bookingFields.couponDiscountValue !== null
      ? bookingFields.couponDiscountValue
      : undefined;
    const totalDiscount = bookingFields.totalDiscount !== undefined && bookingFields.totalDiscount !== null
      ? bookingFields.totalDiscount
      : bookingFields.totalDiscountAmount !== undefined && bookingFields.totalDiscountAmount !== null
      ? bookingFields.totalDiscountAmount
      : undefined;
    const gstAmount = bookingFields.gstAmount !== undefined && bookingFields.gstAmount !== null
      ? bookingFields.gstAmount
      : bookingFields.totalGstCollected !== undefined && bookingFields.totalGstCollected !== null
      ? bookingFields.totalGstCollected
      : undefined;
    const bookingAmountWithDiscountBeforeGst = bookingFields.bookingAmountWithDiscountBeforeGst !== undefined &&
        bookingFields.bookingAmountWithDiscountBeforeGst !== null
      ? bookingFields.bookingAmountWithDiscountBeforeGst
      : (rentalCharge ?? 0) + (extraGuestCharge ?? 0) - (totalDiscount ?? 0);
    const gstPercentage = bookingAmountWithDiscountBeforeGst > 0 && gstAmount !== undefined
      ? (gstAmount / bookingAmountWithDiscountBeforeGst) * 100
      : undefined;
    const otaCommission = bookingFields.otaCommission !== undefined && bookingFields.otaCommission !== null
      ? bookingFields.otaCommission
      : bookingFields.instafarmsCommission !== undefined && bookingFields.instafarmsCommission !== null
      ? bookingFields.instafarmsCommission
      : undefined;
    const netOwnerRevenue = bookingFields.netOwnerRevenue !== undefined && bookingFields.netOwnerRevenue !== null
      ? bookingFields.netOwnerRevenue
      : bookingFields.ownerRevenue !== undefined && bookingFields.ownerRevenue !== null
      ? bookingFields.ownerRevenue
      : undefined;

    // Prepare request body - only include fields that were actually provided in the form
    const requestBody: any = {};
    if (formData.has("propertyId") && (bookingFields.propertyId || bookingFields.entityId)) {
      const propertyIdValue = bookingFields.propertyId || bookingFields.entityId;
      if (propertyIdValue && propertyIdValue.trim().length > 0) {
        requestBody.propertyId = propertyIdValue;
      }
    }
    // Only include customerId if it was provided in the form
    if (hasCustomerId && bookingFields.customerId && bookingFields.customerId.length > 0) {
      requestBody.customerId = bookingFields.customerId;
    }
    // Only include bookingType if it was provided in the form
    if (hasBookingType && bookingFields.bookingType) {
      requestBody.bookingType = bookingFields.bookingType;
    }
    // Only include guest counts if they were provided in the form
    if (hasAdultCount && bookingFields.adultCount !== undefined && bookingFields.adultCount !== null && bookingFields.adultCount >= 0) {
      requestBody.adultCount = bookingFields.adultCount;
    }
    if (formData.has("childrenCount") && bookingFields.childrenCount !== undefined && bookingFields.childrenCount !== null) {
      requestBody.childrenCount = bookingFields.childrenCount;
    }
    if (formData.has("infantCount") && bookingFields.infantCount !== undefined && bookingFields.infantCount !== null) {
      requestBody.infantCount = bookingFields.infantCount;
    }
    // Only include dates if they are valid non-empty strings
    // Dates are optional for updates - only send if provided and valid
    if (bookingFields.checkinDate && typeof bookingFields.checkinDate === 'string' && bookingFields.checkinDate.trim().length > 0) {
      try {
        const checkinDateObj = new Date(bookingFields.checkinDate);
        if (!isNaN(checkinDateObj.getTime())) {
          requestBody.checkinDate = checkinDateObj.toISOString();
        }
      } catch (e) {
        console.error('[Admin Panel] Invalid checkinDate format:', bookingFields.checkinDate);
      }
    }
    if (bookingFields.checkoutDate && typeof bookingFields.checkoutDate === 'string' && bookingFields.checkoutDate.trim().length > 0) {
      try {
        const checkoutDateObj = new Date(bookingFields.checkoutDate);
        if (!isNaN(checkoutDateObj.getTime())) {
          requestBody.checkoutDate = checkoutDateObj.toISOString();
        }
      } catch (e) {
        console.error('[Admin Panel] Invalid checkoutDate format:', bookingFields.checkoutDate);
      }
    }
    if (bookingFields.bookingRemarks !== undefined && bookingFields.bookingRemarks !== null) {
      requestBody.bookingRemarks = bookingFields.bookingRemarks;
    }
    if (bookingFields.specialRequests !== undefined && bookingFields.specialRequests !== null) {
      requestBody.specialRequests = bookingFields.specialRequests;
    }
    // Only include financial fields if they have actual values (for partial updates)
    // Don't send 0 values unless they were explicitly provided
    if (rentalCharge !== undefined && rentalCharge !== null && rentalCharge >= 0) {
      requestBody.rentalCharge = rentalCharge;
    }
    if (extraGuestCharge !== undefined && extraGuestCharge !== null && extraGuestCharge >= 0) {
      requestBody.extraGuestCharge = extraGuestCharge;
    }
    if (ownerDiscount !== undefined && ownerDiscount !== null && ownerDiscount >= 0) {
      requestBody.ownerDiscount = ownerDiscount;
    }
    if (multipleNightsDiscount !== undefined && multipleNightsDiscount !== null && multipleNightsDiscount >= 0) {
      requestBody.multipleNightsDiscount = multipleNightsDiscount;
    }
    if (couponDiscount !== undefined && couponDiscount !== null && couponDiscount >= 0) {
      requestBody.couponDiscount = couponDiscount;
    }
    if (totalDiscount !== undefined && totalDiscount !== null && totalDiscount >= 0) {
      requestBody.totalDiscount = totalDiscount;
    }
    if (gstAmount !== undefined && gstAmount !== null && gstAmount >= 0) {
      requestBody.gstAmount = gstAmount;
    }
    if (gstPercentage !== undefined && gstPercentage !== null && gstPercentage >= 0) {
      requestBody.gstPercentage = gstPercentage;
    }
    if (otaCommission !== undefined && otaCommission !== null && otaCommission >= 0) {
      requestBody.otaCommission = otaCommission;
    }
    if (bookingFields.paymentGatewayCharge !== undefined && bookingFields.paymentGatewayCharge !== null && bookingFields.paymentGatewayCharge >= 0) {
      requestBody.paymentGatewayCharge = bookingFields.paymentGatewayCharge;
    }
    if (netOwnerRevenue !== undefined && netOwnerRevenue !== null && netOwnerRevenue >= 0) {
      requestBody.netOwnerRevenue = netOwnerRevenue;
    }

    // Only include payments if there are any
    if (paymentData && paymentData.length > 0) {
      requestBody.payments = paymentData.map((p) => ({
        amount: p.amount,
        paymentDate: new Date(p.paymentDate).toISOString(),
        receiverType: p.receiverType ?? "PLATFORM",
        paymentFor: p.paymentFor,
        paymentMethod: p.paymentMethod,
        paymentInstrument: p.paymentInstrument,
        paymentReference: p.paymentReference ?? undefined,
        bankName: p.bankName ?? undefined,
        bankAccountNumber: p.bankAccountNumber ?? undefined,
        bankAccountHolderName: p.bankAccountHolderName ?? undefined,
        bankIfsc: p.bankIfsc ?? undefined,
        bankNickname: p.bankNickname ?? undefined,
        paymentGateway: p.paymentMethod === "PG" ? p.paymentGateway ?? "RAZORPAY" : undefined,
        gatewayPaymentId: p.gatewayPaymentId ?? undefined,
        gatewayFee: p.gatewayFee ?? undefined,
      }));
    }

    console.log(`[Admin Panel] Updating booking via API: /api/booking/admin/update/${bookingId}`);
    console.log('[Admin Panel] Request body:', JSON.stringify(requestBody, null, 2));

    const result = await apiPatch(`/api/booking/admin/update/${bookingId}`, requestBody, { token });

    if (!result.success) {
      throw new Error(result.message || 'Failed to update booking');
    }

    console.log(`[Admin Panel] ✅ Booking updated successfully: ${bookingId}`);

    revalidatePath("/admin");
    return { success: "Booking updated" };
  } catch (err) {
    console.error('[Admin Panel] Error updating booking:', err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: BOOKINGS_ERRORS.updateFailed };
  }
};

export const cancelBooking = async (
  bookingId: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const {
      refundAmount,
      refundStatus,
      cancellationType,
      referencePersonId,
      refundMethodChoice,
    } = parseCancellationFormData(formData);

    // Get Firebase token for API authentication
    const token = await getAuthToken();

    const requestBody = {
      refundAmount,
      refundStatus,
      cancellationType,
      referencePersonId: referencePersonId || undefined,
      refundMethodChoice,
    };

    console.log(`[Admin Panel] Cancelling booking via API: /api/booking/admin/cancel/${bookingId}`);

    const result = await apiPost(`/api/booking/admin/cancel/${bookingId}`, requestBody, { token });

    if (!result.success) {
      throw new Error(result.message || 'Failed to cancel booking');
    }

    console.log(`[Admin Panel] ✅ Booking cancelled successfully: ${bookingId}`);

    revalidatePath("/admin");
    return { success: result.message || "Booking cancelled successfully" };
  } catch (err) {
    console.error('[Admin Panel] Error cancelling booking:', err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: BOOKINGS_ERRORS.cancelFailed };
  }
};

export const cancelPendingOfflineBooking = async (input: {
  bookingId: string;
  brandId?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!input.bookingId) {
      throw new Error("Booking id is required");
    }

    const token = await getAuthToken();
    const result = await apiPost(
      `/api/booking/admin/${input.bookingId}/cancel-pending-offline`,
      {
        brandId: input.brandId,
      },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to cancel pending offline booking");
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    return { success: result.message || "Pending offline booking cancelled successfully" };
  } catch (err) {
    console.error("[Admin Panel] Error cancelling pending offline booking:", err);
    captureError(err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to cancel pending offline booking",
    };
  }
};

export type ReservationLifecycleActionStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export const transitionReservationLifecycle = async (input: {
  bookingId: string;
  brandId?: string;
  nextStatus: ReservationLifecycleActionStatus;
  note?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!input.bookingId) {
      throw new Error("Booking id is required");
    }

    const token = await getAuthToken();
    const result = await apiPatch<{
      success?: boolean;
      data?: { status?: string };
      message?: string;
    }>(
      `/api/booking/admin/${input.bookingId}/reservation-lifecycle`,
      {
        brandId: input.brandId,
        nextStatus: input.nextStatus,
        note: input.note?.trim() || undefined,
      },
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to update reservation lifecycle");
    }

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error updating reservation lifecycle:", err);
    captureError(err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to update reservation lifecycle",
    };
  }
};

export const updateReservationAssignment = async (input: {
  bookingId: string;
  brandId?: string;
  assignedExecutiveAdminId?: string | null;
  assignedSupervisorId?: string | null;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!input.bookingId) {
      throw new Error("Booking id is required");
    }

    if (
      input.assignedExecutiveAdminId === undefined &&
      input.assignedSupervisorId === undefined
    ) {
      throw new Error("Provide an executive or supervisor assignment to update");
    }

    const token = await getAuthToken();
    const result = await apiPatch<{
      success?: boolean;
      data?: {
        assignedExecutiveAdminId?: string | null;
        assignedSupervisorId?: string | null;
      };
      message?: string;
    }>(
      `/api/booking/admin/${input.bookingId}/reservation-assignment`,
      {
        brandId: input.brandId,
        assignedExecutiveAdminId: input.assignedExecutiveAdminId,
        assignedSupervisorId: input.assignedSupervisorId,
      },
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to update reservation assignment");
    }

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${input.bookingId}`);
    return { success: result.data };
  } catch (err) {
    console.error("[Admin Panel] Error updating reservation assignment:", err);
    captureError(err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to update reservation assignment",
    };
  }
};

export const getAdminBookingsList = async (params: {
  limit: number;
  offset: number;
  includeAll?: boolean;
  searchKey?: string;
  searchValue?: string;
  bookingDateFrom?: string;
  bookingDateTo?: string;
  stayDateFrom?: string;
  stayDateTo?: string;
  propertySearch?: string;
  propertySearchType?: "code" | "name";
  bookingType?: string;
  bookingSource?: string;
  presentOnMago?: boolean;
  excludeTest?: boolean;
}) => {
  try {
    console.log("[AllBookings][Action] getAdminBookingsList called", {
      includeAll: params.includeAll,
      limit: params.limit,
      offset: params.offset,
      searchKey: params.searchKey,
      searchValue: params.searchValue,
      bookingDateFrom: params.bookingDateFrom,
      bookingDateTo: params.bookingDateTo,
      stayDateFrom: params.stayDateFrom,
      stayDateTo: params.stayDateTo,
      propertySearch: params.propertySearch,
      propertySearchType: params.propertySearchType,
      bookingType: params.bookingType,
      bookingSource: params.bookingSource,
      presentOnMago: params.presentOnMago,
      excludeTest: params.excludeTest,
    });

    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    // Get Firebase token for API authentication
    const token = await getAuthToken();

    // Prepare request body with validated parameters
    const requestBody: any = {
      limit: params.limit,
      offset: params.offset,
    };

    if (params.includeAll !== undefined) {
      requestBody.includeAll = params.includeAll;
    }

    // Add optional parameters only if they are defined
    if (params.searchKey) {
      requestBody.searchKey = params.searchKey;
    }
    if (params.searchValue) {
      requestBody.searchValue = params.searchValue;
    }
    if (params.bookingDateFrom) {
      requestBody.bookingDateFrom = params.bookingDateFrom;
    }
    if (params.bookingDateTo) {
      requestBody.bookingDateTo = params.bookingDateTo;
    }
    if (params.stayDateFrom) {
      requestBody.stayDateFrom = params.stayDateFrom;
    }
    if (params.stayDateTo) {
      requestBody.stayDateTo = params.stayDateTo;
    }
    if (params.propertySearch) {
      requestBody.propertySearch = params.propertySearch;
    }
    if (params.propertySearchType) {
      requestBody.propertySearchType = params.propertySearchType;
    }
    if (params.bookingType) {
      requestBody.bookingType = params.bookingType;
    }
    if (params.bookingSource) {
      requestBody.bookingSource = params.bookingSource;
    }
    if (params.presentOnMago !== undefined) {
      requestBody.presentOnMago = params.presentOnMago;
    }
    if (params.excludeTest !== undefined) {
      requestBody.excludeTest = params.excludeTest;
    }

    if (params.includeAll) {
      // includeAll is handled at service layer by skipping brandId constraint.
      // One call is enough; no cross-brand fan-out required.
      const response = await apiPost<any>("/api/booking/admin/list", requestBody, {
        token,
        appType: "INSTAFARMS_ADMIN",
      });
      const rows = Array.isArray(response?.data) ? response.data : [];
      console.log("[AllBookings][Action] includeAll single-call result", { count: rows.length });
      return { success: rows };
    }

    // Default single-brand flow
    const response = await apiPost<any>("/api/booking/admin/list", requestBody, { token });
    console.log("[AllBookings][Action] Single-brand fetch result", {
      count: Array.isArray(response?.data) ? response.data.length : 0,
    });
    return { success: response?.data || [] };
  } catch (err) {
    console.error('[Admin Panel] Error fetching bookings list:', err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchFailed };
  }
};

export const getCustomerBookings = async (
  customerId: string,
  options?: {
    brandName?: CustomerBrandName;
    limit?: number;
  }
): Promise<{ success?: CustomerBookingListItem[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    if (!customerId) {
      return { error: "Customer id is required." };
    }

    const token = await getAuthToken();
    const requestedLimit = options?.limit ?? 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const appType =
      options?.brandName === CUSTOMER_BRANDS.MAGO ? "MAGO_ADMIN" : "INSTAFARMS_ADMIN";

    const response = await apiGet<{ data?: CustomerBookingListItem[] }>(
      `/api/booking/admin/customer/${customerId}/bookings?limit=${encodeURIComponent(String(limit))}`,
      {
        token,
        appType,
      }
    );

    return { success: Array.isArray(response?.data) ? response.data : [] };
  } catch (err) {
    console.error("[Admin Panel] Error fetching customer bookings:", err);
    captureError(err);
    return {
      error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchFailed,
    };
  }
};

export const getAdminBookingRequestsList = async (params: {
  limit: number;
  offset: number;
  searchKey?: "Property Code" | "Property Name";
  searchValue?: string;
  statuses?: Array<"AWAITING_APPROVAL" | "CONFIRMED" | "REJECTED">;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const requestBody: {
      limit: number;
      offset: number;
      searchKey?: "Property Code" | "Property Name";
      searchValue?: string;
      statuses?: Array<"AWAITING_APPROVAL" | "CONFIRMED" | "REJECTED">;
    } = {
      limit: params.limit,
      offset: params.offset,
    };

    if (params.searchKey && params.searchValue) {
      requestBody.searchKey = params.searchKey;
      requestBody.searchValue = params.searchValue;
    }

    if (params.statuses && params.statuses.length > 0) {
      requestBody.statuses = params.statuses;
    }

    const response = await apiPost("/api/booking/admin/requests/list", requestBody, {
      token,
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to fetch booking requests");
    }

    return { success: response.data || [] };
  } catch (err) {
    console.error("[Admin Panel] Error fetching booking requests:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchFailed };
  }
};

export const getBookingRequestById = async (bookingRequestId: string) => {
  try {
    await isAdmin();

    const token = await getAuthToken();
    const response = await apiGet(`/api/booking/admin/requests/${bookingRequestId}`, { token });

    if (!response.success) {
      throw new Error(response.message || "Booking request not found");
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("[Admin Panel] Error getting booking request:", error);
    captureError(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getAdminBlockingList = async (params: {
  limit: number;
  offset: number;
  includeAll?: boolean;
  searchKey?: "Property Code" | "Property Name";
  searchValue?: string;
  bookingDateFrom?: string;
  bookingDateTo?: string;
  stayDateFrom?: string;
  stayDateTo?: string;
  propertySearch?: string;
  propertySearchType?: "code" | "name";
  presentOnMago?: boolean;
  excludeTest?: boolean;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const requestBody: any = {
      limit: params.limit,
      offset: params.offset,
    };

    if (params.includeAll !== undefined) {
      requestBody.includeAll = params.includeAll;
    }
    if (params.searchKey) {
      requestBody.searchKey = params.searchKey;
    }
    if (params.searchValue) {
      requestBody.searchValue = params.searchValue;
    }
    if (params.bookingDateFrom) {
      requestBody.bookingDateFrom = params.bookingDateFrom;
    }
    if (params.bookingDateTo) {
      requestBody.bookingDateTo = params.bookingDateTo;
    }
    if (params.stayDateFrom) {
      requestBody.stayDateFrom = params.stayDateFrom;
    }
    if (params.stayDateTo) {
      requestBody.stayDateTo = params.stayDateTo;
    }
    if (params.propertySearch) {
      requestBody.propertySearch = params.propertySearch;
    }
    if (params.propertySearchType) {
      requestBody.propertySearchType = params.propertySearchType;
    }
    if (params.presentOnMago !== undefined) {
      requestBody.presentOnMago = params.presentOnMago;
    }
    if (params.excludeTest !== undefined) {
      requestBody.excludeTest = params.excludeTest;
    }

    const response = await apiPost<any>("/api/booking/admin/blocking/list", requestBody, {
      token,
      appType: "INSTAFARMS_ADMIN",
    });

    return { success: response?.data || [] };
  } catch (err) {
    console.error("[Admin Panel] Error fetching blocking list:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchFailed };
  }
};

export const createAdminBlocking = async (formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const brandId = formData.get("brandId")?.toString().trim() || "";
    const propertyId = formData.get("propertyId")?.toString().trim() || "";
    const startDate = formData.get("startDate")?.toString().trim() || "";
    const endDate = formData.get("endDate")?.toString().trim() || "";
    const blockingType =
      formData.get("blockingType")?.toString().trim() || "PERMANENT";
    const blockingSource = formData.get("blockingSource")?.toString().trim() || "ADMIN";
    const blockingReasonId =
      formData.get("blockingReasonId")?.toString().trim() || "";
    const blockingReasonNotes =
      formData.get("blockingReasonNotes")?.toString().trim() || undefined;
    const chargeOwnerRentRaw = formData.get("chargeOwnerRent")?.toString();
    const chargeOwnerRent = chargeOwnerRentRaw === "true";
    const ownerRentRateRaw = formData.get("ownerRentRatePerNight")?.toString().trim();
    const ownerRentRatePerNight = chargeOwnerRent
      ? Number(ownerRentRateRaw || 0)
      : null;

    if (!brandId) {
      return { error: "Please select a brand" };
    }
    if (!propertyId) {
      return { error: "Please select a property" };
    }
    if (!startDate || !endDate) {
      return { error: "Please select date range" };
    }
    if (!blockingReasonId) {
      return { error: "Please select a blocking reason" };
    }
    if (chargeOwnerRent) {
      if (blockingSource !== "OWNER") {
        return {
          error: "Owner block rent can only be charged when source is OWNER",
        };
      }
      if (!Number.isFinite(ownerRentRatePerNight) || (ownerRentRatePerNight ?? 0) <= 0) {
        return {
          error: "Enter a positive owner rent rate per night to charge rent",
        };
      }
    }

    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/booking/admin/blocking/create",
      {
        brandId,
        propertyId,
        startDate,
        endDate,
        blockingType,
        blockingSource,
        blockingReasonId,
        blockingReasonNotes,
        chargeOwnerRent,
        ownerRentRatePerNight,
      },
      {
        token,
        appType: "INSTAFARMS_ADMIN",
      }
    );

    if (!response.success) {
      throw new Error(response.message || "Failed to create blocking");
    }

    revalidatePath("/admin/bookings/blocking");
    revalidatePath("/admin/bookings");

    return { success: "Blocking created successfully." };
  } catch (err) {
    console.error("[Admin Panel] Error creating blocking:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create blocking" };
  }
};

export type ReservationDraftBranchKind =
  | "GUEST"
  | "OWNER"
  | "PROPERTY_BLOCK"
  | "ENQUIRY";

export const saveReservationDraft = async (input: {
  draftId?: string;
  brandId?: string | null;
  branchKind: ReservationDraftBranchKind;
  payload: Record<string, unknown>;
}): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/booking/admin/reservation-drafts",
      input,
      { token, appType: "INSTAFARMS_ADMIN" },
    );
    if (!response.success) throw new Error(response.message || "Failed to save reservation draft");
    revalidatePath("/admin/bookings/drafts");
    return { success: "Reservation draft saved.", data: response.data };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to save reservation draft" };
  }
};

export const getReservationDrafts = async (): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    const token = await getAuthToken();
    const response = await apiGet<any>("/api/booking/admin/reservation-drafts", {
      token,
      appType: "INSTAFARMS_ADMIN",
      cache: "no-store",
    });
    if (!response.success) throw new Error(response.message || "Failed to fetch reservation drafts");
    return { success: response.data || [] };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to fetch reservation drafts" };
  }
};

export const getReservationDraft = async (draftId: string): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    if (!draftId) return { error: "Invalid draft id" };
    const token = await getAuthToken();
    const response = await apiGet<any>(`/api/booking/admin/reservation-drafts/${draftId}`, {
      token,
      appType: "INSTAFARMS_ADMIN",
      cache: "no-store",
    });
    if (!response.success) throw new Error(response.message || "Failed to fetch reservation draft");
    return { success: response.data };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to fetch reservation draft" };
  }
};

export const discardReservationDraft = async (draftId: string): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    if (!draftId) return { error: "Invalid draft id" };
    const token = await getAuthToken();
    const response = await apiPatch<any>(
      `/api/booking/admin/reservation-drafts/${draftId}/discard`,
      {},
      { token, appType: "INSTAFARMS_ADMIN" },
    );
    if (!response.success) throw new Error(response.message || "Failed to discard reservation draft");
    revalidatePath("/admin/bookings/drafts");
    return { success: "Reservation draft discarded." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to discard reservation draft" };
  }
};

export const discardAllReservationDrafts = async (): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    const token = await getAuthToken();
    const list = await apiGet<any>("/api/booking/admin/reservation-drafts", {
      token,
      appType: "INSTAFARMS_ADMIN",
      cache: "no-store",
    });
    if (!list.success) throw new Error(list.message || "Failed to fetch reservation drafts");
    const drafts: Array<{ id: string; status: string }> = Array.isArray(list.data) ? list.data : [];
    const activeIds = drafts.filter((d) => d.status === "DRAFT").map((d) => d.id);

    const results = await Promise.all(
      activeIds.map((id) =>
        apiPatch<any>(`/api/booking/admin/reservation-drafts/${id}/discard`, {}, { token, appType: "INSTAFARMS_ADMIN" }),
      ),
    );
    const failed = results.filter((r) => !r.success).length;

    revalidatePath("/admin/bookings/drafts");
    if (failed > 0) {
      return { error: `Discarded ${activeIds.length - failed} of ${activeIds.length} draft(s); ${failed} failed.` };
    }
    return { success: `Discarded ${activeIds.length} draft(s).` };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to discard reservation drafts" };
  }
};

export const createReservationPropertyBlock = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };

    const brandId = formData.get("brandId")?.toString().trim() || "";
    const propertyId = formData.get("propertyId")?.toString().trim() || "";
    const startDate = formData.get("startDate")?.toString().trim() || "";
    const endDate = formData.get("endDate")?.toString().trim() || "";
    const blockingType = formData.get("blockingType")?.toString().trim() || "PERMANENT";
    const reason = formData.get("reason")?.toString().trim() || "";
    const notes = formData.get("notes")?.toString().trim() || undefined;
    const roomId = formData.get("roomId")?.toString().trim() || null;

    if (!brandId || !propertyId || !startDate || !endDate || !reason) {
      return { error: "Brand, property, dates and block reason are required" };
    }

    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/booking/admin/reservation/property-block",
      { brandId, propertyId, startDate, endDate, blockingType, reason, notes, roomId },
      { token, appType: "INSTAFARMS_ADMIN" },
    );
    if (!response.success) throw new Error(response.message || "Failed to create property block");

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/bookings/blocking");
    return { success: "Property block created successfully.", data: response.data };
  } catch (err) {
    console.error("[Admin Panel] Error creating reservation property block:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create property block" };
  }
};

export const createOwnerReservation = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };

    const brandId = formData.get("brandId")?.toString().trim() || "";
    const propertyId = formData.get("propertyId")?.toString().trim() || "";
    const ownerId = formData.get("ownerId")?.toString().trim() || "";
    const startDate = formData.get("startDate")?.toString().trim() || "";
    const endDate = formData.get("endDate")?.toString().trim() || "";
    const ownerStayType = formData.get("ownerStayType")?.toString().trim() || "";
    const guestName = formData.get("guestName")?.toString().trim() || undefined;
    const guestMobile = formData.get("guestMobile")?.toString().trim() || undefined;
    const guestCountRaw = formData.get("guestCount")?.toString().trim();
    const bookingAmountRaw = formData.get("bookingAmount")?.toString().trim();
    const advanceAmountRaw = formData.get("advanceAmount")?.toString().trim();
    const guestCount = guestCountRaw ? Number(guestCountRaw) : undefined;
    const bookingAmount = bookingAmountRaw ? Number(bookingAmountRaw) : undefined;
    const advanceAmount = advanceAmountRaw ? Number(advanceAmountRaw) : undefined;
    const internalNotes = formData.get("internalNotes")?.toString().trim() || undefined;

    if (!brandId || !propertyId || !ownerId || !startDate || !endDate) {
      return { error: "Brand, property, owner and dates are required" };
    }
    if (ownerStayType !== "SELF" && ownerStayType !== "GUEST") {
      return { error: "Select owner self stay or owner guest stay" };
    }
    if (ownerStayType === "GUEST" && (!guestName || !guestMobile || !guestCount)) {
      return { error: "Owner guest stay requires guest name, mobile and guest count" };
    }
    if ([guestCount, bookingAmount, advanceAmount].some((value) => value !== undefined && !Number.isFinite(value))) {
      return { error: "Enter valid numeric amounts and guest count" };
    }

    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/booking/admin/reservation/owner",
      {
        brandId,
        propertyId,
        ownerId,
        startDate,
        endDate,
        ownerStayType,
        guestName,
        guestMobile,
        guestCount,
        bookingAmount,
        advanceAmount,
        internalNotes,
      },
      { token, appType: "INSTAFARMS_ADMIN" },
    );
    if (!response.success) throw new Error(response.message || "Failed to create owner reservation");

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/bookings/blocking");
    return { success: "Owner reservation created successfully.", data: response.data };
  } catch (err) {
    console.error("[Admin Panel] Error creating owner reservation:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create owner reservation" };
  }
};

export const createReservationEnquiry = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };

    const brandId = formData.get("brandId")?.toString().trim() || "";
    const guestName = formData.get("guestName")?.toString().trim() || "";
    const email = formData.get("email")?.toString().trim() || "";
    const mobile = formData.get("mobile")?.toString().trim() || undefined;
    const guestCountRaw = formData.get("guestCount")?.toString().trim();
    const guestCount = guestCountRaw ? Number(guestCountRaw) : undefined;
    const checkinDate = formData.get("checkinDate")?.toString().trim() || undefined;
    const checkoutDate = formData.get("checkoutDate")?.toString().trim() || undefined;
    const requirements = formData.get("requirements")?.toString().trim() || "";
    const followUpNote = formData.get("followUpNote")?.toString().trim() || undefined;
    const suggestedPropertiesRaw = formData.get("suggestedProperties")?.toString() || "[]";
    let suggestedProperties: Array<{ propertyId: string; notes?: string }>;

    try {
      suggestedProperties = JSON.parse(suggestedPropertiesRaw);
    } catch {
      return { error: "Suggested properties are invalid" };
    }

    if (!brandId || !guestName || !email || !requirements) {
      return { error: "Brand, guest name, email and requirements are required" };
    }
    if (guestCount !== undefined && (!Number.isInteger(guestCount) || guestCount <= 0)) {
      return { error: "Guest count must be a positive whole number" };
    }
    if ((checkinDate && !checkoutDate) || (!checkinDate && checkoutDate)) {
      return { error: "Select both check-in and check-out dates" };
    }

    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/booking/admin/reservation-enquiry",
      {
        brandId,
        guestName,
        email,
        mobile,
        guestCount,
        checkinDate,
        checkoutDate,
        requirements,
        followUpNote,
        suggestedProperties,
      },
      { token, appType: "INSTAFARMS_ADMIN" },
    );
    if (!response.success) throw new Error(response.message || "Failed to create reservation enquiry");

    revalidatePath("/admin/requests/enquiries");
    return { success: "Reservation enquiry created successfully.", data: response.data };
  } catch (err) {
    console.error("[Admin Panel] Error creating reservation enquiry:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create reservation enquiry" };
  }
};

export const getAdminBlockingById = async (blockingId: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: BOOKINGS_ERRORS.unauthorized };

    const token = await getAuthToken();
    const response = await apiGet<any>(`/api/booking/admin/blocking/${blockingId}`, { token });
    return { success: response.data };
  } catch (err) {
    console.error("[Admin Panel] Error fetching blocking:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch blocking" };
  }
};

export const updateICalBlockingCommercialInfo = async (
  blockingId: string,
  data: {
    customerId?: string | null;
    icalBookingAmountWithGst?: number | null;
    icalBookingGst?: number | null;
    icalNetBookingAmount?: number | null;
    icalOtaCommission?: number | null;
  }
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: BOOKINGS_ERRORS.unauthorized };

    const token = await getAuthToken();
    await apiPatch(`/api/booking/admin/blocking/${blockingId}/commercial-info`, data, { token });

    revalidatePath(`/admin/bookings/blocking/${blockingId}`);
    revalidatePath("/admin/bookings/blocking");
    return { success: "Commercial info updated successfully." };
  } catch (err) {
    console.error("[Admin Panel] Error updating iCal commercial info:", err);
    return { error: err instanceof Error ? err.message : "Failed to update commercial info" };
  }
};

export const getAdminArchivedBookingsList = async (params: {
  limit: number;
  offset: number;
  searchKey?: string;
  searchValue?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const requestBody: any = {
      limit: params.limit,
      offset: params.offset,
    };
    if (params.searchKey) requestBody.searchKey = params.searchKey;
    if (params.searchValue) requestBody.searchValue = params.searchValue;

    const response = await apiPost("/api/booking/admin/archived", requestBody, { token });

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch archived bookings');
    }

    return { success: response.data || [] };
  } catch (err) {
    console.error('[Admin Panel] Error fetching archived bookings:', err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchArchivedFailed };
  }
};

export const getAdminCancelledBookingsList = async (params: {
  limit: number;
  offset: number;
  searchKey?: string;
  searchValue?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const requestBody: any = {
      limit: params.limit,
      offset: params.offset,
    };
    if (params.searchKey) requestBody.searchKey = params.searchKey;
    if (params.searchValue) requestBody.searchValue = params.searchValue;

    const response = await apiPost("/api/booking/admin/cancelled", requestBody, { token });

    if (!response.success) {
      throw new Error(response.message || BOOKINGS_ERRORS.fetchCancelledFailed);
    }

    return { success: response.data || [] };
  } catch (err) {
    console.error('[Admin Panel] Error fetching cancelled bookings:', err);
    captureError(err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.fetchCancelledFailed };
  }
};

export const updateRefundStatus = async (
  bookingId: string,
  newStatus: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();
    const data = await apiPost<{ success?: boolean; message?: string }>(
      `/api/booking/admin/updateRefundStatus/${bookingId}`,
      { refundStatus: newStatus },
      { token }
    );

    if (!data?.success) {
      throw new Error((data as any)?.message || "Failed to update refund status");
    }

    revalidatePath("/admin/bookings/cancellations");
    revalidatePath("/admin/cancellations");
    return { success: `Refund status updated to ${newStatus}` };
  } catch (err) {
    captureError(err);
    return {
      error: err instanceof Error ? err.message : "Failed to update refund status",
    };
  }
};

/**
 * Admin: execute deferred Razorpay refund for a cancellation request.
 * Calls POST /api/booking/admin/cancellations/:id/process-refund
 */
export const processCancellationRefund = async (
  cancellationId: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!cancellationId) {
      throw new Error("Cancellation ID is required");
    }

    const token = await getAuthToken();
    const data = await apiPost<{
      success?: boolean;
      message?: string;
      data?: {
        refundAmount?: number;
        refundStatus?: string;
        razorpayRefundId?: string | null;
        razorpayPaymentId?: string | null;
      };
    }>(
      `/api/booking/admin/cancellations/${cancellationId}/process-refund`,
      { refundMethodChoice: "RAZORPAY" },
      { token }
    );

    if (!data?.success) {
      throw new Error(
        (data as any)?.message || "Failed to process Razorpay refund"
      );
    }

    revalidatePath("/admin/bookings/cancellations");
    revalidatePath("/admin/cancellations");

    const refundAmount = data.data?.refundAmount;
    const amountLabel =
      refundAmount != null && Number.isFinite(Number(refundAmount))
        ? ` Amount: ₹${Number(refundAmount).toLocaleString("en-IN")}.`
        : "";

    return {
      success:
        data.message || `Razorpay refund processed successfully.${amountLabel}`,
      data: {
        refundAmount: data.data?.refundAmount ?? null,
        refundStatus: data.data?.refundStatus ?? "COMPLETED",
        razorpayRefundId: data.data?.razorpayRefundId ?? null,
        razorpayPaymentId: data.data?.razorpayPaymentId ?? null,
      },
    };
  } catch (err) {
    captureError(err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to process Razorpay refund",
    };
  }
};

export const getBookingById = async (bookingId: string) => {
  try {
    await isAdmin(); // Ensure admin access

    const token = await getAuthToken();

    // Call API route to get booking details (includes booking, payments, logs, notifications)
    const response = await apiGet(`/api/booking/admin/${bookingId}`, { token });

    if (!response.success) {
      throw new Error(response.message || "Booking not found");
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Admin Panel] Error getting booking:', error);
    captureError(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

export const initiateRefund = async (
  bookingId: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/bookings/adminCancelBooking/${bookingId}`,
      {
        method: "GET",
        headers: {
          "X-App-Type": "INSTAFARMS_ADMIN",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to initiate refund");
    }

    revalidatePath("/admin/cancellations");
    return {
      success: `Refund initiated successfully. Amount: ₹${data.refundAmount || 0}`
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to initiate refund"
    };
  }
};

export const retryRefund = async (
  bookingId: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/retryRefund/${bookingId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Type": "INSTAFARMS_ADMIN",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to retry refund");
    }

    revalidatePath("/admin/cancellations");
    return {
      success: `Refund retry successful. Amount: ₹${data.refundAmount || 0}`
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to retry refund"
    };
  }
};

export const markManualRefund = async (
  bookingId: string
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/markManualRefund/${bookingId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Type": "INSTAFARMS_ADMIN",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to mark manual refund");
    }

    revalidatePath("/admin/cancellations");
    return { success: "Refund marked as manually completed" };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to mark manual refund"
    };
  }
};

export const getRefundStatus = async (bookingId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/bookings/refundStatus/${bookingId}`,
      {
        headers: {
          "X-App-Type": "INSTAFARMS_ADMIN",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to get refund status");
    }

    return { success: data };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to get refund status"
    };
  }
};

export const downloadBookings = async (params: {
  bookingCreationDate?: string;
  bookingDateFrom?: string;
  bookingDateTo?: string;
  bookingSource?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();

    // Prepare request body
    const requestBody: any = {};

    if (params.bookingCreationDate) {
      requestBody.bookingCreationDate = params.bookingCreationDate;
    }
    if (params.bookingDateFrom) {
      requestBody.bookingDateFrom = params.bookingDateFrom;
    }
    if (params.bookingDateTo) {
      requestBody.bookingDateTo = params.bookingDateTo;
    }
    if (params.bookingSource) {
      requestBody.bookingSource = params.bookingSource;
    }

    console.log('[Admin Panel] Downloading bookings via API: /api/booking/admin/download');

    const result = await apiPost("/api/booking/admin/download", requestBody, { token });

    if (!result.success) {
      throw new Error(result.message || BOOKINGS_ERRORS.downloadFailed);
    }

    return { success: result.data };
  } catch (err) {
    console.error('[Admin Panel] Error downloading bookings:', err);
    return { error: err instanceof Error ? err.message : BOOKINGS_ERRORS.downloadFailed };
  }
};

export const deleteBooking = async (bookingId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error('Unauthorized');
    }

    const token = await getAuthToken();
    const result = await apiDelete(`/api/booking/admin/delete/${bookingId}`, { token });

    if (!result.success) {
      throw new Error(result.message || 'Failed to delete booking');
    }

    revalidatePath('/admin/bookings');
    return { success: 'Booking deleted successfully' };
  } catch (err) {
    console.error('[Admin Panel] Error deleting booking:', err);
    return {
      error: err instanceof Error ? err.message : 'Failed to delete booking'
    };
  }
};

export const downloadBookingInvoicePdf = async (
  bookingId: string
): Promise<{ success?: ArrayBuffer; filename?: string; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token   = await getAuthToken();
    const apiBase = process.env.NEXT_PUBLIC_DEV_BASE_URL;
    if (!apiBase) throw new Error("API URL not configured");

    const url      = `${apiBase}/api/invoices/admin/${bookingId}/pdf`;
    const response = await fetch(url, {
      headers: {
        "X-App-Type": "INSTAFARMS_ADMIN",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).message ?? "Failed to generate invoice PDF");
    }

    // Get filename from Content-Disposition header if available
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const nameMatch   = disposition.match(/filename="([^"]+)"/);
    const filename    = nameMatch?.[1] ?? `invoice-${bookingId}.pdf`;

    const buffer = await response.arrayBuffer();
    return { success: buffer, filename };
  } catch (err) {
    console.error("[Admin Panel] Error downloading invoice PDF:", err);
    return { error: err instanceof Error ? err.message : "Failed to download invoice" };
  }
};

export type ImportedIcalBookingRow = {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  source: string | null;
  checkinDate: string;
  checkoutDate: string;
  summary: string | null;
  externalBookingId?: string | null;
  thirdPartyBookingId?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestCount?: number | null;
  totalAmountInclGst?: number | null;
  gstRate?: number | null;
  thirdPartyCommissionPercentage?: number | null;
  platformCommissionPercentage?: number | null;
  tdsRate?: number | null;
  dataCompletionStatus?: "PENDING" | "COMPLETED" | string | null;
  createdAt: string;
};

export const getAdminImportedIcalBookings = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<{
  success?: ImportedIcalBookingRow[];
  total?: number;
  error?: string;
}> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }

    const token = await getAuthToken();
    const params = await searchParams;
    const { limit, offset } = parseLimitOffset(params);
    const filterParams = parseFilterParams(params);
    const propertySearch = (
      typeof params.propertySearch === "string" ? params.propertySearch : filterParams?.searchValue || ""
    ).trim();

    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    qs.set("offset", String(offset));
    if (propertySearch) {
      qs.set("propertySearch", propertySearch);
    }

    const response = await apiGet(`/api/ical/admin/imported-bookings?${qs.toString()}`, { token });
    return {
      success: (response.data || []) as ImportedIcalBookingRow[],
      total: typeof response.total === "number" ? response.total : 0,
    };
  } catch (err) {
    console.error("[Admin Panel] Error fetching imported iCal bookings:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch imported iCal bookings" };
  }
};

/**
 * Client-callable variant of getAdminImportedIcalBookings for the booking
 * wizard's "Completed OTA Booking" -> "synced on iCal?" step -- that action
 * takes a Next.js searchParams Promise (built for the /admin/bookings/third-party
 * server page) which isn't a fit for a plain client-side fetch. Same
 * underlying endpoint, same real data (merged real iCal-synced `blocking`
 * rows and manually-logged `thirdPartyBookings` rows) -- just a plain
 * params object instead.
 */
export const searchOtaMatchCandidates = async (params: {
  limit?: number;
} = {}): Promise<{ success?: ImportedIcalBookingRow[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: BOOKINGS_ERRORS.unauthorized };
    }
    const token = await getAuthToken();
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit ?? 50));
    qs.set("offset", "0");
    const response = await apiGet(`/api/ical/admin/imported-bookings?${qs.toString()}`, { token });
    return { success: (response.data || []) as ImportedIcalBookingRow[] };
  } catch (err) {
    console.error("[Admin Panel] Error fetching OTA match candidates:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch iCal-synced bookings" };
  }
};

/**
 * "Completed OTA Booking" wizard submission. Blocks the property's calendar
 * and records the OTA settlement (`blocking` + `inventoryCalendar` +
 * `thirdPartyBookings`) -- deliberately NOT the same path as createBooking:
 * this booking was already confirmed and paid for on the OTA's own
 * platform, so it has no `bookings` row, no payments, and no GST/commission
 * ledger entries of its own here.
 */
export const logManualOtaBooking = async (input: {
  brandId: string;
  brandName: string;
  propertyId: string;
  channel: string;
  externalBookingId?: string;
  checkinDate: string;
  checkoutDate: string;
  guestName?: string;
  guestPhone?: string;
  guestCount?: number;
  totalAmountInclGst: number;
  thirdPartyCommissionAmount?: number;
  platformCommissionAmount?: number;
  platformCommissionGst?: number;
  gstAmount?: number;
  tdsAmount?: number;
  notes?: string;
  daywiseBreakup?: any[];
}): Promise<ServerActionResult> => {
  try {
    if (!(await isAdmin())) return { error: BOOKINGS_ERRORS.unauthorized };
    const token = await getAuthToken();
    const appType = input.brandName.toLowerCase().includes("mago") ? "MAGO_ADMIN" : "INSTAFARMS_ADMIN";
    const { brandName, ...body } = input;
    const response = await apiPost<any>("/api/ical/admin/log-manual-booking", body, { token, appType });
    if (!response.success) throw new Error(response.message || "Failed to log OTA booking");
    revalidatePath("/admin/bookings/third-party");
    return { success: "OTA booking logged.", data: response.data };
  } catch (err) {
    console.error("[Admin Panel] Error logging manual OTA booking:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to log OTA booking" };
  }
};
