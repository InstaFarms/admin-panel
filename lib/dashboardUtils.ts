import type { DashboardFilters } from "@/utils/types";

const DASHBOARD_TIME_ZONE = "Asia/Kolkata";

function getTimeZoneDateString(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: DASHBOARD_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
        return date.toISOString().slice(0, 10);
    }

    return `${year}-${month}-${day}`;
}

function shiftIsoDate(dateString: string, days: number): string {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/**
 * Default filters for daily charts (last 30 days).
 */
export function getDefaultFilters(referenceDate = new Date()): DashboardFilters {
    const endDate = getTimeZoneDateString(referenceDate);

    return {
        startDate: shiftIsoDate(endDate, -30),
        endDate,
        stateId: "all",
        cityId: "all",
        areaId: "all",
        propertyCode: "",
        entityCode: "",
        channel: "all",
    };
}

/**
 * Default filters for weekly charts (last 8 weeks).
 */
export function getDefaultWeeklyFilters(referenceDate = new Date()): DashboardFilters {
    const endDate = getTimeZoneDateString(referenceDate);

    return {
        startDate: shiftIsoDate(endDate, -56),
        endDate,
        stateId: "all",
        cityId: "all",
        areaId: "all",
        propertyCode: "",
        entityCode: "",
        channel: "all",
    };
}

/**
 * Format a number as Indian currency (e.g., ₹1.5L, ₹10k, or ₹1,234).
 * @param {number} value - The numeric value to format.
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (value: number) => {
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * Compact INR format for chart axis labels (e.g., ₹1.2Cr, ₹5.5L, ₹50k).
 */
export function formatINR(value: number): string {
    if (value >= 1_00_00_000) {
        const cr = value / 1_00_00_000;
        return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
    }
    if (value >= 1_00_000) {
        const l = value / 1_00_000;
        return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
    }
    if (value >= 1_000) {
        const k = value / 1_000;
        return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return `₹${value.toFixed(0)}`;
}

/**
 * Full INR format for tooltips (e.g., ₹1,23,456).
 */
export function formatINRFull(value: number): string {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Calculate the start and end date of a week given an ISO week string (e.g., "2023-05").
 * Assumes ISO week numbering.
 * @param {string} weekString - The ISO week string in format "YYYY-WW".
 * @returns {{ start: Date, end: Date } | null} An object containing start and end Dates, or null if parsing fails.
 */
export const getDateRangeFromWeek = (weekString: string) => {
    try {
        const [yearStr, weekStr] = weekString.split("-");
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);

        // Simple estimation: 
        // Jan 4th is always in week 1
        const simple = new Date(year, 0, 4);
        const day = simple.getDay() || 7; // Get day of week (1-7, Mon-Sun)
        const weekStart = new Date(simple);
        weekStart.setDate(simple.getDate() - day + 1 + (week - 1) * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        return { start: weekStart, end: weekEnd };
    } catch (e) {
        return null;
    }
};

export type SortDir = "asc" | "desc";

/**
 * Stable sort of milestone-priority rows by a single key.
 * Non-numeric sentinels (e.g. "N/A") and null/undefined always sink to the bottom.
 */
export function sortRows<T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
  dir: SortDir,
): T[] {
  const factor = dir === "asc" ? 1 : -1;
  const isMissing = (v: any) =>
    v === null || v === undefined || v === "" || v === "N/A";

  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];

    if (isMissing(av) && isMissing(bv)) return 0;
    if (isMissing(av)) return 1;   // always last
    if (isMissing(bv)) return -1;  // always last

    const an = Number(av);
    const bn = Number(bv);
    const bothNumeric = Number.isFinite(an) && Number.isFinite(bn);

    if (bothNumeric) return (an - bn) * factor;

    return (
      String(av).toLowerCase().localeCompare(String(bv).toLowerCase()) * factor
    );
  });
}
