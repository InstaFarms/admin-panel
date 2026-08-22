"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { parsePropertyFormData, parseSpecialDates } from "@/utils/server-utils";
import { GalleryData, PropertyFormData, ServerActionResult, ServerSearchResult } from "@/utils/types";
import { apiDelete, apiGet, apiPatch, apiPost, buildQueryString } from "@/utils/api-utils";
import { isAdmin } from "@/utils/admin-only";
import type { PropertyUpsertPayload, PropertyUpsertResultData } from "@/lib/properties/propertyUpsert";
import type { PropertySectionKey } from "@/types/jarvis-property-sections";
import { captureError } from "@/lib/sentry";

const WEBSITE_REVALIDATION_SECRET = "instafarms-local-revalidation-secret";
const CLIENT_SITE_BASE_URL = (process.env.NEXT_PUBLIC_CLIENT_SITE_URL || process.env.CLIENT_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const WEBSITE_REVALIDATION_URL = `${CLIENT_SITE_BASE_URL}/api/revalidate`;

const _pickStr = (...values: any[]): string | undefined => {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
  }
  return undefined;
};

const _normalizeRevalidationSource = (response: any) => {
  const top = response?.data ?? response;
  if (top?.property && typeof top.property === "object") return top.property;
  if (top?.detail && typeof top.detail === "object") return top.detail;
  if (top?.tabs?.detail && typeof top.tabs.detail === "object") {
    return { ...top.tabs.detail, ...(top.tabs.others ?? {}) };
  }
  return top;
};

