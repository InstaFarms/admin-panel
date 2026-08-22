/** Icons used in admin pages */
export { HiPencil } from "react-icons/hi";

// Breadcrumbs
export const getBreadcrumbs = (type: "list" | "create" | "details" | "edit") => {
  const base = [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/admins", label: "Admins" },
  ];

  if (type === "create") {
    return [...base, { href: "#", label: "Create" }];
  }
  if (type === "details") {
    return [...base, { href: "#", label: "Details" }];
  }
  if (type === "edit") {
    return [...base, { href: "#", label: "Edit" }];
  }
  return base;
};

export const ADMIN_FORM_ID = "adminForm";

// Field names
export const FIELD_FIRST_NAME = "firstName";
export const FIELD_LAST_NAME = "lastName";
export const FIELD_EMAIL = "email";
export const FIELD_PHONE = "phoneNumber";

// Validation messages
export const VALIDATION_MESSAGES = {
  FIRST_NAME_REQUIRED: "First name is required",
  LAST_NAME_REQUIRED: "Last name is required",
  NAME_STARTS_WITH_NUMBER: "Name cannot start with a number",
  NAME_INVALID_CHARS: "Name can only contain letters, spaces, hyphens, and apostrophes",
  EMAIL_REQUIRED: "Email is required",
  EMAIL_STARTS_WITH_NUMBER: "Email cannot start with a number",
  EMAIL_INVALID: "Please enter a valid email address",
  PHONE_REQUIRED: "Phone number is required",
  PHONE_LETTERS: "Phone number cannot contain letters",
  PHONE_FORMAT: "Phone number must be 10 digits",
  PHONE_STARTS_WITH_ZERO: "Phone number cannot start with 0",
} as const;

// Toast messages
export const TOAST_MESSAGES = {
  FILL_REQUIRED: "Please fill in all required fields",
  ERROR: "Error",
  SAVING: "Saving admin data...",
  CREATED: "Admin created successfully",
  UPDATED: "Admin updated successfully",
} as const;

// List page errors (fetch failed, etc.)
export const ADMIN_LIST_ERRORS = {
  fetchFailed: "Failed to fetch admins. Please try again.",
} as const;

// CRUD error messages
export const ADMIN_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  notFound: "Admin not found",
  createFailed: "Failed to create admin. Please try again.",
  updateFailed: "Failed to update admin. Please try again.",
  deleteFailed: "Failed to delete admin. Please try again.",
  invalidId: "Invalid admin ID",
  duplicateEmail: "An admin with this email already exists",
} as const;
