"use server";

import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { apiPatch, apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

type BulkMode = "percentage" | "value";
type BulkType = "increase" | "decrease" | "set";

type PropertyRow = {
  id: string;
  propertyName?: string;
  propertyCode?: string | null;
  weekdayPrice?: number | null;
  weekendPrice?: number | null;
  weekendSaturdayPrice?: number | null;
  weekdayAdultExtraGuestCharge?: number | null;
  weekdayChildExtraGuestCharge?: number | null;
  mondayFloatingAdultExtraGuestCharge?: number | null;
  weekdayDiscount?: number | null;
  weekdayGSTslab?: number | null;
  bookedDates?: string[];
  owner?: { name?: string; phone?: string } | null;
  manager?: { name?: string; phone?: string } | null;
  caretaker?: { name?: string; phone?: string } | null;
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) {
    throw new Error("No authentication token found");
  }
  return token;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function applyBulk(current: number, mode: BulkMode, type: BulkType, amount: number): number {
  if (type === "set") return amount;
  if (mode === "percentage") {
    const delta = (current * amount) / 100;
    return type === "increase" ? current + delta : current - delta;
  }
  return type === "increase" ? current + amount : current - amount;
}

function normalizeContact(value: any): { name?: string; phone?: string } | null {
  if (!value) return null;
  if (typeof value === "string") {
    return { name: value };
  }
  return {
    name: value.name || value.firstName || value.fullName || undefined,
    phone: value.phone || value.mobileNumber || undefined,
  };
}

export async function fetchPropertiesForView(): Promise<{ data?: PropertyRow[]; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    const token = await getAuthToken();

    const response = await apiPost<{ success?: boolean; data?: any[]; message?: string }>(
      "/api/properties/admin/view-data",
      { perPage: 500, pageNumber: 1 },
      { token }
    );

    const rows = (response.data || []).map((r: any) => ({
      id: r.id,
      propertyName: r.propertyName || r.name || r.heading || "",
      propertyCode: r.propertyCode || null,
      weekdayPrice: toNumber(r.weekdayPrice ?? r.mondayPrice ?? 0),
      weekendPrice: toNumber(r.weekendPrice ?? r.sundayPrice ?? 0),
      weekendSaturdayPrice: toNumber(r.weekendSaturdayPrice ?? r.saturdayPrice ?? 0),
      weekdayAdultExtraGuestCharge: toNumber(
        r.weekdayAdultExtraGuestCharge ?? r.mondayAdultExtraGuestCharge ?? 0
      ),
      weekdayChildExtraGuestCharge: toNumber(
        r.weekdayChildExtraGuestCharge ?? r.mondayChildExtraGuestCharge ?? 0
      ),
      mondayFloatingAdultExtraGuestCharge: toNumber(r.mondayFloatingAdultExtraGuestCharge ?? 0),
      weekdayDiscount: toNumber(r.weekdayDiscount ?? r.mondayDiscount ?? 0),
      weekdayGSTslab: toNumber(r.weekdayGSTslab ?? r.mondayGSTslab ?? 0),
      bookedDates: Array.isArray(r.bookedDates) ? r.bookedDates : [],
      owner: normalizeContact(r.owner),
      manager: normalizeContact(r.manager),
      caretaker: normalizeContact(r.caretaker),
    }));

    return { data: rows };
  } catch (error: any) {
    captureError(error);
    return { error: error?.message || "Failed to fetch properties for view" };
  }
}

export async function patchPropertyViewFields(
  propertyId: string,
  fields: Record<string, number>
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    const token = await getAuthToken();
    await apiPatch(`/api/properties/${propertyId}`, fields, { token });
    return { success: true };
  } catch (error: any) {
    captureError(error);
    return { error: error?.message || "Failed to update property fields" };
  }
}

export async function bulkUpdatePropertyField(
  rows: Array<{ id: string; value: number }>,
  field: string,
  mode: BulkMode,
  type: BulkType,
  amount: number
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    const token = await getAuthToken();

    for (const row of rows) {
      const next = applyBulk(toNumber(row.value), mode, type, toNumber(amount));
      await apiPatch(`/api/properties/${row.id}`, { [field]: Number(next.toFixed(2)) }, { token });
    }
    return { success: true };
  } catch (error: any) {
    captureError(error);
    return { error: error?.message || "Failed to apply bulk update" };
  }
}

export async function bulkUpdatePropertyGST(
  rows: Array<{ id: string; value: number }>,
  mode: BulkMode,
  type: BulkType,
  amount: number
): Promise<{ success?: true; error?: string }> {
  return bulkUpdatePropertyField(rows, "weekdayGSTslab", mode, type, amount);
}

function getDateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out;
  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export async function blockPropertyDateRange(
  targets: Array<{ id: string; bookedDates: string[] }>,
  from: string,
  to: string,
  mode: "block" | "unblock"
): Promise<{ success?: true; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    const token = await getAuthToken();
    const range = getDateRange(from, to);
    if (range.length === 0) return { error: "Invalid date range" };

    for (const target of targets) {
      const current = new Set((target.bookedDates || []).filter(Boolean));
      if (mode === "block") {
        range.forEach((d) => current.add(d));
      } else {
        range.forEach((d) => current.delete(d));
      }
      await apiPatch(`/api/properties/${target.id}`, { bookedDates: Array.from(current).sort() }, { token });
    }

    return { success: true };
  } catch (error: any) {
    captureError(error);
    return { error: error?.message || "Failed to update blocked dates" };
  }
}