async function triggerWebsiteRevalidation(propertyId: string, token: string, context: string, slugHint?: string): Promise<void> {
  let source: any = {};
  for (const endpoint of [`/api/properties/admin/${propertyId}/full`, `/api/properties/${propertyId}/full`, `/api/properties/${propertyId}`]) {
    try {
      const res = await apiGet<any>(endpoint, { token });
      const s = _normalizeRevalidationSource(res);
      if (s) { source = s; break; }
    } catch { /* try next */ }
  }

  const slug = _pickStr(slugHint, source?.slug, source?.propertySlug, source?.entitySlug);
  if (!slug) {
    console.warn(`[${context}] Skipping website revalidation: no slug found`, { propertyId });
    return;
  }

  const state = (_pickStr(source?.stateSlug, source?.state_slug, source?.state, source?.address_details?.state_slug) ?? "telangana").replace(/^\/+|\/+$/g, "");
  const city = (_pickStr(source?.citySlug, source?.city_slug, source?.city, source?.address_details?.city_slug) ?? "hyderabad").replace(/^\/+|\/+$/g, "");
  const area = (_pickStr(source?.areaSlug, source?.area_slug, source?.area, source?.address_details?.area_slug) ?? "").replace(/^\/+|\/+$/g, "");
  const propertySlug = slug.trim().replace(/\.html$/i, "").replace(/^\/+|\/+$/g, "");

  try {
    await fetch(WEBSITE_REVALIDATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: propertySlug, state, city, area, propertySlug, secret: WEBSITE_REVALIDATION_SECRET }),
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[${context}] Revalidation request error`, { propertyId, slug: propertySlug, err });
    captureError(err);
  }
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

interface ParsedGalleryResult {
  data: GalleryData[];
  error: string | null;
}

interface ParsedAmenityResult {
  data: Array<{ id: string; name: string; weight: number | null; isPaid?: boolean; isUSP?: boolean }>;
  error: string | null;
}

interface ParsedActivityResult {
  data: Array<{ id: string; name: string; weight?: number | null; isPaid?: boolean; isUSP?: boolean }>;
  error: string | null;
}

// Helper function to convert null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => {
  return value === null ? undefined : value;
};

const parseGalleries = (formData: FormData): ParsedGalleryResult => {
  try {
    const galleriesString = formData.get("galleries")?.toString();

    if (!galleriesString) {
      return { data: [], error: null };
    }

    const galleries = JSON.parse(galleriesString) as GalleryData[];

    const validGalleries = galleries.filter((g: GalleryData) => {
      const hasValidUrl = (g.photoUrl && g.photoUrl.trim() !== "" && !g.photoUrl.startsWith('blob:')) ||
        (g.rawUrl && g.rawUrl.trim() !== "" && !g.rawUrl.startsWith('blob:'));

      return hasValidUrl;
    }).map(g => ({
      ...g,
      altText: g.altText || g.fileName || '',
      caption: g.fileName || g.selectedFile?.name || '',
    }));

    return { data: validGalleries, error: null };
  } catch (error) {
    console.error("[parseGalleries] Failed to parse galleries:", error);
    captureError(error);
    return { data: [], error: "Invalid gallery data" };
  }
};

const parseAmenities = (formData: FormData): ParsedAmenityResult => {
  try {
    const amenitiesString = formData.get("amenities")?.toString();
    if (!amenitiesString) return { data: [], error: null };

    const amenities = JSON.parse(amenitiesString);
    const validAmenities = amenities
      .filter((a: any) => a.name && a.name.trim() !== "")
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        weight: a.weight ?? null,
        isPaid: a.isPaid ?? false,
        isUSP: a.isUSP ?? false,
      }));
    return { data: validAmenities, error: null };
  } catch (error) {
    captureError(error);
    return { data: [], error: "Invalid amenities data" };
  }
};

const parseActivities = (formData: FormData): ParsedActivityResult => {
  try {
    const activitiesString = formData.get("activities")?.toString();
    if (!activitiesString) return { data: [], error: null };

    const activities = JSON.parse(activitiesString);
    const validActivities = activities
      .filter((a: any) => a.name && a.name.trim() !== "")
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        weight: a.weight ?? null,
        isPaid: a.isPaid ?? false,
        isUSP: a.isUSP ?? false,
      }));
    return { data: validActivities, error: null };
  } catch (error) {
    captureError(error);
    return { data: [], error: "Invalid activities data" };
  }
};

const parseOptionalJsonField = <T>(formData: FormData, key: string): T | undefined => {
  const raw = formData.get(key)?.toString();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
};

const mapGalleryToService = (galleries: GalleryData[]) => {
  const mapped = galleries.map((g) => {
    const result: Record<string, unknown> = {
      url: g.photoUrl || g.rawUrl || '',
      rawUrl: g.rawUrl || g.photoUrl || '',
      listingUrl: '', // Nothing goes to listingUrl key per requirement
      originalUrl: g.originalUrl ?? g.rawUrl ?? g.photoUrl ?? '',
      thumbnailUrl: g.thumbnailUrl ?? '',
      watermarkedUrlByInstafarms: g.watermarkedUrlByInstafarms ?? g.photoUrl ?? '',
      name: g.name ?? g.fileName ?? '',
      altText: g.instafarmsAltText ?? g.altText ?? '',
      order: g.sortOrder || 0,
      cover: g.isCover ? 1 : 0,
      waterMarked: g.hasWatermark || false,
      tag: g.key || 'general',
    };
    if (g.fileSize != null && typeof g.fileSize === 'number') result.fileSize = g.fileSize;
    if (g.mimeType != null && g.mimeType !== '') result.mimeType = g.mimeType;
    if (g.width != null && typeof g.width === 'number') result.width = g.width;
    if (g.height != null && typeof g.height === 'number') result.height = g.height;
    if (g.aspectRatio != null && typeof g.aspectRatio === 'number') result.aspectRatio = g.aspectRatio;
    if (g.blurHash != null && g.blurHash !== '') result.blurHash = g.blurHash;

    return result;
  });
  return mapped;
};

const extractUpsertMeta = (result: any): PropertyUpsertResultData => {
  const data = result?.data ?? {};
  const meta = result?.meta ?? data?.meta ?? {};
  const propertyId =
    String(
      meta.propertyId ??
      data.propertyId ??
      data.id ??
      ""
    ).trim();
  const propertyUpdatedAt =
    typeof data.propertyUpdatedAt === "string" ? data.propertyUpdatedAt : null;
  return { propertyId, propertyUpdatedAt };
};

export const createPropertyFromPayload = async (
  payload: PropertyUpsertPayload,
): Promise<ServerActionResult<PropertyUpsertResultData>> => {
  try {
    console.log("[createPropertyFromPayload] payload:", JSON.stringify(payload, null, 2));
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiPost<{ success?: boolean; data?: unknown; message?: string; meta?: unknown }>(
      "/api/properties",
      payload,
      { token }
    );

    if (!result?.success) {
      throw new Error((result as any)?.message || "Failed to create property");
    }

    const upsertMeta = extractUpsertMeta(result);

    if (upsertMeta.propertyId) {
      await triggerWebsiteRevalidation(upsertMeta.propertyId, token, "createPropertyFromPayload");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    return {
      success: "Created new property.",
      data: upsertMeta,
    };
  } catch (err: any) {
    console.log("Error: ", err);
    console.log(
      "[createPropertyFromPayload] failed payload:",
      JSON.stringify(payload, null, 2),
    );
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const editPropertyFromPayload = async (
  propertyId: string,
  payload: PropertyUpsertPayload,
): Promise<ServerActionResult<PropertyUpsertResultData>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    if (!propertyId) {
      throw new Error("Invalid id.");
    }

    const result = await apiPatch<{ success?: boolean; data?: unknown; message?: string; meta?: unknown }>(
      `/api/properties/${propertyId}`,
      payload,
      { token }
    );

    if (!result?.success) {
      throw new Error((result as any)?.message || "Failed to update property");
    }

    const upsertMeta = extractUpsertMeta(result);

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}`);

    // Bust the frontend cache so the property page reflects changes immediately
    const updatedProperty = (result as any)?.data ?? {};
    const rawSlug =
      typeof updatedProperty.slug === "string" ? updatedProperty.slug.trim().replace(/\.html$/i, "") : "";
    if (rawSlug) {
      try {
        await fetch(WEBSITE_REVALIDATION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: rawSlug,
            state: updatedProperty.stateSlug || updatedProperty.state || "",
            city: updatedProperty.citySlug || updatedProperty.city || "",
            area: updatedProperty.areaSlug || updatedProperty.area || "",
            propertySlug: rawSlug,
            secret: WEBSITE_REVALIDATION_SECRET,
          }),
          cache: "no-store",
        });
      } catch (revalidationError) {
        console.error("[editPropertyFromPayload] Revalidation request error", {
          propertyId,
          rawSlug,
          revalidationError,
        });
        captureError(revalidationError);
      }
    } else {
      console.warn("[editPropertyFromPayload] Skipping website revalidation: slug missing from API response", { propertyId });
    }

    return {
      success: "Saved Property data.",
      data: upsertMeta,
    };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const createProperty = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const formData_parsed: PropertyFormData = parsePropertyFormData(formData);
    const skipGalleryAndCoverCreate = formData.get("skipGalleryAndCover") === "true";
    const galleriesData = parseGalleries(formData);
    const ownersData = JSON.parse(formData.get("owners")?.toString() || "[]");
    const managersData = JSON.parse(formData.get("managers")?.toString() || "[]");
    const caretakersData = JSON.parse(formData.get("caretakers")?.toString() || "[]");
    const safetyHygieneData = formData.has("safetyHygiene")
      ? JSON.parse(formData.get("safetyHygiene")?.toString() || "[]")
      : undefined;
    const discountPlansData = JSON.parse(formData.get("discountPlans")?.toString() || "[]");
    const cancellationPlansData = JSON.parse(formData.get("cancellationPlans")?.toString() || "[]");
    const amenitiesData = parseAmenities(formData);
    const activitiesData = parseActivities(formData);
    const specialDatesData = parseSpecialDates(formData);

    if (galleriesData.error) {
      throw new Error(galleriesData.error);
    }

    if (amenitiesData.error) {
      throw new Error(amenitiesData.error);
    }

    if (activitiesData.error) {
      throw new Error(activitiesData.error);
    }

    if (specialDatesData.error) {
      throw new Error(specialDatesData.error);
    }

    // Build request payload matching backend expectations
    const payload = {
      propertyName: formData_parsed.propertyName,
      heading: formData_parsed.propertyName || "",
      propertyCode: formData_parsed.propertyCode,
      propertyCodeName: nullToUndefined(formData_parsed.propertyCodeName),
      allowCallBooking: formData_parsed.allowCallBooking,
      allowOnlineBooking: formData_parsed.allowOnlineBooking,
      allowEnquiry: formData_parsed.allowEnquiry,
      commissionPercentage: formData_parsed.commissionPercentage || 0,
      securityDeposit: nullToUndefined(formData_parsed.securityDeposit),
      cookingAccessFee: formData_parsed.cookingAccessFee ?? 0,

      // Day-wise pricing
      mondayPrice: nullToUndefined(formData_parsed.mondayPrice),
      mondayAdultExtraGuestCharge: nullToUndefined(formData_parsed.mondayAdultExtraGuestCharge),
      mondayChildExtraGuestCharge: nullToUndefined(formData_parsed.mondayChildExtraGuestCharge),
      mondayInfantExtraGuestCharge: nullToUndefined(formData_parsed.mondayInfantExtraGuestCharge),
      mondayBaseGuestCount: nullToUndefined(formData_parsed.mondayBaseGuestCount),
      mondayDiscount: nullToUndefined(formData_parsed.mondayDiscount),

      tuesdayPrice: nullToUndefined(formData_parsed.tuesdayPrice),
      tuesdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayAdultExtraGuestCharge),
      tuesdayChildExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayChildExtraGuestCharge),
      tuesdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayInfantExtraGuestCharge),
      tuesdayBaseGuestCount: nullToUndefined(formData_parsed.tuesdayBaseGuestCount),
      tuesdayDiscount: nullToUndefined(formData_parsed.tuesdayDiscount),

      wednesdayPrice: nullToUndefined(formData_parsed.wednesdayPrice),
      wednesdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayAdultExtraGuestCharge),
      wednesdayChildExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayChildExtraGuestCharge),
      wednesdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayInfantExtraGuestCharge),
      wednesdayBaseGuestCount: nullToUndefined(formData_parsed.wednesdayBaseGuestCount),
      wednesdayDiscount: nullToUndefined(formData_parsed.wednesdayDiscount),

      thursdayPrice: nullToUndefined(formData_parsed.thursdayPrice),
      thursdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.thursdayAdultExtraGuestCharge),
      thursdayChildExtraGuestCharge: nullToUndefined(formData_parsed.thursdayChildExtraGuestCharge),
      thursdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.thursdayInfantExtraGuestCharge),
      thursdayBaseGuestCount: nullToUndefined(formData_parsed.thursdayBaseGuestCount),
      thursdayDiscount: nullToUndefined(formData_parsed.thursdayDiscount),

      fridayPrice: nullToUndefined(formData_parsed.fridayPrice),
      fridayAdultExtraGuestCharge: nullToUndefined(formData_parsed.fridayAdultExtraGuestCharge),
      fridayChildExtraGuestCharge: nullToUndefined(formData_parsed.fridayChildExtraGuestCharge),
      fridayInfantExtraGuestCharge: nullToUndefined(formData_parsed.fridayInfantExtraGuestCharge),
      fridayBaseGuestCount: nullToUndefined(formData_parsed.fridayBaseGuestCount),
      fridayDiscount: nullToUndefined(formData_parsed.fridayDiscount),

      saturdayPrice: nullToUndefined(formData_parsed.saturdayPrice),
      saturdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.saturdayAdultExtraGuestCharge),
      saturdayChildExtraGuestCharge: nullToUndefined(formData_parsed.saturdayChildExtraGuestCharge),
      saturdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.saturdayInfantExtraGuestCharge),
      saturdayBaseGuestCount: nullToUndefined(formData_parsed.saturdayBaseGuestCount),
      saturdayDiscount: nullToUndefined(formData_parsed.saturdayDiscount),

      sundayPrice: nullToUndefined(formData_parsed.sundayPrice),
      sundayAdultExtraGuestCharge: nullToUndefined(formData_parsed.sundayAdultExtraGuestCharge),
      sundayChildExtraGuestCharge: nullToUndefined(formData_parsed.sundayChildExtraGuestCharge),
      sundayInfantExtraGuestCharge: nullToUndefined(formData_parsed.sundayInfantExtraGuestCharge),
      sundayBaseGuestCount: nullToUndefined(formData_parsed.sundayBaseGuestCount),
      sundayDiscount: nullToUndefined(formData_parsed.sundayDiscount),

      // Day-wise with GST, GST slab, max extra guest price/total (so PATCH persists them)
      mondayPriceWithGST: nullToUndefined((formData_parsed as any).mondayPriceWithGST),
      mondayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayAdultExtraGuestChargeWithGST),
      mondayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayChildExtraGuestChargeWithGST),
      mondayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayInfantExtraGuestChargeWithGST),
      mondayGSTslab: nullToUndefined((formData_parsed as any).mondayGSTslab),
      mondayMaxExtraGuestPrice: nullToUndefined(formData_parsed.mondayMaxExtraGuestPrice),
      mondayMaxTotal: nullToUndefined(formData_parsed.mondayMaxTotal),
      tuesdayPriceWithGST: nullToUndefined((formData_parsed as any).tuesdayPriceWithGST),
      tuesdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayAdultExtraGuestChargeWithGST),
      tuesdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayChildExtraGuestChargeWithGST),
      tuesdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayInfantExtraGuestChargeWithGST),
      tuesdayGSTslab: nullToUndefined((formData_parsed as any).tuesdayGSTslab),
      tuesdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.tuesdayMaxExtraGuestPrice),
      tuesdayMaxTotal: nullToUndefined(formData_parsed.tuesdayMaxTotal),
      wednesdayPriceWithGST: nullToUndefined((formData_parsed as any).wednesdayPriceWithGST),
      wednesdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayAdultExtraGuestChargeWithGST),
      wednesdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayChildExtraGuestChargeWithGST),
      wednesdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayInfantExtraGuestChargeWithGST),
      wednesdayGSTslab: nullToUndefined((formData_parsed as any).wednesdayGSTslab),
      wednesdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.wednesdayMaxExtraGuestPrice),
      wednesdayMaxTotal: nullToUndefined(formData_parsed.wednesdayMaxTotal),
      thursdayPriceWithGST: nullToUndefined((formData_parsed as any).thursdayPriceWithGST),
      thursdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayAdultExtraGuestChargeWithGST),
      thursdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayChildExtraGuestChargeWithGST),
      thursdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayInfantExtraGuestChargeWithGST),
      thursdayGSTslab: nullToUndefined((formData_parsed as any).thursdayGSTslab),
      thursdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.thursdayMaxExtraGuestPrice),
      thursdayMaxTotal: nullToUndefined(formData_parsed.thursdayMaxTotal),
      fridayPriceWithGST: nullToUndefined((formData_parsed as any).fridayPriceWithGST),
      fridayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayAdultExtraGuestChargeWithGST),
      fridayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayChildExtraGuestChargeWithGST),
      fridayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayInfantExtraGuestChargeWithGST),
      fridayGSTslab: nullToUndefined((formData_parsed as any).fridayGSTslab),
      fridayMaxExtraGuestPrice: nullToUndefined(formData_parsed.fridayMaxExtraGuestPrice),
      fridayMaxTotal: nullToUndefined(formData_parsed.fridayMaxTotal),
      saturdayPriceWithGST: nullToUndefined((formData_parsed as any).saturdayPriceWithGST),
      saturdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayAdultExtraGuestChargeWithGST),
      saturdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayChildExtraGuestChargeWithGST),
      saturdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayInfantExtraGuestChargeWithGST),
      saturdayGSTslab: nullToUndefined((formData_parsed as any).saturdayGSTslab),
      saturdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.saturdayMaxExtraGuestPrice),
      saturdayMaxTotal: nullToUndefined(formData_parsed.saturdayMaxTotal),
      sundayPriceWithGST: nullToUndefined((formData_parsed as any).sundayPriceWithGST),
      sundayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayAdultExtraGuestChargeWithGST),
      sundayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayChildExtraGuestChargeWithGST),
      sundayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayInfantExtraGuestChargeWithGST),
      sundayGSTslab: nullToUndefined((formData_parsed as any).sundayGSTslab),
      sundayMaxExtraGuestPrice: nullToUndefined(formData_parsed.sundayMaxExtraGuestPrice),
      sundayMaxTotal: nullToUndefined(formData_parsed.sundayMaxTotal),

      mondayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingAdultExtraGuestCharge),
      mondayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingChildExtraGuestCharge),
      mondayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingInfantExtraGuestCharge),
      mondayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingAdultExtraGuestChargeWithGST),
      mondayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingChildExtraGuestChargeWithGST),
      mondayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingInfantExtraGuestChargeWithGST),
      tuesdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingAdultExtraGuestCharge),
      tuesdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingChildExtraGuestCharge),
      tuesdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingInfantExtraGuestCharge),
      tuesdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingAdultExtraGuestChargeWithGST),
      tuesdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingChildExtraGuestChargeWithGST),
      tuesdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingInfantExtraGuestChargeWithGST),
      wednesdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingAdultExtraGuestCharge),
      wednesdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingChildExtraGuestCharge),
      wednesdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingInfantExtraGuestCharge),
      wednesdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingAdultExtraGuestChargeWithGST),
      wednesdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingChildExtraGuestChargeWithGST),
      wednesdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingInfantExtraGuestChargeWithGST),
      thursdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingAdultExtraGuestCharge),
      thursdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingChildExtraGuestCharge),
      thursdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingInfantExtraGuestCharge),
      thursdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingAdultExtraGuestChargeWithGST),
      thursdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingChildExtraGuestChargeWithGST),
      thursdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingInfantExtraGuestChargeWithGST),
      fridayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingAdultExtraGuestCharge),
      fridayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingChildExtraGuestCharge),
      fridayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingInfantExtraGuestCharge),
      fridayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingAdultExtraGuestChargeWithGST),
      fridayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingChildExtraGuestChargeWithGST),
      fridayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingInfantExtraGuestChargeWithGST),
      saturdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingAdultExtraGuestCharge),
      saturdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingChildExtraGuestCharge),
      saturdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingInfantExtraGuestCharge),
      saturdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingAdultExtraGuestChargeWithGST),
      saturdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingChildExtraGuestChargeWithGST),
      saturdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingInfantExtraGuestChargeWithGST),
      sundayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingAdultExtraGuestCharge),
      sundayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingChildExtraGuestCharge),
      sundayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingInfantExtraGuestCharge),
      sundayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingAdultExtraGuestChargeWithGST),
      sundayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingChildExtraGuestChargeWithGST),
      sundayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingInfantExtraGuestChargeWithGST),

      // Property details
      bedroomCount: nullToUndefined(formData_parsed.bedroomCount),
      bathroomCount: nullToUndefined(formData_parsed.bathroomCount),
      doubleBedCount: nullToUndefined(formData_parsed.doubleBedCount),
      singleBedCount: nullToUndefined(formData_parsed.singleBedCount),
      mattressCount: nullToUndefined(formData_parsed.mattressCount),
      baseGuestCount: nullToUndefined(formData_parsed.baseGuestCount),
      maxGuestCount: nullToUndefined(formData_parsed.maxGuestCount),
      bookingType: nullToUndefined(formData_parsed.bookingType),
      checkinTime: nullToUndefined(formData_parsed.checkinTime),
      checkoutTime: nullToUndefined(formData_parsed.checkoutTime),

      // Location
      latitude: nullToUndefined(formData_parsed.latitude),
      longitude: nullToUndefined(formData_parsed.longitude),
      mapLink: nullToUndefined(formData_parsed.mapLink),
      address: formData_parsed.address || undefined,
      landmark: nullToUndefined(formData_parsed.landmark),
      // Pass null explicitly when clearing area so API updates DB; nullToUndefined would omit and leave old value
      areaId: formData_parsed.areaId,
      secondaryAreaId1: formData_parsed.secondaryAreaId1,
      secondaryAreaId2: formData_parsed.secondaryAreaId2,
      secondaryAreaId3: formData_parsed.secondaryAreaId3,
      secondaryAreaId4: formData_parsed.secondaryAreaId4,
      cityId: nullToUndefined(formData_parsed.cityId),
      stateId: nullToUndefined(formData_parsed.stateId),
      pincode: nullToUndefined(formData_parsed.pincode),
      googlePlaceId: nullToUndefined(formData_parsed.googlePlaceId),
      googlePlaceRating: nullToUndefined(formData_parsed.googlePlaceRating),
      googlePlaceUserRatingCount: nullToUndefined(formData_parsed.googlePlaceUserRatingCount),
      googlePlaceReviews: formData.get("googlePlaceReviews") ? JSON.parse(formData.get("googlePlaceReviews")?.toString() || "[]") : undefined,
      nearbyPlaces: formData.get("nearbyPlaces") ? JSON.parse(formData.get("nearbyPlaces")?.toString() || "[]") : undefined,
      propertyTypeId: nullToUndefined(formData_parsed.propertyTypeId),
      slug: nullToUndefined(formData_parsed.slug),
      showOnInstafarms: nullToUndefined(formData_parsed.showOnInstafarms),
      weight: nullToUndefined(formData_parsed.weight as any) ?? 0,
      isDisabled: nullToUndefined(formData_parsed.isDisabled),

      // External sync

      // Property settings
      requiresConfirmation: formData_parsed.requiresConfirmation ?? false,
      advancePaymentEnabled: formData_parsed.advancePaymentEnabled ?? false,
      advancePaymentAmount: nullToUndefined(formData_parsed.advancePaymentAmount),
      advancePaymentPercentage: nullToUndefined(formData_parsed.advancePaymentPercentage),
      enableFloatingGuests: formData_parsed.enableFloatingGuests ?? false,

      // Map relationships with weight (isPaid and isUSP are on amenity/activity table, not relationship)
      amenities: amenitiesData.data.map((a) => ({
        id: a.id,
        weight: a.weight ?? null,
      })),
      activities: activitiesData.data.map((a) => ({
        id: a.id,
        weight: a.weight ?? null,
      })),
      safetyHygiene: Array.isArray(safetyHygieneData)
        ? safetyHygieneData.map((sh: { id?: string; safetyHygieneId?: string }) => ({
            safetyHygieneId: sh.safetyHygieneId || sh.id,
          })).filter((x: any) => Boolean(x.safetyHygieneId))
        : undefined,

      // Special dates
      specialDates: specialDatesData.data?.map((sd) => ({
        date: sd.date,
        price: nullToUndefined(sd.price),
        priceWithGST: nullToUndefined(sd.priceWithGST),
        adultExtraGuestCharge: nullToUndefined(sd.adultExtraGuestCharge),
        adultExtraGuestChargeWithGST: nullToUndefined(sd.adultExtraGuestChargeWithGST),
        childExtraGuestCharge: nullToUndefined(sd.childExtraGuestCharge),
        childExtraGuestChargeWithGST: nullToUndefined(sd.childExtraGuestChargeWithGST),
        infantExtraGuestCharge: nullToUndefined(sd.infantExtraGuestCharge),
        infantExtraGuestChargeWithGST: nullToUndefined(sd.infantExtraGuestChargeWithGST),
        floatingAdultExtraGuestCharge: nullToUndefined(sd.floatingAdultExtraGuestCharge),
        floatingAdultExtraGuestChargeWithGST: nullToUndefined(sd.floatingAdultExtraGuestChargeWithGST),
        floatingChildExtraGuestCharge: nullToUndefined(sd.floatingChildExtraGuestCharge),
        floatingChildExtraGuestChargeWithGST: nullToUndefined(sd.floatingChildExtraGuestChargeWithGST),
        floatingInfantExtraGuestCharge: nullToUndefined(sd.floatingInfantExtraGuestCharge),
        floatingInfantExtraGuestChargeWithGST: nullToUndefined(sd.floatingInfantExtraGuestChargeWithGST),
        baseGuestCount: nullToUndefined(sd.baseGuestCount),
        discount: nullToUndefined(sd.discount),
        maxExtraGuestPrice: nullToUndefined(sd.maxExtraGuestPrice),
        maxTotal: nullToUndefined(sd.maxTotal),
        gstSlab: nullToUndefined(sd.gstSlab),
      })) || [],

      // User relationships
      owners: ownersData.map((o: any) => ({ id: o.id })),
      managers: managersData.map((m: any) => ({ id: m.id })),
      caretakers: caretakersData.map((c: any) => ({ id: c.id })),

      // Plans
      discountPlan: discountPlansData.length > 0 ? { id: discountPlansData[0].id } : undefined,
      shortTermCancellationPlan: cancellationPlansData.find((p: any) => p.type === 'shortterm') ? { id: cancellationPlansData.find((p: any) => p.type === 'shortterm').id } : undefined,
      longTermCancellationPlan: cancellationPlansData.find((p: any) => p.type === 'longterm') ? { id: cancellationPlansData.find((p: any) => p.type === 'longterm').id } : undefined,

      // Gallery - omit when skipGalleryAndCover (photos/cover managed via Upload tab and Cover Images)
      ...(skipGalleryAndCoverCreate ? {} : { gallery: mapGalleryToService(galleriesData.data) }),

      // Summary (description), rules, booking policy
      description: formData_parsed.description ?? "",
      bookingPolicy: formData_parsed.bookingPolicy ?? "",
      homeRulesTruths: formData_parsed.homeRulesTruths ?? undefined,

      // Others
      bedding_availability: parseOptionalJsonField(formData, "bedding_availability"),
      experiences: parseOptionalJsonField(formData, "experiences"),
      nearbyAttractions: parseOptionalJsonField(formData, "nearbyAttractions"),
      foodOptions: parseOptionalJsonField(formData, "foodOptions"),
      miscCharges: parseOptionalJsonField(formData, "miscCharges"),
      faqs: parseOptionalJsonField(formData, "faqs"),
      meta:
        parseOptionalJsonField(formData, "meta") ??
        (formData.get("metaTitle") ||
        formData.get("metaUrl") ||
        formData.get("metaDescription") ||
        formData.get("metaKeyword")
          ? {
              metaTitle: formData.get("metaTitle")?.toString() || "",
              metaUrl: formData.get("metaUrl")?.toString() || "",
              metaDescription: formData.get("metaDescription")?.toString() || "",
              metaKeyword: formData.get("metaKeyword")?.toString() || "",
            }
          : undefined),
      spaces: formData.get("spaces")
        ? (JSON.parse(formData.get("spaces")?.toString() || "[]") as any[]).map((space, index) => ({
            id: space.id || space.spaceId || undefined,
            spaceId: space.spaceId || space.id || undefined,
            name: space.name || space.spaceName || space.title || `Space ${index + 1}`,
            photo: space.photo ?? "",
            title: space.title || space.name || space.spaceName || `Space ${index + 1}`,
            description: space.description || "",
          }))
        : undefined,
      // Audit system fields
      propertyManagementType: formData_parsed.propertyManagementType,
      auditEnabled: formData_parsed.auditEnabled,
      maxAuditGapDays: formData_parsed.maxAuditGapDays,
      auditComplianceStatus: formData_parsed.auditComplianceStatus,
    };

    // Call backend API
    const result = await apiPost("/api/properties", payload, {
      token,
    });

    if (!result.success) {
      throw new Error(result.message || 'Failed to create property');
    }

    // Update amenities with isPaid, isUSP, and weight
    for (const amenity of amenitiesData.data) {
      try {
        await apiPatch(`/api/amenities/${amenity.id}`, {
          type: "amenities",
          isPaid: amenity.isPaid ?? false,
          isUSP: amenity.isUSP ?? false,
          weight: amenity.weight ?? null,
        }, { token });
      } catch (err) {
        console.error(`Failed to update amenity ${amenity.id}:`, err);
        captureError(err);
        // Continue with other amenities even if one fails
      }
    }

    // Update activities with isPaid, isUSP, and weight
    for (const activity of activitiesData.data) {
      try {
        await apiPatch(`/api/amenities/${activity.id}?type=activities`, {
          type: "activities",
          isPaid: activity.isPaid ?? false,
          isUSP: activity.isUSP ?? false,
          weight: activity.weight ?? null,
        }, { token });
      } catch (err) {
        console.error(`Failed to update activity ${activity.id}:`, err);
        captureError(err);
        // Continue with other activities even if one fails
      }
    }

    const createdId = String((result as any)?.data?.id ?? (result as any)?.data?.propertyId ?? "").trim();
    if (createdId) {
      const slugHint = formData.get("metaUrl")?.toString().trim() || undefined;
      await triggerWebsiteRevalidation(createdId, token, "createProperty", slugHint);
    }

    revalidatePath("/admin");
    return { success: "Created new property." };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const editProperty = async (
  propertyId: string,
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    if (!propertyId) {
      throw new Error("Invalid id.");
    }

    const formData_parsed: PropertyFormData = parsePropertyFormData(formData);
    const specialDatesData = parseSpecialDates(formData);
    const skipGalleryAndCover = formData.get("skipGalleryAndCover") === "true";
    const galleriesData = parseGalleries(formData);
    const ownersData = JSON.parse(formData.get("owners")?.toString() || "[]");
    const managersData = JSON.parse(formData.get("managers")?.toString() || "[]");
    const caretakersData = JSON.parse(formData.get("caretakers")?.toString() || "[]");
    const safetyHygieneData = formData.has("safetyHygiene")
      ? JSON.parse(formData.get("safetyHygiene")?.toString() || "[]")
      : undefined;
    const discountPlansData = JSON.parse(formData.get("discountPlans")?.toString() || "[]");
    const cancellationPlansData = JSON.parse(formData.get("cancellationPlans")?.toString() || "[]");
    const amenitiesData = parseAmenities(formData);
    const activitiesData = parseActivities(formData);

    if (specialDatesData.error) {
      throw new Error(specialDatesData.error);
    }
    if (galleriesData.error) {
      throw new Error(galleriesData.error);
    }
    if (amenitiesData.error) {
      throw new Error(amenitiesData.error);
    }
    if (activitiesData.error) {
      throw new Error(activitiesData.error);
    }

    // console.log("🔍 [editProperty] Owners Payload:", ownersData);


    // Build update payload (same structure as create)
    const payload = {
      propertyName: formData_parsed.propertyName,
      heading: formData_parsed.propertyName || "",
      propertyCode: formData_parsed.propertyCode,
      propertyCodeName: nullToUndefined(formData_parsed.propertyCodeName),
      allowCallBooking: formData_parsed.allowCallBooking,
      allowOnlineBooking: formData_parsed.allowOnlineBooking,
      allowEnquiry: formData_parsed.allowEnquiry,
      commissionPercentage: formData_parsed.commissionPercentage || 0,
      securityDeposit: nullToUndefined(formData_parsed.securityDeposit),
      cookingAccessFee: formData_parsed.cookingAccessFee ?? 0,

      // All day-wise pricing...
      mondayPrice: nullToUndefined(formData_parsed.mondayPrice),
      mondayAdultExtraGuestCharge: nullToUndefined(formData_parsed.mondayAdultExtraGuestCharge),
      mondayChildExtraGuestCharge: nullToUndefined(formData_parsed.mondayChildExtraGuestCharge),
      mondayInfantExtraGuestCharge: nullToUndefined(formData_parsed.mondayInfantExtraGuestCharge),
      mondayBaseGuestCount: nullToUndefined(formData_parsed.mondayBaseGuestCount),
      mondayDiscount: nullToUndefined(formData_parsed.mondayDiscount),

      tuesdayPrice: nullToUndefined(formData_parsed.tuesdayPrice),
      tuesdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayAdultExtraGuestCharge),
      tuesdayChildExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayChildExtraGuestCharge),
      tuesdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayInfantExtraGuestCharge),
      tuesdayBaseGuestCount: nullToUndefined(formData_parsed.tuesdayBaseGuestCount),
      tuesdayDiscount: nullToUndefined(formData_parsed.tuesdayDiscount),

      wednesdayPrice: nullToUndefined(formData_parsed.wednesdayPrice),
      wednesdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayAdultExtraGuestCharge),
      wednesdayChildExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayChildExtraGuestCharge),
      wednesdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayInfantExtraGuestCharge),
      wednesdayBaseGuestCount: nullToUndefined(formData_parsed.wednesdayBaseGuestCount),
      wednesdayDiscount: nullToUndefined(formData_parsed.wednesdayDiscount),

      thursdayPrice: nullToUndefined(formData_parsed.thursdayPrice),
      thursdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.thursdayAdultExtraGuestCharge),
      thursdayChildExtraGuestCharge: nullToUndefined(formData_parsed.thursdayChildExtraGuestCharge),
      thursdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.thursdayInfantExtraGuestCharge),
      thursdayBaseGuestCount: nullToUndefined(formData_parsed.thursdayBaseGuestCount),
      thursdayDiscount: nullToUndefined(formData_parsed.thursdayDiscount),

      fridayPrice: nullToUndefined(formData_parsed.fridayPrice),
      fridayAdultExtraGuestCharge: nullToUndefined(formData_parsed.fridayAdultExtraGuestCharge),
      fridayChildExtraGuestCharge: nullToUndefined(formData_parsed.fridayChildExtraGuestCharge),
      fridayInfantExtraGuestCharge: nullToUndefined(formData_parsed.fridayInfantExtraGuestCharge),
      fridayBaseGuestCount: nullToUndefined(formData_parsed.fridayBaseGuestCount),
      fridayDiscount: nullToUndefined(formData_parsed.fridayDiscount),

      saturdayPrice: nullToUndefined(formData_parsed.saturdayPrice),
      saturdayAdultExtraGuestCharge: nullToUndefined(formData_parsed.saturdayAdultExtraGuestCharge),
      saturdayChildExtraGuestCharge: nullToUndefined(formData_parsed.saturdayChildExtraGuestCharge),
      saturdayInfantExtraGuestCharge: nullToUndefined(formData_parsed.saturdayInfantExtraGuestCharge),
      saturdayBaseGuestCount: nullToUndefined(formData_parsed.saturdayBaseGuestCount),
      saturdayDiscount: nullToUndefined(formData_parsed.saturdayDiscount),

      sundayPrice: nullToUndefined(formData_parsed.sundayPrice),
      sundayAdultExtraGuestCharge: nullToUndefined(formData_parsed.sundayAdultExtraGuestCharge),
      sundayChildExtraGuestCharge: nullToUndefined(formData_parsed.sundayChildExtraGuestCharge),
      sundayInfantExtraGuestCharge: nullToUndefined(formData_parsed.sundayInfantExtraGuestCharge),
      sundayBaseGuestCount: nullToUndefined(formData_parsed.sundayBaseGuestCount),
      sundayDiscount: nullToUndefined(formData_parsed.sundayDiscount),

      // Day-wise with GST, GST slab, max extra guest price/total (so PATCH persists them)
      mondayPriceWithGST: nullToUndefined((formData_parsed as any).mondayPriceWithGST),
      mondayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayAdultExtraGuestChargeWithGST),
      mondayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayChildExtraGuestChargeWithGST),
      mondayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).mondayInfantExtraGuestChargeWithGST),
      mondayGSTslab: nullToUndefined((formData_parsed as any).mondayGSTslab),
      mondayMaxExtraGuestPrice: nullToUndefined(formData_parsed.mondayMaxExtraGuestPrice),
      mondayMaxTotal: nullToUndefined(formData_parsed.mondayMaxTotal),
      tuesdayPriceWithGST: nullToUndefined((formData_parsed as any).tuesdayPriceWithGST),
      tuesdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayAdultExtraGuestChargeWithGST),
      tuesdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayChildExtraGuestChargeWithGST),
      tuesdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).tuesdayInfantExtraGuestChargeWithGST),
      tuesdayGSTslab: nullToUndefined((formData_parsed as any).tuesdayGSTslab),
      tuesdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.tuesdayMaxExtraGuestPrice),
      tuesdayMaxTotal: nullToUndefined(formData_parsed.tuesdayMaxTotal),
      wednesdayPriceWithGST: nullToUndefined((formData_parsed as any).wednesdayPriceWithGST),
      wednesdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayAdultExtraGuestChargeWithGST),
      wednesdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayChildExtraGuestChargeWithGST),
      wednesdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).wednesdayInfantExtraGuestChargeWithGST),
      wednesdayGSTslab: nullToUndefined((formData_parsed as any).wednesdayGSTslab),
      wednesdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.wednesdayMaxExtraGuestPrice),
      wednesdayMaxTotal: nullToUndefined(formData_parsed.wednesdayMaxTotal),
      thursdayPriceWithGST: nullToUndefined((formData_parsed as any).thursdayPriceWithGST),
      thursdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayAdultExtraGuestChargeWithGST),
      thursdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayChildExtraGuestChargeWithGST),
      thursdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).thursdayInfantExtraGuestChargeWithGST),
      thursdayGSTslab: nullToUndefined((formData_parsed as any).thursdayGSTslab),
      thursdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.thursdayMaxExtraGuestPrice),
      thursdayMaxTotal: nullToUndefined(formData_parsed.thursdayMaxTotal),
      fridayPriceWithGST: nullToUndefined((formData_parsed as any).fridayPriceWithGST),
      fridayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayAdultExtraGuestChargeWithGST),
      fridayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayChildExtraGuestChargeWithGST),
      fridayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).fridayInfantExtraGuestChargeWithGST),
      fridayGSTslab: nullToUndefined((formData_parsed as any).fridayGSTslab),
      fridayMaxExtraGuestPrice: nullToUndefined(formData_parsed.fridayMaxExtraGuestPrice),
      fridayMaxTotal: nullToUndefined(formData_parsed.fridayMaxTotal),
      saturdayPriceWithGST: nullToUndefined((formData_parsed as any).saturdayPriceWithGST),
      saturdayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayAdultExtraGuestChargeWithGST),
      saturdayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayChildExtraGuestChargeWithGST),
      saturdayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).saturdayInfantExtraGuestChargeWithGST),
      saturdayGSTslab: nullToUndefined((formData_parsed as any).saturdayGSTslab),
      saturdayMaxExtraGuestPrice: nullToUndefined(formData_parsed.saturdayMaxExtraGuestPrice),
      saturdayMaxTotal: nullToUndefined(formData_parsed.saturdayMaxTotal),
      sundayPriceWithGST: nullToUndefined((formData_parsed as any).sundayPriceWithGST),
      sundayAdultExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayAdultExtraGuestChargeWithGST),
      sundayChildExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayChildExtraGuestChargeWithGST),
      sundayInfantExtraGuestChargeWithGST: nullToUndefined((formData_parsed as any).sundayInfantExtraGuestChargeWithGST),
      sundayGSTslab: nullToUndefined((formData_parsed as any).sundayGSTslab),
      sundayMaxExtraGuestPrice: nullToUndefined(formData_parsed.sundayMaxExtraGuestPrice),
      sundayMaxTotal: nullToUndefined(formData_parsed.sundayMaxTotal),

      mondayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingAdultExtraGuestCharge),
      mondayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingChildExtraGuestCharge),
      mondayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.mondayFloatingInfantExtraGuestCharge),
      mondayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingAdultExtraGuestChargeWithGST),
      mondayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingChildExtraGuestChargeWithGST),
      mondayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.mondayFloatingInfantExtraGuestChargeWithGST),
      tuesdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingAdultExtraGuestCharge),
      tuesdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingChildExtraGuestCharge),
      tuesdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.tuesdayFloatingInfantExtraGuestCharge),
      tuesdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingAdultExtraGuestChargeWithGST),
      tuesdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingChildExtraGuestChargeWithGST),
      tuesdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.tuesdayFloatingInfantExtraGuestChargeWithGST),
      wednesdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingAdultExtraGuestCharge),
      wednesdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingChildExtraGuestCharge),
      wednesdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.wednesdayFloatingInfantExtraGuestCharge),
      wednesdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingAdultExtraGuestChargeWithGST),
      wednesdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingChildExtraGuestChargeWithGST),
      wednesdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.wednesdayFloatingInfantExtraGuestChargeWithGST),
      thursdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingAdultExtraGuestCharge),
      thursdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingChildExtraGuestCharge),
      thursdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.thursdayFloatingInfantExtraGuestCharge),
      thursdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingAdultExtraGuestChargeWithGST),
      thursdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingChildExtraGuestChargeWithGST),
      thursdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.thursdayFloatingInfantExtraGuestChargeWithGST),
      fridayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingAdultExtraGuestCharge),
      fridayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingChildExtraGuestCharge),
      fridayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.fridayFloatingInfantExtraGuestCharge),
      fridayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingAdultExtraGuestChargeWithGST),
      fridayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingChildExtraGuestChargeWithGST),
      fridayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.fridayFloatingInfantExtraGuestChargeWithGST),
      saturdayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingAdultExtraGuestCharge),
      saturdayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingChildExtraGuestCharge),
      saturdayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.saturdayFloatingInfantExtraGuestCharge),
      saturdayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingAdultExtraGuestChargeWithGST),
      saturdayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingChildExtraGuestChargeWithGST),
      saturdayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.saturdayFloatingInfantExtraGuestChargeWithGST),
      sundayFloatingAdultExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingAdultExtraGuestCharge),
      sundayFloatingChildExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingChildExtraGuestCharge),
      sundayFloatingInfantExtraGuestCharge: nullToUndefined(formData_parsed.sundayFloatingInfantExtraGuestCharge),
      sundayFloatingAdultExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingAdultExtraGuestChargeWithGST),
      sundayFloatingChildExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingChildExtraGuestChargeWithGST),
      sundayFloatingInfantExtraGuestChargeWithGST: nullToUndefined(formData_parsed.sundayFloatingInfantExtraGuestChargeWithGST),

      // Property details
      bedroomCount: nullToUndefined(formData_parsed.bedroomCount),
      bathroomCount: nullToUndefined(formData_parsed.bathroomCount),
      doubleBedCount: nullToUndefined(formData_parsed.doubleBedCount),
      singleBedCount: nullToUndefined(formData_parsed.singleBedCount),
      mattressCount: nullToUndefined(formData_parsed.mattressCount),
      baseGuestCount: nullToUndefined(formData_parsed.baseGuestCount),
      maxGuestCount: nullToUndefined(formData_parsed.maxGuestCount),
      bookingType: nullToUndefined(formData_parsed.bookingType),
      checkinTime: nullToUndefined(formData_parsed.checkinTime),
      checkoutTime: nullToUndefined(formData_parsed.checkoutTime),

      // Location
      latitude: nullToUndefined(formData_parsed.latitude),
      longitude: nullToUndefined(formData_parsed.longitude),
      mapLink: nullToUndefined(formData_parsed.mapLink),
      address: formData_parsed.address || undefined,
      landmark: nullToUndefined(formData_parsed.landmark),
      // Pass null explicitly when clearing area so API updates DB; nullToUndefined would omit and leave old value
      areaId: formData_parsed.areaId,
      secondaryAreaId1: formData_parsed.secondaryAreaId1,
      secondaryAreaId2: formData_parsed.secondaryAreaId2,
      secondaryAreaId3: formData_parsed.secondaryAreaId3,
      secondaryAreaId4: formData_parsed.secondaryAreaId4,
      cityId: nullToUndefined(formData_parsed.cityId),
      stateId: nullToUndefined(formData_parsed.stateId),
      pincode: nullToUndefined(formData_parsed.pincode),
      googlePlaceId: nullToUndefined(formData_parsed.googlePlaceId),
      googlePlaceRating: nullToUndefined(formData_parsed.googlePlaceRating),
      googlePlaceUserRatingCount: nullToUndefined(formData_parsed.googlePlaceUserRatingCount),
      googlePlaceReviews: formData.get("googlePlaceReviews") ? JSON.parse(formData.get("googlePlaceReviews")?.toString() || "[]") : undefined,
      nearbyPlaces: formData.get("nearbyPlaces") ? JSON.parse(formData.get("nearbyPlaces")?.toString() || "[]") : undefined,
      propertyTypeId: nullToUndefined(formData_parsed.propertyTypeId),
      slug: nullToUndefined(formData_parsed.slug),
      showOnInstafarms: nullToUndefined(formData_parsed.showOnInstafarms),
      isDisabled: nullToUndefined(formData_parsed.isDisabled),

      // External sync

      // Property settings
      requiresConfirmation: formData_parsed.requiresConfirmation ?? false,
      advancePaymentEnabled: formData_parsed.advancePaymentEnabled ?? false,
      advancePaymentAmount: nullToUndefined(formData_parsed.advancePaymentAmount),
      advancePaymentPercentage: nullToUndefined(formData_parsed.advancePaymentPercentage),
      enableFloatingGuests: formData_parsed.enableFloatingGuests ?? false,

      // Map relationships with weight (isPaid and isUSP are on amenity/activity table, not relationship)
      amenities: amenitiesData.data.map((a) => ({
        id: a.id,
        weight: a.weight ?? null,
      })),
      activities: activitiesData.data.map((a) => ({
        id: a.id,
        weight: a.weight ?? null,
      })),
      safetyHygiene: Array.isArray(safetyHygieneData)
        ? safetyHygieneData.map((sh: { id?: string; safetyHygieneId?: string }) => ({
            safetyHygieneId: sh.safetyHygieneId || sh.id,
          })).filter((x: any) => Boolean(x.safetyHygieneId))
        : undefined,

      // Special dates
      specialDates: specialDatesData.data?.map((sd) => ({
        date: sd.date,
        price: nullToUndefined(sd.price),
        priceWithGST: nullToUndefined(sd.priceWithGST),
        adultExtraGuestCharge: nullToUndefined(sd.adultExtraGuestCharge),
        adultExtraGuestChargeWithGST: nullToUndefined(sd.adultExtraGuestChargeWithGST),
        childExtraGuestCharge: nullToUndefined(sd.childExtraGuestCharge),
        childExtraGuestChargeWithGST: nullToUndefined(sd.childExtraGuestChargeWithGST),
        infantExtraGuestCharge: nullToUndefined(sd.infantExtraGuestCharge),
        infantExtraGuestChargeWithGST: nullToUndefined(sd.infantExtraGuestChargeWithGST),
        floatingAdultExtraGuestCharge: nullToUndefined(sd.floatingAdultExtraGuestCharge),
        floatingAdultExtraGuestChargeWithGST: nullToUndefined(sd.floatingAdultExtraGuestChargeWithGST),
        floatingChildExtraGuestCharge: nullToUndefined(sd.floatingChildExtraGuestCharge),
        floatingChildExtraGuestChargeWithGST: nullToUndefined(sd.floatingChildExtraGuestChargeWithGST),
        floatingInfantExtraGuestCharge: nullToUndefined(sd.floatingInfantExtraGuestCharge),
        floatingInfantExtraGuestChargeWithGST: nullToUndefined(sd.floatingInfantExtraGuestChargeWithGST),
        baseGuestCount: nullToUndefined(sd.baseGuestCount),
        discount: nullToUndefined(sd.discount),
        maxExtraGuestPrice: nullToUndefined(sd.maxExtraGuestPrice),
        maxTotal: nullToUndefined(sd.maxTotal),
        gstSlab: nullToUndefined(sd.gstSlab),
      })) || [],

      // User relationships
      owners: ownersData.map((o: any) => ({ id: o.id })),
      managers: managersData.map((m: any) => ({ id: m.id })),
      caretakers: caretakersData.map((c: any) => ({ id: c.id })),

      // Plans
      discountPlan: discountPlansData.length > 0 ? { id: discountPlansData[0].id } : undefined,
      shortTermCancellationPlan: cancellationPlansData.find((p: any) => p.type === 'shortterm') ? { id: cancellationPlansData.find((p: any) => p.type === 'shortterm').id } : undefined,
      longTermCancellationPlan: cancellationPlansData.find((p: any) => p.type === 'longterm') ? { id: cancellationPlansData.find((p: any) => p.type === 'longterm').id } : undefined,

      // Gallery - omit when skipGalleryAndCover (Update Property does not touch photos/cover)
      ...(skipGalleryAndCover ? {} : { gallery: mapGalleryToService(galleriesData.data) }),

      // Summary (description), rules, booking policy
      description: formData_parsed.description ?? "",
      bookingPolicy: formData_parsed.bookingPolicy ?? "",
      homeRulesTruths: formData_parsed.homeRulesTruths ?? undefined,

      // Others
      bedding_availability: parseOptionalJsonField(formData, "bedding_availability"),
      experiences: parseOptionalJsonField(formData, "experiences"),
      nearbyAttractions: parseOptionalJsonField(formData, "nearbyAttractions"),
      foodOptions: parseOptionalJsonField(formData, "foodOptions"),
      miscCharges: parseOptionalJsonField(formData, "miscCharges"),
      faqs: parseOptionalJsonField(formData, "faqs"),
      meta:
        parseOptionalJsonField(formData, "meta") ??
        (formData.get("metaTitle") ||
        formData.get("metaUrl") ||
        formData.get("metaDescription") ||
        formData.get("metaKeyword")
          ? {
              metaTitle: formData.get("metaTitle")?.toString() || "",
              metaUrl: formData.get("metaUrl")?.toString() || "",
              metaDescription: formData.get("metaDescription")?.toString() || "",
              metaKeyword: formData.get("metaKeyword")?.toString() || "",
            }
          : undefined),
      spaces: formData.get("spaces")
        ? (JSON.parse(formData.get("spaces")?.toString() || "[]") as any[]).map((space, index) => ({
            id: space.id || space.spaceId || undefined,
            spaceId: space.spaceId || space.id || undefined,
            name: space.name || space.spaceName || space.title || `Space ${index + 1}`,
            photo: space.photo ?? "",
            title: space.title || space.name || space.spaceName || `Space ${index + 1}`,
            description: space.description || "",
          }))
        : undefined,
      // Audit system fields
      propertyManagementType: formData_parsed.propertyManagementType,
      auditEnabled: formData_parsed.auditEnabled,
      maxAuditGapDays: formData_parsed.maxAuditGapDays,
      auditComplianceStatus: formData_parsed.auditComplianceStatus,
    };

    console.log("[editProperty] payload:", payload);

    // console.log('📤 [editProperty] Payload gallery count:', payload.gallery.length);
    // if (payload.gallery.length > 0) {
    //   console.log('📤 [editProperty] First gallery in payload:', payload.gallery[0]);
    // }

    // Call backend API
    const result = await apiPatch(`/api/properties/${propertyId}`, payload, {
      token,
    });

    console.log('📥 [editProperty] API response:', result);

    if (!result.success) {
      throw new Error(result.message || 'Failed to update property');
    }

    const updatedProperty = (result as any)?.data || {};

    const rawSlug = formData_parsed.slug || updatedProperty.slug;
    const slugForRevalidation =
      typeof rawSlug === "string" ? rawSlug.trim().replace(/\.html$/i, "") : "";

    const rawState = updatedProperty.stateSlug || updatedProperty.state;
    const rawCity = updatedProperty.citySlug || updatedProperty.city;
    const rawArea = updatedProperty.areaSlug || updatedProperty.area;
    const rawPropertySlug = updatedProperty.slug || formData_parsed.slug;

    const stateForRevalidation =
      typeof rawState === "string" ? rawState.trim().replace(/^\/+|\/+$/g, "") : "telangana";
    const cityForRevalidation =
      typeof rawCity === "string" ? rawCity.trim().replace(/^\/+|\/+$/g, "") : "hyderabad";
    const areaForRevalidation =
      typeof rawArea === "string" ? rawArea.trim().replace(/^\/+|\/+$/g, "") : "farmhouses-in-moinabad";
    const propertySlugForRevalidation =
      typeof rawPropertySlug === "string"
        ? rawPropertySlug.trim().replace(/\.html$/i, "").replace(/^\/+|\/+$/g, "")
        : "";

    console.log("[editProperty] Revalidation payload values", {
      propertyId,
      slugForRevalidation,
      stateForRevalidation,
      cityForRevalidation,
      areaForRevalidation,
      propertySlugForRevalidation,
      revalidationUrl: WEBSITE_REVALIDATION_URL,
    });

    if (slugForRevalidation) {
      try {
        const revalidationPayload = {
          slug: slugForRevalidation,
          state: stateForRevalidation,
          city: cityForRevalidation,
          area: areaForRevalidation,
          propertySlug: propertySlugForRevalidation,
          secret: WEBSITE_REVALIDATION_SECRET,
        };

        console.log("[editProperty] Revalidation request payload", {
          propertyId,
          ...revalidationPayload,
        });

        const revalidationResponse = await fetch(WEBSITE_REVALIDATION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(revalidationPayload),
          cache: "no-store",
        });

        const revalidationBody = await revalidationResponse
          .json()
          .catch(() => null);

        console.log("[editProperty] Revalidation response", {
          propertyId,
          slugForRevalidation,
          status: revalidationResponse.status,
          ok: revalidationResponse.ok,
          body: revalidationBody,
        });

        if (!revalidationResponse.ok) {
          console.error("[editProperty] Revalidation request failed", {
            propertyId,
            slugForRevalidation,
            status: revalidationResponse.status,
          });
        }
      } catch (revalidationError) {
        console.error("[editProperty] Revalidation request error", {
          propertyId,
          slugForRevalidation,
          revalidationError,
        });
        captureError(revalidationError);
      }
    } else {
      console.warn("[editProperty] Skipping website revalidation: slug is empty", {
        propertyId,
        rawSlug,
        rawState,
        rawCity,
        rawArea,
        rawPropertySlug,
      });
    }

    // Update amenities with isPaid, isUSP, and weight
    for (const amenity of amenitiesData.data) {
      try {
        await apiPatch(`/api/amenities/${amenity.id}`, {
          type: "amenities",
          isPaid: amenity.isPaid ?? false,
          isUSP: amenity.isUSP ?? false,
          weight: amenity.weight ?? null,
        }, { token });
      } catch (err) {
        console.error(`Failed to update amenity ${amenity.id}:`, err);
        captureError(err);
        // Continue with other amenities even if one fails
      }
    }

    // Update activities with isPaid, isUSP, and weight
    for (const activity of activitiesData.data) {
      try {
        await apiPatch(`/api/amenities/${activity.id}?type=activities`, {
          type: "activities",
          isPaid: activity.isPaid ?? false,
          isUSP: activity.isUSP ?? false,
          weight: activity.weight ?? null,
        }, { token });
      } catch (err) {
        console.error(`Failed to update activity ${activity.id}:`, err);
        captureError(err);
        // Continue with other activities even if one fails
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    if (propertyId) revalidatePath(`/admin/properties/${propertyId}`);
    return { success: "Saved Property data." };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const deleteProperty = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    if (!id) {
      throw new Error("Invalid id.");
    }

    // Fetch slug before disabling — property won't be fetchable after disable
    let slugHint: string | undefined;
    try {
      for (const ep of [`/api/properties/admin/${id}/full`, `/api/properties/${id}/full`, `/api/properties/${id}`]) {
        const res = await apiGet<any>(ep, { token });
        const s = _normalizeRevalidationSource(res);
        const candidate = _pickStr(s?.slug, s?.propertySlug, s?.entitySlug);
        if (candidate) { slugHint = candidate; break; }
      }
    } catch { /* proceed without slug */ }

    await apiPatch(
      `/api/properties/${id}`,
      { isDisabled: true },
      { token }
    );

    await triggerWebsiteRevalidation(id, token, "deleteProperty", slugHint);

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${id}`);
    return { success: "Property disabled successfully." };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const deleteSplitProperty = async (id: string): Promise<ServerActionResult> => {
  const res = await deleteProperty(id);
  // Split list is a separate route; ensure it refreshes.
  revalidatePath("/admin/properties/split-properties");
  return res;
};

export const deleteMergedProperty = async (mergedPropertyId: string): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    if (!mergedPropertyId) {
      throw new Error("Invalid mergedPropertyId.");
    }

    await apiPost(
      "/api/properties/admin/delete-merged-property",
      { mergedPropertyId },
      { token }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath("/admin/properties/merge-properties");
    return { success: "Merged property deleted successfully." };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const getPropertyById = async (
  id: string,
  options?: { appType?: string },
): Promise<ServerSearchResult<any>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiGet<{ success?: boolean; data?: any }>(`/api/properties/${id}`, {
      token,
      appType: options?.appType,
    });

    if (!result.success && !result.data) {
      throw new Error('Property not found');
    }

    return { data: result.data };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const searchProperty = async (
  formData: FormData,
  options?: { appType?: string },
): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const searchKeys = ["Property Name", "Property Code"] as const;
    const searchKey = searchKeys.find(
      (x) => x === formData.get("searchKey")?.toString(),
    );
    const searchValue = formData.get("searchValue")?.toString();
    const brandId = formData.get("brandId")?.toString();

    if (!searchValue) {
      return { data: [] };
    }

    if (!searchKey) {
      throw new Error("Invalid search key.");
    }

    // Map to backend expected values: backend expects "propertyName"/"propertyCode"
    // even though we're searching entities (the endpoint searches propertyDetailView which includes entity data)
    const searchBy = searchKey === "Property Name" ? "propertyName" : "propertyCode";

    const response = await apiPost("/api/properties/admin/search", {
      searchBy,
      searchKey: searchValue,
      perPage: 5,
      ...(brandId ? { brandId } : {}),
    }, { token, appType: options?.appType });

    if (!response.success) {
      throw new Error(response.error || "Failed to search properties");
    }

    return { data: response.data || response.list || [] };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const togglePropertyStatus = async (
  propertyId: string,
  isLive: boolean
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiPatch<{ success: boolean; message?: string }>(`/api/properties/${propertyId}`, {
      isDisabled: !isLive,
    }, {
      token,
    });

    if (!result.success) {
      throw new Error(result.message || 'Failed to toggle status');
    }

    const normalizeRevalidationSource = (response: any) => {
      const top = response?.data ?? response;
      if (top?.property && typeof top.property === "object") {
        return top.property;
      }
      if (top?.detail && typeof top.detail === "object") {
        return top.detail;
      }
      if (top?.tabs?.detail && typeof top.tabs.detail === "object") {
        return {
          ...top.tabs.detail,
          ...(top.tabs.others && typeof top.tabs.others === "object" ? top.tabs.others : {}),
        };
      }
      return top;
    };

    const updatedProperty = normalizeRevalidationSource(result as any) || {};
    let revalidationSource = updatedProperty;

    const pickString = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
        }
      }
      return undefined;
    };

    let resolvedSlug = pickString(
      revalidationSource?.slug,
      revalidationSource?.propertySlug,
      revalidationSource?.entitySlug
    );

    if (!resolvedSlug) {
      try {
        for (const endpoint of PROPERTY_FULL_ROUTE_CANDIDATES(propertyId)) {
          try {
            const propertyFull = await apiGet<{ success?: boolean; data?: any }>(endpoint, {
              token,
            });
            const propertyFullSource = normalizeRevalidationSource(propertyFull);
            if (propertyFullSource) {
              revalidationSource = propertyFullSource;
              resolvedSlug = pickString(
                revalidationSource?.slug,
                revalidationSource?.propertySlug,
                revalidationSource?.entitySlug
              );
              if (resolvedSlug) break;
            }
          } catch {
            // Try next endpoint candidate.
          }
        }
      } catch (propertyFullError) {
        console.warn("[togglePropertyStatus] Failed to fetch /full property details for revalidation", {
          propertyId,
          propertyFullError,
        });
        captureError(propertyFullError);
      }
    }

    if (!resolvedSlug) {
      try {
        const propertyDetails = await apiGet<{ success?: boolean; data?: any }>(`/api/properties/${propertyId}`, {
          token,
        });
        const propertyDetailsSource = normalizeRevalidationSource(propertyDetails);
        if (propertyDetailsSource) {
          revalidationSource = propertyDetailsSource;
          resolvedSlug = pickString(
            revalidationSource?.slug,
            revalidationSource?.propertySlug,
            revalidationSource?.entitySlug
          );
        }
      } catch (propertyDetailsError) {
        console.warn("[togglePropertyStatus] Failed to fetch property details for revalidation", {
          propertyId,
          propertyDetailsError,
        });
        captureError(propertyDetailsError);
      }
    }

    const rawSlug = resolvedSlug;
    const slugForRevalidation =
      typeof rawSlug === "string" ? rawSlug.trim().replace(/\.html$/i, "") : "";

    const rawState = pickString(
      revalidationSource?.stateSlug,
      revalidationSource?.state_slug,
      revalidationSource?.state,
      revalidationSource?.address_details?.state_slug
    );
    const rawCity = pickString(
      revalidationSource?.citySlug,
      revalidationSource?.city_slug,
      revalidationSource?.city,
      revalidationSource?.address_details?.city_slug
    );
    const rawArea = pickString(
      revalidationSource?.areaSlug,
      revalidationSource?.area_slug,
      revalidationSource?.area,
      revalidationSource?.address_details?.area_slug
    );
    const rawPropertySlug = pickString(
      revalidationSource?.slug,
      revalidationSource?.propertySlug,
      revalidationSource?.entitySlug
    );

    const stateForRevalidation =
      typeof rawState === "string" ? rawState.trim().replace(/^\/+|\/+$/g, "") : "telangana";
    const cityForRevalidation =
      typeof rawCity === "string" ? rawCity.trim().replace(/^\/+|\/+$/g, "") : "hyderabad";
    const areaForRevalidation =
      typeof rawArea === "string" ? rawArea.trim().replace(/^\/+|\/+$/g, "") : "farmhouses-in-moinabad";
    const propertySlugForRevalidation =
      typeof rawPropertySlug === "string"
        ? rawPropertySlug.trim().replace(/\.html$/i, "").replace(/^\/+|\/+$/g, "")
        : "";

    if (slugForRevalidation) {
      try {
        const revalidationPayload = {
          slug: slugForRevalidation,
          state: stateForRevalidation,
          city: cityForRevalidation,
          area: areaForRevalidation,
          propertySlug: propertySlugForRevalidation,
          secret: WEBSITE_REVALIDATION_SECRET,
        };

        await fetch(WEBSITE_REVALIDATION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(revalidationPayload),
          cache: "no-store",
        });
      } catch (revalidationError) {
        console.error("[togglePropertyStatus] Revalidation request error", {
          propertyId,
          slugForRevalidation,
          revalidationError,
        });
        captureError(revalidationError);
      }
    } else {
      console.warn("[togglePropertyStatus] Skipping website revalidation: slug is empty", {
        propertyId,
        rawSlug,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    if (propertyId) revalidatePath(`/admin/properties/${propertyId}`);
    return { success: `Property is now ${isLive ? "Live" : "Disabled"}` };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const togglePropertyBrandStatus = async (
  propertyId: string,
  brandId: string,
  brandName: string,
  isActive: boolean
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiPatch<{ success: boolean; message?: string }>(
      `/api/properties/admin/${propertyId}/brand-status`,
      {
        brandId,
        isActive,
      },
      {
        token,
      }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to update brand status");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    if (propertyId) revalidatePath(`/admin/properties/${propertyId}`);
    return { success: `${brandName} is now ${isActive ? "Live" : "Disabled"}` };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const togglePropertyAuditConfigLock = async (
  propertyId: string,
  isLocked: boolean,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    const result = await apiPatch<{ success: boolean; message?: string }>(
      `/api/properties/admin/${propertyId}/audit-config-lock`,
      { isLocked },
      { token },
    );
    if (!result.success) throw new Error(result.message || "Failed to update audit lock");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: isLocked ? "Audit setup locked" : "Audit setup unlocked" };
  } catch (err: any) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Server Error." };
  }
};

export const recoverProperty = async (
  id: string,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    if (!id) {
      throw new Error("Invalid id.");
    }

    await apiPatch(
      `/api/properties/${id}`,
      {
        isDisabled: false,
      },
      {
        token,
      }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${id}`);
    return { success: "Property recovered successfully." };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const fetchPropertiesPaginated = async (params: {
  includeDeletedOnly?: boolean;
  limit: number;
  offset: number;
  searchBy?: string;
  searchKey?: string;
  areaId?: string;
  brandId?: string;
}): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const { includeDeletedOnly = false, limit, offset, searchBy, searchKey, areaId, brandId } = params;

    const payload: any = {
      includeDeletedOnly,
      perPage: limit,
      pageNumber: Math.floor(offset / limit) + 1,
    };

    if (searchBy && searchKey) {
      payload.searchBy = searchBy;
      payload.searchKey = searchKey;
    }

    if (areaId) {
      payload.searchBy = "location";
      payload.searchKey = areaId;
    }

    if (brandId) {
      payload.brandId = brandId;
    }

    // Admin list uses a lightweight admin-specific endpoint
    // to avoid returning heavy aggregated fields.
    const result = await apiPost<{ success: boolean; data?: any[]; message?: string }>("/api/properties/admin/paginate", payload, {
      token,
    });

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch properties');
    }
    return { data: result.data || [] };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export interface SplitPropertyMappingRow {
  parentPropertyId: string;
  childPropertyId: string;
  parentProperty: {
    id: string;
    propertyName: string;
    name?: string;
    heading?: string;
    propertyCodeName?: string | null;
    propertyCode: string;
    area?: string | null;
    city?: string | null;
    state?: string | null;
    isDisabled?: boolean;
    is_disabled?: boolean;
  } | null;
  childProperty: {
    id: string;
    propertyName: string;
    name?: string;
    heading?: string;
    propertyCodeName?: string | null;
    propertyCode: string;
    area?: string | null;
    city?: string | null;
    state?: string | null;
    isDisabled?: boolean;
    is_disabled?: boolean;
  } | null;
}

