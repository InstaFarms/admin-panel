"use server";

import { cookies } from "next/headers";
import { ServerSearchResult } from "@/utils/types";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";
import { STATES_ERRORS } from "@/constants/states";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error(STATES_ERRORS.unauthorized);
  return token;
}

export const getAllStates = async () => getStates();

export const getStates = async (
  pageNumber?: number,
  perPage?: number,
  searchKey?: string,
  searchBy?: string
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: STATES_ERRORS.unauthorized };

    const token = await getAuthToken();

    if (searchKey && searchBy) {
      const response = await apiPost<{ success: boolean; data: any[]; message?: string }>(
        "/api/states/paginate",
        {
          // Pass lowercase for case-insensitive intermediate letter matching
          searchKey: searchKey.toLowerCase(),
          searchBy,
          pageNumber: pageNumber || 1,
          perPage: perPage || 100,
        },
        { token }
      );
      if (response.success && response.data) {
        return { data: Array.isArray(response.data) ? response.data : [] };
      }
      return { error: response.message || STATES_ERRORS.fetchFailed, data: [] };
    } else if (pageNumber && perPage) {
      const response = await apiPost<{ success: boolean; data: any[]; message?: string }>(
        "/api/states/paginate",
        { pageNumber, perPage, sortorder: "desc", orderBy: "weight" },
        { token }
      );
      if (response.success && response.data) {
        return { data: Array.isArray(response.data) ? response.data : [] };
      }
      return { error: response.message || STATES_ERRORS.fetchFailed, data: [] };
    } else {
      const response = await apiGet<{ success: boolean; data: any[]; message?: string }>(
        "/api/states",
        { token }
      );
      if (response.success && response.data) {
        return { data: Array.isArray(response.data) ? response.data : [] };
      }
      return { error: response.message || STATES_ERRORS.fetchFailed, data: [] };
    }
  } catch (err) {
    console.error("Get states error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: STATES_ERRORS.fetchFailed };
  }
};
