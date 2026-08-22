"use server";

import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";

export type MinBookingRule = {
  id: string;
  propertyId: string;
  label: string;
  startDate: string;
  endDate: string;
  minNights: number;
  isActive: boolean;
  createdAt?: string;
};

export type MinBookingRuleInput = {
  propertyId: string;
  label: string;
  startDate: string;
  endDate: string;
  minNights: number;
  isActive?: boolean;
};

export async function getMinBookingRules(propertyId: string): Promise<MinBookingRule[]> {
  try {
    await isAdmin();
    const token = await getApiAuthToken();
    const res = await apiGet<{ data: MinBookingRule[] }>(
      `/api/properties/min-booking-rules?propertyId=${propertyId}`,
      { token },
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function createMinBookingRule(input: MinBookingRuleInput): Promise<MinBookingRule> {
  await isAdmin();
  const token = await getApiAuthToken();
  const res = await apiPost<{ data: MinBookingRule }>(
    `/api/properties/min-booking-rules`,
    input,
    { token },
  );
  return res.data;
}

export async function updateMinBookingRule(
  id: string,
  input: Partial<Omit<MinBookingRuleInput, "propertyId">>,
): Promise<MinBookingRule> {
  await isAdmin();
  const token = await getApiAuthToken();
  const res = await apiPut<{ data: MinBookingRule }>(
    `/api/properties/min-booking-rules/${id}`,
    input,
    { token },
  );
  return res.data;
}

export async function deleteMinBookingRule(id: string): Promise<void> {
  await isAdmin();
  const token = await getApiAuthToken();
  await apiDelete(`/api/properties/min-booking-rules/${id}`, { token });
}
