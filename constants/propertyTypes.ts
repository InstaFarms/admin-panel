import { ADMIN_BASE_PATH } from "@/constants/routes";

// Icons
export { HiPencil } from "react-icons/hi";

export const PROPERTY_TYPES_SEARCH_KEYS = ["Name"] as const;
export type PropertyTypeSearchKey = (typeof PROPERTY_TYPES_SEARCH_KEYS)[number];

export const PROPERTY_TYPES_VALIDATION = {
  nameRequired: "Property type name is required",
  nameMinLength: "Name must be at least 2 characters",
  nameMaxLength: "Name must be at most 100 characters",
  nameDuplicate: "A property type with this name already exists",
};

export const PROPERTY_TYPES_ERRORS = {
  unauthorized: "Unauthorized",
  notFound: "Property type not found",
  createFailed: "Failed to create property type",
  updateFailed: "Failed to update property type",
  deleteFailed: "Failed to delete property type",
  fetchFailed: "Failed to fetch property types",
  invalidId: "Invalid property type ID",
};

export const PROPERTY_TYPES_SUCCESS = {
  created: "Property type created successfully",
  updated: "Property type updated successfully",
  deleted: "Property type deleted successfully",
};

export const BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Property Types" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/propertyTypes", label: "Property Types" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/propertyTypes", label: "Property Types" },
    { href: "#", label: "Edit" },
  ],
};

export const TABLE_COLUMNS = ["S. No.", "Property Type", "Actions"] as const;