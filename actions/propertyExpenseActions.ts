"use server";

import { cookies } from "next/headers";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";

export type PropertyMonthlyExpenseStatus = "OPEN" | "CLOSED" | "LOCKED";

export type MonthlyExpenseEntry = {
  id: string;
  propertyMonthlyExpenseId: string;
  propertyId: string;
  expenseDate: string;
  propertyExpenseCategoryId: string;
  categoryName: string | null;
  description: string | null;
  amountExclGst: number;
  gstRate: number;
  gstAmount: number;
  amountInclGst: number;
  attachmentUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PropertyMonthlyExpense = {
  id: string;
  propertyId: string;
  month: string;
  status: PropertyMonthlyExpenseStatus;
  totalExpenseExclGst: number;
  totalGstAmount: number;
  totalExpenseInclGst: number;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  entries: MonthlyExpenseEntry[];
};

export type MonthlyExpenseInput = {
  propertyId: string;
  month: string;
  status?: PropertyMonthlyExpenseStatus;
  notes?: string | null;
};

export type ExpenseEntryInput = {
  propertyMonthlyExpenseId: string;
  propertyId: string;
  expenseDate: string;
  propertyExpenseCategoryId: string;
  description?: string | null;
  amountExclGst: number;
  gstRate?: number;
  attachmentUrl?: string | null;
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

export async function getPropertyMonthlyExpenses(propertyId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{ data: PropertyMonthlyExpense[] }>(
    `/api/admin/properties/${propertyId}/monthly-expenses`,
    { token },
  );
  return result.data ?? [];
}

export async function createPropertyMonthlyExpense(input: MonthlyExpenseInput) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPost<{
    success: boolean;
    data: unknown;
    message?: string;
  }>("/api/admin/property-monthly-expenses", input, { token });
  if (!result.success) throw new Error(result.message || "Create failed");
  return result.data;
}

export async function updatePropertyMonthlyExpense(
  id: string,
  input: Partial<MonthlyExpenseInput>,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPatch<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/property-monthly-expenses/${id}`, input, { token });
  if (!result.success) throw new Error(result.message || "Update failed");
  return result.data;
}

export async function deletePropertyMonthlyExpense(id: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiDelete<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/property-monthly-expenses/${id}`, { token });
  if (!result.success) throw new Error(result.message || "Delete failed");
  return result.data;
}

export async function createPropertyMonthlyExpenseEntry(
  input: ExpenseEntryInput,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPost<{
    success: boolean;
    data: unknown;
    message?: string;
  }>("/api/admin/property-monthly-expense-entries", input, { token });
  if (!result.success) throw new Error(result.message || "Create failed");
  return result.data;
}

export async function updatePropertyMonthlyExpenseEntry(
  id: string,
  input: Omit<ExpenseEntryInput, "propertyMonthlyExpenseId" | "propertyId">,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPatch<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/property-monthly-expense-entries/${id}`, input, { token });
  if (!result.success) throw new Error(result.message || "Update failed");
  return result.data;
}

export async function deletePropertyMonthlyExpenseEntry(id: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiDelete<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/property-monthly-expense-entries/${id}`, { token });
  if (!result.success) throw new Error(result.message || "Delete failed");
  return result.data;
}
