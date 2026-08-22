"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  SAFETY_HYGIENE_ERRORS,
  SAFETY_HYGIENE_SUCCESS,
  SAFETY_HYGIENE_VALIDATION,
} from "@/constants/safetyHygiene";
import { captureError } from "@/lib/sentry";

function parseSafetyHygieneError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("not found")) return SAFETY_HYGIENE_ERRORS.notFound;
    if (msg.includes("unauthorized")) return SAFETY_HYGIENE_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return SAFETY_HYGIENE_ERRORS.fetchFailed;
    return err.message;
  }
  return fallback;
}

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

export const createSafetyHygiene = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const name = parseString(formData.get("name")?.toString());
    const icon = parseString(formData.get("icon")?.toString()) || null;

    if (!name || name.trim().length === 0) {
      return { error: SAFETY_HYGIENE_VALIDATION.nameRequired };
    }

    const createData = {
      name: name,
      ...(icon && { icon }),
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPost("/api/safety-hygiene", createData, {
      token,
    });
    
    revalidatePath("/admin/safety-hygiene");
    return { success: SAFETY_HYGIENE_SUCCESS.created };
  } catch (err) {
    console.error("API Error createSafetyHygiene:", err);
    captureError(err);
    return { error: parseSafetyHygieneError(err, SAFETY_HYGIENE_ERRORS.createFailed) };
  }
};

export const editSafetyHygiene = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const name = parseString(formData.get("name")?.toString());
    const icon = parseString(formData.get("icon")?.toString()) || null;

    if (!id) {
      return { error: SAFETY_HYGIENE_ERRORS.invalidId };
    }

    if (!name || name.trim().length === 0) {
      return { error: SAFETY_HYGIENE_VALIDATION.nameRequiredEdit };
    }

    const updateData = {
      name: name,
      ...(icon && { icon }),
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiPatch(`/api/safety-hygiene/${id}`, updateData, {
      token,
    });
    
    revalidatePath("/admin/safety-hygiene");
    return { success: SAFETY_HYGIENE_SUCCESS.updated };
  } catch (err) {
    console.error("API Error editSafetyHygiene:", err);
    captureError(err);
    return { error: parseSafetyHygieneError(err, SAFETY_HYGIENE_ERRORS.updateFailed) };
  }
};

export const deleteSafetyHygiene = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!id) {
      return { error: SAFETY_HYGIENE_ERRORS.invalidId };
    }

    const token = await getAuthToken();
    await apiDelete(`/api/safety-hygiene/${id}`, { token });

    revalidatePath("/admin/safety-hygiene");
    return { success: SAFETY_HYGIENE_SUCCESS.deleted };
  } catch (err) {
    console.error("API Error deleteSafetyHygiene:", err);
    captureError(err);
    return { error: parseSafetyHygieneError(err, SAFETY_HYGIENE_ERRORS.deleteFailed) };
  }
};

/**
 * Fetch all safety & hygiene items with optional pagination and search
 */
export const getSafetyHygiene = async (
  pageNumber?: number,
  perPage?: number,
  searchKey?: string,
  searchBy?: string
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    if (pageNumber && perPage) {
      const body: Record<string, unknown> = {
        pageNumber,
        perPage,
        sortorder: "desc",
        orderBy: "created_at",
      };
      if (searchKey && searchBy) {
        body.searchKey = searchKey.trim().toLowerCase();
        body.searchBy = searchBy;
      }
      const response = await apiPost("/api/safety-hygiene/paginate", body, {
        token,
      });
      return response.data;
    } else {
      // Use getAll endpoint with /api/ prefix
      const response = await apiGet("/api/safety-hygiene", {
        token,
      });
      return response.data;
    }
  } catch (err) {
    console.error("API Error getSafetyHygiene:", err);
    captureError(err);
    throw new Error(SAFETY_HYGIENE_ERRORS.fetchFailed);
  }
};

/**
 * Fetch a single safety & hygiene item by ID
 */
export const getSafetyHygieneById = async (id: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!id) {
      throw new Error(SAFETY_HYGIENE_ERRORS.invalidId);
    }

    const token = await getAuthToken();
    const response = await apiGet(`/api/safety-hygiene/${id}`, { token });
    return response.data;
  } catch (err) {
    console.error("API Error getSafetyHygieneById:", err);
    captureError(err);
    throw new Error(SAFETY_HYGIENE_ERRORS.fetchOneFailed);
  }
};