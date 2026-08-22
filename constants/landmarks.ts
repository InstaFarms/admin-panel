import { ADMIN_BASE_PATH } from "@/constants/routes";

export const LANDMARKS_VALIDATION = {
  nameRequired: "Landmark name is required",
  nameMinLength: "Landmark name must be at least 2 characters",
  nameMaxLength: "Landmark name must be at most 100 characters",
  nameDuplicate: "A landmark with this name already exists in this area",
  areaRequired: "Please select an area",
  stateRequired: "Please select a state",
  cityRequired: "Please select a city",
  slugInvalid: "Slug must contain only lowercase letters, numbers, and hyphens",
  slugDuplicate: "A landmark with this slug already exists",
};

export const LANDMARKS_ERRORS = {
  unauthorized: "Unauthorized",
  notFound: "Landmark not found",
  createFailed: "Failed to create landmark",
  updateFailed: "Failed to update landmark",
  deleteFailed: "Failed to delete landmark",
  fetchFailed: "Failed to fetch landmarks",
  networkError: "Network error. Please try again.",
  invalidId: "Invalid landmark ID",
};

export const LANDMARKS_SUCCESS = {
  created: "Landmark created successfully",
  updated: "Landmark updated successfully",
  deleted: "Landmark deleted successfully",
};

export const SEARCH_KEYS = ["Name", "Area", "City"] as const;
export type LandmarkSearchKey = (typeof SEARCH_KEYS)[number];

export const SEARCH_KEY_MAP: Record<LandmarkSearchKey, string> = {
  Name: "landmark",
  Area: "area",
  City: "city",
};

export const BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Landmarks" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/landmarks", label: "Landmarks" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/landmarks", label: "Landmarks" },
    { href: "#", label: "Edit" },
  ],
};

export const TABLE_COLUMNS = [
  "S. No.",
  "Landmark",
  "Area",
  "City",
  "State",
  "Actions",
] as const;