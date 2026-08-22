"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { parseString } from "@/utils/server-utils";
import { City, ServerActionResult } from "@/utils/types";
import { apiPost, apiGet, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  CITIES_VALIDATION,
  CITIES_ERRORS,
  CITIES_SUCCESS,
} from "@/constants/cities";
import { captureError } from "@/lib/sentry";

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(CITIES_ERRORS.unauthorized);
  return token;
}

function validateCityName(name: string): string | null {
  if (!name || name.trim().length === 0) return CITIES_VALIDATION.nameRequired;
  if (name.trim().length < 2) return CITIES_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return CITIES_VALIDATION.nameMaxLength;
  return null;
}

function validateStateId(stateId: string): string | null {
  if (!stateId || stateId.trim().length === 0)
    return CITIES_VALIDATION.stateRequired;
  return null;
}

function validateCityTag(cityTag: string): string | null {
  if (!cityTag || cityTag.trim().length === 0)
    return CITIES_VALIDATION.cityTagRequired;
  if (!/^[A-Z]{3}$/.test(cityTag.trim().toUpperCase()))
    return CITIES_VALIDATION.cityTagInvalid;
  return null;
}

function validateSlug(slug: string): string | null {
  if (!slug || slug.trim().length === 0) return null;
  if (!/^[a-z0-9-]+$/.test(slug.trim())) return CITIES_VALIDATION.slugInvalid;
  return null;
}

function generateSlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function parseJsonArray(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value.toString());
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function parseFaqs(value: FormDataEntryValue | null) {
  try {
    const raw = JSON.parse(value?.toString() || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function buildCityPayload(formData: FormData) {
  const city = parseString(formData.get("city")?.toString())?.trim() ?? "";
  const cityTag =
    parseString(formData.get("cityTag")?.toString())?.trim().toUpperCase() ?? "";
  const stateId =
    parseString(formData.get("stateId")?.toString())?.trim() ?? "";
  const weight = parseString(formData.get("weight")?.toString()) ?? "0";
  const featured = formData.get("featured") === "true";
  const isActive = formData.get("isActive") !== "false";
  const brandId = parseString(formData.get("brandId")?.toString())?.trim();
  const heading = parseString(formData.get("heading")?.toString());
  const description = parseString(formData.get("description")?.toString());
  const slug =
    parseString(formData.get("slug")?.toString())?.trim() || generateSlug(city);
  const icon = parseString(formData.get("iconUrl")?.toString());
  const pageTitle = parseString(formData.get("pageTitle")?.toString());
  const pageDescription = parseString(
    formData.get("pageDescription")?.toString(),
  );
  const mapSearchKey = parseString(formData.get("mapSearchKey")?.toString());
  const howToReachTitle = parseString(
    formData.get("howToReachTitle")?.toString(),
  );
  const howToReachDescription = parseString(
    formData.get("howToReachDescription")?.toString(),
  );
  const nearByPlaces = parseJsonArray(formData.get("nearByPlaces"));
  const nearByAttractions = parseJsonArray(formData.get("nearByAttractions"));
  const faqs = parseFaqs(formData.get("faqs"));
  const metaTitle = parseString(formData.get("metaTitle")?.toString());
  const metaDescription = parseString(
    formData.get("metaDescription")?.toString(),
  );
  const metaUrl = parseString(formData.get("metaUrl")?.toString());
  const metaImage = parseString(formData.get("metaImageUrl")?.toString());

  return {
    city,
    cityTag,
    stateId,
    weight: parseFloat(weight) || 0,
    featured,
    isActive,
    ...(brandId && { brandId }),
    ...(heading && { heading }),
    ...(description && { description }),
    ...(slug && { slug }),
    ...(icon && { icon }),
    info: {
      ...(pageTitle && { title: pageTitle }),
      ...(pageDescription && { description: pageDescription }),
      ...(mapSearchKey && { mapSearchKey }),
      ...(nearByAttractions.length > 0 && { nearByAttractions }),
      ...((howToReachTitle ||
        howToReachDescription ||
        nearByPlaces.length > 0) && {
        howToReach: {
          title: howToReachTitle || "",
          description: howToReachDescription || "",
          nearByPlaces,
        },
      }),
    },
    faqs,
    meta: {
      ...(metaTitle && { metaTitle }),
      ...(metaDescription && { metaDescription }),
      ...(metaUrl && { metaUrl }),
      ...(metaImage && { metaImage }),
    },
  };
}

export const createCity = async (
  formData: FormData,
): Promise<ServerActionResult<{ id: string }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CITIES_ERRORS.unauthorized);

    const payload = buildCityPayload(formData);

    const nameError = validateCityName(payload.city);
    if (nameError) return { error: nameError };

    const stateError = validateStateId(payload.stateId);
    if (stateError) return { error: stateError };

    const cityTagError = validateCityTag(payload.cityTag);
    if (cityTagError) return { error: cityTagError };

    const slugError = validateSlug(payload.slug || "");
    if (slugError) return { error: slugError };

    const token = await getAuthToken();

    try {
      const response = await apiPost<any>("/api/cities", payload, { token });
      const normalizedData =
        response && typeof response === "object" && "data" in response
          ? response.data
          : response;
      revalidatePath("/admin/cities");
      return { success: CITIES_SUCCESS.created, data: normalizedData };
    } catch (apiError: any) {
      captureError(apiError);
      if (
        apiError.message?.includes("already taken") ||
        apiError.message?.includes("duplicate")
      ) {
        return { error: CITIES_VALIDATION.duplicateName };
      }
      if (
        apiError.message?.includes("network") ||
        apiError.message?.includes("fetch")
      ) {
        return { error: CITIES_ERRORS.networkError };
      }
      return { error: apiError.message || CITIES_ERRORS.createFailed };
    }
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CITIES_ERRORS.createFailed };
  }
};

