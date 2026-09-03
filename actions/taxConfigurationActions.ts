"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost, buildQueryString } from "@/utils/api-utils";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) {
    throw new Error("No authentication token found");
  }
  return token;
}

export interface AccommodationGstPolicy {
  boundary: number;
  lower: number;
  higher: number;
}

export interface AccommodationGstConfigRow {
  id: string;
  key: string;
  value: number;
  description: string | null;
  brandId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export const fetchAccommodationGstConfig = async (
  brandId?: string | null
): Promise<
  | { success: true; policy: AccommodationGstPolicy; history: AccommodationGstConfigRow[] }
  | { success: false; error: string }
> => {
  try {
    const token = await getAuthToken();
    const result = await apiGet<{
      success: boolean;
      data?: { policy: AccommodationGstPolicy; history: AccommodationGstConfigRow[] };
      message?: string;
    }>(`/api/admin/tax-configuration/accommodation-gst${buildQueryString({ brandId: brandId || undefined })}`, {
      token,
    });
    if (!result.success || !result.data) {
      return { success: false, error: result.message || "Failed to fetch accommodation GST configuration" };
    }
    return { success: true, policy: result.data.policy, history: result.data.history };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accommodation GST configuration",
    };
  }
};

export const addAccommodationGstConfigRow = async (input: {
  key: "BOUNDARY" | "LOWER" | "HIGHER";
  brandId: string | null;
  value: number;
  effectiveFrom: string;
  description?: string | null;
}): Promise<
  | { success: true; data: AccommodationGstConfigRow }
  | { success: false; error: string }
> => {
  try {
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data?: AccommodationGstConfigRow;
      message?: string;
    }>("/api/admin/tax-configuration/accommodation-gst", input, { token });
    if (!result.success || !result.data) {
      return { success: false, error: result.message || "Failed to add accommodation GST configuration row" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add accommodation GST configuration row",
    };
  }
};
