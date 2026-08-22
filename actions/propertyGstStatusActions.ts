"use server";

import { cookies } from "next/headers";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPut } from "@/utils/api-utils";

export type PropertyGstStatus = {
  propertyId: string;
  isPropertyGstRegistered: boolean;
  propertyGstNumber: string | null;
  propertyGstCertificateUrl: string | null;
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

export async function getPropertyGstStatus(propertyId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: PropertyGstStatus | null;
    message?: string;
  }>(`/api/admin/properties/${propertyId}/gst-status`, {
    token,
  });
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch GST status");
  }
  return result.data;
}

export async function updatePropertyGstStatus(input: {
  propertyId: string;
  isPropertyGstRegistered: boolean;
  propertyGstNumber?: string | null;
  propertyGstCertificateUrl?: string | null;
}) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPut<{
    success: boolean;
    data: PropertyGstStatus | null;
    message?: string;
  }>("/api/admin/properties/gst-status", input, { token });
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to update GST status");
  }
  return result.data;
}
