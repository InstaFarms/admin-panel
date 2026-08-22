import { ADMIN_BASE_PATH } from "@/constants/routes";

export const BLOCKING_REASON_SEARCH_KEYS = ["Reason", "Description"] as const;

export const BLOCKING_REASON_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Blocking Reasons" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/blocking-reasons", label: "Blocking Reasons" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/blocking-reasons", label: "Blocking Reasons" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const BLOCKING_REASON_ERRORS = {
  unauthorized: "You are not authorized to perform this action.",
  invalidId: "Invalid blocking reason id.",
  createFailed: "Failed to create blocking reason.",
  updateFailed: "Failed to update blocking reason.",
  deleteFailed: "Failed to delete blocking reason.",
  fetchFailed: "Failed to fetch blocking reasons.",
  fetchOneFailed: "Failed to fetch blocking reason.",
  notFound: "Blocking reason not found.",
} as const;

export const BLOCKING_REASON_SUCCESS = {
  created: "Blocking reason created.",
  updated: "Blocking reason updated.",
  deleted: "Blocking reason marked inactive.",
} as const;
