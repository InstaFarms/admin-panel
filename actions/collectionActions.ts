"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResult } from "@/utils/types";
import { parseString, parseNumber } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import {
  COLLECTIONS_ERRORS,
  COLLECTIONS_SUCCESS,
  COLLECTIONS_VALIDATION,
  SEARCH_KEY_MAP,
  COLLECTION_ADMIN_APP_TYPE,
  COLLECTION_LIST_BASE_PATH,
  parseCollectionAdminScope,
  type CollectionAdminScope,
  type CollectionSearchKey,
} from "@/constants/collections";
import { captureError } from "@/lib/sentry";

const NEW_SCHEMA_HEADERS = { "X-Use-New-Schema": "true" };

function collectionApiHeaders(scope: CollectionAdminScope) {
  return {
    ...NEW_SCHEMA_HEADERS,
    "X-App-Type": COLLECTION_ADMIN_APP_TYPE[scope],
  };
}

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(COLLECTIONS_ERRORS.unauthorized);
  return token;
}

function parseApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("unique") || msg.includes("already exists")) return COLLECTIONS_VALIDATION.nameDuplicate;
    if (msg.includes("not found")) return COLLECTIONS_ERRORS.notFound;
    if (msg.includes("unauthorized")) return COLLECTIONS_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return COLLECTIONS_ERRORS.networkError;
    return err.message;
  }
  return fallback;
}

function parseCollectionFormData(formData: FormData) {
  const name = parseString(formData.get("name")?.toString()) ?? "";
  const description = parseString(formData.get("description")?.toString()) || "";
  const heading = parseString(formData.get("heading")?.toString()) || undefined;
  const slug = parseString(formData.get("slug")?.toString()) || undefined;
  const weight = parseNumber(formData.get("weight")?.toString()) || 0;
  const hpc = parseNumber(formData.get("hpc")?.toString()) || undefined;
  const logo = parseString(formData.get("logo")?.toString()) || undefined;
  const altText = parseString(formData.get("altText")?.toString()) || undefined;
  const isActive = formData.get("isActive") === "true";

  const metaTitle = parseString(formData.get("metaTitle")?.toString());
  const metaDescription = parseString(formData.get("metaDescription")?.toString());
  const metaUrl = parseString(formData.get("metaUrl")?.toString());
  const metaImage = parseString(formData.get("metaImage")?.toString());

  let faqs: any[] = [];
  let info: any[] = [];
  let properties: { id: string }[] = [];

  try {
    const faqsStr = formData.get("faqs")?.toString();
    const infoStr = formData.get("info")?.toString();
    const propertiesStr = formData.get("properties")?.toString();
    if (faqsStr) faqs = JSON.parse(faqsStr);
    if (infoStr) info = JSON.parse(infoStr);
    if (propertiesStr) properties = JSON.parse(propertiesStr);
  } catch {
    // malformed JSON — keep defaults
  }

  const meta = {
    ...(metaTitle && { metaTitle }),
    ...(metaDescription && { metaDescription }),
    ...(metaUrl && { metaUrl }),
    ...(metaImage && { metaImage }),
  };

  const information = info.length > 0
    ? { title: info[0].title, description: info[0].content }
    : undefined;

  return {
    name, description, heading, slug, weight, hpc, logo, altText, isActive,
    faqs, info, properties, meta, information,
  };
}

export const createCollection = async (formData: FormData): Promise<ServerActionResult<{ id: string }>> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COLLECTIONS_ERRORS.unauthorized);

    const scope = parseCollectionAdminScope(formData.get("collectionAdminScope"));
    const fields = parseCollectionFormData(formData);

    if (!fields.name || fields.name.trim().length === 0) return { error: COLLECTIONS_VALIDATION.nameRequired };
    if (fields.name.trim().length < 2) return { error: COLLECTIONS_VALIDATION.nameMinLength };

    const token = await getAuthToken();

    const response = await apiPost<{ success?: boolean; data?: { id: string } }>("/api/collections", {
      name: fields.name,
      description: fields.description,
      heading: fields.heading,
      slug: fields.slug,
      weight: fields.weight,
      hpc: fields.hpc,
      logo: fields.logo,
      altText: fields.altText,
      isActive: fields.isActive,
      metadata: Object.keys(fields.meta).length > 0 ? fields.meta : undefined,
      faqs: fields.faqs.length > 0 ? fields.faqs : undefined,
      information: fields.information,
      properties: fields.properties.length > 0 ? fields.properties : undefined,
    }, { token, headers: collectionApiHeaders(scope) });

    revalidatePath("/admin");
    revalidatePath(COLLECTION_LIST_BASE_PATH[scope]);
    const createdId = response?.data?.id;
    return { success: COLLECTIONS_SUCCESS.created, data: createdId ? { id: createdId } : undefined };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COLLECTIONS_ERRORS.createFailed) };
  }
};

