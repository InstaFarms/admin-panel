"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { apiGet, apiPatch } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import type { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error("No authentication token found");
  return token;
}

async function assertAdmin() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
}

export type ActiveBookingSourceOption = {
  id: string;
  name: string;
  sourceCategory: string;
  sourceTypeName?: string | null;
  commissionType: string;
  commissionValue: string | number;
  commissionOn: string;
  gstApplicable: boolean;
  tdsApplicable: boolean;
  isActive: boolean;
};

export async function getActiveBookingSourcesForCorrection() {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: ActiveBookingSourceOption[];
    message?: string;
  }>("/api/booking/admin/sources", { token });

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch booking sources");
  }

  return result.data ?? [];
}

export async function changeBookingSourceForCorrection(input: {
  bookingId: string;
  newBookingSourceId: string;
  reason: string;
  changeAttemptId?: string;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const reason = input.reason.trim();
    if (!reason) {
      return { error: "Reason is required." };
    }

    const token = await getAuthToken();
    const result = await apiPatch<{
      success: boolean;
      data?: unknown;
      message?: string;
    }>(
      `/api/booking/admin/${input.bookingId}/source`,
      {
        newBookingSourceId: input.newBookingSourceId,
        reason,
        changeAttemptId: input.changeAttemptId,
      },
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to change booking source");
    }

    revalidatePath(`/admin/bookings/${input.bookingId}`);
    revalidatePath(`/admin/finance/booking-finance/${input.bookingId}`);

    return {
      success: result.message || "Booking source updated.",
      data: result.data,
    };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to change booking source.",
    };
  }
}

export async function getSourceChangePreview(input: {
  bookingId: string;
  newBookingSourceId: string;
}) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(
    `/api/booking/admin/${input.bookingId}/source-change-preview?newSourceId=${encodeURIComponent(
      input.newBookingSourceId,
    )}`,
    { token },
  );

  if (!result.success) {
    throw new Error(result.message || "Failed to preview source change");
  }

  return result.data;
}

export async function getBookingCorrectionHistory(bookingId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: unknown[];
    message?: string;
  }>(`/api/admin/bookings/${bookingId}/correction-history`, { token });

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch correction history");
  }

  return result.data ?? [];
}