export type SplitSectionKey = PropertySectionKey;

export type SplitSectionMode = "INHERIT" | "CUSTOM";

export interface CreateSplitPropertyPayload {
  parentPropertyId: string;
  sectionModes: Record<SplitSectionKey, SplitSectionMode>;
  customOverrides: Record<string, unknown>;
}

export interface MergedPropertyMappingRow {
  mergedPropertyId: string;
  mergedProperty: {
    id: string;
    propertyName: string;
    name?: string;
    heading?: string;
    propertyCodeName?: string | null;
    propertyCode: string;
    area?: string | null;
    city?: string | null;
    state?: string | null;
    isDisabled?: boolean;
    is_disabled?: boolean;
  } | null;
  constituentProperties: Array<{
    id: string;
    propertyName: string;
    name?: string;
    heading?: string;
    propertyCodeName?: string | null;
    propertyCode: string;
    area?: string | null;
    city?: string | null;
    state?: string | null;
    isDisabled?: boolean;
    is_disabled?: boolean;
  }>;
}

export type MergeSectionKey = SplitSectionKey;
export type MergeSectionMode = "INHERIT" | "CUSTOM";

export interface CreateMergedPropertyPayload {
  primaryPropertyId: string;
  /**
   * Backward-compatible: older payloads used PRIMARY/SECONDARY sources.
   * New merge wizard uses per-section propertyId sources; `secondaryPropertyId` is optional.
   */
  secondaryPropertyId?: string;
  constituentPropertyIds: string[];
  sectionModes: Record<MergeSectionKey, MergeSectionMode>;
  /** For each section, which constituent propertyId is the source. */
  sectionSources: Record<MergeSectionKey, string>;
  customOverrides: Record<string, unknown>;
}

