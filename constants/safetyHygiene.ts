import { ADMIN_BASE_PATH } from "@/constants/routes";

export const SAFETY_HYGIENE_SEARCH_KEYS = ["Name"] as const;
export type SafetyHygieneSearchKey = (typeof SAFETY_HYGIENE_SEARCH_KEYS)[number];

export const SAFETY_HYGIENE_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Safety & Hygiene" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/safety-hygiene", label: "Safety & Hygiene" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/safety-hygiene", label: "Safety & Hygiene" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const SAFETY_HYGIENE_VALIDATION = {
  nameRequired: "Please enter safety & hygiene item name.",
  nameRequiredEdit: "Please enter valid safety & hygiene item name.",
} as const;

export const SAFETY_HYGIENE_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  invalidId: "Invalid id.",
  createFailed: "Failed to create safety & hygiene item.",
  updateFailed: "Failed to update safety & hygiene item.",
  deleteFailed: "Failed to delete safety & hygiene item.",
  fetchFailed: "Failed to fetch safety & hygiene items",
  fetchOneFailed: "Failed to fetch safety & hygiene item",
  notFound: "Safety & hygiene item not found",
} as const;

export const SAFETY_HYGIENE_SUCCESS = {
  created: "Created new safety & hygiene item.",
  updated: "Safety & hygiene item updated.",
  deleted: "Safety & hygiene item deleted.",
} as const;

/** Icons used in safety-hygiene pages */
export { HiPencil } from "react-icons/hi";
