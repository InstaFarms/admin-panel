import { ADMIN_BASE_PATH } from "@/constants/routes";

export const AGREEMENT_MODEL_SEARCH_KEYS = [
  "Name",
  "Code",
  "Description",
] as const;

export const AGREEMENT_MODEL_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Agreement Tab" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/agreement-models", label: "Agreement Tab" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/agreement-models", label: "Agreement Tab" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const AGREEMENT_MODEL_ERRORS = {
  unauthorized: "You are not authorized to perform this action.",
  invalidId: "Invalid agreement model id.",
  createFailed: "Failed to create agreement model.",
  updateFailed: "Failed to update agreement model.",
  deleteFailed: "Failed to delete agreement model.",
  fetchFailed: "Failed to fetch agreement models.",
  fetchOneFailed: "Failed to fetch agreement model.",
  notFound: "Agreement model not found.",
} as const;

export const AGREEMENT_MODEL_SUCCESS = {
  created: "Agreement model created.",
  updated: "Agreement model updated.",
  deleted: "Agreement model marked inactive.",
} as const;
