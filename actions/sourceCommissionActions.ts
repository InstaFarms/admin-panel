"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  SOURCE_COMMISSION_ERRORS,
  SOURCE_COMMISSION_SUCCESS,
} from "@/constants/sourceCommissions";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

export type SourceCommissionStatus = "ACTIVE" | "INACTIVE";

export type CommissionBookingSource = {
  id: string;
  sourceName: string;
  sourceCode: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CommissionBookingSourceListResponse = {
  data: CommissionBookingSource[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  if (!token) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);
  return token;
}

function parseSourceCommissionError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function getFormActive(formData: FormData) {
  return formData.get("status")?.toString() !== "INACTIVE";
}

export async function getCommissionBookingSources(params: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: "sourceName" | "sourceCode" | "description";
  status?: SourceCommissionStatus | "ALL";
}): Promise<CommissionBookingSourceListResponse> {
  const admin = await isAdmin();
  if (!admin) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);

  const token = await getAuthToken();
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.searchBy) query.set("searchBy", params.searchBy);
  if (params.status && params.status !== "ALL")
    query.set("status", params.status);

  const response = await apiGet<CommissionBookingSourceListResponse>(
    `/api/admin/commission-booking-sources${query.size ? `?${query.toString()}` : ""}`,
    { token },
  );

  return {
    data: response.data ?? [],
    pagination: response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: response.data?.length ?? 0,
      totalPages: 1,
    },
  };
}

export async function getCommissionBookingSourceById(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);
  if (!id) throw new Error(SOURCE_COMMISSION_ERRORS.invalidId);

  const token = await getAuthToken();
  const response = await apiGet<{ data: CommissionBookingSource }>(
    `/api/admin/commission-booking-sources/${id}`,
    { token },
  );
  return response.data;
}

export async function createCommissionBookingSource(
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);

    const sourceName = parseString(formData.get("sourceName")?.toString());
    const sourceCode = parseString(formData.get("sourceCode")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!sourceName) return { error: "Please enter source name." };
    if (!sourceCode) return { error: "Please enter source code." };

    const token = await getAuthToken();
    await apiPost(
      "/api/admin/commission-booking-sources",
      {
        sourceName,
        sourceCode,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );

    revalidatePath("/admin/source-commissions");
    return { success: SOURCE_COMMISSION_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return {
      error: parseSourceCommissionError(
        err,
        SOURCE_COMMISSION_ERRORS.createFailed,
      ),
    };
  }
}

export async function updateCommissionBookingSource(
  id: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);
    if (!id) return { error: SOURCE_COMMISSION_ERRORS.invalidId };

    const sourceName = parseString(formData.get("sourceName")?.toString());
    const sourceCode = parseString(formData.get("sourceCode")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!sourceName) return { error: "Please enter source name." };
    if (!sourceCode) return { error: "Please enter source code." };

    const token = await getAuthToken();
    await apiPatch(
      `/api/admin/commission-booking-sources/${id}`,
      {
        sourceName,
        sourceCode,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );

    revalidatePath("/admin/source-commissions");
    revalidatePath(`/admin/source-commissions/${id}`);
    return { success: SOURCE_COMMISSION_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return {
      error: parseSourceCommissionError(
        err,
        SOURCE_COMMISSION_ERRORS.updateFailed,
      ),
    };
  }
}

export async function deleteCommissionBookingSource(
  id: string,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(SOURCE_COMMISSION_ERRORS.unauthorized);
    if (!id) return { error: SOURCE_COMMISSION_ERRORS.invalidId };

    const token = await getAuthToken();
    await apiDelete(`/api/admin/commission-booking-sources/${id}`, { token });

    revalidatePath("/admin/source-commissions");
    return { success: SOURCE_COMMISSION_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return {
      error: parseSourceCommissionError(
        err,
        SOURCE_COMMISSION_ERRORS.deleteFailed,
      ),
    };
  }
}
