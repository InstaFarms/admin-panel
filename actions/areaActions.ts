"use server";

import { isAdmin } from "@/utils/admin-only";
import { parseString } from "@/utils/server-utils";
import { AreaWithLocation, ServerActionResult } from "@/utils/types";
import { apiPost, apiPatch, apiGet, apiDelete } from "@/utils/api-utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  AREAS_VALIDATION,
  AREAS_ERRORS,
  AREAS_SUCCESS,
} from "@/constants/areas";
import { captureError } from "@/lib/sentry";

// Helper function to get auth token from cookies
async function getAuthToken(): Promise<string> {
  const cookie = await cookies();
  const token = cookie.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error(AREAS_ERRORS.unauthorized);
  }

  return token;
}

// Validation helpers
function validateAreaName(name: string): string | null {
  if (!name || name.trim().length === 0) return AREAS_VALIDATION.nameRequired;
  if (name.trim().length < 2) return AREAS_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return AREAS_VALIDATION.nameMaxLength;
  return null;
}

function validateCity(cityId: string): string | null {
  if (!cityId || cityId.trim().length === 0) return AREAS_VALIDATION.cityRequired;
  return null;
}

function validateState(stateId: string): string | null {
  if (!stateId || stateId.trim().length === 0) return AREAS_VALIDATION.stateRequired;
  return null;
}

function validateSlug(slug: string): string | null {
  if (!slug || slug.trim().length === 0) return null; // optional
  if (!/^[a-z0-9-]+$/.test(slug.trim())) return AREAS_VALIDATION.slugInvalid;
  return null;
}

export const createArea = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    const area = parseString(formData.get("area")?.toString());
    const cityId = parseString(formData.get("cityId")?.toString());
    const stateId = parseString(formData.get("stateId")?.toString());

    // Validations
    const nameError = validateAreaName(area || "");
    if (nameError) return { error: nameError };

    const stateError = validateState(stateId || "");
    if (stateError) return { error: stateError };

    const cityError = validateCity(cityId || "");
    if (cityError) return { error: cityError };

    const createData = {
      area: area!,
      city_id: cityId!,
    };

    const token = await getAuthToken();

    try {
      const response = await apiPost<any>("/api/areas", createData, { token });
      const normalizedData =
        response && typeof response === "object" && "data" in response
          ? response.data
          : response;
      revalidatePath("/admin/areas");
      return { success: AREAS_SUCCESS.created, data: normalizedData };
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("already taken") || apiError.message?.includes("duplicate")) {
        return { error: AREAS_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: AREAS_ERRORS.networkError };
      }
      throw new Error(AREAS_ERRORS.createFailed);
    }
  } catch (err) {
    console.error("Create area error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.createFailed };
  }
};

