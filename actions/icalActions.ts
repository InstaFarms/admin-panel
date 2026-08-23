"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { apiDelete, apiGet, apiPost, apiPut } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

// Add this interface at the top
interface ICalActionResult<T = any> {
  success?: string;
  error?: string;
  data?: T;
}

export interface ICalConnectionStatusRow {
  propertyId: string;
  propertyName: string;
  airbnbConnected: boolean;
  bookingConnected: boolean;
  isIcalConnected: boolean;
}

export interface ICalConnectionStatusData {
  connectedCount: number;
  totalProperties: number;
  rows: ICalConnectionStatusRow[];
}

export interface ICalBookingConflictRow {
  id: string;
  propertyId: string | null;
  propertyName: string | null;
  platform: string;
  isResolved: boolean;
  resolutionRemarks: string | null;
  resolvedAt: string | null;
  checkinDate: string | null;
  checkoutDate: string | null;
  importedSummary: string | null;
  bookingId: string | null;
  createdAt: string;
}

export const fetchIcalLinks = async (
  propertyId: string
): Promise<ICalActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    // ✅ Get token for API calls
    const token = await getAuthToken();
    
    // Use GET endpoint with /api/ prefix
    const response = await apiGet(`/api/ical/links/${propertyId}`, {
      token,
    });
    
    return { success: "Fetched successfully", data: response.data };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch links",
    };
  }
};

export const addIcalLink = async (
  propertyId: string,
  name: string,
  icalUrl: string,
  roomId: string | null = null
): Promise<ICalActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();

    const response = await apiPost(
      "/api/ical/links",
      {
        propertyId,
        name,
        icalUrl,
        roomId,
      },
      {
        token,
      }
    );

    revalidatePath("/admin/properties");
    return { success: "iCal link added successfully", data: response.data };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to add link",
    };
  }
};

export const syncIcalLink = async (
  linkId: string
): Promise<ICalActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    const response = await apiPost(
      `/api/ical/sync/${linkId}`,
      {},
      {
        token,
      }
    );

    revalidatePath("/admin/properties");
    return {
      success: `Sync completed. Processed ${response.data?.eventsProcessed || 0} events.`,
      data: response.data,
    };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
};

export const deleteIcalLink = async (
  linkId: string
): Promise<ICalActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();
    
    await apiDelete(`/api/ical/links/${linkId}`, {
      token,
    });

    revalidatePath("/admin/properties");
    return { success: "Link deleted successfully" };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
};

export const getExportUrl = async (propertyId: string): Promise<string> => {
  const baseUrl =
    process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_DEV_BASE_URL ||
    "http://localhost:3001";
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}/api/ical/export/${propertyId}`;
};

export const getIcalConnectionStatus = async (): Promise<ICalActionResult<ICalConnectionStatusData>> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("jarvis-admin-token")?.value;
    if (!token) {
      return { error: "Unauthorized" };
    }

    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    const response = await apiGet("/api/ical/admin/connection-status", { token });
    return { success: "Fetched successfully", data: response.data as ICalConnectionStatusData };
  } catch (error: any) {
    if (error instanceof Error && error.message !== "You are not logged in.") {
      console.error("API Error: ", error);
    }
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch iCal connection status",
    };
  }
};

export const bulkUpdateIcalSyncControl = async (payload: {
  provider: "airbnb" | "booking";
  allow: boolean;
  propertyIds?: string[];
  isAppliedToAll?: boolean;
}): Promise<ICalActionResult<{ matchedLinks: number; updatedLinks: number }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    const token = await getAuthToken();
    const response = await apiPost("/api/ical/admin/bulk-sync-control", payload, { token });
    revalidatePath("/admin/dashboard/ical-connections");
    revalidatePath("/admin/dashboard/ical-sync-controls");
    return { success: response.message || "Updated successfully", data: response.data };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to update iCal sync controls",
    };
  }
};

export const getAdminBookingConflicts = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<{ success?: ICalBookingConflictRow[]; total?: number; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    const token = await getAuthToken();
    const params = await searchParams;
    const limit = Number(params.limit ?? 10);
    const offset = Number(params.offset ?? 0);
    const propertySearch = typeof params.propertySearch === "string" ? params.propertySearch.trim() : "";
    const platform = typeof params.platform === "string" ? params.platform.trim() : "";
    const resolved = typeof params.resolved === "string" ? params.resolved.trim() : "";

    const qs = new URLSearchParams();
    qs.set("limit", String(Number.isNaN(limit) ? 10 : Math.max(1, Math.min(limit, 100))));
    qs.set("offset", String(Number.isNaN(offset) ? 0 : Math.max(0, offset)));
    if (propertySearch) qs.set("propertySearch", propertySearch);
    if (platform) qs.set("platform", platform);
    if (resolved) qs.set("resolved", resolved);

    const response = await apiGet(`/api/ical/admin/booking-conflicts?${qs.toString()}`, { token });
    return {
      success: (response.data || []) as ICalBookingConflictRow[],
      total: typeof response.total === "number" ? response.total : 0,
    };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch booking conflicts",
    };
  }
};

export const updateBookingConflictResolution = async (
  conflictId: string,
  payload: { isResolved: boolean; resolutionRemarks?: string }
): Promise<ICalActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return { error: "Unauthorized" };
    }

    const token = await getAuthToken();
    await apiPut(`/api/ical/admin/booking-conflicts/${conflictId}`, payload, { token });
    revalidatePath("/admin/bookings/ical-conflicts");
    return { success: "Conflict updated successfully" };
  } catch (error: any) {
    console.error("API Error: ", error);
    captureError(error);
    return {
      error: error instanceof Error ? error.message : "Failed to update booking conflict",
    };
  }
};
