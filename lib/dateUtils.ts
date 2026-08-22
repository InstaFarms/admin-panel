import { DateTime } from "luxon";

export const ADMIN_TIME_ZONE = "Asia/Kolkata";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HAS_EXPLICIT_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2}|[+-]\d{4}|Asia\/[A-Za-z_]+)$/i;

const normalizeInput = (value: string) =>
  value.trim().replace(/Asia\/Calcutta/gi, ADMIN_TIME_ZONE);

export const parseAdminDateTime = (
  value: string | Date | null | undefined,
): DateTime | null => {
  if (!value) return null;

  if (value instanceof Date) {
    const fromDate = DateTime.fromJSDate(value).setZone(ADMIN_TIME_ZONE);
    return fromDate.isValid ? fromDate : null;
  }

  const normalized = normalizeInput(value);
  if (!normalized) return null;

  if (DATE_ONLY_PATTERN.test(normalized)) {
    const dateOnly = DateTime.fromISO(normalized, { zone: ADMIN_TIME_ZONE });
    return dateOnly.isValid ? dateOnly : null;
  }

  const hasExplicitZone = HAS_EXPLICIT_ZONE_PATTERN.test(normalized);

  const iso = hasExplicitZone
    ? DateTime.fromISO(normalized, { setZone: true })
    : DateTime.fromISO(normalized, { zone: "utc" });
  if (iso.isValid) return iso.setZone(ADMIN_TIME_ZONE);

  const sql = hasExplicitZone
    ? DateTime.fromSQL(normalized, { setZone: true })
    : DateTime.fromSQL(normalized, { zone: "utc" });
  if (sql.isValid) return sql.setZone(ADMIN_TIME_ZONE);

  const jsDate = new Date(normalized);
  if (!Number.isNaN(jsDate.getTime())) {
    const fromJs = DateTime.fromJSDate(jsDate).setZone(ADMIN_TIME_ZONE);
    return fromJs.isValid ? fromJs : null;
  }

  return null;
};

export const formatAdminDate = (
  value: string | Date | null | undefined,
  fallback = "N/A",
): string => {
  const dt = parseAdminDateTime(value);
  return dt ? dt.toFormat("dd LLL yyyy") : fallback;
};

export const formatAdminDateTime = (
  value: string | Date | null | undefined,
  options?: {
    fallback?: string;
    includeSeconds?: boolean;
  },
): string => {
  const dt = parseAdminDateTime(value);
  if (!dt) return options?.fallback ?? "N/A";
  return dt.toFormat(options?.includeSeconds === false ? "dd/LL/yyyy, HH:mm" : "dd/LL/yyyy, HH:mm:ss");
};

export const formatAdminDateTimeLong = (
  value: string | Date | null | undefined,
  fallback = "N/A",
): string => {
  const dt = parseAdminDateTime(value);
  return dt ? dt.toFormat("dd LLL yyyy, HH:mm") : fallback;
};

export const formatDate = (dateStr: string | null | undefined) =>
  formatAdminDateTimeLong(dateStr, "-");
