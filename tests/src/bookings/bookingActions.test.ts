import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createBooking,
  createOwnerReservation,
  createReservationEnquiry,
  createReservationPropertyBlock,
  discardReservationDraft,
  getReservationDraft,
  getReservationDrafts,
  saveReservationDraft,
  getPropertyAvailability,
  transitionReservationLifecycle,
  updateReservationAssignment,
  updateBooking,
} from "@/actions/bookingActions";

import { isAdmin } from "@/utils/admin-only";
import { apiPost, apiGet, apiPatch } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/utils/admin-only");
vi.mock("@/utils/api-utils");
vi.mock("@/utils/server-utils", () => ({
  parseBookingFormData: vi.fn(),
  parseCancellationFormData: vi.fn(),
  parsePaymentFormData: vi.fn(),
}));

import {
  parseBookingFormData,
  parsePaymentFormData,
} from "@/utils/server-utils";

describe("bookingActions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "jarvis-admin-token" ? ({ value: "fake-token" } as any) : undefined,
      ),
    } as any);

    vi.mocked(isAdmin).mockResolvedValue({ id: "admin-1" } as any);

    vi.mocked(apiPost).mockResolvedValue({ success: true, data: { bookingId: "b-1" } } as any);
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: { blockedDates: [], bookedRanges: [] } } as any);
    vi.mocked(apiPatch).mockResolvedValue({ success: true, data: { bookingId: "b-1" } } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createBooking", () => {
    const baseFormData = () => {
      const formData = new FormData();
      formData.set("brandId", "brand-1");
      formData.set("brandName", "Instafarms");
      formData.set("bookingExecutionType", "OFFLINE");
      formData.set("sourceCategory", "DIRECT_BOOKING");
      formData.set("commissionBookingSourceId", "source-1");
      formData.set("reservationContext", JSON.stringify({ sourceKind: "DIRECT" }));
      return formData;
    };

    it("returns error when admin is unauthorized", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);
      (parseBookingFormData as any).mockResolvedValue({});
      (parsePaymentFormData as any).mockResolvedValue([]);

      const result = await createBooking(baseFormData());
      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("maps parse errors to validation messages", async () => {
      (parseBookingFormData as any).mockImplementationOnce(() => {
        throw new Error("Invalid Value for amount");
      });

      const result = await createBooking(baseFormData());
      expect(result).toEqual({
        error: "Please enter valid numbers in all numeric fields (guest counts, amounts, etc.)",
      });
    });

    it("returns invalid payment data when payment parse fails", async () => {
      (parseBookingFormData as any).mockReturnValue({
        entityId: "e1",
        customerId: "c1",
        bookingType: "Online",
        adultCount: 1,
        checkinDate: "2024-01-01",
        checkoutDate: "2024-01-02",
      });
      (parsePaymentFormData as any).mockImplementationOnce(() => {
        throw new Error("bad payments");
      });

      const result = await createBooking(baseFormData());
      expect(result).toEqual({
        error: "Invalid payment data. Please check payment fields.",
      });
    });

    it("calls API with mapped payload and returns success", async () => {
      (parseBookingFormData as any).mockReturnValue({
        entityId: "e1",
        customerId: "c1",
        bookingType: "Online",
        bookingSource: "Website",
        adultCount: 2,
        childrenCount: 1,
        infantCount: 0,
        checkinDate: "2024-01-01",
        checkoutDate: "2024-01-02",
        baseRentalAmountWithGst: 1000,
        extraAdultGuestChargeWithGst: 0,
        extraChildGuestChargeWithGst: 0,
        ownerDiscountValue: 0,
        multipleNightsDiscountValue: 0,
        couponDiscountValue: 0,
        totalDiscountAmount: 0,
        totalGstCollected: 180,
        instafarmsCommission: 50,
        ownerRevenue: 950,
        bookingRemarks: "",
        specialRequests: "",
      });
      (parsePaymentFormData as any).mockReturnValue([
        {
          transactionType: "Credit",
          amount: 1000,
          paymentDate: "2024-01-01",
          referencePersonId: null,
          paymentType: "Rent",
          paymentMode: "Online",
          bankName: null,
          bankAccountNumber: null,
          bankAccountHolderName: null,
          bankIfsc: null,
          bankNickname: null,
        },
      ]);

      const result = await createBooking(baseFormData());

      expect(result).toEqual(
        expect.objectContaining({ success: "Booking created." }),
      );
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/create",
        expect.objectContaining({
          brandId: "brand-1",
          propertyId: "e1",
          customerId: "c1",
          bookingType: "Offline",
          bookingExecutionType: "OFFLINE",
          bookingTechPlatform: "ADMIN_PANEL",
          sourceCategory: "DIRECT_BOOKING",
          commissionBookingSourceId: "source-1",
          reservationContext: { sourceKind: "DIRECT" },
          rentalCharge: 1000,
        }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("prefers shared calculator field names when they are present", async () => {
      (parseBookingFormData as any).mockReturnValue({
        entityId: "e1",
        customerId: "c1",
        bookingType: "Online",
        adultCount: 2,
        childrenCount: 1,
        infantCount: 0,
        checkinDate: "2024-01-01",
        checkoutDate: "2024-01-03",
        rentalCharge: 1200,
        extraGuestCharge: 300,
        ownerDiscount: 100,
        multipleNightsDiscount: 50,
        lastMinuteDiscount: 25,
        couponDiscount: 10,
        totalDiscount: 185,
        bookingAmountWithDiscountBeforeGst: 1315,
        gstAmount: 236.7,
        otaCommission: 150,
        netOwnerRevenue: 1165,
        baseRentalAmountWithGst: 9999,
        ownerRevenue: 9999,
      });
      (parsePaymentFormData as any).mockReturnValue([]);

      const result = await createBooking(baseFormData());

      expect(result).toEqual(
        expect.objectContaining({ success: "Booking created." }),
      );
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/create",
        expect.objectContaining({
          rentalCharge: 1200,
          extraGuestCharge: 300,
          ownerDiscount: 100,
          multipleNightsDiscount: 50,
          lastMinuteDiscount: 25,
          couponDiscount: 10,
          totalDiscount: 185,
          gstAmount: 236.7,
          gstPercentage: 18,
          otaCommission: 150,
          netOwnerRevenue: 1165,
        }),
        expect.any(Object),
      );
    });

    it("maps OTA commercial fields without replacing calculated platform commission", async () => {
      const formData = baseFormData();
      formData.set("sourceCategory", "THIRD_PARTY_BOOKING");
      formData.set(
        "reservationContext",
        JSON.stringify({
          sourceKind: "OTA",
          externalReference: "AIRBNB-123",
          otaGrossBookingAmount: "24000",
          otaBookingGstAmount: "1200",
          otaCommissionAmount: "3600",
          otaCommissionGstAmount: "648",
          otaCleaningCharge: "500",
          otaOtherCharge: "250",
        }),
      );
      (parseBookingFormData as any).mockReturnValue({
        entityId: "e1",
        customerId: "c1",
        adultCount: 2,
        childrenCount: 0,
        infantCount: 0,
        checkinDate: "2024-01-01",
        checkoutDate: "2024-01-03",
      });
      (parsePaymentFormData as any).mockReturnValue([]);

      await createBooking(formData);

      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/create",
        expect.objectContaining({
          reservationContext: expect.objectContaining({
            sourceKind: "OTA",
            externalReference: "AIRBNB-123",
            otaGrossBookingAmount: 24000,
            otaCommissionAmount: 3600,
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe("getPropertyAvailability", () => {
    it("returns unauthorized error when admin is not logged in", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await getPropertyAvailability("prop-1");
      expect(result).toEqual({ error: "You don't have permission to view bookings." });
    });

    it("returns success data when API call succeeds", async () => {
      vi.mocked(apiGet).mockResolvedValueOnce({
        success: true,
        data: { blockedDates: ["2024-01-02"], bookedRanges: [] },
      } as any);

      const result = await getPropertyAvailability("prop-1");
      expect(result).toEqual({
        success: { blockedDates: ["2024-01-02"], bookedRanges: [] },
      });
      expect(apiGet).toHaveBeenCalledWith(
        "/api/booking/admin/availability/prop-1",
        expect.objectContaining({ token: "fake-token" }),
      );
    });
  });

  describe("updateBooking", () => {
    const baseFormData = () => new FormData();

    it("returns error when bookingId is missing", async () => {
      const result = await updateBooking("", baseFormData());
      expect(result).toEqual({ error: "Invalid booking id" });
    });

    it("maps partial fields and calls API", async () => {
      const fd = baseFormData();
      fd.set("bookingType", "Online");

      (parseBookingFormData as any).mockReturnValue({
        bookingType: "Online",
        baseRentalAmountWithGst: 1000,
      });
      (parsePaymentFormData as any).mockResolvedValue([]);

      const result = await updateBooking("b-1", fd);

      expect(apiPatch).toHaveBeenCalledWith(
        "/api/booking/admin/update/b-1",
        expect.objectContaining({
          bookingType: "Online",
        }),
        expect.any(Object),
      );
      expect(result).toEqual(expect.objectContaining({ success: expect.any(String) }));
    });
  });

  describe("reservation operations", () => {
    it("transitions the lifecycle through the dedicated API", async () => {
      vi.mocked(apiPatch).mockResolvedValueOnce({
        success: true,
        data: { status: "CHECKED_IN" },
      } as any);

      const result = await transitionReservationLifecycle({
        bookingId: "b-1",
        brandId: "brand-1",
        nextStatus: "CHECKED_IN",
        note: "Guest arrived at reception",
      });

      expect(result).toEqual({ success: { status: "CHECKED_IN" } });
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/booking/admin/b-1/reservation-lifecycle",
        {
          brandId: "brand-1",
          nextStatus: "CHECKED_IN",
          note: "Guest arrived at reception",
        },
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("updates the executive and supervisor through the dedicated API", async () => {
      vi.mocked(apiPatch).mockResolvedValueOnce({
        success: true,
        data: {
          assignedExecutiveAdminId: "admin-2",
          assignedSupervisorId: "supervisor-1",
        },
      } as any);

      const result = await updateReservationAssignment({
        bookingId: "b-1",
        brandId: "brand-1",
        assignedExecutiveAdminId: "admin-2",
        assignedSupervisorId: "supervisor-1",
      });

      expect(result).toEqual({
        success: {
          assignedExecutiveAdminId: "admin-2",
          assignedSupervisorId: "supervisor-1",
        },
      });
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/booking/admin/b-1/reservation-assignment",
        {
          brandId: "brand-1",
          assignedExecutiveAdminId: "admin-2",
          assignedSupervisorId: "supervisor-1",
        },
        expect.objectContaining({ token: "fake-token" }),
      );
    });
  });

  describe("reservation branches", () => {
    it("creates an inventory-only property block through the reservation API", async () => {
      const formData = new FormData();
      formData.set("brandId", "brand-1");
      formData.set("propertyId", "property-1");
      formData.set("startDate", "2026-08-01");
      formData.set("endDate", "2026-08-03");
      formData.set("blockingType", "PERMANENT");
      formData.set("reason", "Maintenance");

      const result = await createReservationPropertyBlock(formData);

      expect(result).toEqual(expect.objectContaining({ success: "Property block created successfully." }));
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/reservation/property-block",
        expect.objectContaining({ reason: "Maintenance", propertyId: "property-1" }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("sends owner guest information through the isolated owner reservation API", async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries({
        brandId: "brand-1",
        propertyId: "property-1",
        ownerId: "owner-1",
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        ownerStayType: "GUEST",
        guestName: "Aarav Sharma",
        guestMobile: "9999999999",
        guestCount: "4",
        bookingAmount: "8000",
        advanceAmount: "2000",
      })) formData.set(key, value);

      const result = await createOwnerReservation(formData);

      expect(result).toEqual(expect.objectContaining({ success: "Owner reservation created successfully." }));
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/reservation/owner",
        expect.objectContaining({ ownerStayType: "GUEST", guestCount: 4, advanceAmount: 2000 }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("creates a lead-only booking enquiry with suggested properties", async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries({
        brandId: "brand-1",
        guestName: "Aarav Sharma",
        email: "aarav@example.com",
        requirements: "Family stay",
        suggestedProperties: JSON.stringify([{ propertyId: "property-1" }]),
      })) formData.set(key, value);

      const result = await createReservationEnquiry(formData);

      expect(result).toEqual(expect.objectContaining({ success: "Reservation enquiry created successfully." }));
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/reservation-enquiry",
        expect.objectContaining({ guestName: "Aarav Sharma", suggestedProperties: [{ propertyId: "property-1" }] }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });
  });

  describe("reservation drafts", () => {
    it("saves an admin-owned draft without creating a reservation", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({ success: true, data: { id: "draft-1" } } as any);

      const result = await saveReservationDraft({
        brandId: "brand-1",
        branchKind: "OWNER",
        payload: { ownerId: "owner-1" },
      });

      expect(result).toEqual({ success: "Reservation draft saved.", data: { id: "draft-1" } });
      expect(apiPost).toHaveBeenCalledWith(
        "/api/booking/admin/reservation-drafts",
        expect.objectContaining({ branchKind: "OWNER", payload: { ownerId: "owner-1" } }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("lists and retrieves only the current admin's drafts through dedicated APIs", async () => {
      vi.mocked(apiGet)
        .mockResolvedValueOnce({ success: true, data: [{ id: "draft-1" }] } as any)
        .mockResolvedValueOnce({ success: true, data: { id: "draft-1", branchKind: "OWNER" } } as any);

      await expect(getReservationDrafts()).resolves.toEqual({ success: [{ id: "draft-1" }] });
      await expect(getReservationDraft("draft-1")).resolves.toEqual({ success: { id: "draft-1", branchKind: "OWNER" } });
      expect(apiGet).toHaveBeenCalledWith(
        "/api/booking/admin/reservation-drafts/draft-1",
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("discards a draft through the dedicated API", async () => {
      await expect(discardReservationDraft("draft-1")).resolves.toEqual({ success: "Reservation draft discarded." });
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/booking/admin/reservation-drafts/draft-1/discard",
        {},
        expect.objectContaining({ token: "fake-token" }),
      );
    });
  });
});
