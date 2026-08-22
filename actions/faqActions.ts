"use server";

import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { getApiAuthToken } from "@/utils/auth-utils";
import { revalidatePath } from "next/cache";
import { apiGet, apiPost } from "@/utils/api-utils";
import {
  FAQ_ERRORS,
  FAQ_SUCCESS,
  FAQ_VALIDATION,
} from "@/constants/faqs";
import {
  BRAND_ADMIN_APP_TYPE,
  FAQ_CONTENT_BASE,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";
import { captureError } from "@/lib/sentry";

export const createFAQ = async (
  formData: FormData,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();
    const appType = BRAND_ADMIN_APP_TYPE[scope];

    const question = parseString(formData.get("question")?.toString());
    const answer = parseString(formData.get("answer")?.toString());
    const category = parseString(formData.get("category")?.toString());

    if (!question || question.trim().length === 0) {
      return { error: FAQ_VALIDATION.questionRequired };
    }
    if (!answer || answer.trim().length === 0) {
      return { error: FAQ_VALIDATION.answerRequired };
    }

    await apiPost(
      "/api/faqs/management/create",
      { question: question.trim(), answer: answer.trim(), category: category || null },
      { token, appType }
    );

    if (category) {
      revalidatePath(`${FAQ_CONTENT_BASE[scope]}/${category}`);
    }
    return { success: FAQ_SUCCESS.created };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: FAQ_ERRORS.createFailed };
  }
};

export const editFAQ = async (
  id: string,
  formData: FormData,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();
    const appType = BRAND_ADMIN_APP_TYPE[scope];

    const question = parseString(formData.get("question")?.toString());
    const answer = parseString(formData.get("answer")?.toString());
    const category = parseString(formData.get("category")?.toString());

    if (!id) {
      return { error: FAQ_ERRORS.invalidId };
    }
    if (!question || question.trim().length === 0) {
      return { error: FAQ_VALIDATION.questionRequired };
    }
    if (!answer || answer.trim().length === 0) {
      return { error: FAQ_VALIDATION.answerRequired };
    }

    await apiPost(
      "/api/faqs/management/update",
      { id, question: question.trim(), answer: answer.trim(), category: category || null },
      { token, appType }
    );

    if (category) {
      revalidatePath(`${FAQ_CONTENT_BASE[scope]}/${category}`);
    }
    return { success: FAQ_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: FAQ_ERRORS.updateFailed };
  }
};

export const deleteFAQ = async (
  id: string,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();
    const appType = BRAND_ADMIN_APP_TYPE[scope];

    if (!id) {
      return { error: FAQ_ERRORS.invalidId };
    }

    await apiPost("/api/faqs/management/delete", { id }, { token, appType });

    revalidatePath("/admin/faqs");
    revalidatePath(FAQ_CONTENT_BASE[scope]);
    return { success: FAQ_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: FAQ_ERRORS.deleteFailed };
  }
};

export const getFaqs = async (
  limit: number,
  offset: number,
  category?: string,
  search?: string,
  scope: BrandAdminScope = "instafarms",
): Promise<{ data: any[] }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(FAQ_ERRORS.unauthorized);
    }
    const token = await getApiAuthToken();
    const appType = BRAND_ADMIN_APP_TYPE[scope];

    const searchNormalized = search?.trim() ? search.trim().toLowerCase() : undefined;

    const result = await apiPost<any>(
      "/api/faqs/management/paginate",
      { limit, offset, category, search: searchNormalized },
      { token, cache: "no-store", appType }
    );
    return { data: result?.data ?? result ?? [] };
  } catch (err) {
    console.error("Error getting FAQs:", err);
    captureError(err);
    return { data: [] };
  }
};

export const getFaqById = async (id: string, scope: BrandAdminScope = "instafarms") => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const token = await getApiAuthToken();
    const appType = BRAND_ADMIN_APP_TYPE[scope];

    try {
      const result = await apiGet<any>(`/api/faqs/management/${id}`, {
        token,
        cache: "no-store",
        appType,
      });
      return result || null;
    } catch {
      return null;
    }
  } catch (err) {
    console.error("Error getting FAQ by ID:", err);
    captureError(err);
    return null;
  }
};