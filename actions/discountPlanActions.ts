"use server";

import { revalidatePath } from "next/cache";

import { ServerActionResult, ServerSearchResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";

import { apiGet, apiPost } from "@/utils/api-utils";
import {
  DISCOUNT_PLANS_VALIDATION,
  DISCOUNT_PLANS_ERRORS,
  DISCOUNT_PLANS_SUCCESS,
} from "@/constants/discount-plans";
import {
  DISCOUNT_PLANS_LIST_BASE_PATH,
  parsePlanBrandScope,
  PLAN_BRAND_APP_TYPE,
  type PlanBrandScope,
} from "@/constants/planBrandScope";
import { captureError } from "@/lib/sentry";

function planBrandHeaders(scope: PlanBrandScope) {
  return { "X-App-Type": PLAN_BRAND_APP_TYPE[scope] };
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(DISCOUNT_PLANS_ERRORS.unauthorized);
  return token;
}

// ─── API error parser ─────────────────────────────────────────────────────────

function parseApiError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
      return DISCOUNT_PLANS_ERRORS.duplicateName;
    }
    if (msg.includes("not found")) return DISCOUNT_PLANS_ERRORS.notFound;
    if (msg.includes("network") || msg.includes("fetch")) return DISCOUNT_PLANS_ERRORS.networkError;
    return err.message;
  }
  return DISCOUNT_PLANS_ERRORS.createFailed;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return DISCOUNT_PLANS_VALIDATION.nameRequired;
  if (name.trim().length < 2) return DISCOUNT_PLANS_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return DISCOUNT_PLANS_VALIDATION.nameMaxLength;
  return null;
}

function validateTiers(minDaysArray: FormDataEntryValue[], discountPercentageArray: FormDataEntryValue[], flatDiscountArray: FormDataEntryValue[]): string | null {
  if (minDaysArray.length === 0) return DISCOUNT_PLANS_VALIDATION.tierRequired;
  
  for (let i = 0; i < minDaysArray.length; i++) {
    const minDays = parseInt(minDaysArray[i].toString());
    if (isNaN(minDays) || minDays < 0) return DISCOUNT_PLANS_VALIDATION.minDaysInvalid;
    
    const discountPercentage = discountPercentageArray[i]?.toString();
    const flatDiscount = flatDiscountArray[i]?.toString();
    
    if (discountPercentage) {
      const percentage = parseFloat(discountPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return DISCOUNT_PLANS_VALIDATION.discountPercentageInvalid;
      }
    }
    
    if (flatDiscount) {
      const flat = parseInt(flatDiscount);
      if (isNaN(flat) || flat < 0) {
        return DISCOUNT_PLANS_VALIDATION.flatDiscountInvalid;
      }
    }
    
    // At least one discount type must be provided
    if (!discountPercentage && !flatDiscount) {
      return DISCOUNT_PLANS_VALIDATION.tierIncomplete;
    }
  }
  
  return null;
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

export const createDiscountPlan = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));

    const name = parseString(formData.get("name")?.toString());
    const isActive = formData.get("isActive") === "true";

    const nameError = validateName(name || "");
    if (nameError) return { error: nameError };

    // Get discount plan values
    const minDaysArray = formData.getAll("minDays");
    const discountPercentageArray = formData.getAll("discountPercentage");
    const flatDiscountArray = formData.getAll("flatDiscount");

    const tierError = validateTiers(minDaysArray, discountPercentageArray, flatDiscountArray);
    if (tierError) return { error: tierError };

    // Prepare values
    const values = minDaysArray.map((_, index) => ({
      minDays: parseInt(minDaysArray[index].toString()),
      discountPercentage: discountPercentageArray[index]?.toString() ? parseFloat(discountPercentageArray[index].toString()) : undefined,
      flatDiscount: flatDiscountArray[index] ? parseInt(flatDiscountArray[index].toString()) : undefined,
    }));

    try {
      await apiPost(
        "/api/discount-plans/global/create",
        { name, isActive, values },
        { token, headers: planBrandHeaders(scope) }
      );
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      return { error: parseApiError(apiError) };
    }

    revalidatePath(DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: DISCOUNT_PLANS_SUCCESS.created };
  } catch (err) {
    console.error("Create discount plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const editDiscountPlan = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(DISCOUNT_PLANS_ERRORS.unauthorized);

    if (!id) return { error: DISCOUNT_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));

    const name = parseString(formData.get("name")?.toString());
    const isActive = formData.get("isActive") === "true";

    const nameError = validateName(name || "");
    if (nameError) return { error: nameError };

    // Get discount plan values
    const minDaysArray = formData.getAll("minDays");
    const discountPercentageArray = formData.getAll("discountPercentage");
    const flatDiscountArray = formData.getAll("flatDiscount");

    const tierError = validateTiers(minDaysArray, discountPercentageArray, flatDiscountArray);
    if (tierError) return { error: tierError };

    // Prepare values
    const values = minDaysArray.map((_, index) => ({
      minDays: parseInt(minDaysArray[index].toString()),
      discountPercentage: discountPercentageArray[index]?.toString() ? parseFloat(discountPercentageArray[index].toString()) : undefined,
      flatDiscount: flatDiscountArray[index] ? parseInt(flatDiscountArray[index].toString()) : undefined,
    }));

    try {
      await apiPost(
        "/api/discount-plans/global/update",
        { id, name, isActive, values },
        { token, headers: planBrandHeaders(scope) }
      );
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("not found")) return { error: DISCOUNT_PLANS_ERRORS.notFound };
      return { error: parseApiError(apiError) };
    }

    revalidatePath(DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: DISCOUNT_PLANS_SUCCESS.updated };
  } catch (err) {
    console.error("Edit discount plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const deleteDiscountPlan = async (
  id: string,
  scope: PlanBrandScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(DISCOUNT_PLANS_ERRORS.unauthorized);

    if (!id) return { error: DISCOUNT_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();

    try {
      await apiPost("/api/discount-plans/global/delete", { id }, { token, headers: planBrandHeaders(scope) });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("not found")) return { error: DISCOUNT_PLANS_ERRORS.notFound };
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: DISCOUNT_PLANS_ERRORS.networkError };
      }
      throw new Error(DISCOUNT_PLANS_ERRORS.deleteFailed);
    }

    revalidatePath(DISCOUNT_PLANS_LIST_BASE_PATH[scope]);
    return { success: DISCOUNT_PLANS_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete discount plan error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: DISCOUNT_PLANS_ERRORS.deleteFailed };
  }
};

