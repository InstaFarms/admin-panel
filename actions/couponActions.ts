"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { parseLimitOffset, parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { apiGet, apiPost } from "@/utils/api-utils";
import {
  COUPONS_ERRORS,
  COUPONS_SUCCESS,
  COUPONS_VALIDATION,
} from "@/constants/coupons";
import { captureError } from "@/lib/sentry";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(COUPONS_ERRORS.unauthorized);
  return token;
}

// ─── API error parser ─────────────────────────────────────────────────────────

function parseApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      return COUPONS_VALIDATION.codeDuplicate;
    }
    if (msg.includes("not found")) return COUPONS_ERRORS.notFound;
    if (msg.includes("network") || msg.includes("fetch")) return COUPONS_ERRORS.networkError;
    if (msg.includes("unauthorized")) return COUPONS_ERRORS.unauthorized;
    return err.message;
  }
  return fallback;
}

// ─── Shared form parser ───────────────────────────────────────────────────────

function parseCouponFormData(formData: FormData) {
  const name = parseString(formData.get("name")?.toString()) ?? "";
  const code = parseString(formData.get("code")?.toString())?.toUpperCase() ?? "";
  const discountType = parseString(formData.get("discountType")?.toString()) ?? "percentage";
  const discountPercentage = formData.get("discountPercentage")?.toString();
  const flatDiscount = formData.get("flatDiscount")?.toString();
  const maxDiscountAmount = parseInt(formData.get("maxDiscountAmount")?.toString() || "0");
  const applicableDays: string[] = JSON.parse(formData.get("applicableDays")?.toString() || "[]");
  const entityIds: string[] = JSON.parse(formData.get("entityIds")?.toString() || "[]");
  const isActive = formData.get("isActive")?.toString() === "true";
  const validFrom = formData.get("validFrom")?.toString() ?? "";
  const validUntil = formData.get("validUntil")?.toString() ?? "";
  const minOrderValue = parseInt(formData.get("minOrderValue")?.toString() || "0");
  const newUsersOnly = formData.get("newUsersOnly")?.toString() === "true";
  const brandId = parseString(formData.get("brandId")?.toString()) ?? "";

  return {
    name, code, discountType, discountPercentage, flatDiscount,
    maxDiscountAmount, applicableDays, entityIds, isActive,
    validFrom, validUntil, minOrderValue, newUsersOnly, brandId,
  };
}

function buildServerValidationErrors(fields: ReturnType<typeof parseCouponFormData>, isEdit = false): string | null {
  if (!fields.name || !fields.code) return "Please enter coupon name and code.";
  if (!fields.brandId) return "Please select a brand.";
  if (!fields.validFrom || !fields.validUntil) return "Please enter valid from and valid until dates.";
  if (new Date(fields.validUntil) < new Date(fields.validFrom)) return COUPONS_VALIDATION.validUntilBeforeFrom;
  if (fields.applicableDays.length === 0) return COUPONS_VALIDATION.applicableDaysRequired;
  if (fields.discountType === "percentage") {
    if (!fields.discountPercentage) return "Please enter discount percentage.";
    const pct = parseFloat(fields.discountPercentage);
    if (pct < 0 || pct > 100) return COUPONS_VALIDATION.percentageRange;
  } else if (fields.discountType === "flat") {
    if (!fields.flatDiscount) return "Please enter flat discount amount.";
    if (parseInt(fields.flatDiscount) < 0) return COUPONS_VALIDATION.flatNegative;
  }
  return null;
}

function buildCouponPayload(fields: ReturnType<typeof parseCouponFormData>): Record<string, any> {
  const payload: Record<string, any> = {
    name: fields.name,
    code: fields.code,
    maxDiscountAmount: fields.maxDiscountAmount,
    applicableDays: fields.applicableDays,
    isActive: fields.isActive,
    validFrom: new Date(fields.validFrom).toISOString(),
    validUntil: new Date(fields.validUntil).toISOString(),
    entityIds: fields.entityIds,
    minOrderValue: fields.minOrderValue,
    newUsersOnly: fields.newUsersOnly,
    brandId: fields.brandId,
  };

  if (fields.discountType === "percentage") {
    payload.discountPercentage = parseFloat(fields.discountPercentage!);
  } else {
    payload.flatDiscount = parseInt(fields.flatDiscount!, 10);
    payload.maxDiscountAmount = 0;
  }

  return payload;
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

export const createCoupon = async (formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);

    const fields = parseCouponFormData(formData);
    const validationError = buildServerValidationErrors(fields, false);
    if (validationError) return { error: validationError };

    const token = await getAuthToken();
    await apiPost("/api/coupons/create", buildCouponPayload(fields), { token });

    revalidatePath("/admin/coupons");
    return { success: COUPONS_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COUPONS_ERRORS.createFailed) };
  }
};

