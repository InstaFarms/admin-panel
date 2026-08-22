"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { _PaymentData } from "@/utils/types";
import { getBookingById } from "@/actions/bookingActions";
import { v4 } from "uuid";

const createNewPayment = (): _PaymentData => ({
  id: v4(),
  bookingId: "",
  paymentDate: new Date().toISOString().split('T')[0],
  transactionType: "Credit",
  amount: 0,
  referencePersonId: "",
  paymentMode: "Cash",
  paymentType: "Rent",
  paymentMethod: "CASH",
  paymentInstrument: "OTHERS",
  paymentFor: "FULL_PAYMENT",
  paymentReference: "",
  paymentGateway: null,
  gatewayFee: 0,
  gatewayPaymentId: "",
  bankAccountHolderName: "",
  bankIfsc: "",
  bankAccountNumber: "",
  bankName: "",
  bankNickname: "",
});

const isNonEmptyString = (value: string | null | undefined) => Boolean(value && value.trim() !== "");

const isPaymentRowValid = (payment: _PaymentData): boolean => {
  if (!isNonEmptyString(payment.paymentDate)) return false;
  if (!isNonEmptyString(payment.paymentMethod)) return false;
  if (!isNonEmptyString(payment.paymentInstrument)) return false;
  if (!isNonEmptyString(payment.paymentFor)) return false;
  if (Number(payment.amount || 0) <= 0) return false;

  if (payment.paymentMethod === "BANK_TRANSFER") {
    return [
      payment.bankName,
      payment.bankAccountNumber,
      payment.bankAccountHolderName,
      payment.bankIfsc,
    ].every((field) => isNonEmptyString(field));
  }

  if (payment.paymentMethod === "PG") {
    return isNonEmptyString(payment.paymentGateway) && isNonEmptyString(payment.gatewayPaymentId);
  }

  return true;
};

