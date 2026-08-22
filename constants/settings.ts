import { ADMIN_BASE_PATH } from "@/constants/routes";

/** Which brand row in `settings` (site_settings + brandId) admin is editing. */
export type SiteSettingsScope = "instafarms" | "mago";

export const SETTINGS_SCOPE_FORM_FIELD = "adminSiteSettingsScope" as const;

export const SETTINGS_BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Settings" },
] as const;

export const MAGO_SITE_SETTINGS_BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Mago Site Settings" },
] as const;

export const SETTINGS_VALIDATION = {
  siteTitleRequired: "Site title is required",
  supportEmailInvalid: "Please enter a valid support email",
  homePageNumberRequired: "Home page number is required",
  supportNumberRequired: "Support number is required",
  supportEmailRequired: "Support email is required",
  whatsappNumberRequired: "WhatsApp number is required",
  centralBookingNumberRequired: "Central booking number is required",
  siteMetaTitleRequired: "Site meta title is required",
  siteMetaKeywordsRequired: "Site meta keywords is required",
  siteMetaDescriptionRequired: "Site meta description is required",
  bookingExpiryPositive: "Booking expiry hours must be a positive number",
} as const;

export const SETTINGS_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  fetchFailed: "Failed to fetch settings",
  updateFailed: "Failed to update settings",
  bookingUpdateFailed: "Failed to update booking settings",
  watermarkUploadFailed: "Failed to upload watermark",
} as const;

export const SETTINGS_SUCCESS = {
  updated: "Settings updated successfully.",
  bookingUpdated: "Booking expiry updated successfully.",
} as const;
