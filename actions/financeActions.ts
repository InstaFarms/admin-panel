"use server";

import { apiGet, buildQueryString } from "@/utils/api-utils";
import { cookies } from "next/headers";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) {
    throw new Error("No authentication token found");
  }
  return token;
}

export type FinanceListResponse<T = any> = {
  success: boolean;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: Record<string, unknown>;
  message?: string;
};

export type FinanceDetailResponse<T = any> = {
  success: boolean;
  data: T | null;
  message?: string;
};

export async function getFinanceList<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<FinanceListResponse<T>> {
  try {
    const token = await getAuthToken();
    const query = buildQueryString(params ?? {});
    const response = await apiGet<FinanceListResponse<T>>(`/api/finance/admin/${endpoint}${query}`, { token });
    return response;
  } catch (error) {
    console.error("[Admin Finance] Failed to fetch finance list", endpoint, error);
    captureError(error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : "Failed to fetch finance data",
    };
  }
}

export async function getFinanceDetail<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<FinanceDetailResponse<T>> {
  try {
    const token = await getAuthToken();
    const query = buildQueryString(params ?? {});
    const response = await apiGet<FinanceDetailResponse<T>>(`/api/finance/admin/${endpoint}${query}`, { token });
    return response;
  } catch (error) {
    console.error("[Admin Finance] Failed to fetch finance detail", endpoint, error);
    captureError(error);
    return {
      success: false,
      data: null,
      message: error instanceof Error ? error.message : "Failed to fetch finance detail",
    };
  }
}