export function useBookingHook(bookingId?: string | null) {
  // Basic booking fields
  const [entityId, setEntityId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [checkinDate, setCheckinDate] = useState<Date | null>(null);
  const [checkoutDate, setCheckoutDate] = useState<Date | null>(null);
  const [bookingType, setBookingType] = useState<string>("Offline");
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [infantCount, setInfantCount] = useState<number>(0);
  const [floatingAdultCount, setFloatingAdultCount] = useState<number>(0);
  const [floatingChildCount, setFloatingChildCount] = useState<number>(0);
  const [floatingInfantCount, setFloatingInfantCount] = useState<number>(0);
  const [bookingRemarks, setBookingRemarks] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");

  // Financial fields
  const [rentalCharge, setRentalCharge] = useState<number>(0);
  const [extraGuestCharge, setExtraGuestCharge] = useState<number>(0);
  const [ownerDiscount, setOwnerDiscount] = useState<number>(0);
  const [multipleNightsDiscount, setMultipleNightsDiscount] = useState<number>(0);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [gstPercentage, setGstPercentage] = useState<number>(0);
  const [otaCommission, setOtaCommission] = useState<number>(0);
  const [paymentGatewayCharge, setPaymentGatewayCharge] = useState<number>(0);
  const [netOwnerRevenue, setNetOwnerRevenue] = useState<number>(0);

  // Collections
  const [payments, setPayments] = useState<_PaymentData[]>([]);

  // Cancellation
  const [showCancellationForm, setShowCancellationForm] = useState<boolean>(false);
  const [cancellationReferencePerson, setCancellationReferencePerson] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundStatus, setRefundStatus] = useState<string>("");
  const [cancellationType, setCancellationType] = useState<string>("");

  // Availability
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [checkinBlockedDates, setCheckinBlockedDates] = useState<Date[]>([]);
  const [checkoutBlockedDates, setCheckoutBlockedDates] = useState<Date[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Full booking data (for view mode)
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<_PaymentData[]>([]);
  const [bookingLogs, setBookingLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<any[]>([]);
  const [notificationDeadLetters, setNotificationDeadLetters] = useState<any[]>([]);
  const [relatedData, setRelatedData] = useState<any>(null);
  const [bookingV2Finance, setBookingV2Finance] = useState<any>(null);

  // Derived values
  const isEditMode = !!bookingId;

  // Loading/Error
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);

  const loadBookingData = async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getBookingById(bookingId);

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch booking');
      }

      const data = result.data.booking;
      const payments = result.data.payments || [];
      const logs = result.data.logs || [];
      const bookingLogs = result.data.bookingLogs || logs;
      const notifs = result.data.notifications || [];

      // Set full data for view mode
      setBookingData(data);
      setPaymentData(payments);
      setBookingLogs(bookingLogs);
      setNotifications(notifs);
      setNotificationEvents(result.data.notificationEvents || []);
      setNotificationDeadLetters(result.data.notificationDeadLetters || []);
      setRelatedData(result.data.relatedData || null);
      setBookingV2Finance(result.data.bookingV2Finance || null);

      // Set basic fields
      setEntityId(data.propertyId);
      setCustomerId(data.customerId);
      setBookingType(data.bookingType || "");
      setAdultCount(data.adultCount || 0);
      setChildrenCount(data.childrenCount || 0);
      setInfantCount(data.infantCount || 0);
      setFloatingAdultCount(data.floatingAdultCount || 0);
      setFloatingChildCount(data.floatingChildCount || 0);
      setFloatingInfantCount(data.floatingInfantCount || 0);
      setBookingRemarks(data.bookingRemarks || "");
      setSpecialRequests(data.specialRequests || "");

      // Set dates
      setCheckinDate(data.checkinDate ? new Date(data.checkinDate + 'T00:00:00') : null);
      setCheckoutDate(data.checkoutDate ? new Date(data.checkoutDate + 'T00:00:00') : null);

      // Set financial fields
      setRentalCharge(data.baseRentalAmountWithGst ?? 0);
      const extraAdult = data.extraAdultGuestChargeWithGst ?? 0;
      const extraChild = data.extraChildGuestChargeWithGst ?? 0;
      setExtraGuestCharge(extraAdult + extraChild);
      setOwnerDiscount(data.ownerDiscountValue ?? 0);
      setMultipleNightsDiscount(data.multipleNightsDiscountValue ?? 0);
      setCouponDiscount(data.couponDiscountValue ?? 0);
      setTotalDiscount(data.totalDiscountAmount ?? 0);
      setGstAmount(data.totalGstCollected ?? 0);

      // Calculate GST percentage
      const baseRental = data.baseRentalAmountWithGst ?? 0;
      const extraGuest = extraAdult + extraChild;
      const totalDisc = data.totalDiscountAmount ?? 0;
      const gstAmt = data.totalGstCollected ?? 0;
      const baseAmount = baseRental + extraGuest - totalDisc;
      const gstPct = baseAmount > 0 ? (gstAmt / baseAmount) * 100 : 0;
      setGstPercentage(gstPct);

      setOtaCommission(data.instafarmsCommission ?? 0);
      setPaymentGatewayCharge(data.paymentGatewayCharge ?? 0);
      setNetOwnerRevenue(data.ownerRevenue ?? 0);

      // Set payments
      setPayments(payments);

      // Set cancellation data
      if (data.cancellation) {
        setShowCancellationForm(true);
        setCancellationReferencePerson(data.cancellation.referencePersonId);
        setRefundAmount(data.cancellation.refundAmount);
        setRefundStatus(data.cancellation.refundStatus);
        setCancellationType(data.cancellation.cancellationType);
      } else {
        setShowCancellationForm(false);
        setCancellationReferencePerson(null);
        setRefundAmount(0);
        setRefundStatus("");
        setCancellationType("");
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch booking';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateBookingDetails = (): string | null => {
    if (!isEditMode) {
      if (!entityId || entityId.trim() === "") {
        return "Please select a property";
      }

      if (!customerId || customerId.trim() === "") {
        return "Please select a customer";
      }

      if (!checkinDate) {
        return "Please select check-in date";
      }

      if (!checkoutDate) {
        return "Please select check-out date";
      }

      if (checkinDate >= checkoutDate) {
        return "Check-out date must be after check-in date";
      }
    }

    if (adultCount < 0) {
      return "Adult count cannot be negative";
    }

    if (!isEditMode && adultCount < 1) {
      return "At least 1 adult is required";
    }

    if (childrenCount < 0) {
      return "Children count cannot be negative";
    }

    if (infantCount < 0) {
      return "Infant count cannot be negative";
    }

    return null;
  };

  const validatePayments = (): string | null => {
    if (isEditMode) return null;

    if (payments.length === 0) {
      return "Add at least one payment to create this booking";
    }

    const invalidPayment = payments.find((payment) => !isPaymentRowValid(payment));
    if (!invalidPayment) {
      return null;
    }

    if (
      invalidPayment.paymentMode === "Online" &&
      (!isNonEmptyString(invalidPayment.bankName) ||
        !isNonEmptyString(invalidPayment.bankAccountNumber) ||
        !isNonEmptyString(invalidPayment.bankAccountHolderName) ||
        !isNonEmptyString(invalidPayment.bankIfsc))
    ) {
      return "Online payments require bank name, account number, account holder name, and IFSC";
    }

    return "Complete all required fields in every payment row before creating this booking";
  };

  const validateBookingForm = (): string | null => {
    return validateBookingDetails() ?? validatePayments();
  };

  // Fetch booking data
  useEffect(() => {
    if (!bookingId) return;

    loadBookingData();
  }, [bookingId]);

  // Payment CRUD helper functions
  const addPayment = () => {
    setPayments([...payments, createNewPayment()]);
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter((x) => x.id !== id));
  };

  const updatePayment = (payment: _PaymentData) => {
    setPayments(payments.map((x) => (x.id === payment.id ? payment : x)));
  };