export const fetchSplitPropertyMappingsPaginated = async (params: {
  limit: number;
  offset: number;
}): Promise<ServerSearchResult<SplitPropertyMappingRow[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const { limit, offset } = params;
    const payload = {
      perPage: limit,
      pageNumber: Math.floor(offset / limit) + 1,
    };

    const result = await apiPost<{ success: boolean; data?: SplitPropertyMappingRow[]; message?: string }>(
      "/api/properties/admin/split-mappings",
      payload,
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch split property mappings");
    }

    return { data: result.data || [] };
  } catch (err: any) {
    console.log("Error: ", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Server Error." };
  }
};

export const fetchDisabledSplitMappings = async (): Promise<ServerSearchResult<SplitPropertyMappingRow[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const result = await apiPost<{ success: boolean; data?: SplitPropertyMappingRow[]; message?: string }>(
      "/api/properties/admin/split-mappings",
      { perPage: 500, pageNumber: 1, includeDisabledOnly: true },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch disabled split mappings");
    }

    return { data: result.data || [] };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export const createSplitProperty = async (
  payload: CreateSplitPropertyPayload
): Promise<ServerActionResult<{ childPropertyId: string; parentPropertyId: string }>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const response = await apiPost<{
      success?: boolean;
      data?: { childPropertyId: string; parentPropertyId: string };
      message?: string;
      error?: string;
    }>(
      "/api/properties/admin/create-split-property",
      payload,
      { token }
    );

    if (response?.success === false) {
      return { error: response?.error || response?.message || "Failed to create split property" };
    }

    return {
      success: response?.message || "Split property created successfully",
      data: response?.data,
    };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export interface SplitMappingByChildPayload {
  childPropertyId: string;
}

export interface SplitMappingByChildResult {
  parentPropertyId: string;
  parentProperty: any | null;
  childProperty: any | null;
}

export const fetchSplitMappingByChildId = async (
  payload: SplitMappingByChildPayload
): Promise<ServerActionResult<SplitMappingByChildResult>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const response = await apiPost<{
      success: boolean;
      data?: SplitMappingByChildResult;
      message?: string;
      error?: string;
    }>("/api/properties/admin/split-mapping/by-child", payload, { token });

    if (response?.success === false) {
      return { error: response?.error || response?.message || "Failed to fetch split mapping" };
    }

    return {
      success: response?.message || "Split mapping fetched successfully",
      data: response.data as SplitMappingByChildResult,
    };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export interface UpdateSplitPropertyPayload {
  childPropertyId: string;
  parentPropertyId?: string;
  sectionModes: Record<SplitSectionKey, SplitSectionMode>;
  customOverrides: Record<string, unknown>;
}

export const updateSplitProperty = async (
  payload: UpdateSplitPropertyPayload
): Promise<ServerActionResult<{ childPropertyId: string; parentPropertyId: string }>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const response = await apiPost<{
      success: boolean;
      data?: { childPropertyId: string; parentPropertyId: string };
      message?: string;
      error?: string;
    }>("/api/properties/admin/update-split-property", payload, { token });

    if (response?.success === false) {
      return { error: response?.error || response?.message || "Failed to update split property" };
    }

    return {
      success: response?.message || "Split property updated successfully",
      data: response.data,
    };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export const fetchMergedPropertyMappingsPaginated = async (params: {
  limit: number;
  offset: number;
}): Promise<ServerSearchResult<MergedPropertyMappingRow[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const { limit, offset } = params;
    const payload = {
      perPage: limit,
      pageNumber: Math.floor(offset / limit) + 1,
    };

    const result = await apiPost<{ success: boolean; data?: MergedPropertyMappingRow[]; message?: string }>(
      "/api/properties/admin/merge-mappings",
      payload,
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch merged property mappings");
    }

    return { data: result.data || [] };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Server Error." };
  }
};

