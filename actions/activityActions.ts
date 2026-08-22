"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  ACTIVITIES_VALIDATION,
  ACTIVITIES_ERRORS,
  ACTIVITIES_SUCCESS,
} from "@/constants/activities";
import { captureError } from "@/lib/sentry";

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error(ACTIVITIES_ERRORS.unauthorized);
  }
  
  return token;
}

// Validation helper for activity name
function validateActivityName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return ACTIVITIES_VALIDATION.nameRequired;
  }
  if (name.trim().length < 2) {
    return ACTIVITIES_VALIDATION.nameMinLength;
  }
  if (name.trim().length > 100) {
    return ACTIVITIES_VALIDATION.nameMaxLength;
  }
  return null;
}

export const createActivity = async (
  formData: FormData,
): Promise<ServerActionResult<{ id: string }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }

    const activity = parseString(formData.get("activity")?.toString());
    const icon = parseString(formData.get("icon")?.toString())?.trim() || "default-icon";

    // Validate activity name
    const nameError = validateActivityName(activity || "");
    if (nameError) {
      return { error: nameError };
    }

    const createData = {
      name: activity!,
      icon: icon,
      type: "activities" as const,
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();

    let createdId: string | undefined;
    try {
      const response = await apiPost<{ success?: boolean; data?: { id: string } }>("/api/amenities", createData, {
        token,
      });
      createdId = response?.data?.id;
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("duplicate") || apiError.message?.includes("unique")) {
        return { error: ACTIVITIES_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: ACTIVITIES_ERRORS.networkError };
      }

      throw new Error(ACTIVITIES_ERRORS.createFailed);
    }

    revalidatePath("/admin/activities");
    return { success: ACTIVITIES_SUCCESS.created, data: createdId ? { id: createdId } : undefined };
  } catch (err) {
    console.error("Create activity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: ACTIVITIES_ERRORS.createFailed };
    }
  }
};

export const editActivity = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }
    
    const activity = parseString(formData.get("activity")?.toString());
    const icon = parseString(formData.get("icon")?.toString());

    if (!id) {
      return { error: "Invalid activity ID" };
    }

    // Validate activity name
    const nameError = validateActivityName(activity || "");
    if (nameError) {
      return { error: nameError };
    }

    const updateData = {
      name: activity!,
      icon: (icon && icon.trim()) ? icon.trim() : "default-icon",
      type: "activities" as const,
    };

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    try {
      await apiPatch(`/api/amenities/${id}?type=activities`, updateData, {
        token,
      });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("not found")) {
        return { error: ACTIVITIES_ERRORS.notFound };
      }
      if (apiError.message?.includes("duplicate") || apiError.message?.includes("unique")) {
        return { error: ACTIVITIES_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: ACTIVITIES_ERRORS.networkError };
      }

      throw new Error(ACTIVITIES_ERRORS.updateFailed);
    }
    
    revalidatePath("/admin/activities");
    return { success: ACTIVITIES_SUCCESS.updated };
  } catch (err) {
    console.error("Edit activity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: ACTIVITIES_ERRORS.updateFailed };
    }
  }
};

export const deleteActivity = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }
    
    if (!id) {
      return { error: "Invalid activity ID" };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    try {
      await apiDelete(`/api/amenities/${id}?type=activities`, {
        token,
      });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      // Parse specific error messages
      if (apiError.message?.includes("not found")) {
        return { error: ACTIVITIES_ERRORS.notFound };
      }
      if (apiError.message?.includes("in use") || apiError.message?.includes("constraint")) {
        return { error: ACTIVITIES_ERRORS.deleteFailed };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: ACTIVITIES_ERRORS.networkError };
      }

      throw new Error(ACTIVITIES_ERRORS.deleteFailed);
    }
    
    revalidatePath("/admin/activities");
    return { success: ACTIVITIES_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete activity error:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: ACTIVITIES_ERRORS.deleteFailed };
    }
  }
};

/**
 * Fetch all activities with optional pagination and search
 * Now with case-insensitive search that matches intermediate letters
 */
export const getActivities = async (
  pageNumber?: number,
  perPage?: number,
  searchKey?: string,
  searchBy?: string
) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }

    const token = await getAuthToken();

    if (pageNumber && perPage) {
      const body: Record<string, unknown> = {
        pageNumber,
        perPage,
        type: "activities",
        sortorder: "desc",
        orderBy: "createdAt",
      };
      
      // Pass searchKey and searchBy for case-insensitive search
      if (searchKey && searchBy) {
        body.searchKey = searchKey.toLowerCase(); // Convert to lowercase for case-insensitive search
        body.searchBy = searchBy;
      }
      
      const response = await apiPost("/api/amenities/paginate", body, {
        token,
      });
      return response.data;
    } else {
      // Use getAll endpoint with /api/ prefix
      const response = await apiGet("/api/amenities?type=activities", {
        token,
      });
      return response.data;
    }
  } catch (err) {
    console.error("Get activities error:", err);
    captureError(err);
    
    // Provide specific error messages
    if (err instanceof Error) {
      if (err.message.includes("unauthorized")) {
        throw new Error(ACTIVITIES_ERRORS.unauthorized);
      }
      if (err.message.includes("network") || err.message.includes("fetch")) {
        throw new Error(ACTIVITIES_ERRORS.networkError);
      }
    }
    
    throw new Error(ACTIVITIES_ERRORS.fetchFailed);
  }
};

/**
 * Fetch a single activity by ID
 */
export const getActivityById = async (id: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }

    if (!id) {
      throw new Error("Invalid activity ID");
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    try {
      const response = await apiGet(`/api/amenities/${id}?type=activities`, {
        token,
      });
      return response.data;
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      if (apiError.message?.includes("not found")) {
        throw new Error(ACTIVITIES_ERRORS.notFound);
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        throw new Error(ACTIVITIES_ERRORS.networkError);
      }

      throw new Error(ACTIVITIES_ERRORS.fetchActivityFailed);
    }
  } catch (err) {
    console.error("Get activity by ID error:", err);
    captureError(err);
    throw err; // Re-throw to preserve the specific error message
  }
};

/**
 * Get activity info (icon and name only)
 */
export const getActivitiesInfo = async () => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(ACTIVITIES_ERRORS.unauthorized);
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    try {
      const response = await apiGet("/api/amenities/info?type=activities", {
        token,
      });
      return response.data;
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);

      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        throw new Error(ACTIVITIES_ERRORS.networkError);
      }

      throw new Error(ACTIVITIES_ERRORS.fetchFailed);
    }
  } catch (err) {
    console.error("Get activities info error:", err);
    captureError(err);
    throw new Error(ACTIVITIES_ERRORS.fetchFailed);
  }
};