export const editArea = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    if (!id) return { error: "Invalid area ID" };

    const area = parseString(formData.get("area")?.toString());
    const cityId = parseString(formData.get("cityId")?.toString());
    const stateId = parseString(formData.get("stateId")?.toString());
    const weight = formData.get("weight")?.toString() || "0";
    const featured = formData.get("featured") === "true";
    const isActive = formData.get("isActive") !== "false";
    const slug = formData.get("slug")?.toString()?.trim();
    const icon = formData.get("icon")?.toString();
    const brandId = formData.get("brandId")?.toString();

    // Validations
    const nameError = validateAreaName(area || "");
    if (nameError) return { error: nameError };

    const stateError = validateState(stateId || "");
    if (stateError) return { error: stateError };

    const cityError = validateCity(cityId || "");
    if (cityError) return { error: cityError };

    const slugError = validateSlug(slug || "");
    if (slugError) return { error: slugError };

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum)) return { error: AREAS_VALIDATION.weightInvalid };

    // Process areaInfo data
    const pageTitle = formData.get("pageTitle")?.toString();
    const pageDescription = formData.get("pageDescription")?.toString();
    const howToReachTitle = formData.get("howToReachTitle")?.toString();
    const howToReachDescription = formData.get("howToReachDescription")?.toString();
    const mapSearchKey = formData.get("mapSearchKey")?.toString();
    const nearByPlaces = JSON.parse(formData.get("nearByPlaces")?.toString() || "[]");
    const nearByAttractions = JSON.parse(formData.get("nearByAttractions")?.toString() || "[]");

    // Process meta data
    const metaTitle = formData.get("metaTitle")?.toString();
    const metaUrl = formData.get("metaUrl")?.toString();
    const metaKeywords = formData.get("metaKeywords")?.toString();
    const metaDescription = formData.get("metaDescription")?.toString();
    const metaImageUrl = formData.get("metaImageUrl")?.toString();
    const nearbyAreaId1 = parseString(formData.get("nearbyArea1")?.toString()) || undefined;
    const nearbyAreaId2 = parseString(formData.get("nearbyArea2")?.toString()) || undefined;
    const nearbyAreaId3 = parseString(formData.get("nearbyArea3")?.toString()) || undefined;
    const nearbyAreaId4 = parseString(formData.get("nearbyArea4")?.toString()) || undefined;

    // Process FAQs
    const faqsData = JSON.parse(formData.get("faqs")?.toString() || "[]");

    const areaInfo = {
      title: pageTitle || "",
      description: pageDescription || "",
      howToReach: {
        title: howToReachTitle || "",
        description: howToReachDescription || "",
        nearByPlaces,
      },
      mapSearchKey: mapSearchKey || "",
      nearByAttractions,
    };

    const meta = {
      metaTitle: metaTitle || "",
      metaUrl: metaUrl || "",
      metaKeywords: metaKeywords || "",
      metaDescription: metaDescription || "",
      metaImage: metaImageUrl || "",
    };

    const updateData = {
      area: area!,
      city_id: cityId!,
      weight: weightNum,
      featured,
      isActive,
      brandId,
      slug: slug && slug.length > 0 ? slug : area!.toLowerCase().replace(/\s+/g, "-"),
      icon: icon || undefined,
      areaInfo,
      faqs: faqsData,
      meta,
      nearbyAreaId1,
      nearbyAreaId2,
      nearbyAreaId3,
      nearbyAreaId4,
    };

    const token = await getAuthToken();

    try {
      const response = await apiPatch<any>(`/api/areas/${id}`, updateData, { token });
      const normalizedData =
        response && typeof response === "object" && "data" in response
          ? response.data
          : response;
      revalidatePath("/admin/areas");
      revalidatePath(`/admin/areas/${id}`);
      return { success: AREAS_SUCCESS.updated, data: normalizedData };
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      if (apiError.message?.includes("not found")) return { error: AREAS_ERRORS.notFound };
      if (apiError.message?.includes("already taken") || apiError.message?.includes("duplicate")) {
        return { error: AREAS_VALIDATION.duplicateName };
      }
      if (apiError.message?.includes("network") || apiError.message?.includes("fetch")) {
        return { error: AREAS_ERRORS.networkError };
      }
      throw new Error(AREAS_ERRORS.updateFailed);
    }
  } catch (err) {
    console.error("Edit area error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.updateFailed };
  }
};

export const addBrandToArea = async (areaId: string, brandId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    const token = await getAuthToken();

    const response = await apiPost<{ success?: boolean; data?: any; message?: string }>(
      `/api/areas/${areaId}/brands`,
      { brandId },
      { token }
    );

    const isLegacyMappedSuccess =
      response &&
      typeof response === "object" &&
      !("success" in response) &&
      !("message" in response);

    if (response.success || isLegacyMappedSuccess) {
      revalidatePath(`/admin/areas/${areaId}`);
      return {
        success: true,
        data: "data" in response ? response.data : response,
      };
    }
    return { success: false, error: response.message || "Failed to add brand to area" };
  } catch (err) {
    console.error("Add brand to area error:", err);
    captureError(err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to add brand to area" };
  }
};

export const deleteAreaBrand = async (areaId: string, _brandId: string): Promise<ServerActionResult> => {
  // TODO(brand-migration): currently delegates to deleteArea; per-brand removal
  // (remove a single brandsOnAreas row) will be wired once the backend exposes it.
  return deleteArea(areaId);
};

export const deleteArea = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    if (!id) return { error: "Invalid area ID" };

    const token = await getAuthToken();

    try {
      await apiDelete(`/api/areas/${id}`, { token });
    } catch (apiError: any) {
      console.error("API Error:", apiError);
      captureError(apiError);
      const msg = apiError?.message || "";
      if (msg.includes("Area cannot be deleted")) return { error: msg };
      if (msg.includes("not found")) return { error: AREAS_ERRORS.notFound };
      if (msg.includes("network") || msg.includes("fetch")) {
        return { error: AREAS_ERRORS.networkError };
      }
      throw new Error(AREAS_ERRORS.deleteFailed);
    }

    revalidatePath("/admin/areas");
    return { success: AREAS_SUCCESS.deleted };
  } catch (err) {
    console.error("Delete area error:", err);
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.deleteFailed };
  }
};

