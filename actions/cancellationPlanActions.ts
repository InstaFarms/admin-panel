"use server";

import { revalidatePath } from "next/cache";

import { ServerActionResult, ServerSearchResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";

// Helper function to get auth token from cookies
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";
import {
  CANCELLATION_PLANS_VALIDATION,
  CANCELLATION_PLANS_ERRORS,
  CANCELLATION_PLANS_SUCCESS,
} from "@/constants/cancellation-plans";
import {
  CANCELLATION_PLANS_LIST_BASE_PATH,
  parsePlanBrandScope,
  PLAN_BRAND_APP_TYPE,
  type PlanBrandScope,
} from "@/constants/planBrandScope";

function planBrandHeaders(scope: PlanBrandScope) {
  return { "X-App-Type": PLAN_BRAND_APP_TYPE[scope] };
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);
  return token;
}

// ─── API error parser ─────────────────────────────────────────────────────────

function parseApiError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
      return CANCELLATION_PLANS_ERRORS.duplicateName;
    }
    if (msg.includes("not found")) return CANCELLATION_PLANS_ERRORS.notFound;
    if (msg.includes("network") || msg.includes("fetch")) return CANCELLATION_PLANS_ERRORS.networkError;
    return err.message;
  }
  return CANCELLATION_PLANS_ERRORS.createFailed;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) return CANCELLATION_PLANS_VALIDATION.nameRequired;
  if (name.trim().length < 2) return CANCELLATION_PLANS_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return CANCELLATION_PLANS_VALIDATION.nameMaxLength;
  return null;
}

function validateTiers(percentageArray: FormDataEntryValue[], daysArray: FormDataEntryValue[]): string | null {
  if (percentageArray.length === 0) return CANCELLATION_PLANS_VALIDATION.tierRequired;
  
  for (let i = 0; i < percentageArray.length; i++) {
    const percentage = percentageArray[i]?.toString();
    const days = daysArray[i]?.toString();
    
    if (!percentage || percentage.trim().length === 0) {
      return CANCELLATION_PLANS_VALIDATION.percentageRequired;
    }
    
    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
      return CANCELLATION_PLANS_VALIDATION.percentageInvalid;
    }
    
    if (!days || days.trim().length === 0) {
      return CANCELLATION_PLANS_VALIDATION.daysRequired;
    }
    
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 0) {
      return CANCELLATION_PLANS_VALIDATION.daysInvalid;
    }
  }
  
  return null;
}

// ─── CRUD actions ─────────────────────────────────────────────────────────────

export const createCancellationPlan = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);

    const name = parseString(formData.get("name")?.toString());
    const isActive = formData.get("isActive") === "true";

    const nameError = validateName(name || "");
    if (nameError) return { error: nameError };

    // Get cancellation percentages
    const percentageArray = formData.getAll("percentage");
    const daysArray = formData.getAll("days");
    const lessThanArray = formData.getAll("lessThan");

    const tierError = validateTiers(percentageArray, daysArray);
    if (tierError) return { error: tierError };

    const rules = percentageArray.map((_, index) => ({
      refund: parseInt(percentageArray[index].toString()), // API expects 'refund', UI sends 'percentage'
      days: parseInt(daysArray[index].toString()),
      lessThan: lessThanArray[index] === "true",
    }));

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));

    try {
      await apiPost("/api/cancellation-plans", { name, rules, isActive }, { token, headers: planBrandHeaders(scope) });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      return { error: parseApiError(apiError) };
    }

    revalidatePath(CANCELLATION_PLANS_LIST_BASE_PATH[scope]);
    return { success: CANCELLATION_PLANS_SUCCESS.created };
  } catch (err) {
    console.error("Create cancellation plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const editCancellationPlan = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);

    if (!id) return { error: CANCELLATION_PLANS_ERRORS.invalidId };

    const name = parseString(formData.get("name")?.toString());
    const isActive = formData.get("isActive") === "true";

    const nameError = validateName(name || "");
    if (nameError) return { error: nameError };

    // Get cancellation percentages
    const percentageArray = formData.getAll("percentage");
    const daysArray = formData.getAll("days");
    const lessThanArray = formData.getAll("lessThan");

    const tierError = validateTiers(percentageArray, daysArray);
    if (tierError) return { error: tierError };

    const rules = percentageArray.map((_, index) => ({
      refund: parseInt(percentageArray[index].toString()),
      days: parseInt(daysArray[index].toString()),
      lessThan: lessThanArray[index] === "true",
    }));

    const token = await getAuthToken();
    const scope = parsePlanBrandScope(formData.get("planBrandScope"));

    try {
      await apiPatch(`/api/cancellation-plans/${id}`, { name, rules, isActive }, { token, headers: planBrandHeaders(scope) });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("not found")) return { error: CANCELLATION_PLANS_ERRORS.notFound };
      return { error: parseApiError(apiError) };
    }

    revalidatePath(CANCELLATION_PLANS_LIST_BASE_PATH[scope]);
    return { success: CANCELLATION_PLANS_SUCCESS.updated };
  } catch (err) {
    console.error("Edit cancellation plan error:", err);
    captureError(err);
    return { error: parseApiError(err) };
  }
};

