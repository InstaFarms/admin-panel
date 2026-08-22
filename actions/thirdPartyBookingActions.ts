"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/admin-only";
import { apiPost } from "@/utils/api-utils";
import type { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

export async function createThirdPartyBookingFill(formData: FormData): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const payload = {
      thirdPartyBookingId: (formData.get("thirdPartyBookingId")?.toString() || "").trim(),
      brandId: (formData.get("brandId")?.toString() || "").trim() || undefined,
      propertyId: (formData.get("propertyId")?.toString() || "").trim(),
      checkinDate: (formData.get("checkinDate")?.toString() || "").trim(),
      checkoutDate: (formData.get("checkoutDate")?.toString() || "").trim(),
      totalNights: Number(formData.get("totalNights")?.toString() || "0"),
      guestName: (formData.get("guestName")?.toString() || "").trim() || undefined,
      guestCount: Number(formData.get("guestCount")?.toString() || "0"),
      guestPhone: (formData.get("guestPhone")?.toString() || "").trim() || undefined,
      totalAmountInclGst: Number(formData.get("totalAmountInclGst")?.toString() || "0"),
      gstRate: (formData.get("gstRate")?.toString() || "").trim()
        ? Number(formData.get("gstRate")?.toString())
        : undefined,
      thirdPartyCommissionPercentage: (formData.get("thirdPartyCommissionPercentage")?.toString() || "").trim()
        ? Number(formData.get("thirdPartyCommissionPercentage")?.toString())
        : undefined,
      platformCommissionPercentage: (formData.get("platformCommissionPercentage")?.toString() || "").trim()
        ? Number(formData.get("platformCommissionPercentage")?.toString())
        : undefined,
      tdsRate: (formData.get("tdsRate")?.toString() || "").trim()
        ? Number(formData.get("tdsRate")?.toString())
        : undefined,
    };

    if (!payload.thirdPartyBookingId) return { error: "Third-party booking ID is required." };
    if (!payload.propertyId) return { error: "Property ID is required." };
    if (!payload.checkinDate || !payload.checkoutDate) return { error: "Check-in and checkout dates are required." };
    if (payload.totalNights <= 0) return { error: "Total nights must be greater than 0." };
    if (payload.guestCount <= 0) return { error: "Guest count must be greater than 0." };
    if (payload.totalAmountInclGst <= 0) return { error: "Total amount must be greater than 0." };

    const token = await getAuthToken();
    await apiPost("/api/third-party-bookings/admin/fill", payload, { token });

    revalidatePath("/admin/bookings/third-party-fill");
    revalidatePath("/admin/wallet");
    revalidatePath("/admin/finance/owner-wallets");

    return { success: "Third-party booking saved and wallet ledger posted." };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create third-party booking fill." };
  }
}

export async function createThirdPartyBookingDraft(formData: FormData): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const payload = {
      brandId: (formData.get("brandId")?.toString() || "").trim() || undefined,
      propertyId: (formData.get("propertyId")?.toString() || "").trim(),
      source: (formData.get("source")?.toString() || "").trim(),
      checkinDate: (formData.get("checkinDate")?.toString() || "").trim(),
      checkoutDate: (formData.get("checkoutDate")?.toString() || "").trim(),
      guestName: (formData.get("guestName")?.toString() || "").trim() || undefined,
      guestPhone: (formData.get("guestPhone")?.toString() || "").trim() || undefined,
      guestCount: (formData.get("guestCount")?.toString() || "").trim()
        ? Number(formData.get("guestCount")?.toString())
        : undefined,
      remarks: (formData.get("remarks")?.toString() || "").trim() || undefined,
      externalBookingId: (formData.get("externalBookingId")?.toString() || "").trim() || undefined,
    };

    if (!payload.propertyId) return { error: "Property is required." };
    if (!payload.source) return { error: "Source is required." };
    if (!payload.checkinDate || !payload.checkoutDate) {
      return { error: "Check-in and checkout dates are required." };
    }

    const token = await getAuthToken();
    const response = await apiPost("/api/third-party-bookings/admin/draft", payload, { token });

    revalidatePath("/admin/bookings/third-party");

    const draftId = response?.data?.id;
    return {
      success: "Third-party booking draft created.",
      data: draftId ? { thirdPartyBookingId: draftId } : undefined,
    };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to create third-party booking draft." };
  }
}

export async function calculateThirdPartyBookingFinancials(formData: FormData): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");

    const payload = {
      propertyId: (formData.get("propertyId")?.toString() || "").trim(),
      totalAmountInclGst: Number(formData.get("totalAmountInclGst")?.toString() || "0"),
      gstRate: (formData.get("gstRate")?.toString() || "").trim()
        ? Number(formData.get("gstRate")?.toString())
        : undefined,
      thirdPartyCommissionPercentage: (formData.get("thirdPartyCommissionPercentage")?.toString() || "").trim()
        ? Number(formData.get("thirdPartyCommissionPercentage")?.toString())
        : undefined,
      platformCommissionPercentage: (formData.get("platformCommissionPercentage")?.toString() || "").trim()
        ? Number(formData.get("platformCommissionPercentage")?.toString())
        : undefined,
      tdsRate: (formData.get("tdsRate")?.toString() || "").trim()
        ? Number(formData.get("tdsRate")?.toString())
        : undefined,
    };

    if (!payload.propertyId) return { error: "Property is required for calculation." };
    if (payload.totalAmountInclGst <= 0) return { error: "Total amount must be greater than 0." };

    const token = await getAuthToken();
    const response = await apiPost("/api/third-party-bookings/admin/calculate", payload, { token });
    return { success: "Calculation generated.", data: response?.data };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to calculate booking financials." };
  }
}
