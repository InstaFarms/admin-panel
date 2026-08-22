export const LAST_MINUTE_DISCOUNT_PLANS_VALIDATION = {
  nameRequired: "Plan name is required",
  nameMinLength: "Plan name must be at least 2 characters",
  nameMaxLength: "Plan name must be at most 100 characters",
  tierRequired: "Please add at least one discount tier",
  thresholdDaysInvalid: "Threshold days must be greater than 0",
  discountPercentageInvalid: "Discount percentage must be greater than 0 and at most 100",
  flatDiscountInvalid: "Flat discount must be a valid non-negative number",
  maxDiscountInvalid: "Maximum discount amount must be a valid non-negative number",
  tierIncomplete: "Each tier must have exactly one discount type",
  duplicateThresholdDays: "Each threshold day can only be used once",
} as const;

export const LAST_MINUTE_DISCOUNT_PLANS_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  notFound: "Last minute discount plan not found",
  createFailed: "Failed to create last minute discount plan. Please try again",
  updateFailed: "Failed to update last minute discount plan. Please try again",
  deleteFailed: "Failed to delete last minute discount plan. Please try again",
  fetchFailed: "Failed to fetch last minute discount plans. Please try again",
  networkError: "Network error. Please check your connection and try again",
  duplicateName: "A last minute discount plan with this name already exists",
  invalidId: "Invalid last minute discount plan ID",
} as const;

export const LAST_MINUTE_DISCOUNT_PLANS_SUCCESS = {
  created: "Last minute discount plan created successfully",
  updated: "Last minute discount plan updated successfully",
  deleted: "Last minute discount plan deleted successfully",
} as const;

export const LAST_MINUTE_DISCOUNT_PLANS_SEARCH_KEYS = ["Name"] as const;
export type LastMinuteDiscountPlanSearchKey =
  (typeof LAST_MINUTE_DISCOUNT_PLANS_SEARCH_KEYS)[number];

export { HiPlus, HiTrash } from "react-icons/hi";
