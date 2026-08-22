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

// Get upcoming settlements
export async function getUpcomingSettlements(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);

    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/wallet/settlements/upcoming?${params.toString()}`,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching upcoming settlements:", error);
    captureError(error);
    throw error;
  }
}

// Get failed settlements (cron failures)
export async function getFailedSettlements(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);

    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/wallet/settlements/failed?${params.toString()}`,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching failed settlements:", error);
    captureError(error);
    throw error;
  }
}

// Get blocked settlements
export async function getBlockedSettlements(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);

    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await apiGet<{ success: boolean; data: any[] }>(
      `/api/wallet/settlements/blocked?${params.toString()}`,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching blocked settlements:", error);
    captureError(error);
    throw error;
  }
}
