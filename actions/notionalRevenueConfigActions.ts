"use server";

import { cookies } from "next/headers";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import type { NotionalRevenueWeekday } from "@/constants/propertyCommercialConfig";

export type BlockingReasonOption = {
  id: string;
  reason: string;
  description?: string | null;
  status?: string;
};

export type NotionalRevenueWeekdayPrice = {
  id?: string;
  weekday: NotionalRevenueWeekday;
  notionalAmount: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
};

export type NotionalRevenueConfig = {
  id: string;
  propertyId: string;
  typeName: string;
  typeId: string;
  blockingReason: string;
  description: string | null;
  isMilestoneRevenueApplicable: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
  weekdayPrices: Array<NotionalRevenueWeekdayPrice | null | undefined>;
};

export type NotionalRevenueConfigInput = {
  propertyId: string;
  typeName: string;
  typeId: string;
  description?: string | null;
  isMilestoneRevenueApplicable?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  weekdayPrices: Array<{
    weekday: NotionalRevenueWeekday;
    notionalAmount: number;
    currency?: string;
    status?: "ACTIVE" | "INACTIVE";
  }>;
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

export async function getNotionalRevenueConfigs(propertyId: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiGet<{
    success: boolean;
    data: NotionalRevenueConfig[];
  }>(`/api/admin/properties/${propertyId}/notional-revenue-config`, { token });
  return result.data ?? [];
}

export async function getAvailableBlockingReasonsForNotionalRevenue(
  propertyId: string,
  currentTypeId?: string | null,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const [blockingReasonsResult, configs] = await Promise.all([
    apiGet<{ success: boolean; data: BlockingReasonOption[] }>(
      "/api/admin/blocking-reasons?status=ACTIVE&limit=100",
      { token },
    ),
    getNotionalRevenueConfigs(propertyId),
  ]);

  const usedTypeIds = new Set(
    configs.map((config) => config.typeId).filter((id) => id !== currentTypeId),
  );

  return (blockingReasonsResult.data ?? []).filter(
    (reason) => !usedTypeIds.has(reason.id),
  );
}

export async function createNotionalRevenueConfig(
  input: NotionalRevenueConfigInput,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPost<{
    success: boolean;
    data: unknown;
    message?: string;
  }>("/api/admin/properties/notional-revenue-config", input, { token });
  if (!result.success) throw new Error(result.message || "Create failed");
  return result.data;
}

export async function updateNotionalRevenueConfig(
  id: string,
  input: Omit<NotionalRevenueConfigInput, "propertyId">,
) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiPatch<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/properties/notional-revenue-config/${id}`, input, { token });
  if (!result.success) throw new Error(result.message || "Update failed");
  return result.data;
}

export async function deleteNotionalRevenueConfig(id: string) {
  await assertAdmin();
  const token = await getAuthToken();
  const result = await apiDelete<{
    success: boolean;
    data: unknown;
    message?: string;
  }>(`/api/admin/properties/notional-revenue-config/${id}`, { token });
  if (!result.success) throw new Error(result.message || "Delete failed");
  return result.data;
}