export const getAreas = async (
  cityId: string,
): Promise<{ data?: AreaWithLocation[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    if (!cityId) throw new Error("Invalid city ID.");

    const token = await getAuthToken();
    // API returns { data: result } where result is the array
    const response = await apiPost<any>("/api/areas/paginate", {
      searchByCityId: cityId,
      orderBy: "area",
      sortorder: "asc",
    }, { token });

    // Handle response - API can return array directly or object with data property
    let areasArray;
    if (Array.isArray(response)) {
      areasArray = response;
    } else if (response.data && Array.isArray(response.data)) {
      areasArray = response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      areasArray = response.data.data;
    } else {
      areasArray = [];
    }

    const transformedAreas: AreaWithLocation[] = areasArray.map((area: any) => {
      const areaData = area.areas || area;
      return {
        id: areaData.id,
        area: areaData.area || areaData.name,
        cityId: areaData.cityId || areaData.city_id,
        city: (typeof areaData.city === "string") ? {
          id: areaData.cityId || areaData.city_id,
          city: areaData.city,
        } : (areaData.city ? {
          id: areaData.city.id,
          city: areaData.city.city || areaData.city.name,
        } : (areaData.city_name ? {
          id: areaData.cityId || areaData.city_id,
          city: areaData.city_name,
        } : null)),
        state: (typeof areaData.state === "string") ? {
          id: areaData.stateId || areaData.stateVal?.id || "",
          state: areaData.state,
        } : (areaData.state ? {
          id: areaData.state.id,
          state: areaData.state.state || areaData.state.name,
        } : (areaData.state_name ? {
          id: areaData.stateId || areaData.state_id,
          state: areaData.state_name,
        } : null)),
      };
    });

    return { data: transformedAreas };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.fetchFailed };
  }
};

export const getAreaWithLocation = async (
  areaId: string,
): Promise<{ data?: { stateId?: string; cityId?: string; areaId: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    if (!areaId) throw new Error("Invalid area ID.");

    const token = await getAuthToken();
    const result = await apiGet<{ data?: any }>(`/api/areas/${areaId}`, { token });

    const areaData = result.data;
    if (!areaData) throw new Error(AREAS_ERRORS.notFound);

    const cityId = areaData.cityId || areaData.cities?.id;
    const stateId = areaData.stateId || areaData.states?.id || areaData.city?.stateId;

    return {
      data: {
        stateId: stateId || undefined,
        cityId: cityId || undefined,
        areaId,
      },
    };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.fetchFailed };
  }
};

export const getNearbyLocationsForArea = async (
  slug: string,
): Promise<{ data?: any; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    if (!slug) throw new Error("Invalid slug.");

    const token = await getAuthToken();
    const result = await apiGet<any>(`/api/areas/${slug}/nearby`, { token });

    return { data: result };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.fetchFailed };
  }
};

export const getAllLocations = async (): Promise<{ data?: { id: string; area: string; slug: string }[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const result = await apiGet<any[] | any>("/api/areas", { token });

    const allAreas = Array.isArray(result) ? result : (result?.data ?? result ?? []);

    const formattedAreas = allAreas.map((area: any) => {
      const areaName = area.area || area.name || "";
      const derivedSlug =
        area.slug ||
        area.areaSlug ||
        area.area_slug ||
        (typeof areaName === "string"
          ? areaName.trim().toLowerCase().replace(/\s+/g, "-")
          : "");

      return {
        id: area.id,
        area: areaName,
        slug: derivedSlug,
      };
    });

    return { data: formattedAreas };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: AREAS_ERRORS.fetchFailed };
  }
};

export const getPaginatedAreas = async (params: {
  pageNumber?: number;
  perPage?: number;
  searchKey?: string;
  searchBy?: string;
  orderBy?: string;
  sortorder?: "asc" | "desc";
  searchByCityId?: string;
  searchByStateId?: string;
}) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

    const token = await getAuthToken();
    const response = await apiPost<{ data?: any } | any[]>("/api/areas/paginate", params, { token });

    // Backend legacy mapper sends the array as top-level body; otherwise { data: result }
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.data)) return response.data;
    if (response?.data && Array.isArray(response.data.data)) return response.data.data;
    if (response?.data) return response.data;
    return [];
  } catch (err) {
    console.error("API Error: ", err);
    captureError(err);
    if (err instanceof Error) throw err;
    throw new Error(AREAS_ERRORS.fetchFailed);
  }
};

export const getAreaById = async (id: string) => {
  const admin = await isAdmin();
  if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

  try {
    const token = await getAuthToken();
    const result = await apiGet<any>(`/api/areas/${id}`, { token });
    return result?.data ?? result;
  } catch (err) {
    console.error("API Error: ", err);
    captureError(err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) return null;
    throw new Error(AREAS_ERRORS.fetchAreaFailed);
  }
};

export const getAreaByIdForBrand = async (id: string, brandId?: string) => {
  const admin = await isAdmin();
  if (!admin) throw new Error(AREAS_ERRORS.unauthorized);

  try {
    const token = await getAuthToken();
    const suffix = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const result = await apiGet<any>(`/api/areas/${id}${suffix}`, { token });
    return result?.data ?? result;
  } catch (err) {
    console.error("API Error: ", err);
    captureError(err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) return null;
    throw new Error(AREAS_ERRORS.fetchAreaFailed);
  }
};