export const fetchDisabledMergeMappings = async (): Promise<ServerSearchResult<MergedPropertyMappingRow[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const result = await apiPost<{ success: boolean; data?: MergedPropertyMappingRow[]; message?: string }>(
      "/api/properties/admin/merge-mappings",
      { perPage: 500, pageNumber: 1, includeDisabledOnly: true },
      { token }
    );

    if (!result.success) {
      throw new Error(result.message || "Failed to fetch archived merge mappings");
    }

    return { data: result.data || [] };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export const createMergedProperty = async (
  payload: CreateMergedPropertyPayload
): Promise<ServerActionResult<{ mergedPropertyId: string; constituentPropertyIds: string[] }>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const response = await apiPost<{
      success?: boolean;
      data?: { mergedPropertyId: string; constituentPropertyIds: string[] };
      message?: string;
      error?: string;
    }>(
      "/api/properties/admin/create-merged-property",
      payload,
      { token }
    );

    if (response?.success === false) {
      return { error: response?.error || response?.message || "Failed to create merged property" };
    }

    return {
      success: response?.message || "Merge property created successfully",
      data: response?.data,
    };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) return { error: err.message };
    return { error: "Server Error." };
  }
};

export type PropertySelectorOption = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
  city?: string | null;
  area?: string | null;
};

