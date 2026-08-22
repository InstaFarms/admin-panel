"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/utils/api-utils";
import type {
  LocationDetail,
  LocationLandmark,
  LocationOption,
} from "@/types/locations";
import { captureError } from "@/lib/sentry";

async function getAuthToken() {
  const token = await getApiAuthToken();
  if (!token) {
    throw new Error("Unauthorized");
  }
  return token;
}

function parseBoolean(value: FormDataEntryValue | null, fallback?: boolean) {
  if (value === null) return fallback;
  return value.toString() === "true";
}

function parseString(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  return str ? str : "";
}

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value.toString()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getLocationsInfo(): Promise<LocationOption[]> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiGet<any>("/api/locations/info", { token });
  return response?.data ?? [];
}

export async function getPaginatedLocations(params: Record<string, any>) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPost<any>("/api/locations/paginate", params, { token });
  return response?.data ?? [];
}

export async function getEnrichedPaginatedLocations(params: Record<string, any>): Promise<any[]> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPost<any>("/api/locations/paginate", params, { token });
  const locations: any[] = response?.data ?? [];

  const enriched = await Promise.all(
    locations.map(async (loc: any) => {
      try {
        const detail = await apiGet<any>(`/api/locations/id/${loc.id}`, { token });
        return { ...loc, configuredBrandIds: detail?.data?.configuredBrandIds ?? [] };
      } catch {
        return { ...loc, configuredBrandIds: [] };
      }
    })
  );
  return enriched;
}

export async function getLocationById(id: string, brandId?: string): Promise<LocationDetail | null> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const suffix = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
  try {
    const response = await apiGet<any>(`/api/locations/id/${id}${suffix}`, { token });
    return response?.data ?? null;
  } catch (error: any) {
    captureError(error);
    if (error?.message?.toLowerCase().includes("not found")) return null;
    throw error;
  }
}

export async function createLocation(formData: FormData) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const payload = {
    name: parseString(formData.get("name")),
    slug: parseString(formData.get("slug")),
    locationTag: parseString(formData.get("locationTag")) || null,
    locationRoles: parseJson<string[]>(formData.get("locationRoles"), []),
    parentId: parseString(formData.get("parentId")) || null,
    marketType: parseString(formData.get("marketType")),
    displayMode: parseString(formData.get("displayMode")),
    isActive: parseBoolean(formData.get("isActive"), true),
  };

  const response = await apiPost<any>("/api/locations", payload, { token });
  revalidatePath("/admin/locations");
  return response?.data;
}

export async function updateLocation(id: string, formData: FormData) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const brandId = parseString(formData.get("brandId"));
  const payload: Record<string, any> = {
    name: parseString(formData.get("name")),
    slug: parseString(formData.get("slug")),
    locationTag: parseString(formData.get("locationTag")) || null,
    locationRoles: parseJson<string[]>(formData.get("locationRoles"), []),
    parentId: parseString(formData.get("parentId")) || null,
    marketType: parseString(formData.get("marketType")),
    displayMode: parseString(formData.get("displayMode")),
    isActive: parseBoolean(formData.get("isActive"), true),
    nearbyMappings: parseJson<any[]>(formData.get("nearbyMappings"), []),
  };

  if (brandId) {
    payload.brandDetail = {
      brandId,
      slug: parseString(formData.get("brandSlug")) || null,
      heading: parseString(formData.get("heading")) || null,
      description: parseString(formData.get("brandDescription")) || null,
      isActive: parseBoolean(formData.get("brandIsActive"), true),
      weight: parseString(formData.get("weight")) || "0",
      featured: parseBoolean(formData.get("featured"), false),
      icon: parseString(formData.get("icon")) || null,
      faqs: parseJson<any[]>(formData.get("faqs"), []),
      info: {
        title: parseString(formData.get("pageTitle")),
        description: parseString(formData.get("pageDescription")),
        mapSearchKey: parseString(formData.get("mapSearchKey")),
        howToReach: {
          title: parseString(formData.get("howToReachTitle")),
          description: parseString(formData.get("howToReachDescription")),
          nearByPlaces: parseJson<string[]>(formData.get("nearByPlaces"), []),
        },
        nearByAttractions: parseJson<string[]>(
          formData.get("nearByAttractions"),
          []
        ),
      },
      meta: {
        metaTitle: parseString(formData.get("metaTitle")),
        metaDescription: parseString(formData.get("metaDescription")),
        metaUrl: parseString(formData.get("metaUrl")),
        metaImage: parseString(formData.get("metaImageUrl")),
        metaKeywords: parseString(formData.get("metaKeywords")),
      },
    };
  }

  const response = await apiPatch<any>(`/api/locations/id/${id}`, payload, { token });
  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${id}`);
  return response?.data;
}

export async function deleteLocation(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  await apiDelete(`/api/locations/id/${id}`, { token });
  revalidatePath("/admin/locations");
  return { success: true };
}

export async function addBrandToLocation(locationId: string, brandId: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPost<any>(
    `/api/locations/id/${locationId}/brands`,
    { brandId },
    { token }
  );
  revalidatePath(`/admin/locations/${locationId}`);
  return response?.data;
}

export async function deleteLocationBrand(locationId: string, brandId: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  await apiDelete(`/api/locations/id/${locationId}/brands/${brandId}`, { token });
  revalidatePath(`/admin/locations/${locationId}`);
  return { success: true };
}

export async function replaceNearbyMappings(locationId: string, items: any[]) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPut<any>(
    `/api/locations/id/${locationId}/nearby`,
    { items },
    { token }
  );
  revalidatePath(`/admin/locations/${locationId}`);
  return response?.data;
}

export async function getPaginatedLocationLandmarks(params: Record<string, any>) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const response = await apiPost<any>("/api/locations/landmarks/paginate", params, {
    token,
  });
  return response?.data ?? [];
}

export async function getLocationLandmarkById(id: string): Promise<LocationLandmark | null> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  try {
    const response = await apiGet<any>(`/api/locations/landmarks/id/${id}`, { token });
    return response?.data ?? null;
  } catch (error: any) {
    captureError(error);
    if (error?.message?.toLowerCase().includes("not found")) return null;
    throw error;
  }
}

export async function createLocationLandmark(formData: FormData) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const payload = {
    landmark: parseString(formData.get("landmark")),
    slug: parseString(formData.get("slug")) || null,
    icon: parseString(formData.get("icon")) || null,
    locationId: parseString(formData.get("locationId")),
  };
  const response = await apiPost<any>("/api/locations/landmarks", payload, { token });
  revalidatePath("/admin/locations/landmarks");
  return response?.data;
}

export async function updateLocationLandmark(id: string, formData: FormData) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  const payload = {
    landmark: parseString(formData.get("landmark")),
    slug: parseString(formData.get("slug")) || null,
    icon: parseString(formData.get("icon")) || null,
    locationId: parseString(formData.get("locationId")),
  };
  const response = await apiPatch<any>(`/api/locations/landmarks/id/${id}`, payload, {
    token,
  });
  revalidatePath("/admin/locations/landmarks");
  revalidatePath(`/admin/locations/landmarks/${id}`);
  return response?.data;
}

export async function deleteLocationLandmark(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized");

  const token = await getAuthToken();
  await apiDelete(`/api/locations/landmarks/id/${id}`, { token });
  revalidatePath("/admin/locations/landmarks");
  return { success: true };
}
