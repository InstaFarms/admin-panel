import { act, render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";

import CouponEditor from "@/app/admin/coupons/[id]/CouponEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    promise: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/actions/couponActions", () => ({
  createCoupon: vi.fn(() => Promise.resolve({ success: "Created" })),
  editCoupon: vi.fn(() => Promise.resolve({ success: "Updated" })),
}));

vi.mock("@/hooks/useCouponForm", () => ({
  useCouponForm: () => ({
    errors: {},
    validateAll: vi.fn(() => true),
    clearFieldError: vi.fn(),
  }),
}));

vi.mock("@/components/coupons/CouponNameCode", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-name-code" />,
}));
vi.mock("@/components/coupons/CouponValidity", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-validity" />,
}));
vi.mock("@/components/coupons/CouponDiscountType", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-discount-type" />,
}));
vi.mock("@/components/coupons/CouponDiscountValue", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-discount-value" />,
}));
vi.mock("@/components/coupons/CouponMaxDiscount", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-max-discount" />,
}));
vi.mock("@/components/coupons/CouponApplicableDays", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-applicable-days" />,
}));
vi.mock("@/components/common/PropertyApplicabilitySelector", () => ({
  __esModule: true,
  default: () => <div data-testid="entity-applicability-selector" />,
}));
vi.mock("@/components/coupons/CouponStatus", () => ({
  __esModule: true,
  default: () => <div data-testid="coupon-status" />,
}));
vi.mock("@/components/coupons/CouponSubmit", () => ({
  __esModule: true,
  default: () => <button type="submit" data-testid="coupon-submit">Save</button>,
}));

describe("CouponEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form with basic sections", async () => {
    await act(async () => {
      render(<CouponEditor />);
    });

    expect(screen.getByTestId("coupon-name-code")).toBeInTheDocument();
    expect(screen.getByTestId("coupon-validity")).toBeInTheDocument();
    expect(screen.getByTestId("coupon-discount-type")).toBeInTheDocument();
    expect(screen.getByTestId("coupon-discount-value")).toBeInTheDocument();
    expect(screen.getByTestId("entity-applicability-selector")).toBeInTheDocument();
  });
});