export const editCollection = async (id: string, formData: FormData): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COLLECTIONS_ERRORS.unauthorized);
    if (!id) return { error: COLLECTIONS_ERRORS.invalidId };

    const scope = parseCollectionAdminScope(formData.get("collectionAdminScope"));
    const fields = parseCollectionFormData(formData);
    const token = await getAuthToken();

    await apiPatch(`/api/collections/${id}`, {
      name: fields.name || undefined,
      description: fields.description,
      heading: fields.heading,
      slug: fields.slug,
      weight: fields.weight,
      hpc: fields.hpc,
      logo: fields.logo,
      altText: fields.altText,
      isActive: fields.isActive,
      faqs: fields.faqs,
      information: fields.information,
      metadata: Object.keys(fields.meta).length > 0 ? fields.meta : undefined,
      properties: fields.properties,
    }, { token, headers: collectionApiHeaders(scope) });

    revalidatePath("/admin");
    revalidatePath(COLLECTION_LIST_BASE_PATH[scope]);
    return { success: COLLECTIONS_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COLLECTIONS_ERRORS.updateFailed) };
  }
};

export const deleteCollection = async (
  id: string,
  scope: CollectionAdminScope = "instafarms"
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COLLECTIONS_ERRORS.unauthorized);
    if (!id) return { error: COLLECTIONS_ERRORS.invalidId };

    const token = await getAuthToken();
    await apiDelete(`/api/collections/${id}`, { token, headers: collectionApiHeaders(scope) });

    revalidatePath("/admin");
    revalidatePath(COLLECTION_LIST_BASE_PATH[scope]);
    return { success: COLLECTIONS_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, COLLECTIONS_ERRORS.deleteFailed) };
  }
};

export const getCollectionWithProperties = async (
  id: string,
  scope: CollectionAdminScope = "instafarms"
) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COLLECTIONS_ERRORS.unauthorized);
    if (!id) throw new Error(COLLECTIONS_ERRORS.invalidId);

    const token = await getAuthToken();
    const result = await apiGet<{ data?: any }>(`/api/collections/${id}`, {
      token,
      headers: collectionApiHeaders(scope),
    });

    const collection = result.data;
    if (!collection) return null;

    const props = Array.isArray(collection.properties) ? collection.properties : [];

    return {
      ...collection,
      createdAt: collection.createdAt instanceof Date
        ? collection.createdAt.toISOString()
        : collection.createdAt,
      updatedAt: collection.updatedAt instanceof Date
        ? collection.updatedAt.toISOString()
        : collection.updatedAt,
      properties: props,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not Found")) {
      return null;
    }
    console.error("Error getting collection:", err);
    captureError(err);
    return null;
  }
};

export const getCollectionsList = async (
  perPage = 10,
  pageNumber = 1,
  searchKey?: string,
  searchBy?: string,
  scope: CollectionAdminScope = "instafarms"
) => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(COLLECTIONS_ERRORS.unauthorized);

    const token = await getAuthToken();

    const normalizedSearch = searchKey ? searchKey.toLowerCase() : undefined;

    const result = await apiPost<{ data?: any }>(
      "/api/collections/paginate",
      { pageNumber, perPage, searchKey: normalizedSearch, searchBy },
      { token, headers: collectionApiHeaders(scope), cache: "no-store" }
    );

    return result.data;
  } catch (err) {
    console.error("Error fetching collections list:", err);
    captureError(err);
    return [];
  }
};
