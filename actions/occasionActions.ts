"use server";

import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPost, apiPut } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";

const MAGO_ADMIN = "MAGO_ADMIN";

export interface OccasionMeta {
  id: string;
  name: string;
  slug: string;
  weight: number;
}

export async function getAllOccasions(): Promise<OccasionMeta[]> {
  try {
    const token = await getApiAuthToken();
    const res = await apiGet<ApiResponse<OccasionMeta[]>>(
      `/api/occasions`,
      { token, appType: MAGO_ADMIN },
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export interface CityCount {
  cityName: string;
  count: number;
}

export async function getOccasionCities(occasionSlug: string | null): Promise<CityCount[]> {
  try {
    const token = await getApiAuthToken();
    const params = new URLSearchParams();
    if (occasionSlug) params.set("occasion", occasionSlug);
    const res = await apiGet<ApiResponse<CityCount[]>>(
      `/api/occasions/properties/cities?${params}`,
      { token, appType: MAGO_ADMIN },
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getTopPropertiesForOccasion(
  occasionSlug: string | null,
  city: string | null,
  search: string,
  page = 1,
  size = 25,
): Promise<any[]> {
  try {
    const token = await getApiAuthToken();
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (occasionSlug) params.set("occasion", occasionSlug);
    if (city)         params.set("city", city);
    if (search)       params.set("search", search);
    const res = await apiGet<ApiResponse<any[]>>(
      `/api/occasions/properties/top?${params}`,
      { token, appType: MAGO_ADMIN },
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function createOccasion(
  name: string,
  icon: string | null,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const token = await getApiAuthToken();
    await apiPost<ApiResponse<unknown>>(
      `/api/occasions`,
      { name, icon: icon || undefined },
      { token, appType: MAGO_ADMIN },
    );
    return { success: true };
  } catch (err: any) {
    captureError(err);
    return { success: false, error: err.message ?? "Failed to create occasion." };
  }
}

export interface OccasionScore {
  occasionId: string;
  name: string;
  slug: string;
  icon: string | null;
  weight: number;
  score: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getPropertyOccasionScores(
  propertyId: string,
): Promise<OccasionScore[]> {
  const token = await getApiAuthToken();
  const res = await apiGet<ApiResponse<OccasionScore[]>>(
    `/api/occasions/properties/${propertyId}/scores`,
    { token, appType: MAGO_ADMIN },
  );
  return res.data ?? [];
}

export interface PropertyWithScores {
  id: string;
  propertyName: string | null;
  propertyCodeName: string | null;
  city: string | null;
  scores: Record<string, number>;
}

export interface ScoresOverview {
  occasions: OccasionMeta[];
  properties: PropertyWithScores[];
}

export async function getPropertiesWithOccasionScores(
  page = 1,
  size = 20,
  search = "",
): Promise<ScoresOverview> {
  const token = await getApiAuthToken();
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) params.set("search", search);
  const res = await apiGet<ApiResponse<ScoresOverview>>(
    `/api/occasions/properties/scores-overview?${params}`,
    { token, appType: MAGO_ADMIN },
  );
  return res.data ?? { occasions: [], properties: [] };
}

export async function deletePropertyOccasionScores(
  propertyId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const token = await getApiAuthToken();
    await apiDelete<ApiResponse<null>>(
      `/api/occasions/properties/${propertyId}/scores`,
      { token, appType: MAGO_ADMIN },
    );
    return { success: true };
  } catch (err: any) {
    captureError(err);
    return { success: false, error: err.message ?? "Failed to delete scores." };
  }
}

export async function savePropertyOccasionScores(
  propertyId: string,
  scores: { occasionId: string; score: number }[],
): Promise<{ success: true; data: OccasionScore[] } | { success: false; error: string }> {
  try {
    const token = await getApiAuthToken();
    const res = await apiPut<ApiResponse<OccasionScore[]>>(
      `/api/occasions/properties/${propertyId}/scores`,
      { scores },
      { token, appType: MAGO_ADMIN },
    );
    return { success: true, data: res.data ?? [] };
  } catch (err: any) {
    captureError(err);
    return { success: false, error: err.message ?? "Failed to save scores." };
  }
}
