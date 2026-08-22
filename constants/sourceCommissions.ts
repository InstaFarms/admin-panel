export const SOURCE_COMMISSION_BREADCRUMBS = {
  list: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "#", label: "SourceCommissions" },
  ],
  create: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/source-commissions", label: "SourceCommissions" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/source-commissions", label: "SourceCommissions" },
    { href: "#", label: "Edit" },
  ],
} as const;

export const SOURCE_COMMISSION_SEARCH_KEYS = [
  "Source Name",
  "Source Code",
  "Description",
] as const;

export const SOURCE_COMMISSION_ERRORS = {
  unauthorized: "Unauthorized.",
  invalidId: "Invalid commission source id.",
  createFailed: "Failed to create commission source.",
  updateFailed: "Failed to update commission source.",
  deleteFailed: "Failed to delete commission source.",
  fetchFailed: "Failed to fetch commission sources.",
  fetchOneFailed: "Failed to fetch commission source.",
  notFound: "Commission source not found.",
} as const;

export const SOURCE_COMMISSION_SUCCESS = {
  created: "Commission source created.",
  updated: "Commission source updated.",
  deleted: "Commission source marked inactive.",
} as const;
