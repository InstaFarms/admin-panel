import { act, render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";

import CouponEditor from "@/components/coupons/CouponEditor";

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

/**
 * CouponEditor also imports getAllPropertiesForSelector from
 * @/actions/propertyActions, and that was NOT stubbed — so the real "use
 * server" module was pulled into a jsdom run, dragging in `server-only` and
 * failing the whole FILE at import time with "This module cannot be imported
 * from a Client Component module". Nothing in here ran; the suite reported
 * zero of these tests rather than a failure inside one, which is easy to miss.
 *
 * Returns an empty list: the effect that calls this only preloads the entity
 * picker, which none of the assertions below look at.
 */
vi.mock("@/actions/propertyActions", () => ({
  getAllPropertiesForSelector: vi.fn(() => Promise.resolve({ data: [] })),
}));

vi.mock("@/hooks/useCouponForm", () => ({
  useCouponForm: () => ({
    errors: {},
    validateAll: vi.fn(() => null),
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
// CouponEditor imports EntityApplicabilitySelector. This used to stub
// PropertyApplicabilitySelector — a stale name left behind by a rename — so
// the real selector rendered and the "entity-applicability-selector" testid
// the assertion looks for never existed. It was invisible while the file was
// failing to import at all.
vi.mock("@/components/common/EntityApplicabilitySelector", () => ({
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

