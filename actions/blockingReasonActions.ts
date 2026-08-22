"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  BLOCKING_REASON_ERRORS,
  BLOCKING_REASON_SUCCESS,
} from "@/constants/blockingReasons";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

export type BlockingReasonStatus = "ACTIVE" | "INACTIVE";

export type BlockingReason = {
  id: string;
  reason: string;
  description: string | null;
  status: BlockingReasonStatus;
  timestamp?: string;
};

export type BlockingReasonListResponse = {
  data: BlockingReason[];
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

  if (!token) {
    throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
  }

  return token;
}

function parseBlockingReasonError(err: unknown, fallback: string) {
  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function getFormStatus(formData: FormData): BlockingReasonStatus {
  return formData.get("status")?.toString() === "INACTIVE"
    ? "INACTIVE"
    : "ACTIVE";
}

export async function getBlockingReasons(params: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: "reason" | "description";
  status?: BlockingReasonStatus | "ALL";
}): Promise<BlockingReasonListResponse> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
  }

  const token = await getAuthToken();
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.searchBy) query.set("searchBy", params.searchBy);
  if (params.status && params.status !== "ALL") {
    query.set("status", params.status);
  }

  const response = await apiGet<BlockingReasonListResponse>(
    `/api/admin/blocking-reasons${query.size ? `?${query.toString()}` : ""}`,
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

export async function getBlockingReasonById(id: string) {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
  }

  if (!id) {
    throw new Error(BLOCKING_REASON_ERRORS.invalidId);
  }

  const token = await getAuthToken();
  const response = await apiGet<{ data: BlockingReason }>(
    `/api/admin/blocking-reasons/${id}`,
    { token },
  );

  return response.data;
}

export async function createBlockingReason(
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
    }

    const reason = parseString(formData.get("reason")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!reason) {
      return { error: "Please enter blocking reason." };
    }

    const token = await getAuthToken();
    await apiPost(
      "/api/admin/blocking-reasons",
      {
        reason,
        description: description || null,
        status: getFormStatus(formData),
      },
      { token },
    );

    revalidatePath("/admin/blocking-reasons");
    return { success: BLOCKING_REASON_SUCCESS.created };
  } catch (err) {
    return {
      error: parseBlockingReasonError(err, BLOCKING_REASON_ERRORS.createFailed),
    };
  }
}

export async function updateBlockingReason(
  id: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
    }

    if (!id) {
      return { error: BLOCKING_REASON_ERRORS.invalidId };
    }

    const reason = parseString(formData.get("reason")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!reason) {
      return { error: "Please enter blocking reason." };
    }

    const token = await getAuthToken();
    await apiPatch(
      `/api/admin/blocking-reasons/${id}`,
      {
        reason,
        description: description || null,
        status: getFormStatus(formData),
      },
      { token },
    );

    revalidatePath("/admin/blocking-reasons");
    revalidatePath(`/admin/blocking-reasons/${id}`);
    return { success: BLOCKING_REASON_SUCCESS.updated };
  } catch (err) {
    return {
      error: parseBlockingReasonError(err, BLOCKING_REASON_ERRORS.updateFailed),
    };
  }
}

export async function deleteBlockingReason(
  id: string,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(BLOCKING_REASON_ERRORS.unauthorized);
    }

    if (!id) {
      return { error: BLOCKING_REASON_ERRORS.invalidId };
    }

    const token = await getAuthToken();
    await apiDelete(`/api/admin/blocking-reasons/${id}`, { token });

    revalidatePath("/admin/blocking-reasons");
    return { success: BLOCKING_REASON_SUCCESS.deleted };
  } catch (err) {
    return {
      error: parseBlockingReasonError(err, BLOCKING_REASON_ERRORS.deleteFailed),
    };
  }
}
