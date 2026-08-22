import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLastMinuteDiscountPlanForm } from "@/hooks/useLastMinuteDiscountPlanForm";
import { LAST_MINUTE_DISCOUNT_PLANS_VALIDATION } from "@/constants/last-minute-discount-plans";

describe("useLastMinuteDiscountPlanForm", () => {
  it("validates a complete percentage tier", () => {
    const { result } = renderHook(() =>
      useLastMinuteDiscountPlanForm({
        name: "Weekend Saver",
        discountTiers: [
          {
            thresholdDays: 3,
            discountType: "percentage",
            discountPercentage: "10",
            flatDiscount: "",
            maxDiscountAmount: "1000",
          },
        ],
      })
    );

    act(() => {
      expect(result.current.validate()).toBe(true);
    });
  });

  it("enforces exactly one discount type", () => {
    const { result } = renderHook(() =>
      useLastMinuteDiscountPlanForm({
        name: "Weekend Saver",
        discountTiers: [
          {
            thresholdDays: 3,
            discountType: "percentage",
            discountPercentage: "10",
            flatDiscount: "500",
            maxDiscountAmount: "0",
          },
        ],
      })
    );

    act(() => {
      expect(result.current.validate()).toBe(false);
    });

    expect(result.current.errors["tier-0-discountPercentage"]).toBe(
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierIncomplete
    );
  });

  it("rejects duplicate threshold days", () => {
    const { result } = renderHook(() =>
      useLastMinuteDiscountPlanForm({
        name: "Weekend Saver",
        discountTiers: [
          {
            thresholdDays: 3,
            discountType: "percentage",
            discountPercentage: "10",
            flatDiscount: "",
            maxDiscountAmount: "0",
          },
          {
            thresholdDays: 3,
            discountType: "flat",
            discountPercentage: "",
            flatDiscount: "500",
            maxDiscountAmount: "0",
          },
        ],
      })
    );

    act(() => {
      expect(result.current.validate()).toBe(false);
    });

    expect(result.current.errors["tier-0-thresholdDays"]).toBe(
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays
    );
    expect(result.current.errors["tier-1-thresholdDays"]).toBe(
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays
    );
  });

  it("checks duplicate threshold days while editing tiers", () => {
    const { result } = renderHook(() =>
      useLastMinuteDiscountPlanForm({
        name: "Weekend Saver",
        discountTiers: [
          {
            thresholdDays: 3,
            discountType: "percentage",
            discountPercentage: "10",
            flatDiscount: "",
            maxDiscountAmount: "0",
          },
          {
            thresholdDays: 5,
            discountType: "flat",
            discountPercentage: "",
            flatDiscount: "500",
            maxDiscountAmount: "0",
          },
        ],
      })
    );

    act(() => {
      result.current.updateDiscountTier(1, "thresholdDays", 3);
    });

    expect(result.current.errors["tier-0-thresholdDays"]).toBe(
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays
    );
    expect(result.current.errors["tier-1-thresholdDays"]).toBe(
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays
    );
  });

  it("clears the opposite discount field when switching type", () => {
    const { result } = renderHook(() =>
      useLastMinuteDiscountPlanForm({
        name: "Weekend Saver",
        discountTiers: [
          {
            thresholdDays: 3,
            discountType: "percentage",
            discountPercentage: "10",
            flatDiscount: "",
            maxDiscountAmount: "0",
          },
        ],
      })
    );

    act(() => {
      result.current.setDiscountTypeExclusive(0, "flat", "500");
    });

    expect(result.current.discountTiers[0].discountType).toBe("flat");
    expect(result.current.discountTiers[0].discountPercentage).toBe("");
    expect(result.current.discountTiers[0].flatDiscount).toBe("500");
  });
});
