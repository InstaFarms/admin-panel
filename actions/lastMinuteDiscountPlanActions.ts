"use server";

import { revalidatePath } from "next/cache";

import { apiGet, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { parseString } from "@/utils/server-utils";
import type { ServerActionResult, ServerSearchResult } from "@/utils/types";
import {
  LAST_MINUTE_DISCOUNT_PLANS_ERRORS,
  LAST_MINUTE_DISCOUNT_PLANS_SUCCESS,
  LAST_MINUTE_DISCOUNT_PLANS_VALIDATION,
} from "@/constants/last-minute-discount-plans";
import {
  LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH,
  PLAN_BRAND_APP_TYPE,
  parsePlanBrandScope,
  type PlanBrandScope,
} from "@/constants/planBrandScope";
import { captureError } from "@/lib/sentry";

function planBrandHeaders(scope: PlanBrandScope) {
  return { "X-App-Type": PLAN_BRAND_APP_TYPE[scope] };
}

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);
  return token;
}

function parseApiError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
      return LAST_MINUTE_DISCOUNT_PLANS_ERRORS.duplicateName;
    }
    if (msg.includes("not found")) return LAST_MINUTE_DISCOUNT_PLANS_ERRORS.notFound;
    if (msg.includes("network") || msg.includes("fetch")) {
      return LAST_MINUTE_DISCOUNT_PLANS_ERRORS.networkError;
    }
    return err.message;
  }
  return LAST_MINUTE_DISCOUNT_PLANS_ERRORS.createFailed;
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameRequired;
  if (trimmed.length < 2) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameMinLength;
  if (trimmed.length > 100) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameMaxLength;
  return null;
}

function validateValues(
  thresholdDaysArray: FormDataEntryValue[],
  discountPercentageArray: FormDataEntryValue[],
  flatDiscountArray: FormDataEntryValue[],
  maxDiscountAmountArray: FormDataEntryValue[]
): string | null {
  if (thresholdDaysArray.length === 0) {
    return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierRequired;
  }

  const seenThresholdDays = new Set<number>();

  for (let index = 0; index < thresholdDaysArray.length; index++) {
    const thresholdDays = parseInt(thresholdDaysArray[index].toString(), 10);
    if (Number.isNaN(thresholdDays) || thresholdDays <= 0) {
      return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.thresholdDaysInvalid;
    }

    if (seenThresholdDays.has(thresholdDays)) {
      return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays;
    }
    seenThresholdDays.add(thresholdDays);

    const discountPercentage = discountPercentageArray[index]?.toString() ?? "";
    const flatDiscount = flatDiscountArray[index]?.toString() ?? "";
    const maxDiscountAmount = maxDiscountAmountArray[index]?.toString() ?? "0";
    const hasPercentage = Boolean(discountPercentage);
    const hasFlat = Boolean(flatDiscount);

    if (hasPercentage === hasFlat) {
      return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierIncomplete;
    }

    if (hasPercentage) {
      const percentage = parseFloat(discountPercentage);
      if (Number.isNaN(percentage) || percentage <= 0 || percentage > 100) {
        return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.discountPercentageInvalid;
      }
    }

    if (hasFlat) {
      const flat = parseInt(flatDiscount, 10);
      if (Number.isNaN(flat) || flat < 0) {
        return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.flatDiscountInvalid;
      }
    }

    const maxDiscount = parseInt(maxDiscountAmount || "0", 10);
    if (Number.isNaN(maxDiscount) || maxDiscount < 0) {
      return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.maxDiscountInvalid;
    }
  }

  return null;
}

function parseValues(formData: FormData) {
  const thresholdDaysArray = formData.getAll("thresholdDays");
  const discountPercentageArray = formData.getAll("discountPercentage");
  const flatDiscountArray = formData.getAll("flatDiscount");
  const maxDiscountAmountArray = formData.getAll("maxDiscountAmount");

  const validationError = validateValues(
    thresholdDaysArray,
    discountPercentageArray,
    flatDiscountArray,
    maxDiscountAmountArray
  );

  if (validationError) return { error: validationError, values: [] as any[] };

  return {
    error: null,
    values: thresholdDaysArray.map((_, index) => ({
      thresholdDays: parseInt(thresholdDaysArray[index].toString(), 10),
      discountPercentage: discountPercentageArray[index]?.toString()
        ? parseFloat(discountPercentageArray[index].toString())
        : undefined,
      flatDiscount: flatDiscountArray[index]?.toString()
        ? parseInt(flatDiscountArray[index].toString(), 10)
        : undefined,
      maxDiscountAmount: maxDiscountAmountArray[index]?.toString()
        ? parseInt(maxDiscountAmountArray[index].toString(), 10)
        : 0,
    })),
  };
}

