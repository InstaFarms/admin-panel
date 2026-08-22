"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import {
  AMENITIES_VALIDATION,
  AMENITIES_ERRORS,
  AMENITIES_SUCCESS,
} from "@/constants/amenities";
import { captureError } from "@/lib/sentry";

// Helper function to get auth token from cookies
async function getAuthToken(): Promise<string> {
  const cookie = await cookies();
  const token = cookie.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error(AMENITIES_ERRORS.unauthorized);
  }

  return token;
}

// Validation helper for amenity name
function validateAmenityName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return AMENITIES_VALIDATION.nameRequired;
  }
  if (name.trim().length < 2) {
    return AMENITIES_VALIDATION.nameMinLength;
  }
  if (name.trim().length > 100) {
    return AMENITIES_VALIDATION.nameMaxLength;
  }
  return null;
}

export const getAllAmenities = async () => {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(AMENITIES_ERRORS.unauthorized);
  }

  try {
    const token = await getAuthToken();
    const result = await apiGet<{ data?: any[] }>(`/api/amenities?type=amenities`, {
      token,
      cache: "no-store",
    });
    return result.data;
  } catch (err) {
    console.error("Get all amenities error:", err);
    captureError(err);

    // Provide specific error messages
    if (err instanceof Error) {
      if (err.message.includes("network") || err.message.includes("fetch")) {
        throw new Error(AMENITIES_ERRORS.networkError);
      }
    }
    
    throw new Error(AMENITIES_ERRORS.fetchFailed);
  }
};

export const getPaginatedAmenities = async (params: {
  pageNumber?: number;
  perPage?: number;
  searchKey?: string;
  searchBy?: string;
  orderBy?: string;
  sortorder?: "asc" | "desc";
}) => {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(AMENITIES_ERRORS.unauthorized);
  }

  try {
    const token = await getAuthToken();
    
    // Convert searchKey to lowercase for case-insensitive search
    const searchParams = {
      ...params,
      type: "amenities",
      searchKey: params.searchKey ? params.searchKey.toLowerCase() : undefined,
    };
    
    const result = await apiPost<{ data?: any }>(
      "/api/amenities/paginate",
      searchParams,
      { token, cache: "no-store" }
    );
    return result.data;
  } catch (err) {
    console.error("Get paginated amenities error:", err);
    captureError(err);

    // Provide specific error messages
    if (err instanceof Error) {
      if (err.message.includes("network") || err.message.includes("fetch")) {
        throw new Error(AMENITIES_ERRORS.networkError);
      }
    }
    
    throw new Error(AMENITIES_ERRORS.fetchFailed);
  }
};

export const getAmenityById = async (id: string) => {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(AMENITIES_ERRORS.unauthorized);
  }

  try {
    const token = await getAuthToken();
    
    try {
      const result = await apiGet<{ data?: any }>(`/api/amenities/${id}?type=amenities`, {
        token,
        cache: "no-store",
      });
      return result.data;
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Preserve existing behavior for 404 -> null
      if (apiError.message?.toLowerCase().includes("not found")) {
        return null;
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        throw new Error(AMENITIES_ERRORS.networkError);
      }
      
      throw new Error(AMENITIES_ERRORS.fetchAmenityFailed);
    }
  } catch (err) {
    console.error("Get amenity by ID error:", err);
    captureError(err);
    throw err; // Re-throw to preserve the specific error message
  }
};

export const createAmenity = async (
  formData: FormData,
): Promise<ServerActionResult<{ id: string }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AMENITIES_ERRORS.unauthorized);
    }

    const amenity = parseString(formData.get("amenity")?.toString());
    const icon = parseString(formData.get("icon")?.toString())?.trim() || "default-icon";

    // Validate amenity name
    const nameError = validateAmenityName(amenity || "");
    if (nameError) {
      return { error: nameError };
    }

    const token = await getAuthToken();

    let createdId: string | undefined;
    try {
      const response = await apiPost<{ success?: boolean; data?: { id: string } }>(
        "/api/amenities",
        {
          name: amenity!,
          icon: icon,
          type: "amenities",
        },
        { token }
      );
      createdId = response?.data?.id;
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("duplicate") || apiError.message?.includes("unique")) {
        return { error: AMENITIES_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: AMENITIES_ERRORS.networkError };
      }

      throw new Error(AMENITIES_ERRORS.createFailed);
    }

    revalidatePath("/admin/amenities");
    return { success: AMENITIES_SUCCESS.created, data: createdId ? { id: createdId } : undefined };
  } catch (err) {
    console.error("Create amenity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: AMENITIES_ERRORS.createFailed };
    }
  }
};

export const editAmenity = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AMENITIES_ERRORS.unauthorized);
    }

    const amenity = parseString(formData.get("amenity")?.toString());
    const icon = parseString(formData.get("icon")?.toString());

    if (!id) {
      return { error: "Invalid amenity ID" };
    }

    // Validate amenity name
    const nameError = validateAmenityName(amenity || "");
    if (nameError) {
      return { error: nameError };
    }

    const token = await getAuthToken();

    try {
      await apiPatch(
        `/api/amenities/${id}`,
        {
          name: amenity!,
          icon: (icon && icon.trim()) ? icon.trim() : "default-icon",
          type: "amenities",
        },
        { token }
      );
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("not found")) {
        return { error: AMENITIES_ERRORS.notFound };
      }
      if (apiError.message?.includes("duplicate") || apiError.message?.includes("unique")) {
        return { error: AMENITIES_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: AMENITIES_ERRORS.networkError };
      }

      throw new Error(AMENITIES_ERRORS.updateFailed);
    }

    revalidatePath("/admin/amenities");
    return { success: AMENITIES_SUCCESS.updated };
  } catch (err) {
    console.error("Edit amenity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: AMENITIES_ERRORS.updateFailed };
    }
  }
};

/**
 * Icon-only update for amenities/activities, used by the bulk icon-uploads tool.
 * Bypasses editAmenity/editActivity's name-required validation — the service layer
 * (AmenitiesService.update) already supports a partial update with just `icon`.
 */
export const updateAmenityActivityIcon = async (
  type: "amenities" | "activities",
  id: string,
  icon: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AMENITIES_ERRORS.unauthorized);
    }
    if (!id) {
      return { error: "Invalid ID" };
    }
    if (!icon.trim()) {
      return { error: "Icon is required" };
    }

    const token = await getAuthToken();
    await apiPatch(`/api/amenities/${id}?type=${type}`, { icon: icon.trim() }, { token });

    revalidatePath(type === "activities" ? "/admin/activities" : "/admin/amenities");
    return { success: AMENITIES_SUCCESS.updated };
  } catch (err) {
    console.error("Update icon error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: AMENITIES_ERRORS.updateFailed };
    }
  }
};

export const deleteAmenity = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AMENITIES_ERRORS.unauthorized);
    }

    if (!id) {
      return { error: "Invalid amenity ID" };
    }

    const token = await getAuthToken();
    
    try {
      await apiDelete(`/api/amenities/${id}?type=amenities`, { token });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("not found")) {
        return { error: AMENITIES_ERRORS.notFound };
      }
      if (apiError.message?.includes("in use") || apiError.message?.includes("constraint")) {
        return { error: AMENITIES_ERRORS.deleteFailed };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: AMENITIES_ERRORS.networkError };
      }
      
      throw new Error(AMENITIES_ERRORS.deleteFailed);
    }

    revalidatePath("/admin/amenities");
    return { success: AMENITIES_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete amenity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: AMENITIES_ERRORS.deleteFailed };
    }
  }
};
