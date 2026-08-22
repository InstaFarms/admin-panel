"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost } from "@/utils/api-utils";

export type BookingAdjustmentType = "POSITIVE" | "NEGATIVE";
export type BookingAdjustmentReason =
  | "EXTRA_GUEST"
  | "SERVICE_FAILURE"
  | "PRICE_CORRECTION"
  | "MILESTONE_ADJUSTMENT"
  | "MANUAL"
  | "OTHER";

export type BookingAdjustment = {
  id: string;
  bookingId: string;
  propertyId: string;
  brandId: string;
  ownerId: string;
  adjustmentType: BookingAdjustmentType;
  adjustmentReason: BookingAdjustmentReason;
  description: string | null;
  amountInputType: "GST_INCLUSIVE" | "GST_EXCLUSIVE";
  grossAmountInclGst: number;
  bookingGstRate: number;
  bookingGstAmount: number;
  amountExclBookingGst: number;
  commissionRate: number;
  commissionAmount: number;
  commissionGstRate: number;
  commissionGstAmount: number;
  commissionGstMode: "INCLUSIVE" | "EXCLUSIVE";
  ownerShare: number;
  isOwnerGstRegistered: boolean;
  commissionModelId: string | null;
  propertyCommissionConfigId: string | null;
  milestoneTrackerId: string | null;
  affectsBookingRevenue: boolean;
  affectsMilestoneRevenue: boolean;
  status: "DRAFT" | "POSTED" | "VOIDED";
  adjustmentDate: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBookingAdjustmentInput = {
  adjustmentType: BookingAdjustmentType;
  adjustmentReason: BookingAdjustmentReason;
  grossAmountInclGst: number;
  adjustmentDate: string;
  description?: string | null;
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

export async function getBookingAdjustments(bookingId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const response = await apiGet<{ data: BookingAdjustment[] }>(
    `/api/admin/bookings/${bookingId}/adjustments`,
    { token },
  );
  return response.data ?? [];
}

export async function getBookingAdjustment(adjustmentId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const response = await apiGet<{ data: BookingAdjustment }>(
    `/api/admin/booking-adjustments/${adjustmentId}`,
    { token },
  );
  return response.data;
}

export async function createBookingAdjustment(
  bookingId: string,
  input: CreateBookingAdjustmentInput,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const response = await apiPost<{
    success: boolean;
    data: BookingAdjustment;
    message?: string;
  }>(`/api/admin/bookings/${bookingId}/adjustments`, input, { token });

  if (!response.success) {
    throw new Error(response.message || "Failed to create adjustment");
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  return response.data;
}
