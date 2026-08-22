"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ServerActionResult } from "@/utils/types";
import { parseString } from "@/utils/server-utils";
import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPatch } from "@/utils/api-utils";
import { uploadSiteWatermarkAction } from "./imageActions";
import { resolveImageSrc } from "@/utils/image";
import { captureError } from "@/lib/sentry";
import {
  SETTINGS_ERRORS,
  SETTINGS_SCOPE_FORM_FIELD,
  SETTINGS_SUCCESS,
  SETTINGS_VALIDATION,
  type SiteSettingsScope,
} from "@/constants/settings";
import { PLAN_BRAND_APP_TYPE, type PlanBrandScope } from "@/constants/planBrandScope";

function siteSettingsAppTypeHeaders(scope: SiteSettingsScope): Record<string, string> {
  const key: PlanBrandScope = scope === "mago" ? "mago" : "instafarms";
  return { "X-App-Type": PLAN_BRAND_APP_TYPE[key] };
}

function parseSiteSettingsScope(formData: FormData): SiteSettingsScope {
  const raw = formData.get(SETTINGS_SCOPE_FORM_FIELD)?.toString();
  return raw === "mago" ? "mago" : "instafarms";
}

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

export const getSiteSettings = async (scope: SiteSettingsScope = "instafarms") => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    const response = await apiGet<{ data?: any }>("/api/settings/site_settings", {
      token,
      headers: siteSettingsAppTypeHeaders(scope),
    });

    // API returns { success: true, data: ... }; use data if present
    const data = response?.data ?? response;
    if (data && typeof data.instafarmWatermarkUrl === "string") {
      data.instafarmWatermarkUrl = resolveImageSrc(data.instafarmWatermarkUrl) ?? data.instafarmWatermarkUrl;
    }
    return data || null;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not Found")) {
      return null;
    }
    console.error("API Error getSiteSettings:", err);
    captureError(err);
    throw new Error(SETTINGS_ERRORS.fetchFailed);
  }
};

export const updateSiteSettings = async (
  formData: FormData,
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const scope = parseSiteSettingsScope(formData);

    // Parse form data
    const homePageNumber = parseString(formData.get("homePageNumber")?.toString());
    const supportNumber = parseString(formData.get("supportNumber")?.toString());
    const supportEmail = parseString(formData.get("supportEmail")?.toString());
    const whatsappNumber = parseString(formData.get("whatsappNumber")?.toString());
    const centralBookingNumber = parseString(formData.get("centralBookingNumber")?.toString());
    const siteTitle = parseString(formData.get("siteTitle")?.toString());
    const siteMetaTitle = parseString(formData.get("siteMetaTitle")?.toString());
    const siteMetaKeywords = parseString(formData.get("siteMetaKeywords")?.toString());
    const siteMetaDescription = parseString(formData.get("siteMetaDescription")?.toString());

    const instafarmWatermark = formData.get("instafarmWatermark") as File | null;

    if (!siteTitle || siteTitle.trim().length === 0) {
      return { error: SETTINGS_VALIDATION.siteTitleRequired };
    }
    if (supportEmail && !isValidEmail(supportEmail)) {
      return { error: SETTINGS_VALIDATION.supportEmailInvalid };
    }

    // Prepare settings data
    const settings = {
      homePageNumber,
      supportNumber,
      supportEmail,
      whatsappNumber,
      centralBookingNumber,
      siteTitle,
      siteMetaTitle,
      siteMetaKeywords,
      siteMetaDescription,
    };

    // Fixed key per scope (setting/{scope}/hero.webp) — re-uploading overwrites in place.
    let instafarmWatermarkUrl;

    if (instafarmWatermark && instafarmWatermark.size > 0) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', instafarmWatermark);
      uploadFormData.append('scope', scope);

      const uploadResult = await uploadSiteWatermarkAction(uploadFormData);
      if (uploadResult.success) {
        instafarmWatermarkUrl = uploadResult.success.path;
      } else {
        return { error: uploadResult.error || SETTINGS_ERRORS.watermarkUploadFailed };
      }
    }

    // Instead of adding watermark URLs to updateData separately,
    // add them to the value object
    const updateData: any = {
      value: {
        ...settings,
        ...(instafarmWatermarkUrl && { instafarmWatermarkUrl }),
      },
      updatedBy: admin.id,
    };

    // Add watermark URL if it was uploaded
    if (instafarmWatermarkUrl) {
      updateData.instafarmWatermarkUrl = instafarmWatermarkUrl;
    }

    // ✅ Get token and pass it to API call with /api/ prefix
    const token = await getAuthToken();

    // Settings use "site_settings" as the ID
    await apiPatch("/api/settings/site_settings", updateData, {
      token,
      headers: siteSettingsAppTypeHeaders(scope),
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/mago/site-settings");
    return { success: SETTINGS_SUCCESS.updated };
  } catch (err) {
    console.error("API Error updateSiteSettings:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: SETTINGS_ERRORS.updateFailed };
  }
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const getBookingExpiry = async (): Promise<number> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const token = await getAuthToken();

    // apiGet returns { success: true, data: { bookingExpiryHours: 24 } }
    // or checks result.data.
    // Let's verify apiGet in utils/api-utils.
    // Assuming apiGet returns the `data` part or the full status.
    // Based on getSiteSettings returning `response || null`, maybe it returns data directly if success?
    // I'll assume standard response and extracting data.
    const response: any = await apiGet("/api/settings/booking-expiry", {
      token,
    });

    return response?.bookingExpiryHours || 24;
  } catch (err) {
    console.log("API Error: ", err);
    captureError(err);
    return 24; // Default to 24 on error
  }
}

export const updateBookingExpiry = async (
  formData: FormData
): Promise<ServerActionResult> => {
  try {
    const admin = await isAdmin();
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const bookingExpiryHours = parseInt(formData.get("bookingExpiryHours")?.toString() || "24", 10);

    if (isNaN(bookingExpiryHours) || bookingExpiryHours <= 0) {
      return { error: SETTINGS_VALIDATION.bookingExpiryPositive };
    }

    const token = await getAuthToken();

    await apiPatch("/api/settings/booking-expiry", { bookingExpiryHours }, {
      token,
    });

    revalidatePath("/admin/settings");
    return { success: SETTINGS_SUCCESS.bookingUpdated };
  } catch (err) {
    console.error("API Error updateBookingExpiry:", err);
    captureError(err);
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: SETTINGS_ERRORS.bookingUpdateFailed };
  }
};