export const editCoupon = async (id: string, formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);
    if (!id) return { error: "Invalid coupon ID" };

    const fields = parseCouponFormData(formData);
    const validationError = buildServerValidationErrors(fields, true);
    if (validationError) return { error: validationError };

    console.log(`[editCoupon] Received fields.entityIds with length: ${fields.entityIds.length}`);

    const token = await getAuthToken();
    const payload: any = { id, ...buildCouponPayload(fields) };
    // Important for updates: clear the opposite discount field to avoid
    // backend validation receiving both percentage and flat values.
    if (fields.discountType === "percentage") {
      payload.flatDiscount = null;
    } else {
      payload.discountPercentage = null;
    }
    console.log(`[editCoupon] Payload to send: length=${payload.entityIds?.length}`);

    await apiPost("/api/coupons/update", payload, { token });

    revalidatePath("/admin/coupons");
    return { success: COUPONS_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COUPONS_ERRORS.updateFailed) };
  }
};

export const deleteCoupon = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);
    if (!id) return { error: "Invalid coupon ID" };

    const token = await getAuthToken();
    await apiPost("/api/coupons/delete", { id }, { token });

    revalidatePath("/admin/coupons");
    return { success: COUPONS_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COUPONS_ERRORS.deleteFailed) };
  }
};

export const toggleCouponStatus = async (
  id: string,
  isActive: boolean
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);

    const token = await getAuthToken();
    await apiPost("/api/coupons/toggle-status", { id, isActive }, { token });

    revalidatePath("/admin/coupons");
    return { success: COUPONS_SUCCESS.statusToggled };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, "Failed to update status.") };
  }
};

export const checkCouponCode = async (
  code: string,
  currentId?: string,
  brandId?: string
): Promise<{ valid: boolean; message?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { valid: false, message: COUPONS_ERRORS.unauthorized };
    if (!code?.trim()) return { valid: false, message: COUPONS_VALIDATION.codeRequired };

    const token = await getAuthToken();
    const result = await apiPost(
      "/api/coupons/check-code",
      { code, excludeId: currentId, brandId },
      { token }
    );

    if (result.exists) return { valid: false, message: COUPONS_VALIDATION.codeDuplicate };
    return { valid: true };
  } catch {
    return { valid: false, message: COUPONS_ERRORS.codeCheckFailed };
  }
};

export const getCoupons = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: any[]; total: number }> => {
  const admin = await isAdmin();
  if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);

  const token = await getAuthToken();
  const { limit, offset } = parseLimitOffset(searchParams);

  // Case-insensitive intermediate-letter search
  const rawSearch = (searchParams.search as string) || (searchParams.searchValue as string);
  const search = rawSearch ? rawSearch.toLowerCase() : undefined;

  const statusParam = searchParams.status as string;
  let isActive: boolean | undefined;
  if (statusParam === "active") isActive = true;
  if (statusParam === "inactive") isActive = false;

  const result = await apiPost<{ data?: any[]; total?: number }>(
    "/api/coupons/paginate",
    {
      limit,
      offset,
      search,
      isActive,
      brandName: searchParams.brandName as string,
      brandId: searchParams.brandId as string
    },
    { token, cache: "no-store" }
  );

  return { data: result.data || [], total: result.total || 0 };
};

export const getCouponById = async (id: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COUPONS_ERRORS.unauthorized);
    if (!id) throw new Error("Invalid coupon ID");

    const token = await getAuthToken();
    return await apiGet(`/api/coupons/${id}`, { token, cache: "no-store" });
  } catch (err) {
    console.error("Error getting coupon by id:", err);
    captureError(err);
    return null;
  }
};