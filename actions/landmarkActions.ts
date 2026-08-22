"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  LANDMARKS_ERRORS,
  LANDMARKS_SUCCESS,
  LANDMARKS_VALIDATION,
  SEARCH_KEY_MAP,
  type LandmarkSearchKey,
} from "@/constants/landmarks";
import { captureError } from "@/lib/sentry";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(LANDMARKS_ERRORS.unauthorized);
  return token;
}

// ─── Error parser ─────────────────────────────────────────────────────────────

function parseApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("landmark cannot be deleted")) return err.message; // Pass through descriptive message
    if (msg.includes("already exists") && msg.includes("slug")) return LANDMARKS_VALIDATION.slugDuplicate;
    if (msg.includes("already exists")) return LANDMARKS_VALIDATION.nameDuplicate;
    if (msg.includes("not found")) return LANDMARKS_ERRORS.notFound;
    if (msg.includes("unauthorized")) return LANDMARKS_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return LANDMARKS_ERRORS.networkError;
    return err.message;
  }
  return fallback;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createLandmark = async (formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);

    const landmark = parseString(formData.get("landmark")?.toString());
    const primaryAreaId = parseString(formData.get("primaryAreaId")?.toString());
    const slug = parseString(formData.get("slug")?.toString()) || "";

    if (!landmark || landmark.trim().length === 0) return { error: LANDMARKS_VALIDATION.nameRequired };
    if (landmark.trim().length < 2) return { error: LANDMARKS_VALIDATION.nameMinLength };
    if (!primaryAreaId) return { error: LANDMARKS_VALIDATION.areaRequired };
    if (slug && !/^[a-z0-9-]+$/.test(slug)) return { error: LANDMARKS_VALIDATION.slugInvalid };

    const finalSlug = slug || landmark.trim().toLowerCase().replace(/\s+/g, "-");
    const token = await getAuthToken();

    await apiPost("/api/landmarks", { landmark: landmark.trim(), slug: finalSlug, primary_area_id: primaryAreaId }, { token });

    revalidatePath("/admin/landmarks");
    return { success: LANDMARKS_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.createFailed) };
  }
};

export const editLandmark = async (id: string, formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!id) return { error: LANDMARKS_ERRORS.invalidId };

    const landmark = parseString(formData.get("landmark")?.toString());
    const primaryAreaId = parseString(formData.get("primaryAreaId")?.toString());
    const slug = parseString(formData.get("slug")?.toString()) || "";

    if (!landmark || landmark.trim().length === 0) return { error: LANDMARKS_VALIDATION.nameRequired };
    if (landmark.trim().length < 2) return { error: LANDMARKS_VALIDATION.nameMinLength };
    if (!primaryAreaId) return { error: LANDMARKS_VALIDATION.areaRequired };
    if (slug && !/^[a-z0-9-]+$/.test(slug)) return { error: LANDMARKS_VALIDATION.slugInvalid };

    const finalSlug = slug || landmark.trim().toLowerCase().replace(/\s+/g, "-");
    const token = await getAuthToken();

    await apiPatch(`/api/landmarks/id/${id}`, { landmark: landmark.trim(), slug: finalSlug, primary_area_id: primaryAreaId }, { token });

    revalidatePath("/admin/landmarks");
    return { success: LANDMARKS_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.updateFailed) };
  }
};

export const deleteLandmark = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!id) return { error: LANDMARKS_ERRORS.invalidId };

    const token = await getAuthToken();
    await apiDelete(`/api/landmarks/id/${id}`, { token });

    revalidatePath("/admin/landmarks");
    return { success: LANDMARKS_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.deleteFailed) };
  }
};

export const getLandmarkById = async (id: string): Promise<{ data?: any; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!id) throw new Error(LANDMARKS_ERRORS.invalidId);

    const token = await getAuthToken();
    const response = await apiGet(`/api/landmarks/id/${id}`, { token });
    return { data: response.data };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

export const getLandmarksList = async (params: {
  limit?: number;
  offset?: number;
  areaId?: string;
  searchKey?: string;
  searchValue?: string;
}): Promise<{ data?: any[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);

    const { limit, offset, areaId, searchKey, searchValue } = params;
    const token = await getAuthToken();
    const pageNumber = limit && offset !== undefined ? Math.floor(offset / (limit || 20)) + 1 : 1;
    const perPage = limit || 20;

    const body: Record<string, any> = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc",
    };

    if (areaId) body.searchByAreaId = areaId;

    if (searchValue && searchKey) {
      // Case-insensitive intermediate-letter matching
      body.searchKey = searchValue.toLowerCase();
      body.searchBy = SEARCH_KEY_MAP[searchKey as LandmarkSearchKey] ?? "landmark";
    }

    const response = await apiPost("/api/landmarks/paginate", body, { token });
    return { data: response.data || [] };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

export const getLandmarks = async (areaId: string): Promise<{ data?: any[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!areaId) throw new Error("Invalid area ID.");

    const token = await getAuthToken();
    const response = await apiPost("/api/landmarks/paginate", {
      searchByAreaId: areaId,
      orderBy: "landmark",
      sortorder: "asc",
    }, { token });

    return { data: response.data || [] };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

// ─── Cascading dropdown helpers ───────────────────────────────────────────────

export const getCitiesForLandmarks = async (
  stateId: string
): Promise<{ data?: Array<{ id: string; city: string; stateId?: string }>; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!stateId) throw new Error("Invalid state ID.");

    const token = await getAuthToken();
    const response = await apiPost("/api/cities/paginate", {
      searchByStateId: stateId,
      orderBy: "city",
      sortorder: "asc",
    }, { token });

    const raw: any[] = Array.isArray(response) ? response : (response.data ?? []);

    return {
      data: raw.map((row: any) => {
        const c = row.cities || row;
        return { id: c.id, city: c.city, stateId: c.stateId };
      }),
    };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

export const getAreasForLandmarks = async (
  cityId: string
): Promise<{ data?: Array<{ id: string; area: string; cityId?: string }>; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);
    if (!cityId) throw new Error("Invalid city ID.");

    const token = await getAuthToken();
    const response = await apiPost("/api/areas/paginate", {
      searchByCityId: cityId,
      orderBy: "area",
      sortorder: "asc",
    }, { token });

    const raw: any[] = Array.isArray(response) ? response : (response.data ?? []);

    return {
      data: raw.map((row: any) => ({
        id: row.id,
        area: row.area || row.name,
        cityId: row.cityId || row.city_id,
      })),
    };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

export const getAllStates = async (): Promise<{ data?: Array<{ id: string; state: string }>; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const response = await apiGet("/api/states", { token });
    const raw = response.data ?? [];

    return { data: raw.map((s: any) => ({ id: s.id, state: s.state })) };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};

export const getAllAreas = async (): Promise<{ data?: Array<{ id: string; area: string; cityId?: string }>; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(LANDMARKS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const response = await apiGet("/api/areas", { token });
    const raw = response.data ?? [];

    return { data: raw.map((a: any) => ({ id: a.id, area: a.area, cityId: a.cityId })) };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, LANDMARKS_ERRORS.fetchFailed) };
  }
};