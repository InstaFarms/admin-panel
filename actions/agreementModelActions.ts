"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  AGREEMENT_MODEL_ERRORS,
  AGREEMENT_MODEL_SUCCESS,
} from "@/constants/agreementModels";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

export type AgreementModelStatus = "ACTIVE" | "INACTIVE";

export type AgreementModel = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isRentBasisModel: boolean;
  isExpensesBasisModel: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AgreementModelListResponse = {
  data: AgreementModel[];
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
    throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
  }

  return token;
}

function parseAgreementModelError(err: unknown, fallback: string) {
  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

function getFormActive(formData: FormData) {
  return formData.get("status")?.toString() !== "INACTIVE";
}

function getFormBoolean(formData: FormData, field: string) {
  const value = formData.get(field)?.toString();
  return value === "on" || value === "true";
}

export async function getAgreementModels(params: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: "name" | "code" | "description";
  status?: AgreementModelStatus | "ALL";
}): Promise<AgreementModelListResponse> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
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

  const response = await apiGet<AgreementModelListResponse>(
    `/api/admin/agreement-models${query.size ? `?${query.toString()}` : ""}`,
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

export async function getAgreementModelById(id: string) {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
  }

  if (!id) {
    throw new Error(AGREEMENT_MODEL_ERRORS.invalidId);
  }

  const token = await getAuthToken();
  const response = await apiGet<{ data: AgreementModel }>(
    `/api/admin/agreement-models/${id}`,
    { token },
  );

  return response.data;
}

export async function createAgreementModel(
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
    }

    const name = parseString(formData.get("name")?.toString());
    const code = parseString(formData.get("code")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!name) return { error: "Please enter agreement model name." };
    if (!code) return { error: "Please enter agreement model code." };

    const token = await getAuthToken();
    await apiPost(
      "/api/admin/agreement-models",
      {
        name,
        code,
        description: description || null,
        isRentBasisModel: getFormBoolean(formData, "isRentBasisModel"),
        isExpensesBasisModel: getFormBoolean(
          formData,
          "isExpensesBasisModel",
        ),
        isActive: getFormActive(formData),
      },
      { token },
    );

    revalidatePath("/admin/agreement-models");
    return { success: AGREEMENT_MODEL_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return {
      error: parseAgreementModelError(err, AGREEMENT_MODEL_ERRORS.createFailed),
    };
  }
}

export async function updateAgreementModel(
  id: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
    }

    if (!id) return { error: AGREEMENT_MODEL_ERRORS.invalidId };

    const name = parseString(formData.get("name")?.toString());
    const code = parseString(formData.get("code")?.toString());
    const description = parseString(formData.get("description")?.toString());

    if (!name) return { error: "Please enter agreement model name." };
    if (!code) return { error: "Please enter agreement model code." };

    const token = await getAuthToken();
    await apiPatch(
      `/api/admin/agreement-models/${id}`,
      {
        name,
        code,
        description: description || null,
        isRentBasisModel: getFormBoolean(formData, "isRentBasisModel"),
        isExpensesBasisModel: getFormBoolean(
          formData,
          "isExpensesBasisModel",
        ),
        isActive: getFormActive(formData),
      },
      { token },
    );

    revalidatePath("/admin/agreement-models");
    revalidatePath(`/admin/agreement-models/${id}`);
    return { success: AGREEMENT_MODEL_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return {
      error: parseAgreementModelError(err, AGREEMENT_MODEL_ERRORS.updateFailed),
    };
  }
}

export async function deleteAgreementModel(
  id: string,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error(AGREEMENT_MODEL_ERRORS.unauthorized);
    }

    if (!id) return { error: AGREEMENT_MODEL_ERRORS.invalidId };

    const token = await getAuthToken();
    await apiDelete(`/api/admin/agreement-models/${id}`, { token });

    revalidatePath("/admin/agreement-models");
    return { success: AGREEMENT_MODEL_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return {
      error: parseAgreementModelError(err, AGREEMENT_MODEL_ERRORS.deleteFailed),
    };
  }
}
