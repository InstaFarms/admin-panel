export const MILESTONE_REVENUE_BASIS_OPTIONS = [
  "EXCL_BOOKING_GST",
  "INCL_BOOKING_GST",
  "NET_REVENUE_EXCL_GST",
] as const;
export type MilestoneRevenueBasis =
  (typeof MILESTONE_REVENUE_BASIS_OPTIONS)[number];

export const MILESTONE_SETUP_STATUS_OPTIONS = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
] as const;
export type MilestoneSetupStatus =
  (typeof MILESTONE_SETUP_STATUS_OPTIONS)[number];

export const NOTIONAL_REVENUE_WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type NotionalRevenueWeekday =
  (typeof NOTIONAL_REVENUE_WEEKDAYS)[number];

export const BOOKING_SOURCE_GROUP_OPTIONS = [
  "DIRECT_BOOKING",
  "THIRD_PARTY_BOOKING",
  "OWNER_BOOKING",
] as const;
export type BookingSourceGroup = (typeof BOOKING_SOURCE_GROUP_OPTIONS)[number];

export const COMMISSION_TYPE_OPTIONS = ["PERCENTAGE", "FLAT"] as const;
export type CommissionType = (typeof COMMISSION_TYPE_OPTIONS)[number];

export const COMMISSION_BASE_OPTIONS = [
  "BOOKING_AMOUNT_EXCL_GST",
  "BOOKING_AMOUNT_INCL_GST",
  "NET_REVENUE_EXCL_GST",
] as const;
export type CommissionBase = (typeof COMMISSION_BASE_OPTIONS)[number];