const toSelectorOptions = (rows: any[]): PropertySelectorOption[] => {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .filter((p) => p && typeof p === "object" && typeof p.id === "string")
    .map((p: any) => ({
      id: String(p.id),
      propertyName: p.propertyName ?? p.name ?? p.heading ?? undefined,
      propertyCode: p.propertyCode ?? undefined,
      city: p.city ?? null,
      area: p.area ?? null,
    }));
};

export const fetchPropertiesForSelectorInitial = async (
  limit = 50
): Promise<ServerActionResult<PropertySelectorOption[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", data: [] };
    const response = await apiPost<{ success?: boolean; data?: any[]; list?: any[]; message?: string }>(
      "/api/properties/admin/paginate",
      { perPage: Math.min(200, Math.max(1, limit)), pageNumber: 1 },
      { token }
    );
    if (response?.success === false) {
      return { error: response?.message || "Failed to fetch properties", data: [] };
    }
    return { success: "Properties fetched successfully", data: toSelectorOptions(response?.data || response?.list || []) };
  } catch (err: any) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Server Error.", data: [] };
  }
};

export const searchPropertiesForSelector = async (payload: {
  query: string;
  includeIds?: string[];
  limit?: number;
}): Promise<ServerActionResult<PropertySelectorOption[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", data: [] };

    const q = String(payload?.query || "").trim();
    const includeIds = Array.isArray(payload?.includeIds) ? payload.includeIds.filter(Boolean) : [];
    const perPage = Math.min(50, Math.max(1, payload?.limit ?? 20));

    let searchResults: any[] = [];
    if (q) {
      // Backend admin search only supports one field at a time; do both and merge.
      const [byName, byCode] = await Promise.all([
        apiPost("/api/properties/admin/search", { searchBy: "propertyName", searchKey: q, perPage }, { token }),
        apiPost("/api/properties/admin/search", { searchBy: "propertyCode", searchKey: q, perPage }, { token }),
      ]);

      const rowsA = (byName as any)?.data ?? (byName as any)?.list ?? [];
      const rowsB = (byCode as any)?.data ?? (byCode as any)?.list ?? [];
      searchResults = [...(Array.isArray(rowsA) ? rowsA : []), ...(Array.isArray(rowsB) ? rowsB : [])];
    }

    let includeRows: any[] = [];
    if (includeIds.length > 0) {
      const byIds = await apiPost("/api/properties/admin/by-ids", { ids: includeIds }, { token });
      includeRows = (byIds as any)?.data ?? (byIds as any)?.list ?? [];
    }

    const combined = [...searchResults, ...includeRows];
    const deduped = combined.filter((p, idx, arr) => idx === arr.findIndex((x) => x?.id && x.id === p?.id));
    return { success: "Properties fetched successfully", data: toSelectorOptions(deduped) };
  } catch (err: any) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Server Error.", data: [] };
  }
};

