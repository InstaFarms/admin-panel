"use server";

import { cookies } from "next/headers";
import { apiGet } from "@/utils/api-utils";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { captureError } from "@/lib/sentry";

// Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

// Get table history
export async function getTableHistory(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);

    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    // Table History has tens of thousands of rows and no date column, so
    // without these there is no way to reach a specific entry — the list was
    // page-through-everything-or-nothing (QA #276).
    const resolved = await searchParams;
    const first = (key: string) => {
      const value = resolved[key];
      const single = Array.isArray(value) ? value[0] : value;
      return typeof single === "string" && single.trim() ? single.trim() : undefined;
    };
    const tableName = first("tableName");
    const affectedId = first("affectedId");
    if (tableName) params.append("tableName", tableName);
    if (affectedId) {
      // The API rejects a malformed id with a 400, which would surface as a
      // crashed page. No record can carry an id that is not a UUID, so the
      // honest answer to a typo is simply "nothing matched".
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(affectedId)) {
        return { data: [], totalCount: 0 };
      }
      params.append("affectedId", affectedId);
    }

    const response = await apiGet<{ success: boolean; data: any[]; totalCount: number }>(
      `/api/history/paginate?${params.toString()}`,
      { token }
    );

    return { data: response.data || [], totalCount: response.totalCount || 0 };
  } catch (error) {
    console.error("Error fetching table history:", error);
    captureError(error);
    throw error;
  }
}

// Get history record by ID
export async function getHistoryById(id: string) {
  try {
    const token = await getAuthToken();
    const response = await apiGet<{ success: boolean; data: any }>(
      `/api/history/${id}`,
      { token }
    );

    if (!response.success || !response.data) {
      throw new Error("History record not found");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching history record:", error);
    captureError(error);
    throw error;
  }
}

