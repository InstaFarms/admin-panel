"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  PROPERTY_TYPES_ERRORS,
  PROPERTY_TYPES_SUCCESS,
  PROPERTY_TYPES_VALIDATION,
} from "@/constants/propertyTypes";
import { captureError } from "@/lib/sentry";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);
  return token;
}

// ─── Error parser ─────────────────────────────────────────────────────────────

function parseApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("duplicate") || msg.includes("already exists")) return PROPERTY_TYPES_VALIDATION.nameDuplicate;
    if (msg.includes("not found")) return PROPERTY_TYPES_ERRORS.notFound;
    if (msg.includes("unauthorized")) return PROPERTY_TYPES_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return PROPERTY_TYPES_ERRORS.fetchFailed;
    return err.message;
  }
  return fallback;
}

// ─── Validate name ────────────────────────────────────────────────────────────

function validateName(name: string | undefined | null): string | null {
  if (!name || name.trim().length === 0) return PROPERTY_TYPES_VALIDATION.nameRequired;
  if (name.trim().length < 2) return PROPERTY_TYPES_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return PROPERTY_TYPES_VALIDATION.nameMaxLength;
  return null;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createPropertyType = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);

    const name = parseString(formData.get("propertyType")?.toString());
    const nameError = validateName(name);
    if (nameError) return { error: nameError };

    const token = await getAuthToken();
    await apiPost("/api/property-types", { name: name!.trim() }, { token });

    revalidatePath("/admin/propertyTypes");
    return { success: PROPERTY_TYPES_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, PROPERTY_TYPES_ERRORS.createFailed) };
  }
};

export const editPropertyType = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);
    if (!id) return { error: PROPERTY_TYPES_ERRORS.invalidId };

    const name = parseString(formData.get("propertyType")?.toString());
    const nameError = validateName(name);
    if (nameError) return { error: nameError };

    const token = await getAuthToken();
    await apiPatch(`/api/property-types/${id}`, { name: name!.trim() }, { token });

    revalidatePath("/admin/propertyTypes");
    return { success: PROPERTY_TYPES_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, PROPERTY_TYPES_ERRORS.updateFailed) };
  }
};

export const deletePropertyType = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);
    if (!id) return { error: PROPERTY_TYPES_ERRORS.invalidId };

    const token = await getAuthToken();
    await apiDelete(`/api/property-types/${id}`, { token });

    revalidatePath("/admin/propertyTypes");
    return { success: PROPERTY_TYPES_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, PROPERTY_TYPES_ERRORS.deleteFailed) };
  }
};

export const getPropertyTypes = async (
  pageNumber?: number,
  perPage?: number,
  searchValue?: string,
  searchBy?: string
): Promise<{ data: any[]; total: number }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);

    const token = await getAuthToken();

    if (pageNumber && perPage) {
      const body: Record<string, unknown> = {
        pageNumber,
        perPage,
        sortorder: "desc",
        orderBy: "createdAt",
      };
      if (searchValue && searchBy) {
        body.searchKey = searchValue.toLowerCase();
        body.searchBy = searchBy;
      }
      const response = await apiPost<{ data?: any[]; totalCount?: number }>(
        "/api/property-types/paginate",
        body,
        { token }
      );
      const data = response.data ?? [];
      const total = response.totalCount ?? data.length;
      return { data, total };
    }

    const response = await apiGet<{ data?: any[] }>("/api/property-types", { token });
    const data = response.data ?? [];
    return { data, total: data.length };
  } catch (err) {
    captureError(err);
    throw new Error(parseApiError(err, PROPERTY_TYPES_ERRORS.fetchFailed));
  }
};

export const getPropertyTypeById = async (id: string): Promise<any> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(PROPERTY_TYPES_ERRORS.unauthorized);
    if (!id) throw new Error(PROPERTY_TYPES_ERRORS.invalidId);

    const token = await getAuthToken();
    const response = await apiGet(`/api/property-types/${id}`, { token });
    return response.data ?? null;
  } catch (err) {
    captureError(err);
    throw new Error(parseApiError(err, PROPERTY_TYPES_ERRORS.fetchFailed));
  }
};