"use server";

import { apiGet, buildQueryString } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { captureError } from "@/lib/sentry";
import type {
  StaffActivityFilters,
  StaffActivityLogsResponse,
  StaffActivityOptionsResponse,
  StaffActivityPropertyOption,
  StaffActivityRole,
  StaffActivityStaffOption,
} from "@/types/staffActivity";

const ADMIN_APP_TYPE = "MAGO_ADMIN";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function getStaffActivityLogs(
  filters: StaffActivityFilters,
): Promise<StaffActivityLogsResponse> {
  try {
    const token = await getApiAuthToken();
    const query = buildQueryString({
      page: filters.page,
      limit: filters.limit,
      staffKey: filters.staff,
      role: filters.role,
      category: filters.category,
      outcome: filters.outcome,
      propertyId: filters.property,
      from: filters.from,
      to: filters.to,
      search: filters.q,
    });

    return await apiGet<StaffActivityLogsResponse>(
      `/api/staff-activity/logs${query}`,
      {
        token,
        appType: ADMIN_APP_TYPE,
        cache: "no-store",
      },
    );
  } catch (error) {
    captureError(error);
    return {
      success: false,
      data: [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        totalPages: 0,
      },
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        activeStaff: 0,
        lastActivityAt: null,
      },
      error: errorMessage(error, "Failed to load staff activity"),
    };
  }
}

export async function searchStaffActivityStaff(params?: {
  search?: string;
  role?: StaffActivityRole;
  limit?: number;
}): Promise<StaffActivityOptionsResponse<StaffActivityStaffOption>> {
  try {
    const token = await getApiAuthToken();
    const query = buildQueryString({
      search: params?.search?.trim() || undefined,
      role: params?.role,
      limit: params?.limit ?? 50,
    });
    const response = await apiGet<
      | StaffActivityOptionsResponse<StaffActivityStaffOption>
      | StaffActivityStaffOption[]
    >(`/api/staff-activity/staff${query}`, {
      token,
      appType: ADMIN_APP_TYPE,
      cache: "no-store",
    });

    return Array.isArray(response)
      ? { success: true, data: response }
      : { ...response, data: response.data ?? [] };
  } catch (error) {
    captureError(error);
    return {
      success: false,
      data: [],
      error: errorMessage(error, "Failed to search staff"),
    };
  }
}

export async function searchStaffActivityProperties(params?: {
  search?: string;
  limit?: number;
}): Promise<StaffActivityOptionsResponse<StaffActivityPropertyOption>> {
  try {
    const token = await getApiAuthToken();
    const query = buildQueryString({
      search: params?.search?.trim() || undefined,
      limit: params?.limit ?? 50,
    });
    const response = await apiGet<
      | StaffActivityOptionsResponse<StaffActivityPropertyOption>
      | StaffActivityPropertyOption[]
    >(`/api/staff-activity/properties${query}`, {
      token,
      appType: ADMIN_APP_TYPE,
      cache: "no-store",
    });

    return Array.isArray(response)
      ? { success: true, data: response }
      : { ...response, data: response.data ?? [] };
  } catch (error) {
    captureError(error);
    return {
      success: false,
      data: [],
      error: errorMessage(error, "Failed to search properties"),
    };
  }
}
