"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { ServerActionResult } from "@/utils/types";
import { captureError } from "@/lib/sentry";

export type ExpenseCategoryStatus = "ACTIVE" | "INACTIVE";

export type PropertyExpenseCategory = {
  id: string;
  propertyId: string;
  propertyName?: string;
  propertyCode?: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ExpenseCategoryListResponse = {
  data: PropertyExpenseCategory[];
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
  if (!token) throw new Error("Unauthorized");
  return token;
}

function getFormActive(formData: FormData) {
  return formData.get("status")?.toString() !== "INACTIVE";
}

function parseError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export async function getExpenseCategories(params: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: "name" | "property" | "description";
  status?: ExpenseCategoryStatus | "ALL";
}): Promise<ExpenseCategoryListResponse> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.searchBy) query.set("searchBy", params.searchBy);
  if (params.status && params.status !== "ALL")
    query.set("status", params.status);

  const response = await apiGet<ExpenseCategoryListResponse>(
    `/api/admin/property-expense-categories${query.size ? `?${query.toString()}` : ""}`,
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

export async function getExpenseCategoryById(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  const token = await getAuthToken();
  const response = await apiGet<{ data: PropertyExpenseCategory }>(
    `/api/admin/property-expense-categories/${id}`,
    { token },
  );
  return response.data;
}

export async function getExpenseCategoriesForProperty(propertyId: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");
  const token = await getAuthToken();
  const response = await apiGet<{ data: PropertyExpenseCategory[] }>(
    `/api/admin/properties/${propertyId}/property-expense-categories`,
    { token },
  );
  return response.data ?? [];
}

export async function createExpenseCategory(
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const propertyId = parseString(formData.get("propertyId")?.toString());
    const name = parseString(formData.get("name")?.toString());
    const description = parseString(formData.get("description")?.toString());
    if (!propertyId) return { error: "Please select a property." };
    if (!name) return { error: "Please enter category name." };

    const token = await getAuthToken();
    await apiPost(
      "/api/admin/property-expense-categories",
      {
        propertyId,
        name,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );
    revalidatePath("/admin/expense-categories");
    return { success: "Expense category created." };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create expense category.") };
  }
}

export async function createExpenseCategoryForProperty(
  propertyId: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const name = parseString(formData.get("name")?.toString());
    const description = parseString(formData.get("description")?.toString());
    if (!propertyId) return { error: "Property context is missing." };
    if (!name) return { error: "Please enter category name." };

    const token = await getAuthToken();
    await apiPost(
      "/api/admin/property-expense-categories",
      {
        propertyId,
        name,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );
    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: "Expense category created." };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to create expense category.") };
  }
}

export async function updateExpenseCategory(
  id: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const propertyId = parseString(formData.get("propertyId")?.toString());
    const name = parseString(formData.get("name")?.toString());
    const description = parseString(formData.get("description")?.toString());
    if (!propertyId) return { error: "Please select a property." };
    if (!name) return { error: "Please enter category name." };

    const token = await getAuthToken();
    await apiPatch(
      `/api/admin/property-expense-categories/${id}`,
      {
        propertyId,
        name,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );
    revalidatePath("/admin/expense-categories");
    revalidatePath(`/admin/expense-categories/${id}`);
    return { success: "Expense category updated." };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update expense category.") };
  }
}

export async function updateExpenseCategoryForProperty(
  propertyId: string,
  id: string,
  formData: FormData,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const name = parseString(formData.get("name")?.toString());
    const description = parseString(formData.get("description")?.toString());
    if (!propertyId) return { error: "Property context is missing." };
    if (!name) return { error: "Please enter category name." };

    const token = await getAuthToken();
    await apiPatch(
      `/api/admin/property-expense-categories/${id}`,
      {
        propertyId,
        name,
        description: description || null,
        isActive: getFormActive(formData),
      },
      { token },
    );
    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: "Expense category updated." };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to update expense category.") };
  }
}

export async function deleteExpenseCategory(
  id: string,
): Promise<ServerActionResult> {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error("Unauthorized");
    const token = await getAuthToken();
    await apiDelete(`/api/admin/property-expense-categories/${id}`, { token });
    revalidatePath("/admin/expense-categories");
    return { success: "Expense category deleted." };
  } catch (err) {
    captureError(err);
    return { error: parseError(err, "Failed to delete expense category.") };
  }
}