export const editCity = async (
  id: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CITIES_ERRORS.unauthorized);

    if (!id) return { error: "Invalid city ID" };

    const payload = buildCityPayload(formData);

    const nameError = validateCityName(payload.city);
    if (nameError) return { error: nameError };

    const stateError = validateStateId(payload.stateId);
    if (stateError) return { error: stateError };

    const cityTagError = validateCityTag(payload.cityTag);
    if (cityTagError) return { error: cityTagError };

    const slugError = validateSlug(payload.slug || "");
    if (slugError) return { error: slugError };

    const token = await getAuthToken();

    try {
      await apiPatch(`/api/cities/${id}`, payload, { token });
    } catch (apiError: any) {
      captureError(apiError);
      if (apiError.message?.includes("not found"))
        return { error: CITIES_ERRORS.notFound };
      if (
        apiError.message?.includes("already taken") ||
        apiError.message?.includes("duplicate")
      ) {
        return { error: CITIES_VALIDATION.duplicateName };
      }
      if (
        apiError.message?.includes("network") ||
        apiError.message?.includes("fetch")
      ) {
        return { error: CITIES_ERRORS.networkError };
      }
      throw new Error(CITIES_ERRORS.updateFailed);
    }

    revalidatePath("/admin/cities");
    return { success: CITIES_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CITIES_ERRORS.updateFailed };
  }
};

export const addBrandToCity = async (cityId: string, brandId: string) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CITIES_ERRORS.unauthorized);

    const token = await getAuthToken();

    const response = await apiPost<{
      success?: boolean;
      data?: any;
      message?: string;
    }>(`/api/cities/${cityId}/brands`, { brandId }, { token });

    const isLegacyMappedSuccess =
      response &&
      typeof response === "object" &&
      !("success" in response) &&
      !("message" in response);

    if (response.success || isLegacyMappedSuccess) {
      revalidatePath(`/admin/cities/${cityId}`);
      return {
        success: true,
        data: "data" in response ? response.data : response,
      };
    }
    return {
      success: false,
      error: response.message || "Failed to add brand to city",
    };
  } catch (err) {
    captureError(err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add brand to city",
    };
  }
};

export const deleteCityBrand = async (cityId: string, _brandId: string): Promise<ServerActionResult> => {
  // TODO(brand-migration): delegate to deleteCity until per-brand removal endpoint exists.
  return deleteCity(cityId);
};

