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

