export const COUPONS_VALIDATION = {
  nameRequired: "Coupon name is required",
  nameMinLength: "Coupon name must be at least 2 characters",
  nameMaxLength: "Coupon name must be at most 100 characters",
  codeRequired: "Coupon code is required",
  codeInvalid: "Coupon code must contain only uppercase letters and numbers",
  codeDuplicate: "This coupon code already exists",
  discountRequired: "Please provide either a discount percentage or flat discount",
  discountBoth: "Cannot provide both percentage and flat discount",
  percentageRange: "Discount percentage must be between 1 and 100",
  flatNegative: "Flat discount must be greater than 0",
  maxDiscountNegative: "Maximum discount amount must be non-negative",
  validFromRequired: "Valid from date is required",
  validUntilRequired: "Valid until date is required",
  validUntilBeforeFrom: "Valid until date must be after valid from date",
  validFromPast: "Valid from date cannot be in the past",
  applicableDaysRequired: "Please select at least one applicable day",
  entityRequired: "Please select at least one entity or enable 'Applies to All Entities'",
  minOrderNegative: "Minimum order value cannot be negative",
};

export const COUPONS_ERRORS = {
  unauthorized: "Unauthorized",
  notFound: "Coupon not found",
  createFailed: "Failed to create coupon",
  updateFailed: "Failed to update coupon",
  deleteFailed: "Failed to delete coupon",
  fetchFailed: "Failed to fetch coupons",
  fetchCouponFailed: "Failed to fetch coupon",
  networkError: "Network error. Please try again.",
  codeCheckFailed: "Error checking coupon code availability",
};

export const COUPONS_SUCCESS = {
  created: "Coupon created successfully",
  updated: "Coupon updated successfully",
  deleted: "Coupon deleted successfully",
  statusToggled: "Coupon status updated",
};

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DISCOUNT_TYPES = ["percentage", "flat"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const SEARCH_KEYS = ["Name", "Code"] as const;
export type CouponSearchKey = (typeof SEARCH_KEYS)[number];

export const INSTAFARMS_COUPON_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarms-coupons", label: "Instafarms Coupons" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarms-coupons", label: "Instafarms Coupons" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarms-coupons", label: "Instafarms Coupons" },
    { href: "#", label: "Edit" },
  ],
};

export const MAGO_COUPON_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-coupons", label: "Mago Coupons" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-coupons", label: "Mago Coupons" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-coupons", label: "Mago Coupons" },
    { href: "#", label: "Edit" },
  ],
};

export const TABLE_COLUMNS = [
  "S. No.",
  "Name",
  "Code",
  "Discount",
  "Validity",
  "Redemptions",
  "Status",
  "Actions",
] as const;

export const COUPON_STATUS_CONFIG = {
  inactive: { color: "failure" as const, label: "Inactive", title: "Manually disabled by admin" },
  expired: { color: "gray" as const, label: "Expired", title: "Validity period has ended" },
  scheduled: { color: "warning" as const, label: "Scheduled", title: "Not yet within validity period" },
  active: { color: "success" as const, label: "Active", title: "Active and within validity period" },
};