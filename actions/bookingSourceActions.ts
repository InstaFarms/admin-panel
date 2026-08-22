"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/admin-only";
import { apiDelete, apiGet, apiPatch, apiPost, buildQueryString } from "@/utils/api-utils";
import type { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

export type ThirdPartyBookingSource = {
  id: string;
  name: string;
  commissionPercentage: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function getThirdPartyBookingSources(search?: string): Promise<ThirdPartyBookingSource[]> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  const token = await getAuthToken();
  const query = buildQueryString({ search: search?.trim() || undefined });
  const result = await apiGet<{ data?: ThirdPartyBookingSource[] }>(
    `/api/third-party-bookings/admin/source-config${query}`,
    { token }
  );
  return result.data || [];
}

export async function getThirdPartyBookingSourceById(id: string): Promise<ThirdPartyBookingSource | null> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  const token = await getAuthToken();
  try {
    const result = await apiGet<{ data?: ThirdPartyBookingSource }>(
      `/api/third-party-bookings/admin/source-config/${id}`,
      { token }
    );
    return result.data || null;
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("not found")) return null;
    captureError(err);
    throw err;
  }
}

export async function createBookingSourceWithCommission(
  formData: FormData
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const name = (formData.get("name")?.toString() || "").trim();
    const commissionPercentage = Number(formData.get("commissionPercentage")?.toString() || "0");

    if (!name) return { error: "Source name is required." };
    if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0) {
      return { error: "Commission percentage must be 0 or greater." };
    }

    const token = await getAuthToken();
    await apiPost(
      "/api/third-party-bookings/admin/source-config",
      {
        name,
        commissionPercentage,
      },
      { token }
    );

    revalidatePath("/admin");
    return { success: "Booking source and commission created successfully." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create source." };
  }
}

export async function editBookingSourceWithCommission(
  id: string,
  formData: FormData
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const name = (formData.get("name")?.toString() || "").trim();
    const commissionPercentage = Number(formData.get("commissionPercentage")?.toString() || "0");
    if (!name) return { error: "Source name is required." };
    if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0) {
      return { error: "Commission percentage must be 0 or greater." };
    }

    const token = await getAuthToken();
    await apiPatch(
      `/api/third-party-bookings/admin/source-config/${id}`,
      { name, commissionPercentage },
      { token }
    );
    revalidatePath("/admin/bookings/third-party/sources");
    return { success: "Booking source updated successfully." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to update source." };
  }
}

export async function deleteBookingSource(id: string): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    await apiDelete(`/api/third-party-bookings/admin/source-config/${id}`, { token });
    revalidatePath("/admin/bookings/third-party/sources");
    return { success: "Booking source deleted successfully." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to delete source." };
  }
}

