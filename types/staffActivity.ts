export const STAFF_ACTIVITY_ROLES = ["CARETAKER", "SUPERVISOR"] as const;
export type StaffActivityRole = (typeof STAFF_ACTIVITY_ROLES)[number];

export const STAFF_ACTIVITY_OUTCOMES = ["SUCCESS", "FAILED"] as const;
export type StaffActivityOutcome = (typeof STAFF_ACTIVITY_OUTCOMES)[number];

export const STAFF_ACTIVITY_CATEGORIES = [
  "AUTH",
  "PROPERTY",
  "ONBOARDING",
  "AUDIT",
  "TASK",
  "WORK_ORDER",
  "TICKET",
  "VISIT",
  "BOOKING",
  "COLLECTION",
  "NEWS_FEED",
  "PROFILE",
  "NOTIFICATION",
  "OTHER",
] as const;
export type StaffActivityCategory = (typeof STAFF_ACTIVITY_CATEGORIES)[number];

export const STAFF_ACTIVITY_PAGE_SIZES = [25, 50, 100] as const;
export type StaffActivityPageSize = (typeof STAFF_ACTIVITY_PAGE_SIZES)[number];

/** A combined caretaker/supervisor option. `key` prevents cross-table id collisions. */
export interface StaffActivityStaffOption {
  key: `${StaffActivityRole}:${string}`;
  id: string;
  role: StaffActivityRole;
  name: string;
  phone: string | null;
  isActive: boolean;
  assignmentCount: number;
  lastActivityAt: string | null;
}

export interface StaffActivityPropertyOption {
  id: string;
  name: string;
  code: string | null;
}

export interface StaffActivityRow {
  id: string;
  requestId: string;
  actorKey: `${StaffActivityRole}:${string}`;
  actorRole: StaffActivityRole;
  actorId: string;
  actorName: string;
  actorPhoneSuffix: string | null;
  appType: string;
  brandId: string | null;
  propertyId: string | null;
  propertyName: string | null;
  propertyCode: string | null;
  category: StaffActivityCategory;
  actionType: string;
  actionLabel: string;
  httpMethod: string;
  requestPath: string;
  entityType: string | null;
  entityId: string | null;
  outcome: StaffActivityOutcome;
  statusCode: number;
  durationMs: number;
  summary: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StaffActivityPagination {
  page: number;
  limit: StaffActivityPageSize;
  total: number;
  totalPages: number;
}

export interface StaffActivitySummary {
  total: number;
  successful: number;
  failed: number;
  activeStaff: number;
  lastActivityAt: string | null;
}

export interface StaffActivityLogsResponse {
  success: boolean;
  data: StaffActivityRow[];
  pagination: StaffActivityPagination;
  summary: StaffActivitySummary;
  message?: string;
  error?: string;
}

export interface StaffActivityOptionsResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
  error?: string;
}

export interface StaffActivityFilters {
  staff?: string;
  role?: StaffActivityRole;
  category?: StaffActivityCategory;
  outcome?: StaffActivityOutcome;
  property?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  limit: StaffActivityPageSize;
}

export type StaffActivityFilterPatch = Partial<
  Record<
    | "staff"
    | "role"
    | "category"
    | "outcome"
    | "property"
    | "from"
    | "to"
    | "q"
    | "page"
    | "limit",
    string | number | null | undefined
  >
>;
