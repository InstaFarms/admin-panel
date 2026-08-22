import { ADMIN_BASE_PATH, ADMIN_USERS_PATH } from "@/constants/routes";

/** Search key options for Owners, Managers, Caretakers, All Users list pages. */
export const USERS_SEARCH_KEYS = ["Name", "Email", "Phone"] as const;
export type UserSearchKey = (typeof USERS_SEARCH_KEYS)[number];

/** Breadcrumbs for user sub-sections under /admin/users */
export const USERS_BREADCRUMBS = {
  owners: {
    list: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: ADMIN_USERS_PATH, label: "Users" },
      { href: "#", label: "Owners" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/owners", label: "Owners" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/owners", label: "Owners" },
      { href: "#", label: "Edit" },
    ],
  },
  managers: {
    list: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: ADMIN_USERS_PATH, label: "Users" },
      { href: "#", label: "Managers" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/managers", label: "Managers" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/managers", label: "Managers" },
      { href: "#", label: "Edit" },
    ],
  },
  caretakers: {
    list: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: ADMIN_USERS_PATH, label: "Users" },
      { href: "#", label: "Caretakers" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/caretakers", label: "Caretakers" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/users/caretakers", label: "Caretakers" },
      { href: "#", label: "Edit" },
    ],
  },
  allusers: {
    list: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "#", label: "Users" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: ADMIN_USERS_PATH, label: "Users" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: ADMIN_USERS_PATH, label: "Users" },
      { href: "#", label: "Edit" },
    ],
  },
} as const;

/** Table columns shared across user list pages */
export const USERS_TABLE_COLUMNS = {
  base: ["S. No.", "Name", "Email", "Phone Number", "Actions"] as const,
  owners: ["S. No.", "Name", "Email", "Phone Number", "Auto Settlement", "Actions"] as const,
};

/** Icons used in user pages */
export { HiPencil, HiCurrencyDollar, HiTrash } from "react-icons/hi";

/** Error messages for user management (owners, managers, caretakers) */
export const USERS_ERRORS = {
  fetchFailed: "Failed to fetch. Please try again.",
  notFound: "User not found",
  unauthorized: "You are not authorized to perform this action",
  ownerFetchFailed: "Failed to fetch owners.",
  managerFetchFailed: "Failed to fetch managers.",
  caretakerFetchFailed: "Failed to fetch caretakers.",
  allUsersFetchFailed: "Failed to fetch users.",
} as const;

/** Validation messages for user forms (owners, managers, caretakers) */
export const USERS_VALIDATION = {
  firstNameRequired: "First name is required",
  firstNameMinLength: "First name must be at least 2 characters",
  firstNameMaxLength: "First name must be 50 characters or less",
  lastNameMaxLength: "Last name must be 50 characters or less",
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  mobileRequired: "Mobile number is required",
  mobileInvalid: "Mobile number must be exactly 10 digits",
  mobileDuplicate: "This mobile number is already registered to another user",
  propertyMissingId: "Cannot add property: missing ID",
  propertyAlreadyAdded: "Property is already added",
  formNotFound: "Form could not be found. Please refresh the page.",
  atLeastOneProperty: "Please select at least one property",
} as const;
