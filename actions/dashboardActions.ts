"use server";

import { cookies } from "next/headers";

import { apiGet } from "@/utils/api-utils";
import { DashboardFilters } from "@/utils/types";

import { getCitiesList } from "@/actions/cityActions";
import { getAllStates } from "@/actions/stateActions";
import { getAreas } from "@/actions/areaActions";
import { captureError } from "@/lib/sentry";

// Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

// Get bookings analytics with filters
export async function getBookingsAnalytics(filters: DashboardFilters) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    params.append("startDate", filters.startDate);
    params.append("endDate", filters.endDate);

    if (filters.stateId && filters.stateId !== "all") params.append("stateId", filters.stateId);
    if (filters.cityId && filters.cityId !== "all") params.append("cityId", filters.cityId);
    if (filters.areaId && filters.areaId !== "all") params.append("areaId", filters.areaId);
    const propertyCode = filters.propertyCode || filters.entityCode;
    if (propertyCode) params.append("propertyCode", propertyCode);

    const response = await apiGet<{ success: boolean; data: any }>(
      `/api/dashboard/bookings?${params.toString()}`,
      { token }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching bookings analytics:", error);
    captureError(error);
    throw error;
  }
}

export async function getGBVAnalytics(filters: DashboardFilters) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    params.append("startDate", filters.startDate);
    params.append("endDate", filters.endDate);

    if (filters.stateId && filters.stateId !== "all") params.append("stateId", filters.stateId);
    if (filters.cityId && filters.cityId !== "all") params.append("cityId", filters.cityId);
    if (filters.areaId && filters.areaId !== "all") params.append("areaId", filters.areaId);
    const propertyCode = filters.propertyCode || filters.entityCode;
    if (propertyCode) params.append("propertyCode", propertyCode);

    const response = await apiGet<{ success: boolean; data: any }>(
      `/api/dashboard/gbv?${params.toString()}`,
      { token }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching GBV analytics:", error);
    captureError(error);
    throw error;
  }
}

export async function getWeeklyABVAnalytics(filters: DashboardFilters) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    params.append("startDate", filters.startDate);
    params.append("endDate", filters.endDate);

    if (filters.stateId && filters.stateId !== "all") params.append("stateId", filters.stateId);
    if (filters.cityId && filters.cityId !== "all") params.append("cityId", filters.cityId);
    if (filters.areaId && filters.areaId !== "all") params.append("areaId", filters.areaId);
    const propertyCode = filters.propertyCode || filters.entityCode;
    if (propertyCode) params.append("propertyCode", propertyCode);

    const response = await apiGet<{ success: boolean; data: any }>(
      `/api/dashboard/weekly-abv?${params.toString()}`,
      { token }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching weekly ABV:", error);
    captureError(error);
    throw error;
  }
}

export async function getMilestonePriority(month: string, brandId?: string) {
  try {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    params.append("month", month);
    if (brandId && brandId !== "all") params.append("brandId", brandId);

    const response = await apiGet<{ success: boolean; data: any }>(
      `/api/dashboard/milestone-priority?${params.toString()}`,
      { token }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching milestone priority:", error);
    captureError(error);
    throw error;
  }
}

export async function getStatesOptions() {
  try {
    const result = await getAllStates();
    return result.data || [];
  } catch (error) {
    console.error("Error fetching states for dashboard:", error);
    captureError(error);
    return [];
  }
}

export async function getCitiesOptions() {
  try {
    const result = await getCitiesList(100, 0);
    // Normalize: API may return { cities: { id, city, stateId, ... }, states: { ... } }
    return (result.data || []).map((row: any) => {
      if ('cities' in row) {
        return { id: row.cities.id, city: row.cities.city, stateId: row.cities.stateId };
      }
      return { id: row.id, city: row.city, stateId: row.stateId };
    });
  } catch (error) {
    console.error("Error fetching cities for dashboard:", error);
    captureError(error);
    return [];
  }
}

export async function getAreasOptions(cityId: string) {
  try {
    const result = await getAreas(cityId);
    return result.data || [];
  } catch (error) {
    console.error("Error fetching areas for dashboard:", error);
    captureError(error);
    return [];
  }
}