export const deleteCancellationPlan = async (
  id: string,
  scope: PlanBrandScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);

    if (!id) return { error: CANCELLATION_PLANS_ERRORS.invalidId };

    const token = await getAuthToken();

    try {
      await apiDelete(`/api/cancellation-plans/${id}`, { token, headers: planBrandHeaders(scope) });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("not found")) return { error: CANCELLATION_PLANS_ERRORS.notFound };
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: CANCELLATION_PLANS_ERRORS.networkError };
      }
      throw new Error(CANCELLATION_PLANS_ERRORS.deleteFailed);
    }

    revalidatePath(CANCELLATION_PLANS_LIST_BASE_PATH[scope]);
    return { success: CANCELLATION_PLANS_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete cancellation plan error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CANCELLATION_PLANS_ERRORS.deleteFailed };
  }
};

export const searchCancellationPlan = async (
  formData: FormData,
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

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

    const token = await getApiAuthToken();
    const adminAppType = formData.get("adminAppType")?.toString().trim();
    const brandHeaders = adminAppType ? { "X-App-Type": adminAppType } : undefined;

    const result = await apiPost<{ data?: any[] }>(
      "/api/cancellation-plans/paginate",
      {
        searchKey: searchValue,
        searchBy: "name",
        perPage: 5,
        pageNumber: 1,
      },
      { token, ...(brandHeaders && { headers: brandHeaders }) }
    );
    const plans = result.data || [];

    // Format the response
    const formattedResult = plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive ?? true, // Default to true if missing
    }));

    return { data: formattedResult };
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

export const getCancellationPlanById = async (id: string, scope: PlanBrandScope = "instafarms") => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);

    if (!id) throw new Error(CANCELLATION_PLANS_ERRORS.invalidId);

    const token = await getAuthToken();

    const result = await apiGet<{ data: any }>(`/api/cancellation-plans/${id}`, { token, headers: planBrandHeaders(scope) });

    if (!result.data) throw new Error(CANCELLATION_PLANS_ERRORS.notFound);

    // Transform rules to match UI expectations
    const data = result.data;
    if (data && data.rules) {
      data.percentages = data.rules.map((r: any) => ({
        ...r,
        percentage: r.percentage?.toString() || r.refund?.toString(),
      }));
      delete data.rules;
    }

    return data;

  } catch (err) {
    console.log("Error fetching plan by id: ", err);
    captureError(err);
    if (err instanceof Error) throw err;
    throw new Error(CANCELLATION_PLANS_ERRORS.fetchPlanFailed);
  }
}

export const getCancellationPlansList = async (
  limit: number,
  offset: number,
  searchKey?: string,
  searchBy?: string,
  scope: PlanBrandScope = "instafarms",
) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CANCELLATION_PLANS_ERRORS.unauthorized);

    const token = await getAuthToken();

    const pageNumber = Math.floor(offset / limit) + 1;
    const body: Record<string, unknown> = {
      perPage: limit,
      pageNumber,
      orderBy: "created_at",
      sortorder: "desc",
    };
    // Case-insensitive, intermediate-letter matching
    if (searchKey && searchBy) {
      body.searchKey = searchKey.toLowerCase();
      body.searchBy = searchBy;
    }

    const result = await apiPost<{ data?: any[]; total?: number }>(
      "/api/cancellation-plans/paginate",
      body,
      { token, headers: planBrandHeaders(scope) }
    );
    return { data: result.data || [], total: result.total || 0 };

  } catch (err) {
    console.log("Error fetching plans list: ", err);
    captureError(err);
    throw err;
  }
}