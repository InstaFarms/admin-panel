export const CANCELLATION_PLANS_VALIDATION = {
  nameRequired: "Plan name is required",
  nameMinLength: "Plan name must be at least 2 characters",
  nameMaxLength: "Plan name must be at most 100 characters",
  tierRequired: "Please add at least one cancellation tier",
  percentageRequired: "Refund percentage is required for each tier",
  percentageInvalid: "Refund percentage must be between 0 and 100",
  daysRequired: "Days is required for each tier",
  daysInvalid: "Days must be a valid non-negative number",
  tierIncomplete: "Each tier must have refund percentage and days",
  /**
   * Tiers are matched with STRICT inequalities (selectCancellationRule in
   * packages/services/src/cancellation-service.ts), so "more than 7" and
   * "fewer than 7" both EXCLUDE day 7 — a guest cancelling exactly then
   * matches no tier and is silently refunded 0%, not the amount either tier's
   * own label implies. Takes the uncovered days as a string.
   */
  tierGap: (days: string) =>
    `No tier covers ${days}. "More than" and "fewer than" both exclude the day you type, ` +
    `so a guest cancelling then is refunded 0% with no explanation. Add a tier that covers ${days} ` +
    `— e.g. widen one boundary by a day — or make the 0% deliberate by adding a tier for it.`,
} as const;

export const CANCELLATION_PLANS_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  notFound: "Cancellation plan not found",
  createFailed: "Failed to create cancellation plan. Please try again",
  updateFailed: "Failed to update cancellation plan. Please try again",
  deleteFailed: "Failed to delete cancellation plan. Please try again",
  fetchFailed: "Failed to fetch cancellation plans. Please try again",
  fetchPlanFailed: "Failed to fetch cancellation plan details. Please try again",
  networkError: "Network error. Please check your connection and try again",
  duplicateName: "A cancellation plan with this name already exists",
  invalidId: "Invalid cancellation plan ID",
} as const;

export const CANCELLATION_PLANS_SUCCESS = {
  created: "Cancellation plan created successfully",
  updated: "Cancellation plan updated successfully",
  deleted: "Cancellation plan deleted successfully",
} as const;

/** @deprecated Prefer `getCancellationPlanBrandBreadcrumbs` from `@/constants/planBrandScope` */
export const CANCELLATION_PLANS_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "#", label: "Cancellation Plans" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarm/cancellation-plans", label: "Cancellation Plans" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/instafarm/cancellation-plans", label: "Cancellation Plans" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const CANCELLATION_PLANS_SEARCH_KEYS = ["Name"] as const;
export type CancellationPlanSearchKey = (typeof CANCELLATION_PLANS_SEARCH_KEYS)[number];

// Icon imports
export { HiPlus, HiTrash } from "react-icons/hi";
