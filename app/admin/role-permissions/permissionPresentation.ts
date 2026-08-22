import type { AdminPermissionKey } from "@repo/db/types";

export type PermissionRiskLevel = "normal" | "high";

export interface PermissionPresentation {
  label: string;
  category: string;
  description: string;
  risk: PermissionRiskLevel;
}

export const PERMISSION_CATEGORY_ORDER = [
  "Admin & Access",
  "People Operations",
  "Property Operations",
  "Bookings & Revenue",
  "Content & Communication",
  "Reporting & Oversight",
  "Other",
] as const;

export const PERMISSION_PRESENTATION: Partial<
  Record<AdminPermissionKey, PermissionPresentation>
> = {
  DASHBOARD: {
    label: "Dashboard",
    category: "Reporting & Oversight",
    description: "View high-level platform metrics and operational summaries.",
    risk: "normal",
  },
  ALL_USERS: {
    label: "All Users",
    category: "People Operations",
    description: "Access the broader user directory and related management screens.",
    risk: "normal",
  },
  ADMINS: {
    label: "Admin Management",
    category: "Admin & Access",
    description: "Create, edit, and remove admin panel accounts.",
    risk: "high",
  },
  CUSTOMERS: {
    label: "Customers",
    category: "People Operations",
    description: "View and manage customer records and support-related data.",
    risk: "normal",
  },
  SUPERVISORS: {
    label: "Supervisors",
    category: "People Operations",
    description: "Manage supervisor accounts, assignments, and visibility.",
    risk: "normal",
  },
  OWNER_GANG: {
    label: "Owner Gang",
    category: "People Operations",
    description: "Access owner-facing management tools and internal owner operations.",
    risk: "normal",
  },
  ALL_PROPERTY_USERS: {
    label: "All Property Users",
    category: "People Operations",
    description: "Manage the combined set of property-linked operational users.",
    risk: "normal",
  },
  OWNERS: {
    label: "Owners",
    category: "People Operations",
    description: "View and manage owner profiles and owner-linked workflows.",
    risk: "normal",
  },
  MANAGERS: {
    label: "Managers",
    category: "People Operations",
    description: "Access manager records and manager-related operations.",
    risk: "normal",
  },
  CARETAKERS: {
    label: "Caretakers",
    category: "People Operations",
    description: "Access caretaker records and caretaker-related operations.",
    risk: "normal",
  },
  LOCATIONS: {
    label: "Locations",
    category: "Property Operations",
    description: "Manage states, cities, areas, and landmark master data.",
    risk: "normal",
  },
  PROPERTY_DATA: {
    label: "Property Data",
    category: "Property Operations",
    description: "Manage property profiles, media, pricing setup, and related data.",
    risk: "high",
  },
  PROPOSALS: {
    label: "Proposals",
    category: "Bookings & Revenue",
    description: "Create and manage proposals used in booking and sales workflows.",
    risk: "normal",
  },
  BOOKING_MANAGEMENT: {
    label: "Booking Management",
    category: "Bookings & Revenue",
    description: "Handle bookings, approvals, invoices, and core reservation operations.",
    risk: "high",
  },
  WALLET_AND_SETTLEMENTS: {
    label: "Wallet & Settlements",
    category: "Bookings & Revenue",
    description: "Access settlement, payout, wallet, and other financial operations.",
    risk: "high",
  },
  REPORTS: {
    label: "Reports",
    category: "Reporting & Oversight",
    description: "Access reporting dashboards and exported operational reports.",
    risk: "normal",
  },
  COUPONS: {
    label: "Coupons",
    category: "Bookings & Revenue",
    description: "Manage coupon campaigns, discount logic, and coupon availability.",
    risk: "normal",
  },
  COLLECTIONS: {
    label: "Collections",
    category: "Content & Communication",
    description: "Manage curated property collections and collection content.",
    risk: "normal",
  },
  AUDIT_DATA: {
    label: "Audit Data",
    category: "Reporting & Oversight",
    description: "Access audit configuration, audit sessions, and supervisor audit tools.",
    risk: "normal",
  },
  CONTACT_REQUESTS: {
    label: "Contact Requests",
    category: "Content & Communication",
    description: "Review and manage inbound contact requests and enquiry workflows.",
    risk: "normal",
  },
  NOTIFICATIONS: {
    label: "Notifications",
    category: "Content & Communication",
    description: "Manage notification templates, delivery settings, and communication flows.",
    risk: "normal",
  },
  INSTAFARMS_SPECIFIC_DATA: {
    label: "Brand Content & Settings",
    category: "Content & Communication",
    description: "Manage CMS, brand assets, static content, and Instafarms-specific settings.",
    risk: "high",
  },
  HISTORY: {
    label: "History",
    category: "Reporting & Oversight",
    description: "View audit history and historical record trails across the platform.",
    risk: "normal",
  },
};

export function formatPermissionKeyLabel(key: string) {
  return key
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
