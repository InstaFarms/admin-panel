import { ADMIN_BASE_PATH } from "@/constants/routes";
import { BRAND_ADMIN_APP_TYPE, type BrandAdminScope } from "@/constants/brandAdminScope";

export type CollectionAdminScope = BrandAdminScope;

export const COLLECTION_ADMIN_APP_TYPE = BRAND_ADMIN_APP_TYPE;

export const COLLECTION_LIST_BASE_PATH: Record<CollectionAdminScope, string> = {
  instafarms: "/admin/instafarm/collection",
  mago: "/admin/mago/collection",
};

export function parseCollectionAdminScope(raw: unknown): CollectionAdminScope {
  return raw === "mago" ? "mago" : "instafarms";
}

export function getCollectionBreadcrumbs(scope: CollectionAdminScope) {
  const base = COLLECTION_LIST_BASE_PATH[scope];
  const listLabel = scope === "mago" ? "Mago Collections" : "Instafarms Collections";
  return {
    list: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "#", label: listLabel },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: base, label: listLabel },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: base, label: listLabel },
      { href: "#", label: "Edit" },
    ],
  };
}

export const COLLECTIONS_VALIDATION = {
  nameRequired: "Collection name is required",
  nameMinLength: "Collection name must be at least 2 characters",
  nameMaxLength: "Collection name must be at most 100 characters",
  nameDuplicate: "A collection with this name or slug already exists",
  slugInvalid: "Slug must contain only lowercase letters, numbers, and hyphens",
  slugDuplicate: "A collection with this slug already exists",
  weightInvalid: "Weight must be a non-negative number",
  faqQuestionRequired: "FAQ question is required",
  faqAnswerRequired: "FAQ answer is required",
  infoTitleRequired: "Info section title is required",
  infoContentRequired: "Info section content is required",
  logoInvalidType: "Please select an image file",
  logoMaxSize: "Image size must be less than 5MB",
};

export const COLLECTIONS_ERRORS = {
  unauthorized: "Unauthorized",
  notFound: "Collection not found",
  createFailed: "Failed to create collection",
  updateFailed: "Failed to update collection",
  deleteFailed: "Failed to delete collection",
  fetchFailed: "Failed to fetch collections",
  networkError: "Network error. Please try again.",
  invalidId: "Invalid collection ID",
  logoUploadFailed: "Failed to upload logo",
};

export const COLLECTIONS_SUCCESS = {
  created: "Collection created successfully",
  updated: "Collection updated successfully",
  deleted: "Collection deleted successfully",
};

export const SEARCH_KEYS = ["Name", "Slug"] as const;
export type CollectionSearchKey = (typeof SEARCH_KEYS)[number];

export const SEARCH_KEY_MAP: Record<CollectionSearchKey, string> = {
  Name: "name",
  Slug: "slug",
};

/** @deprecated Prefer `getCollectionBreadcrumbs("instafarms")` */
export const BREADCRUMBS = getCollectionBreadcrumbs("instafarms");

export const TABLE_COLUMNS = [
  "S. No.",
  "Logo",
  "Collection",
  "Slug",
  "Active",
  "Weight",
  "Actions",
] as const;

export const LOGO_CONFIG = {
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  acceptedTypes: "image/*",
  folder: "collections",
} as const;

export const TABS = [
  { id: "basic", label: "Basic Info" },
  { id: "properties", label: "Properties" },
  { id: "faqs", label: "FAQs" },
  { id: "info", label: "Info Sections" },
  { id: "meta", label: "Meta / SEO" },
] as const;

export type TabType = (typeof TABS)[number]["id"];
