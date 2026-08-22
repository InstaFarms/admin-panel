"use server";

import { isAdmin } from "@/utils/admin-only";
import { apiPost } from "@/utils/api-utils";
import { cookies } from "next/headers";
import type { CAReportFilters, CAReportResult } from "@repo/services/reporting-service";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

export type CAReportRequestBody = {
  preset:        CAReportFilters["preset"];
  dateFrom?:     string;
  dateTo?:       string;
  groupBy:       CAReportFilters["groupBy"];
  bookingSource?: string;
  status?:       string[];
};

export type CAReportApiOptions = { appType?: string };

export const getCAReport = async (
  body: CAReportRequestBody,
  options?: CAReportApiOptions
): Promise<{ success?: CAReportResult; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const headers = options?.appType ? { "X-App-Type": options.appType } : undefined;
    const result = await apiPost("/api/reports/ca", body, { token, ...(headers && { headers }) });

    if (!result.success) {
      throw new Error(result.message || "Failed to generate report");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin] getCAReport error:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to generate report" };
  }
};

export const getCAReportSummary = async (
  body: CAReportRequestBody,
  options?: CAReportApiOptions
): Promise<{ success?: any; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const token = await getAuthToken();
    const headers = options?.appType ? { "X-App-Type": options.appType } : undefined;
    const result = await apiPost("/api/reports/ca/summary", body, { token, ...(headers && { headers }) });

    if (!result.success) {
      throw new Error(result.message || "Failed to generate summary");
    }

    return { success: result.data };
  } catch (err) {
    console.error("[Admin] getCAReportSummary error:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to generate summary" };
  }
};