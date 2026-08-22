"use server";

import { cookies } from "next/headers";

import { isAdmin } from "@/utils/admin-only";
import { apiGet } from "@/utils/api-utils";

export type PropertySetupIssue = {
  code: "NO_OWNER" | "NO_COMMISSION_SETTINGS" | "NO_PRICING";
  severity: "blocking" | "silent-financial" | "advisory";
  message: string;
  consequence: string;
  tabLabel: string;
  brandName?: string;
};

export type PropertySetupReadiness = {
  propertyId: string;
  ready: boolean;
  issues: PropertySetupIssue[];
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("Unauthorized");
  return token;
}

async function assertAdmin() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
}

export async function checkPropertySetupReadiness(
  propertyId: string,
): Promise<PropertySetupReadiness> {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: PropertySetupReadiness | null;
    message?: string;
  }>(`/api/admin/properties/${propertyId}/setup-readiness`, { token });
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to check property setup readiness");
  }
  return result.data;
}
