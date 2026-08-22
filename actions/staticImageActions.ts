"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResult } from "@/utils/types";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { captureError } from "@/lib/sentry";
import { deleteStorageImageAction } from "@/actions/imageActions";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";
import {
  STATIC_IMAGE_ERRORS,
  STATIC_IMAGE_SUCCESS,
  type StaticImageSection,
} from "@/constants/staticImages";
import {
  BRAND_ADMIN_APP_TYPE,
  STATIC_IMAGES_BASE,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";


// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await getApiAuthToken();
  if (!token) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);
  return token;
}

// ─── Error parser ─────────────────────────────────────────────────────────────

function parseApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("not found")) return STATIC_IMAGE_ERRORS.notFound;
    if (msg.includes("unauthorized")) return STATIC_IMAGE_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return STATIC_IMAGE_ERRORS.networkError;
    return err.message;
  }
  return fallback;
}

// ─── Revalidate helper ────────────────────────────────────────────────────────

function apiOpts(token: string, scope: BrandAdminScope) {
  return { token, appType: BRAND_ADMIN_APP_TYPE[scope] };
}

function revalidateStaticImages(scope: BrandAdminScope) {
  revalidatePath(STATIC_IMAGES_BASE[scope]);
  revalidatePath("/");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateStaticImageInput {
  section: StaticImageSection | string;
  title: string;
  description?: string;
  desktopImageUrl: string;
  desktopImagePath: string;
  mobileImageUrl: string;
  mobileImagePath: string;
  altText?: string;
  linkUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateStaticImageInput {
  section?: StaticImageSection | string;
  title?: string;
  description?: string;
  desktopImageUrl?: string;
  desktopImagePath?: string;
  mobileImageUrl?: string;
  mobileImagePath?: string;
  altText?: string;
  linkUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createStaticImage = async (
  data: CreateStaticImageInput,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);

    if (!data.section || !data.title) return { error: STATIC_IMAGE_ERRORS.titleRequired };
    if (!data.desktopImageUrl || !data.mobileImageUrl) return { error: STATIC_IMAGE_ERRORS.bothImagesRequired };

    const token = await getAuthToken();
    const opts = apiOpts(token, scope);

    let sortOrder = data.sortOrder ?? 0;
    if (sortOrder === 0) {
      const maxRes = await apiGet(`/api/static-images/max-sort-order/${data.section}`, opts);
      sortOrder = (maxRes.data || 0) + 1;
    }

    await apiPost("/api/static-images", {
      section: data.section as StaticImageSection,
      title: data.title,
      description: data.description,
      desktopImageUrl: data.desktopImageUrl,
      desktopImagePath: data.desktopImagePath,
      mobileImageUrl: data.mobileImageUrl,
      mobileImagePath: data.mobileImagePath,
      altText: data.altText,
      linkUrl: data.linkUrl,
      sortOrder,
      isActive: data.isActive ?? true,
    }, opts);

    revalidateStaticImages(scope);
    return { success: STATIC_IMAGE_SUCCESS.created };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, STATIC_IMAGE_ERRORS.createFailed) };
  }
};

export const updateStaticImage = async (
  id: string,
  data: UpdateStaticImageInput,
  oldDesktopImagePath?: string,
  oldMobileImagePath?: string,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);
    if (!id) return { error: STATIC_IMAGE_ERRORS.invalidId };

    const token = await getAuthToken();
    const opts = apiOpts(token, scope);

    // Verify exists
    const existing = await apiGet(`/api/static-images/${id}`, opts);
    if (!existing.data) return { error: STATIC_IMAGE_ERRORS.notFound };

    // Clean up replaced images
    if (data.desktopImagePath && oldDesktopImagePath && data.desktopImagePath !== oldDesktopImagePath) {
      await deleteStorageImageAction(oldDesktopImagePath);
    }
    if (data.mobileImagePath && oldMobileImagePath && data.mobileImagePath !== oldMobileImagePath) {
      await deleteStorageImageAction(oldMobileImagePath);
    }

    const updatePayload: Record<string, any> = {};
    if (data.section) updatePayload.section = data.section;
    if (data.title) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.desktopImageUrl) updatePayload.desktopImageUrl = data.desktopImageUrl;
    if (data.desktopImagePath) updatePayload.desktopImagePath = data.desktopImagePath;
    if (data.mobileImageUrl) updatePayload.mobileImageUrl = data.mobileImageUrl;
    if (data.mobileImagePath) updatePayload.mobileImagePath = data.mobileImagePath;
    if (data.altText !== undefined) updatePayload.altText = data.altText;
    if (data.linkUrl !== undefined) updatePayload.linkUrl = data.linkUrl;
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

    await apiPatch(`/api/static-images/${id}`, updatePayload, opts);

    revalidateStaticImages(scope);
    return { success: STATIC_IMAGE_SUCCESS.updated };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, STATIC_IMAGE_ERRORS.updateFailed) };
  }
};

export const deleteStaticImage = async (
  id: string,
  scope: BrandAdminScope = "instafarms",
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);
    if (!id) return { error: STATIC_IMAGE_ERRORS.invalidId };

    const token = await getAuthToken();
    const opts = apiOpts(token, scope);

    const existing = await apiGet(`/api/static-images/${id}`, opts);
    const image = existing.data;
    if (!image) return { error: STATIC_IMAGE_ERRORS.notFound };

    await apiDelete(`/api/static-images/${id}`, opts);

    // Clean up storage after successful DB delete
    if (image.desktopImagePath) await deleteStorageImageAction(image.desktopImagePath);
    if (image.mobileImagePath) await deleteStorageImageAction(image.mobileImagePath);

    revalidateStaticImages(scope);
    return { success: STATIC_IMAGE_SUCCESS.deleted };
  } catch (err) {
    captureError(err);
    return { error: parseApiError(err, STATIC_IMAGE_ERRORS.deleteFailed) };
  }
};

export const getStaticImagesBySection = async (
  section: StaticImageSection,
  activeOnly = true,
  scope: BrandAdminScope = "instafarms",
): Promise<any[]> => {
  try {
    const admin = await isAdmin();
    const token = admin ? await getAuthToken() : undefined;
    const appType = BRAND_ADMIN_APP_TYPE[scope];
    const response = await apiGet(
      `/api/static-images/section/${section}?activeOnly=${activeOnly}`,
      token ? { token, appType } : { appType }
    );
    return response.data || [];
  } catch {
    return [];
  }
};

export const getStaticImageById = async (
  id: string,
  scope: BrandAdminScope = "instafarms",
): Promise<any> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);
    if (!id) throw new Error(STATIC_IMAGE_ERRORS.invalidId);

    const token = await getAuthToken();
    const response = await apiGet(`/api/static-images/${id}`, apiOpts(token, scope));
    return response.data ?? null;
  } catch (err) {
    captureError(err);
    throw new Error(parseApiError(err, STATIC_IMAGE_ERRORS.fetchFailed));
  }
};

export const getAllStaticImages = async (
  scope: BrandAdminScope = "instafarms",
): Promise<any[]> => {
  try {
    const admin = await isAdmin();
    if (!admin) throw new Error(STATIC_IMAGE_ERRORS.unauthorized);

    const token = await getAuthToken();
    const response = await apiGet("/api/static-images", apiOpts(token, scope));
    return response.data || [];
  } catch {
    return [];
  }
};

// Public — no auth required
export const getHomepageHeroImages = async (): Promise<any[]> => {
  try {
    const response = await apiGet("/api/static-images/section/homepage_hero?activeOnly=true", {});
    return response.data || [];
  } catch {
    return [];
  }
};