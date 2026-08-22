import { ADMIN_TIME_ZONE, parseAdminDateTime } from "@/lib/dateUtils";
import { DateTime } from "luxon";
import {
  STAFF_ACTIVITY_CATEGORIES,
  STAFF_ACTIVITY_OUTCOMES,
  STAFF_ACTIVITY_PAGE_SIZES,
  STAFF_ACTIVITY_ROLES,
  type StaffActivityCategory,
  type StaffActivityFilterPatch,
  type StaffActivityFilters,
  type StaffActivityOutcome,
  type StaffActivityPageSize,
  type StaffActivityRole,
  type StaffActivityRow,
} from "@/types/staffActivity";
import { STAFF_ACTIVITY_DEFAULT_LIMIT } from "@/constants/staffActivity";

type SearchParamsLike = Record<string, string | string[] | undefined>;

const firstString = (value: string | string[] | undefined) =>
  typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value[0]
      : undefined;

const inList = <T extends string>(
  value: string | undefined,
  options: readonly T[],
): value is T => Boolean(value && options.includes(value as T));

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isStaffKey(
  value: string | undefined,
): value is `${StaffActivityRole}:${string}` {
  if (!value) return false;
  const separator = value.indexOf(":");
  if (separator < 1 || separator === value.length - 1) return false;
  const role = value.slice(0, separator);
  const id = value.slice(separator + 1);
  return inList(role, STAFF_ACTIVITY_ROLES) && /^[0-9a-f-]{36}$/i.test(id);
}

export function parseStaffActivityFilters(
  params: SearchParamsLike,
): StaffActivityFilters {
  const rawRole = firstString(params.role);
  const role = inList(rawRole, STAFF_ACTIVITY_ROLES) ? rawRole : undefined;
  const rawCategory = firstString(params.category);
  const category = inList(rawCategory, STAFF_ACTIVITY_CATEGORIES)
    ? rawCategory
    : undefined;
  const rawOutcome = firstString(params.outcome);
  const outcome = inList(rawOutcome, STAFF_ACTIVITY_OUTCOMES)
    ? rawOutcome
    : undefined;
  const rawStaff = firstString(params.staff);
  const staff =
    isStaffKey(rawStaff) && (!role || rawStaff.startsWith(`${role}:`))
      ? rawStaff
      : undefined;
  const rawLimit = positiveInt(
    firstString(params.limit),
    STAFF_ACTIVITY_DEFAULT_LIMIT,
  );
  const limit = (
    STAFF_ACTIVITY_PAGE_SIZES.includes(rawLimit as StaffActivityPageSize)
      ? rawLimit
      : STAFF_ACTIVITY_DEFAULT_LIMIT
  ) as StaffActivityPageSize;
  const q = firstString(params.q)?.trim().slice(0, 120) || undefined;

  return {
    staff,
    role,
    category,
    outcome,
    property: firstString(params.property)?.trim() || undefined,
    from: firstString(params.from)?.trim() || undefined,
    to: firstString(params.to)?.trim() || undefined,
    q,
    page: positiveInt(firstString(params.page), 1),
    limit,
  };
}

export function updateStaffActivityQuery(
  current: URLSearchParams | string,
  patch: StaffActivityFilterPatch,
  resetPage = true,
) {
  const next = new URLSearchParams(
    typeof current === "string" ? current : current.toString(),
  );

  if (resetPage && !("page" in patch)) next.delete("page");

  for (const [key, value] of Object.entries(patch)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "ALL"
    ) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  return next;
}

export function hasStaffActivityFilters(filters: StaffActivityFilters) {
  return Boolean(
    filters.staff ||
    filters.role ||
    filters.category ||
    filters.outcome ||
    filters.property ||
    filters.from ||
    filters.to ||
    filters.q,
  );
}

export function getActivityActorId(row: StaffActivityRow) {
  return row.actorId;
}

export function getActivityStaffKey(row: StaffActivityRow) {
  return row.actorKey || `${row.actorRole}:${row.actorId}`;
}

export function maskedPhoneHint(value: string | null | undefined) {
  if (!value) return "No phone";
  const digits = value.replace(/\D/g, "");
  const suffix = digits.slice(-4);
  return suffix ? `•••• ${suffix}` : "Phone hidden";
}

export function formatStaffActivityTimestamp(
  value: string | null | undefined,
  fallback = "—",
) {
  const date = parseAdminDateTime(value);
  return date ? `${date.toFormat("dd LLL yyyy, HH:mm:ss")} IST` : fallback;
}

export function formatActivityDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "—";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)} s`;
}

export function dateInputValue(value: string | undefined) {
  if (!value) return "";
  const parsed = parseAdminDateTime(value);
  return parsed?.toISODate() ?? value.slice(0, 10);
}

export function toDateBoundary(value: string, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = DateTime.fromISO(value, { zone: ADMIN_TIME_ZONE });
  if (!date.isValid) return undefined;
  const bounded =
    boundary === "start" ? date.startOf("day") : date.endOf("day");
  return bounded.toISO() ?? undefined;
}

export function categoryBadgeColor(category: StaffActivityCategory) {
  const colors: Partial<Record<StaffActivityCategory, string>> = {
    AUTH: "purple",
    AUDIT: "indigo",
    ONBOARDING: "blue",
    TASK: "info",
    WORK_ORDER: "cyan",
    TICKET: "warning",
    VISIT: "pink",
    BOOKING: "success",
    COLLECTION: "green",
    NOTIFICATION: "gray",
  };
  return colors[category] ?? "gray";
}

export function outcomeBadgeColor(outcome: StaffActivityOutcome) {
  return outcome === "SUCCESS" ? "success" : "failure";
}

export function roleBadgeColor(role: StaffActivityRole) {
  return role === "CARETAKER" ? "info" : "purple";
}

export function safeMetadataEntries(
  metadata: Record<string, unknown> | null | undefined,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return [];
  return Object.entries(metadata);
}
