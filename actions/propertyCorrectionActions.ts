"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiGet, apiPost } from "@/utils/api-utils";
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

export type CorrectionKind = "AGREEMENT" | "MILESTONE";

export async function previewPropertyCorrection(input: {
  propertyId: string;
  kind: CorrectionKind;
  rangeStart: string;
  rangeEnd: string;
  payload: Record<string, unknown>;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data: unknown;
      message?: string;
    }>(
      `/api/admin/properties/${input.propertyId}/correction/preview`,
      {
        kind: input.kind,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        payload: input.payload,
      },
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to preview correction");
    }

    return { data: result.data };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Failed to preview correction.",
    };
  }
}

export async function applyAgreementCorrection(input: {
  propertyId: string;
  payload: { agreementModelId: string; rent?: number | null };
  rangeStart: string;
  rangeEnd: string;
  bookingIdsToRestate: string[];
  reason: string;
  changeAttemptId?: string;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data?: unknown;
      message?: string;
    }>(
      `/api/admin/properties/${input.propertyId}/correction/agreement/apply`,
      input,
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to apply agreement correction");
    }

    revalidatePath(`/admin/properties/${input.propertyId}`);
    revalidatePath(`/admin/properties/${input.propertyId}/edit`);
    return { success: "Agreement correction applied.", data: result.data };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply agreement correction.",
    };
  }
}

export async function applyMilestoneCorrection(input: {
  propertyId: string;
  payload: {
    name: string;
    revenueBasis?:
      | "EXCL_BOOKING_GST"
      | "INCL_BOOKING_GST"
      | "NET_REVENUE_EXCL_GST";
    lines: Array<{
      milestoneNumber: number;
      label: string;
      minRevenue: number;
      maxRevenue?: number | null;
      commissionPercentage: number;
      sortOrder?: number;
    }>;
  };
  rangeStart: string;
  rangeEnd: string;
  bookingIdsToRestate: string[];
  reason: string;
  changeAttemptId?: string;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data?: unknown;
      message?: string;
    }>(
      `/api/admin/properties/${input.propertyId}/correction/milestone/apply`,
      input,
      { token },
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to apply milestone correction");
    }

    revalidatePath(`/admin/properties/${input.propertyId}`);
    revalidatePath(`/admin/properties/${input.propertyId}/edit`);
    return { success: "Milestone correction applied.", data: result.data };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply milestone correction.",
    };
  }
}

export async function previewOwnerBlockRentCorrection(input: {
  propertyId: string;
  rangeStart: string;
  rangeEnd: string;
  newRatePerNight: number;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data: unknown;
      message?: string;
    }>(
      `/api/admin/properties/${input.propertyId}/correction/owner-block-rent/preview`,
      input,
      { token },
    );

    if (!result.success) {
      throw new Error(
        result.message || "Failed to preview owner block rent correction",
      );
    }

    return { data: result.data };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Failed to preview owner block rent correction.",
    };
  }
}

export async function applyOwnerBlockRentCorrection(input: {
  propertyId: string;
  rangeStart: string;
  rangeEnd: string;
  newRatePerNight: number;
  recordIdsToRestate: string[];
  reason: string;
  changeAttemptId?: string;
}): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiPost<{
      success: boolean;
      data?: unknown;
      message?: string;
    }>(
      `/api/admin/properties/${input.propertyId}/correction/owner-block-rent/apply`,
      input,
      { token },
    );

    if (!result.success) {
      throw new Error(
        result.message || "Failed to apply owner block rent correction",
      );
    }

    revalidatePath(`/admin/properties/${input.propertyId}`);
    revalidatePath(`/admin/properties/${input.propertyId}/edit`);
    return {
      success: "Owner block rent correction applied.",
      data: result.data,
    };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to apply owner block rent correction.",
    };
  }
}

export async function getPropertyCorrectionHistory(
  propertyId: string,
): Promise<ServerActionResult> {
  try {
    await assertAdmin();
    const token = await getAuthToken();
    const result = await apiGet<{
      success: boolean;
      data: unknown;
      message?: string;
    }>(`/api/admin/properties/${propertyId}/correction-history`, { token });

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch correction history");
    }

    return { data: result.data };
  } catch (error) {
    captureError(error);
    return {
      error:
        error instanceof Error && error.message.trim()
          ? error.message
          : "Failed to fetch correction history.",
    };
  }
}