export const deleteCity = async (id: string): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CITIES_ERRORS.unauthorized);

    if (!id) return { error: "Invalid city ID" };

    const token = await getAuthToken();

    try {
      await apiDelete(`/api/cities/${id}`, { token });
    } catch (apiError: any) {
      captureError(apiError);
      const msg = apiError?.message || "";
      if (msg.includes("City cannot be deleted")) return { error: msg };
      if (msg.includes("not found")) return { error: CITIES_ERRORS.notFound };
      if (msg.includes("network") || msg.includes("fetch")) {
        return { error: CITIES_ERRORS.networkError };
      }
      throw new Error(CITIES_ERRORS.deleteFailed);
    }

    revalidatePath("/admin/cities");
    return { success: CITIES_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CITIES_ERRORS.deleteFailed };
  }
};

export const getCities = async (
  stateId: string,
): Promise<{ data?: City[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(CITIES_ERRORS.unauthorized);
    if (!stateId) throw new Error("Invalid state ID.");

    const token = await getAuthToken();
    const response = await apiPost<any>(
      "/api/cities/paginate",
      {
        searchByStateId: stateId,
        orderBy: "city",
        sortorder: "asc",
      },
      { token },
    );

    let citiesArray: any[] = [];
    if (Array.isArray(response)) citiesArray = response;
    else if (Array.isArray(response?.data)) citiesArray = response.data;
    else if (response?.data?.data && Array.isArray(response.data.data))
      citiesArray = response.data.data;

    const transformedData = citiesArray.map((row: any) => {
      const cityData = row.cities || row;
      const stateData = row.states || {};
      return {
        id: cityData.id,
        city: cityData.city,
        cityTag: cityData.cityTag ?? cityData.city_tag ?? cityData.bookingTag ?? cityData.booking_tag ?? "",
        stateId: cityData.stateId,
        slug: cityData.slug,
        weight: cityData.weight?.toString() || "0",
        featured: cityData.featured,
        state: stateData.id
          ? { id: stateData.id, state: stateData.state }
          : null,
      };
    });

    return { data: transformedData as unknown as City[] };
  } catch (err) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: CITIES_ERRORS.fetchFailed };
  }
};

export const getCitiesList = async (
  limit: number,
  offset: number,
  searchKey?: string,
  searchValue?: string,
  stateId?: string,
): Promise<{ data: any[]; total: number }> => {
  const admin = await isAdmin();
  if (!admin) throw new Error(CITIES_ERRORS.unauthorized);

  const token = await getAuthToken();
  const pageNumber = Math.floor(offset / limit) + 1;

  const body: Record<string, any> = {
    perPage: limit,
    pageNumber,
    orderBy: "created_at",
    sortorder: "desc",
  };

  if (searchValue) {
    body.searchKey = searchValue.toLowerCase();
    body.searchBy = searchKey === "Weight" ? "weight" : "city";
  }

  if (stateId) body.searchByStateId = stateId;

  const response = await apiPost<any>("/api/cities/paginate", body, { token });

  let data: any[] = [];
  if (Array.isArray(response)) data = response;
  else if (Array.isArray(response?.data)) data = response.data;
  else if (response?.data?.data && Array.isArray(response.data.data))
    data = response.data.data;

  const total =
    typeof response === "object" && !Array.isArray(response)
      ? ((response as any).total ?? response?.data?.total ?? data.length)
      : data.length;

  return { data, total };
};

export const getCityById = async (id: string, brandId?: string) => {
  const admin = await isAdmin();
  if (!admin) throw new Error(CITIES_ERRORS.unauthorized);
  if (!id) throw new Error("Invalid city ID");

  const token = await getAuthToken();

  try {
    const suffix = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const response = await apiGet<any>(`/api/cities/${id}${suffix}`, { token });
    const raw = response?.data ?? response;
    const city = raw?.cities ?? raw;

    if (city && !city.cityTag) {
      city.cityTag = city.city_tag ?? city.bookingTag ?? city.booking_tag ?? "";
    }

    return raw;
  } catch (err: any) {
    captureError(err);
    if (err.message?.includes("not found"))
      throw new Error(CITIES_ERRORS.notFound);
    throw new Error(CITIES_ERRORS.fetchCityFailed);
  }
};
