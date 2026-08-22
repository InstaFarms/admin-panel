"use server";

import { cookies } from "next/headers";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import type { CommissionBookingSource } from "./sourceCommissionActions";
import type {
  BookingSourceGroup,
  CommissionBase,
  CommissionType,
} from "@/constants/propertyCommercialConfig";

export type PropertyCommissionSourceRule = {
  id: string;
  propertyId: string;
  commissionBookingSourceId: string | null;
  sourceName: string | null;
  sourceCode: string | null;
  bookingSourceGroup: BookingSourceGroup;
  commissionType: CommissionType;
  commissionValue: number;
  commissionBase: CommissionBase;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PropertyCommissionSourceRuleInput = {
  propertyId: string;
  commissionBookingSourceId: string;
  bookingSourceGroup: BookingSourceGroup;
  commissionType?: CommissionType;
  commissionValue: number;
  commissionBase?: CommissionBase;
  isActive?: boolean;
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

export async function getPropertyCommissionSourceRules(propertyId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: PropertyCommissionSourceRule[];
  }>(`/api/admin/properties/${propertyId}/commission-source-rules`, { token });
  return result.data ?? [];
}

export async function getActiveCommissionBookingSources() {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: CommissionBookingSource[];
  }>("/api/admin/commission-booking-sources?status=ACTIVE&limit=100", {
    token,
  });
  return result.data ?? [];
}

export async function getAvailableCommissionBookingSourcesForProperty(
  propertyId: string,
  currentSourceId?: string | null,
) {
  const [sources, rules] = await Promise.all([
    getActiveCommissionBookingSources(),
    getPropertyCommissionSourceRules(propertyId),
  ]);

  const usedSourceIds = new Set(
    rules
      .map((rule) => rule.commissionBookingSourceId)
      .filter((id): id is string => Boolean(id))
      .filter((id) => id !== currentSourceId),
  );

  return sources.filter((source) => !usedSourceIds.has(source.id));
}

export async function createPropertyCommissionSourceRule(
  input: PropertyCommissionSourceRuleInput,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPost<{
    success: boolean;
    data: unknown;
    message?: string;
  }>("/api/admin/properties/commission-source-rules", input, { token });
  if (!result.success) throw new Error(result.message || "Create failed");
  return result.data;
}

export async function updatePropertyCommissionSourceRule(
  id: string,
  input: Omit<PropertyCommissionSourceRuleInput, "propertyId">,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPatch<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/properties/commission-source-rules/${id}`, input, { token });
  if (!result.success) throw new Error(result.message || "Update failed");
  return result.data;
}

export async function deletePropertyCommissionSourceRule(id: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiDelete<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/properties/commission-source-rules/${id}`, { token });
  if (!result.success) throw new Error(result.message || "Delete failed");
  return result.data;
}