export const getAllPropertiesForSelector = async (
  brandName?: string,
  appType?: string
): Promise<ServerActionResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found", data: [] };
    }

    const response = await apiPost<{ success?: boolean; data?: any[]; list?: any[]; message?: string }>(
      "/api/properties/admin/paginate",
      { perPage: 1000, pageNumber: 1, brandName },
      { token, ...(appType ? { appType } : {}) }
    );

    if (response?.success === false) {
      return { error: response?.message || "Failed to fetch properties", data: [] };
    }

    const rawData = response?.data || response?.list || [];
    if (!Array.isArray(rawData)) {
      return { success: "Properties fetched successfully", data: [] };
    }

    const data = rawData.map((p: any) => ({
      ...p,
      entityName: p.propertyName,
      entityCode: p.propertyCode,
    }));

    return { success: "Properties fetched successfully", data };
  } catch (err: any) {
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message, data: [] };
    }
    return { error: "Server Error.", data: [] };
  }
};

const PROPERTY_FULL_DATA_TIMEOUT_MS = 30_000;

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const PROPERTY_FULL_ROUTE_CANDIDATES = (id: string) => [
  `/api/properties/admin/${id}/full`,
  `/api/properties/${id}/full`,
  `/api/jarvis-properties/${id}/full`,
];

export const fetchPropertyFullData = async (
  id: string,
  options?: {
    includeGallery?: boolean;
    appType?: string;
    brandId?: string;
  },
): Promise<ServerSearchResult<Record<string, unknown>>> => {
  const includeGallery = options?.includeGallery ?? true;
  const debugTag = `[fetchPropertyFullData][propertyId=${id}]`;
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    let result: { success?: boolean; data?: Record<string, unknown>; message?: string } | null = null;
    let lastError: unknown = null;

    for (const endpoint of PROPERTY_FULL_ROUTE_CANDIDATES(id)) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(
          () => controller.abort(),
          PROPERTY_FULL_DATA_TIMEOUT_MS,
        );
        const endpointWithQuery = `${endpoint}${buildQueryString({
          includeGallery: includeGallery ? undefined : false,
          brandId: options?.brandId,
        })}`;
        console.log(`${debugTag} Trying endpoint: ${endpointWithQuery}`);
        result = await apiGet<{ success?: boolean; data?: Record<string, unknown>; message?: string }>(
          endpointWithQuery,
          {
            token,
            signal: controller.signal,
            appType: options?.appType,
          }
        );
        console.log(`${debugTag} Data fetched from: ${endpointWithQuery}`);
        clearTimeout(timeoutId);
        break;
      } catch (routeError) {
        console.warn(`${debugTag} Endpoint failed: ${endpoint}`, routeError);
        captureError(routeError);
        lastError = routeError;
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    }

    if (!result) {
      throw lastError instanceof Error ? lastError : new Error("Failed to fetch full property data");
    }

    if (result.success === false) {
      throw new Error(result.message || "Failed to fetch full property data");
    }

    const responseData = asObjectRecord((result as any)?.data);
    const resultObject = asObjectRecord(result);
    const fallbackData = asObjectRecord(resultObject?.data);

    let actualData: Record<string, unknown> = {};

    // Canonical shape: /admin/:id/full returns tab payload directly in `data`.
    if (responseData) {
      actualData = responseData;
    } else if (fallbackData) {
      actualData = fallbackData;
    } else {
      actualData = resultObject ?? {};
    }
    console.log(`${debugTag} Final payload keys:`, Object.keys(actualData));

    return { data: actualData };
  } catch (err: any) {
    console.log("Error: ", err);
    if (err?.name === "AbortError") {
      return { error: "Request timed out. The server may be slow or unavailable." };
    }
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Server Error." };
  }
};

/**
 * Fetches photos that need watermark conversion (have originalUrl but lack watermarkedUrlByInstafarms).
 * Uses GET /properties/:id/gallery/needs-watermark.
 */
export const fetchPropertyGalleryNeedsWatermark = async (
  propertyId: string,
  limit = 30
): Promise<{ photos?: { id: string; originalUrl: string; name?: string | null; fileName?: string | null }[]; error?: string }> => {
  if (!propertyId?.trim()) return { photos: [] };
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", photos: [] };
    const result = await apiGet<{
      success?: boolean;
      photos?: { id: string; originalUrl: string; name?: string | null; fileName?: string | null }[];
      message?: string;
    }>(`/api/properties/${propertyId}/gallery/needs-watermark?limit=${Math.min(30, Math.max(1, limit))}`, { token });
    if (result?.success === false) {
      return { error: result.message || "Failed to fetch needs-watermark", photos: [] };
    }
    const list = Array.isArray(result?.photos) ? result.photos : [];
    return { photos: list };
  } catch (err: any) {
    console.error("Error fetching needs-watermark gallery:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch", photos: [] };
  }
};

export interface NeedsWatermarkPhoto {
  id: string;
  originalUrl: string;
  name?: string | null;
  fileName?: string | null;
  propertyId: string;
  propertyName?: string | null;
}

/**
 * Fetches ALL photos (across all properties) that need watermark conversion.
 * Uses GET /properties/gallery/needs-watermark-all.
 */
export const fetchAllGalleryNeedsWatermark = async (
  limit = 30,
  options?: { appType?: string; forceAll?: boolean; afterId?: string; afterName?: string }
): Promise<{ photos?: NeedsWatermarkPhoto[]; total?: number; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", photos: [] };
    const params = new URLSearchParams({ limit: String(Math.min(30, Math.max(1, limit))) });
    if (options?.forceAll) params.set("forceAll", "true");
    if (options?.afterId) params.set("afterId", options.afterId);
    if (options?.afterName) params.set("afterName", options.afterName);
    const result = await apiGet<{
      success?: boolean;
      photos?: NeedsWatermarkPhoto[];
      total?: number;
      message?: string;
    }>(`/api/properties/gallery/needs-watermark-all?${params.toString()}`, { token, appType: options?.appType });
    if (result?.success === false) {
      return { error: result.message || "Failed to fetch needs-watermark", photos: [] };
    }
    const list = Array.isArray(result?.photos) ? result.photos : [];
    return { photos: list, total: result?.total };
  } catch (err: any) {
    console.error("Error fetching needs-watermark-all gallery:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch", photos: [] };
  }
};

/**
 * Fetches all gallery images for a property.
 * Uses GET /properties/:id/gallery/all (returns only gallery data).
 */
export const fetchPropertyGalleryAll = async (
  propertyId: string,
  propertyBrandMappingId?: string
): Promise<{ data?: GalleryData[]; error?: string }> => {
  if (!propertyId?.trim()) return { data: [] };
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", data: [] };
    const query = propertyBrandMappingId
      ? `?propertyBrandMappingId=${encodeURIComponent(propertyBrandMappingId)}`
      : "";
    const result = await apiGet<{
      success?: boolean;
      data?: GalleryData[];
      message?: string;
    }>(`/api/properties/${propertyId}/gallery/all${query}`, { token });
    if (result?.success === false) {
      return { error: result.message || "Failed to load gallery", data: [] };
    }
    const list = Array.isArray(result?.data) ? result.data : [];
    return { data: list };
  } catch (err: any) {
    console.error("Error fetching property gallery:", err);
    return { error: err instanceof Error ? err.message : "Failed to load gallery", data: [] };
  }
};

export interface CoverPhotoNeedsConversion {
  id: string;
  propertyId: string;
  propertyName?: string;
  sourceUrl: string;
  originalCover?: Record<string, unknown>;
}

/**
 * Fetches cover photos across all properties that need grid/thumbnail/blurHash conversion.
 * Uses GET /properties/cover-photos/needs-conversion.
 */
export const fetchAllCoverPhotosNeedsConversion = async (
  limit = 30,
  appType?: string,
  options?: { includeAlreadyConverted?: boolean; offset?: number },
): Promise<{ items?: CoverPhotoNeedsConversion[]; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", items: [] };
    const normalizedLimit = options?.includeAlreadyConverted
      ? Math.min(100000, Math.max(1, limit))
      : Math.min(50, Math.max(1, limit));
    const query = new URLSearchParams({
      limit: String(normalizedLimit),
    });
    if (options?.includeAlreadyConverted) {
      query.set("includeAlreadyConverted", "true");
    }
    if (typeof options?.offset === "number" && options.offset > 0) {
      query.set("offset", String(options.offset));
    }
    const result = await apiGet<{
      success?: boolean;
      items?: CoverPhotoNeedsConversion[];
      message?: string;
    }>(
      `/api/properties/cover-photos/needs-conversion?${query.toString()}`,
      { token, appType },
    );
    if (result?.success === false) {
      return { error: result.message || "Failed to fetch", items: [] };
    }
    const list = Array.isArray(result?.items) ? result.items : [];
    return { items: list };
  } catch (err: any) {
    console.error("Error fetching cover-photos needs-conversion:", err);
    return { error: err instanceof Error ? err.message : "Failed to fetch", items: [] };
  }
};

/**
 * Fetches coverPhotos for a property (properties.coverPhotos, up to 5).
 * Uses GET /properties/:id/cover-photos.
 */
export const fetchPropertyCoverPhotos = async (
  propertyId: string,
  propertyBrandMappingId?: string,
  options?: { appType?: string },
): Promise<{ coverPhotos?: GalleryData[]; error?: string }> => {
  if (!propertyId?.trim()) return { coverPhotos: [] };
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found", coverPhotos: [] };
    const query = buildQueryString({ propertyBrandMappingId });
    const result = await apiGet<{
      success?: boolean;
      coverPhotos?: GalleryData[];
      message?: string;
    }>(`/api/properties/${propertyId}/cover-photos${query}`, {
      token,
      appType: options?.appType,
    });
    if (result?.success === false) {
      return { error: result.message || "Failed to load cover photos", coverPhotos: [] };
    }
    const coverPhotos = Array.isArray(result?.coverPhotos) ? result.coverPhotos : [];
    return { coverPhotos };
  } catch (err: any) {
    console.error("Error fetching coverPhotos:", err);
    return { error: err instanceof Error ? err.message : "Failed to load cover photos", coverPhotos: [] };
  }
};

/**
 * Updates properties.coverPhotos with full photo objects (order preserved, max 5).
 * Uses PATCH /properties/:id/cover-photos.
 * Pass full 5-slot array; null = empty slot (preserves position).
 */
export const updatePropertyCoverPhotos = async (
  propertyId: string,
  coverPhotos: (GalleryData | null)[],
  options?: { appType?: string; propertyBrandMappingId?: string },
): Promise<{ success?: boolean; coverPhotos?: (GalleryData | null)[]; error?: string }> => {
  if (!propertyId?.trim()) return { error: "Missing propertyId" };
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    // Preserve slot order: pad to 5, null = empty slot
    const padded = [...(Array.isArray(coverPhotos) ? coverPhotos : [])].slice(0, 5);
    while (padded.length < 5) padded.push(null);
    const payload = padded.map((p) =>
      p?.id
        ? {
          id: p.id,
          thumbnailUrl: p.thumbnailUrl ?? undefined,
          gridUrl: p.gridUrl ?? undefined,
          blurHash: p.blurHash ?? "",
          altText: p.altText ?? p.instafarmsAltText ?? undefined,
        }
        : null
    );

    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    const result = await apiPatch<{ success?: boolean; coverPhotos?: GalleryData[]; message?: string }>(
      `/api/properties/${propertyId}/cover-photos${query}`,
      { coverPhotos: payload },
      { token, appType: options?.appType }
    );
    if (result?.success === false) {
      return { success: false, error: result.message || "Failed to update cover images" };
    }
    return { success: true, coverPhotos: result?.coverPhotos ?? coverPhotos };
  } catch (err: any) {
    console.error("Error updating coverPhotos:", err);
    return { error: err instanceof Error ? err.message : "Failed to update cover images" };
  }
};

