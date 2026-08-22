import type {
  StaffActivityCategory,
  StaffActivityOutcome,
  StaffActivityRole,
} from "@/types/staffActivity";

export const STAFF_ACTIVITY_BREADCRUMBS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "#", label: "Audit Data" },
  { href: "#", label: "Staff Activity" },
] as const;

export const STAFF_ACTIVITY_ROLE_OPTIONS: Array<{
  value: "ALL" | StaffActivityRole;
  label: string;
}> = [
  { value: "ALL", label: "All staff" },
  { value: "CARETAKER", label: "Caretakers" },
  { value: "SUPERVISOR", label: "Supervisors" },
];

export const STAFF_ACTIVITY_CATEGORY_LABELS: Record<
  StaffActivityCategory,
  string
> = {
  AUTH: "Authentication",
  PROPERTY: "Property",
  ONBOARDING: "Onboarding",
  AUDIT: "Audit",
  TASK: "Task",
  WORK_ORDER: "Work order",
  TICKET: "Ticket",
  VISIT: "Visit",
  BOOKING: "Booking",
  COLLECTION: "Collection",
  NEWS_FEED: "News feed",
  PROFILE: "Profile",
  NOTIFICATION: "Notification",
  OTHER: "Other",
};

export const STAFF_ACTIVITY_OUTCOME_LABELS: Record<
  StaffActivityOutcome,
  string
> = {
  SUCCESS: "Successful",
  FAILED: "Failed",
};

export const STAFF_ACTIVITY_ROLE_LABELS: Record<StaffActivityRole, string> = {
  CARETAKER: "Caretaker",
  SUPERVISOR: "Supervisor",
};

export const STAFF_ACTIVITY_DEFAULT_LIMIT = 50 as const;
export const STAFF_ACTIVITY_STAFF_SEARCH_LIMIT = 50;
export const STAFF_ACTIVITY_PROPERTY_SEARCH_LIMIT = 50;