export const searchDiscountPlan = async (
  formData: FormData,
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getApiAuthToken();
    const adminAppType = formData.get("adminAppType")?.toString().trim();
    const brandHeaders = adminAppType ? { "X-App-Type": adminAppType } : undefined;

    const searchKeys = ["Name"] as const;
    const searchKey = searchKeys.find(
      (x) => x === formData.get("searchKey")?.toString(),
    );
    const searchValue = parseString(formData.get("searchValue")?.toString());

    if (!searchValue) {
      return { data: [] };
    }

    if (!searchKey) {
      throw new Error("Invalid search key.");
    }

    const data = await apiPost<{ data?: any[] }>(
      "/api/discount-plans/paginate",
      { limit: 5, offset: 0, search: searchValue },
      { token, cache: "no-store", ...(brandHeaders && { headers: brandHeaders }) }
    );

    // Format the response
    const result = (data.data || []).map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive,
    }));

    return { data: result };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const getDiscountPlans = async (
  limit: number = 10,
  offset: number = 0,
  searchKey?: string,
  searchBy?: string,
  scope: PlanBrandScope = "instafarms",
): Promise<{ data: any[]; total: number }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(DISCOUNT_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();

    const body: Record<string, unknown> = { limit, offset };
    // Case-insensitive, intermediate-letter matching
    if (searchKey && searchBy) {
      body.searchKey = searchKey.toLowerCase();
      body.searchBy = searchBy;
    }

    const result = await apiPost<{ data?: any[]; total?: number; error?: string }>(
      "/api/discount-plans/paginate",
      body,
      { token, cache: "no-store", headers: planBrandHeaders(scope) }
    );

    return { data: result.data || [], total: result.total || 0 };

  } catch (err) {
    console.error("Error getting discount plans:", err);
    captureError(err);
    return { data: [], total: 0 };
  }
};

export const getDiscountPlanById = async (id: string, scope: PlanBrandScope = "instafarms") => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getApiAuthToken();

    return await apiGet(`/api/discount-plans/${id}`, { token, cache: "no-store", headers: planBrandHeaders(scope) });

  } catch (err) {
    console.error("Error getting discount plan by id:", err);
    captureError(err);
    return null;
  }
}