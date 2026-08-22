/**
 * Local stand-in for `@repo/db/types`, redirected via tsconfig `paths`.
 * Values copied from packages/db/src/types.ts - keep in sync manually if the
 * real enum ever changes (same trade-off already accepted by
 * repo-services-reporting-service.d.ts).
 */

/** Instafarms admin panel roles (permission templates). */
export const adminPanelRoleOptions = [
  "SUPER_ADMIN",
  "OPS_TEAM",
  "SALES_EXECUTIVE",
  "FINANCE_TEAM",
] as const;

export type AdminPanelRole = (typeof adminPanelRoleOptions)[number];

export const adminPermissionKeyOptions = [
  "DASHBOARD",
  "ALL_USERS",
  "ADMINS",
  "CUSTOMERS",
  "SUPERVISORS",
  "OWNER_GANG",
  "ALL_PROPERTY_USERS",
  "OWNERS",
  "MANAGERS",
  "CARETAKERS",
  "LOCATIONS",
  "PROPERTY_DATA",
  "PROPOSALS",
  "BOOKING_MANAGEMENT",
  "WALLET_AND_SETTLEMENTS",
  "REPORTS",
  "COUPONS",
  "COLLECTIONS",
  "AUDIT_DATA",
  "CONTACT_REQUESTS",
  "NOTIFICATIONS",
  "INSTAFARMS_SPECIFIC_DATA",
  "HISTORY",
] as const;
export type AdminPermissionKey = (typeof adminPermissionKeyOptions)[number];