function parsePropertyIds(formData: FormData): string[] {
  const raw = formData.get("propertyIds")?.toString();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

export const createLastMinuteDiscountPlan = async (
  formData: FormData
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));
    const name = parseString(formData.get("name")?.toString()) ?? "";
    const isActive = formData.get("isActive") === "true";
    const propertyIds = parsePropertyIds(formData);

    const nameError = validateName(name);
    if (nameError) return { error: nameError };

    const { error: valueError, values } = parseValues(formData);
    if (valueError) return { error: valueError };

    await apiPost(
      "/api/last-minute-discount-plans/global/create",
      { name, isActive, values, propertyIds },
      { token, headers: planBrandHeaders(scope) }
    );

    revalidatePath(LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: LAST_MINUTE_DISCOUNT_PLANS_SUCCESS.created };
  } catch (err) {
    console.error("Create last minute discount plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const editLastMinuteDiscountPlan = async (
  id: string,
  formData: FormData
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);
    if (!id) return { error: LAST_MINUTE_DISCOUNT_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));
    const name = parseString(formData.get("name")?.toString()) ?? "";
    const isActive = formData.get("isActive") === "true";
    const propertyIds = parsePropertyIds(formData);

    const nameError = validateName(name);
    if (nameError) return { error: nameError };

    const { error: valueError, values } = parseValues(formData);
    if (valueError) return { error: valueError };

    await apiPost(
      "/api/last-minute-discount-plans/global/update",
      { id, name, isActive, values, propertyIds },
      { token, headers: planBrandHeaders(scope) }
    );

    revalidatePath(LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: LAST_MINUTE_DISCOUNT_PLANS_SUCCESS.updated };
  } catch (err) {
    console.error("Edit last minute discount plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const deleteLastMinuteDiscountPlan = async (
  id: string,
  scope: PlanBrandScope = "instafarms"
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);
    if (!id) return { error: LAST_MINUTE_DISCOUNT_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();

    await apiPost(
      "/api/last-minute-discount-plans/global/delete",
      { id },
      { token, headers: planBrandHeaders(scope) }
    );

    revalidatePath(LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: LAST_MINUTE_DISCOUNT_PLANS_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete last minute discount plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const toggleLastMinuteDiscountPlanStatus = async (
  id: string,
  isActive: boolean,
  scope: PlanBrandScope = "instafarms"
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);
    if (!id) return { error: LAST_MINUTE_DISCOUNT_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();

    await apiPost(
      "/api/last-minute-discount-plans/toggle-status",
      { id, isActive },
      { token, headers: planBrandHeaders(scope) }
    );

    revalidatePath(LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: LAST_MINUTE_DISCOUNT_PLANS_SUCCESS.updated };
  } catch (err) {
    console.error("Toggle last minute discount plan status error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const getLastMinuteDiscountPlans = async (
  limit: number = 10,
  offset: number = 0,
  search?: string,
  scope: PlanBrandScope = "instafarms"
): Promise<{ data: any[]; total: number }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const result = await apiPost<{ data?: any[]; total?: number }>(
      "/api/last-minute-discount-plans/paginate",
      { limit, offset, ...(search ? { search } : {}) },
      { token, cache: "no-store", headers: planBrandHeaders(scope) }
    );

    return { data: result.data || [], total: result.total || 0 };
  } catch (err) {
    console.error("Error getting last minute discount plans:", err);
    captureError(err);
    return { data: [], total: 0 };
  }
};

export const getLastMinuteDiscountPlanById = async (
  id: string,
  scope: PlanBrandScope = "instafarms"
) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();
    return await apiGet(`/api/last-minute-discount-plans/${id}`, {
      token,
      cache: "no-store",
      headers: planBrandHeaders(scope),
    });
  } catch (err) {
    console.error("Error getting last minute discount plan by id:", err);
    captureError(err);
    return null;
  }
};

export const searchLastMinuteDiscountPlan = async (
  formData: FormData
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LAST_MINUTE_DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));
    const searchValue = parseString(formData.get("searchValue")?.toString());

    if (!searchValue) return { data: [] };

    const result = await apiPost<{ data?: any[] }>(
      "/api/last-minute-discount-plans/paginate",
      { limit: 5, offset: 0, search: searchValue },
      { token, cache: "no-store", headers: planBrandHeaders(scope) }
    );

    return {
      data: (result.data || []).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        isActive: plan.isActive,
      })),
    };
  } catch (err) {
    console.error("Search last minute discount plan error:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Server Error." };
  }
};