/**
 * Appends gallery images to a property. Single backend call: POST /properties/:id/gallery/append.
 * Backend fetches existing gallery, merges with new items, and saves (no client-side merge).
 */
export const addGalleryImagesToProperty = async (
  propertyId: string,
  newItems: GalleryData[],
  options?: { propertyBrandMappingId?: string },
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };
    const payload = mapGalleryToService(newItems);
    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    await apiPost(
      `/api/properties/${propertyId}/gallery/append${query}`,
      { gallery: payload },
      { token }
    );
    return { success: true };
  } catch (err: any) {
    console.error("Error adding gallery images:", err);
    return { error: err?.message ?? "Failed to add gallery images" };
  }
};

export interface GalleryItemUpdate {
  photoId: string;
  /** Saves to photos.name */
  name?: string;
  /** Legacy alias for name (saves to photos.name) */
  fileName?: string;
  /** Saves to photos.instafarmsAltText */
  altText?: string;
  /** Saves to propertyPhotos.category */
  key?: string;
  /** Saves to propertyPhotos.sortOrder (1..n per category, unique per propertyId+category) */
  sortOrder?: number;
  watermarkedUrlByInstafarms?: string;
  thumbnailUrl?: string;
}

export interface GalleryUrlUpdate {
  photoId: string;
  /** Source URL we converted from (original or watermarked). Only sent when we have a new value. */
  originalUrl?: string;
  /** New watermarked image URL (output of processing). Only sent when we created a new watermark - never send originalUrl to avoid overwriting with unwatermarked. */
  watermarkedUrlByInstafarms?: string;
  /** Size of original image in bytes. */
  fileSize?: number;
  /** BlurHash string for loading placeholder. */
  blurHash?: string;
}

/**
 * Batch update gallery items (name, altText, category, order) in the database.
 */
export const updatePropertyGalleryItems = async (
  propertyId: string,
  updates: GalleryItemUpdate[],
  options?: { propertyBrandMappingId?: string },
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };
    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    await apiPatch(
      `/api/properties/${propertyId}/gallery${query}`,
      { updates },
      { token }
    );
    return { success: true };
  } catch (err: any) {
    console.error("Error updating gallery items:", err);
    return { error: err?.message ?? "Failed to update gallery" };
  }
};

/**
 * Update gallery photo URLs (watermarked) in the database.
 * Updates photos table; entities and properties share the same photos via junction tables.
 * Note: photos table no longer has thumbnailUrl; thumbnails live only in coverPhotos.
 */
export const updatePropertyGalleryUrls = async (
  propertyId: string,
  updates: GalleryUrlUpdate[],
  options?: { propertyBrandMappingId?: string; appType?: string },
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };
    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    await apiPatch(
      `/api/properties/${propertyId}/gallery${query}`,
      {
        updates: updates.map((u) => {
          const payload: Record<string, unknown> = { photoId: u.photoId };
          if (u.originalUrl !== undefined) payload.originalUrl = u.originalUrl;
          if (u.watermarkedUrlByInstafarms !== undefined) payload.watermarkedUrlByInstafarms = u.watermarkedUrlByInstafarms;
          if (u.fileSize !== undefined) payload.fileSize = u.fileSize;
          if (u.blurHash !== undefined) payload.blurHash = u.blurHash;
          return payload;
        }),
      },
      { token, appType: options?.appType }
    );
    return { success: true };
  } catch (err: any) {
    console.error("Error updating gallery URLs:", err);
    return { error: err?.message ?? "Failed to update gallery URLs" };
  }
};

/**
 * Deletes a single gallery photo from the database (propertyPhotos, entityPhotos, photos).
 */
export const deletePropertyGalleryPhoto = async (
  propertyId: string,
  photoId: string,
  options?: { propertyBrandMappingId?: string },
): Promise<{ success?: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };
    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    await apiDelete<{ success?: boolean; message?: string }>(
      `/api/properties/${propertyId}/gallery/${photoId}${query}`,
      { token }
    );
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting gallery photo:", err);
    return { error: err?.message ?? "Failed to delete photo" };
  }
};

export const deletePropertyBrand = async (
  propertyId: string,
  brandId: string,
  brandName: string,
): Promise<ServerActionResult> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const result = await apiDelete<{ success?: boolean; message?: string }>(
      `/api/properties/admin/${propertyId}/brands/${brandId}`,
      { token },
    );

    if (!result?.success) {
      throw new Error(result?.message || "Failed to disable property brand");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: `${brandName} removed from active brands successfully.` };
  } catch (err: any) {
    console.error("Error disabling property brand:", err);
    return { error: err?.message ?? "Failed to disable property brand" };
  }
};

export const clonePropertyBrand = async (
  propertyId: string,
  currentBrandId: string,
  newBrandId: string,
  newBrandName: string,
): Promise<ServerActionResult<{ brandId: string; created?: boolean; reactivated?: boolean }>> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };

    const result = await apiPost<{
      success?: boolean;
      message?: string;
      data?: { brandId?: string; created?: boolean; reactivated?: boolean };
    }>(
      `/api/properties/admin/${propertyId}/brands/clone`,
      {
        currentBrandId,
        newBrandId,
      },
      { token },
    );

    if (!result?.success) {
      throw new Error(result?.message || "Failed to add property brand");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}`);

    return {
      success: result?.data?.created
        ? `${newBrandName} added successfully.`
        : result?.data?.reactivated
          ? `${newBrandName} activated successfully.`
          : `${newBrandName} is already available.`,
      data: {
        brandId: result?.data?.brandId || newBrandId,
        created: result?.data?.created,
        reactivated: result?.data?.reactivated,
      },
    };
  } catch (err: any) {
    console.error("Error cloning property brand:", err);
    return { error: err?.message ?? "Failed to add property brand" };
  }
};

/**
 * Deletes all gallery photos in a category from the database (propertyPhotos, entityPhotos, photos).
 * Category: outdoors | indoors | bed-bath | amenities
 */
export const deletePropertyGalleryByCategory = async (
  propertyId: string,
  category: string,
  options?: { propertyBrandMappingId?: string },
): Promise<{ success?: boolean; error?: string; deletedCount?: number }> => {
  try {
    const token = await getAuthToken();
    if (!token) return { error: "Unauthorized - No token found" };
    const query = buildQueryString({ propertyBrandMappingId: options?.propertyBrandMappingId });
    const result = await apiDelete<{ success?: boolean; message?: string; deletedCount?: number }>(
      `/api/properties/${propertyId}/gallery/by-category/${encodeURIComponent(category)}${query}`,
      { token }
    );
    return { success: result?.success ?? true, deletedCount: result?.deletedCount };
  } catch (err: any) {
    console.error("Error deleting gallery by category:", err);
    return { error: err?.message ?? "Failed to delete gallery by category" };
  }
};

export const fetchHelperData = async (endpoint: string): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    try {
      const result = await apiGet<{ data?: any[] }>(`/api/properties/helpers/${endpoint}`, {
        token,
      });
      return { data: result.data || [] };
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}`);
      return { data: [] };
    }
  } catch (err: any) {
    console.log("Error: ", err);
    return { data: [] };
  }
};

export type LocationSearchResult = {
  id: string;
  name: string;
  slug?: string;
  type: "state" | "city" | "area" | "destination" | "region" | "locality";
};

export const searchLocations = async (
  q: string,
  types?: Array<"state" | "city" | "area" | "destination" | "region" | "locality">,
): Promise<LocationSearchResult[]> => {
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const typesParam = types?.length ? `&types=${types.join(",")}` : "";
    const result = await apiGet<{ data?: LocationSearchResult[] }>(
      `/api/properties/helpers/search?q=${encodeURIComponent(q)}${typesParam}`,
      { token },
    );
    return result.data || [];
  } catch {
    return [];
  }
};

export const fetchAreasByCity = async (cityId: string): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { data: [] };
    }

    try {
      const result = await apiGet<{ data?: any[] }>(`/api/properties/helpers/areas-by-city/${cityId}`, {
        token,
      });
      return { data: result.data || [] };
    } catch (err) {
      return { data: [] };
    }
  } catch (err: any) {
    return { data: [] };
  }
};

export const fetchCitiesByState = async (stateId: string): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { data: [] };
    }

    try {
      const result = await apiGet<{ data?: any[] }>(`/api/properties/helpers/cities-by-state/${stateId}`, {
        token,
      });
      return { data: result.data || [] };
    } catch (err) {
      return { data: [] };
    }
  } catch (err: any) {
    return { data: [] };
  }
};

// NEW FUNCTION: Get properties by their IDs
// Get multiple properties by IDs via API
export const getPropertiesByIds = async (
  propertyIds: string[],
  _options?: unknown
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!propertyIds || propertyIds.length === 0) {
      return { data: [] };
    }

    const token = await getAuthToken();
    const response = await apiPost("/api/properties/admin/by-ids", {
      ids: propertyIds,
    }, { token });

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch properties");
    }

    return { data: response.data || response.list || [] };

  } catch (err: any) {
    console.log("Error fetching properties by IDs:", err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

// NEW FUNCTION: Search properties with text and optionally include specific IDs
// Used by the CollectionEditor property search
export const searchPropertiesWithIds = async (
  formData: FormData
): Promise<ServerSearchResult<any[]>> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const searchKeys = ["Property Name", "Property Code"] as const;
    const searchKey = searchKeys.find(
      (x) => x === formData.get("searchKey")?.toString(),
    );
    const searchValue = formData.get("searchValue")?.toString() || "";
    const includeIdsString = formData.get("includeIds")?.toString();
    const appType = formData.get("appType")?.toString();

    let includeIds: string[] = [];
    try {
      if (includeIdsString) {
        includeIds = JSON.parse(includeIdsString);
      }
    } catch (error) {
      console.warn("Failed to parse includeIds:", error);
    }

    // console.log("Search params:", { searchKey, searchValue, includeIds });

    let searchResults: any[] = [];
    let specificProperties: any[] = [];

    // Perform text search if search value is provided
    if (searchValue && searchKey) {
      if (!searchKeys.includes(searchKey as any)) {
        throw new Error("Invalid search key.");
      }

      const searchBy = searchKey === "Property Name" ? "propertyName" : "propertyCode";
      const brandId = formData.get("brandId")?.toString();

      const token = await getAuthToken();
      const response = await apiPost("/api/properties/admin/search", {
        searchBy,
        searchKey: searchValue,
        perPage: 20,
        ...(brandId ? { brandId } : {}),
      }, { token, ...(appType ? { appType } : {}) });

      if (!response.success) {
        throw new Error(response.error || "Failed to search properties");
      }

      searchResults = response.data || [];
    }

    // Fetch specific properties by IDs
    if (includeIds.length > 0) {
      const propertiesById = await getPropertiesByIds(includeIds);
      if (propertiesById.data) {
        specificProperties = propertiesById.data;
      }
    }

    // Combine results and remove duplicates
    const allProperties = [...searchResults, ...specificProperties];
    const uniqueProperties = allProperties.filter((property, index, self) =>
      index === self.findIndex((p) => p.id === property.id)
    );

    // console.log(`Combined results: ${searchResults.length} from search, ${specificProperties.length} by ID, ${uniqueProperties.length} unique total`);

    return { data: uniqueProperties };

  } catch (err: any) {
    console.log("Error in searchPropertiesWithIds:", err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const advancedSearchProperties = async (
  search: any, // Using any to avoid type import issues, or define interface locally
  options?: { appType?: string },
): Promise<ServerSearchResult<any[]>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiPost<{ success: boolean; data?: any[]; message?: string }>("/api/properties/advanced-search", search, {
      token,
      appType: options?.appType,
    });
    console.log("Advanced Search Result: ", result);

    if (!result.success) {
      throw new Error(result.message || 'Advanced search failed');
    }

    // Handle response - could be array directly or object with data/list property
    if (Array.isArray(result)) {
      console.log("[advancedSearch] Result is array, first activities:", result[0]?.activities?.length);
      return { data: result } as any;
    } else if (result && typeof result === 'object') {
      // Some backends may return `list` instead of `data`.
      const data = result.data || (result as any).list || [];
      const safeData = Array.isArray(data) ? data : [];
      if (safeData.length > 0) {
        console.log("[advancedSearch] First item activityNames:", safeData[0]?.activityNames, "tags:", safeData[0]?.tags);
      }
      return { data: safeData } as any;
    }
    return { data: [] } as any;
  } catch (err: any) {
    console.log("Error: ", err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};

export const getPropertyByCode = async (
  code: string,
  options?: { appType?: string },
): Promise<ServerSearchResult<any>> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { error: "Unauthorized - No token found" };
    }

    const result = await apiGet<{ success?: boolean; data?: any; message?: string }>(`/api/properties/code/${code}`, {
      token,
      appType: options?.appType,
    });

    if (result.success === false) {
      throw new Error(result.message || 'Property not found');
    }

    return { data: result.data || result };
  } catch (err: any) {
    console.log("Error: ", err);
    if (err instanceof Error) {
      return { error: err.message };
    } else {
      return { error: "Server Error." };
    }
  }
};
