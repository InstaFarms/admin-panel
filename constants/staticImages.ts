import { ADMIN_BASE_PATH } from "@/constants/routes";
import {
  STATIC_IMAGES_BASE,
  type BrandAdminScope,
} from "@/constants/brandAdminScope";

export type StaticImageSection =
  | "why_instafarms_carousel"
  | "homepage_hero"
  | "about_us_banner"
  | "testimonials_background"
  | "partner_logos"
  | "footer_social";

export const SECTIONS: { value: StaticImageSection; label: string }[] = [
  { value: "homepage_hero", label: "Homepage Hero" },
  { value: "why_instafarms_carousel", label: "Why Instafarms Carousel" },
  { value: "about_us_banner", label: "About Us Banner" },
  { value: "testimonials_background", label: "Testimonials Background" },
  { value: "partner_logos", label: "Partner Logos" },
  { value: "footer_social", label: "Footer Social" },
];

export const VALID_SECTIONS = SECTIONS.map(s => s.value) as StaticImageSection[];

export function getSectionLabel(value: string): string {
  return SECTIONS.find(s => s.value === value)?.label
    ?? value.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export const STATIC_IMAGE_ERRORS = {
  unauthorized: "Unauthorized",
  notFound: "Static image not found",
  createFailed: "Failed to create static image",
  updateFailed: "Failed to update static image",
  deleteFailed: "Failed to delete static image",
  fetchFailed: "Failed to fetch static images",
  invalidId: "Invalid static image ID",
  invalidSection: "Invalid section",
  sectionRequired: "Section is required",
  titleRequired: "Title is required",
  desktopImageRequired: "Desktop image is required",
  mobileImageRequired: "Mobile image is required",
  bothImagesRequired: "Both desktop and mobile images are required",
  networkError: "Network error. Please try again.",
};

export const STATIC_IMAGE_SUCCESS = {
  created: "Static image created successfully",
  updated: "Static image updated successfully",
  deleted: "Static image deleted successfully",
  savedAll: "Static images saved successfully",
};

export const STATIC_IMAGE_UPLOAD = {
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  acceptedTypes: "image/*",
  desktopFolder: "static-images/desktop",
  mobileFolder: "static-images/mobile",
} as const;

export function staticImagesListBreadcrumbs(scope: BrandAdminScope) {
  const base = STATIC_IMAGES_BASE[scope];
  const listLabel = scope === "mago" ? "Mago Static Images" : "Static Images";
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: listLabel },
  ];
}

export function staticImagesCreateBreadcrumbs(scope: BrandAdminScope) {
  const base = STATIC_IMAGES_BASE[scope];
  const listLabel = scope === "mago" ? "Mago Static Images" : "Static Images";
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: base, label: listLabel },
    { href: "#", label: "Create" },
  ];
}

export function staticImagesSectionBreadcrumbs(scope: BrandAdminScope, sectionLabel: string) {
  const base = STATIC_IMAGES_BASE[scope];
  const listLabel = scope === "mago" ? "Mago Static Images" : "Static Images";
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: base, label: listLabel },
    { href: "#", label: sectionLabel },
  ];
}

/** @deprecated Use staticImagesListBreadcrumbs("instafarms") */
export const BREADCRUMBS = {
  list: staticImagesListBreadcrumbs("instafarms"),
  create: staticImagesCreateBreadcrumbs("instafarms"),
  section: (label: string) => staticImagesSectionBreadcrumbs("instafarms", label),
};

export const TABLE_COLUMNS = [
  "Order", "Preview", "Title", "Section", "Status", "Actions",
] as const;