const handleDownloadInvoice = async () => {
  if (!bookingId) return;

  setIsLoadingInvoice(true);
  try {
    const { downloadBookingInvoicePdf } = await import("@/actions/bookingActions");
    const result = await downloadBookingInvoicePdf(bookingId);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.success && result.filename) {
      // Create a real download — no blob tab, no popup blockers
      const blob    = new Blob([result.success], { type: "application/pdf" });
      const url     = URL.createObjectURL(blob);
      const anchor  = document.createElement("a");
      anchor.href     = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to download invoice");
  } finally {
    setIsLoadingInvoice(false);
  }
};

  return {
    // Basic fields
    entityId, setEntityId,
    customerId, setCustomerId,
    checkinDate, setCheckinDate,
    checkoutDate, setCheckoutDate,
    bookingType, setBookingType,
    adultCount, setAdultCount,
    childrenCount, setChildrenCount,
    infantCount, setInfantCount,
    floatingAdultCount, setFloatingAdultCount,
    floatingChildCount, setFloatingChildCount,
    floatingInfantCount, setFloatingInfantCount,
    bookingRemarks, setBookingRemarks,
    specialRequests, setSpecialRequests,

    // Financial fields
    rentalCharge, setRentalCharge,
    extraGuestCharge, setExtraGuestCharge,
    ownerDiscount, setOwnerDiscount,
    multipleNightsDiscount, setMultipleNightsDiscount,
    couponDiscount, setCouponDiscount,
    totalDiscount, setTotalDiscount,
    gstAmount, setGstAmount,
    gstPercentage, setGstPercentage,
    otaCommission, setOtaCommission,
    paymentGatewayCharge, setPaymentGatewayCharge,
    netOwnerRevenue, setNetOwnerRevenue,

    // Collections
    payments, setPayments,
    addPayment,
    removePayment,
    updatePayment,

    // Cancellation
    showCancellationForm, setShowCancellationForm,
    cancellationReferencePerson, setCancellationReferencePerson,
    refundAmount, setRefundAmount,
    refundStatus, setRefundStatus,
    cancellationType, setCancellationType,

    // Availability
    blockedDates, setBlockedDates,
    checkinBlockedDates, setCheckinBlockedDates,
    checkoutBlockedDates, setCheckoutBlockedDates,
    isLoadingAvailability, setIsLoadingAvailability,

    // Full data (for view mode)
    bookingData,
    paymentData,
    bookingLogs,
    notifications,
    notificationEvents,
    notificationDeadLetters,
    relatedData,
    bookingV2Finance,

    // Derived values
    isEditMode,

    // Validation
    validateBookingDetails,
    validatePayments,
    validateBookingForm,
    isPaymentRowValid,

    // Loading/Error
    loading,
    error,

    isLoadingInvoice,
    handleDownloadInvoice,
    refreshBookingData: loadBookingData,
  };
}
