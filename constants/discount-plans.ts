export const DISCOUNT_PLANS_VALIDATION = {
  nameRequired: "Plan name is required",
  nameMinLength: "Plan name must be at least 2 characters",
  nameMaxLength: "Plan name must be at most 100 characters",
  tierRequired: "Please add at least one discount tier",
  minDaysRequired: "Minimum days is required for each tier",
  minDaysInvalid: "Minimum days must be a valid non-negative number",
  discountPercentageInvalid: "Discount percentage must be between 0 and 100",
  flatDiscountInvalid: "Flat discount must be a valid non-negative number",
  tierIncomplete: "Each tier must have at least minimum days and either discount percentage or flat discount",
} as const;

export const DISCOUNT_PLANS_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  notFound: "Discount plan not found",
  createFailed: "Failed to create discount plan. Please try again",
  updateFailed: "Failed to update discount plan. Please try again",
  deleteFailed: "Failed to delete discount plan. Please try again",
  fetchFailed: "Failed to fetch discount plans. Please try again",
  fetchPlanFailed: "Failed to fetch discount plan details. Please try again",
  networkError: "Network error. Please check your connection and try again",
  duplicateName: "A discount plan with this name already exists",
  invalidId: "Invalid discount plan ID",
} as const;

export const DISCOUNT_PLANS_SUCCESS = {
  created: "Discount plan created successfully",
  updated: "Discount plan updated successfully",
  deleted: "Discount plan deleted successfully",
} as const;

/** @deprecated Prefer `getDiscountPlanBrandBreadcrumbs` from `@/constants/planBrandScope` */
export const DISCOUNT_PLANS_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "#", label: "Discount Plans" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarm/discount-plans", label: "Discount Plans" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarm/discount-plans", label: "Discount Plans" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const DISCOUNT_PLANS_SEARCH_KEYS = ["Name"] as const;
export type DiscountPlanSearchKey = (typeof DISCOUNT_PLANS_SEARCH_KEYS)[number];

// Icon imports
export { HiPlus, HiTrash } from "react-icons/hi";
