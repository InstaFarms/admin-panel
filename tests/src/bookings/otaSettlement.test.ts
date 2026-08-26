import { describe, expect, it } from "vitest";
import { calculateOtaSettlement } from "@/components/bookings/wizard/otaSettlement";

describe("calculateOtaSettlement", () => {
  it("derives GST and configured Mago commission from a GST-inclusive OTA total", () => {
    const settlement = calculateOtaSettlement({
      amount: "10000",
      amountInputType: "INCLUSIVE",
      checkIn: "2026-08-26",
      checkOut: "2026-08-27",
      platformCommissionPercentage: 20,
    });

    expect(settlement).toMatchObject({
      nights: 1,
      bookingGstRate: 18,
      taxableBookingAmount: 8474.58,
      bookingGstAmount: 1525.42,
      totalAmountInclGst: 10000,
      platformCommissionAmount: 1694.92,
      platformCommissionGstRate: 18,
      platformCommissionGst: 305.09,
    });
  });

  it("uses the lower slab when the GST-exclusive nightly tariff is at the configured boundary", () => {
    const settlement = calculateOtaSettlement({
      amount: "15750",
      amountInputType: "INCLUSIVE",
      checkIn: "2026-08-26",
      checkOut: "2026-08-28",
      platformCommissionPercentage: 15,
    });

    expect(settlement).toMatchObject({
      nights: 2,
      bookingGstRate: 5,
      taxableBookingAmount: 15000,
      bookingGstAmount: 750,
      platformCommissionAmount: 2250,
      platformCommissionGst: 405,
    });
  });

  it("adds GST when the OTA statement total is copied before GST", () => {
    const settlement = calculateOtaSettlement({
      amount: "10000",
      amountInputType: "EXCLUSIVE",
      checkIn: "2026-08-26",
      checkOut: "2026-08-27",
      platformCommissionPercentage: 20,
    });

    expect(settlement).toMatchObject({
      bookingGstRate: 18,
      taxableBookingAmount: 10000,
      bookingGstAmount: 1800,
      totalAmountInclGst: 11800,
      platformCommissionAmount: 2000,
      platformCommissionGst: 360,
    });
  });
});
