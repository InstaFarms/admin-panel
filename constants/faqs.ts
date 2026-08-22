import { ADMIN_BASE_PATH } from "@/constants/routes";
import { FAQ_CONTENT_BASE, type BrandAdminScope } from "@/constants/brandAdminScope";

export const FAQ_SEARCH_KEYS = ["Question", "Answer"] as const;
export type FAQSearchKey = (typeof FAQ_SEARCH_KEYS)[number];

export const FAQ_INSTAFARM_CONTENT_PATH = FAQ_CONTENT_BASE.instafarms;

const FAQ_CONTENT_SECTION_LABEL: Record<BrandAdminScope, string> = {
  instafarms: "Instafarm Content",
  mago: "Mago Content",
};

/** Entry path for FAQ section in sidebar (first category). */
const FAQ_CONTENT_ENTRY_SLUG: Record<BrandAdminScope, string> = {
  instafarms: "locations",
  mago: "mago-locations",
};

export function getFAQListBreadcrumbs(category: string, scope: BrandAdminScope = "instafarms") {
  const base = FAQ_CONTENT_BASE[scope];
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: `${base}/${FAQ_CONTENT_ENTRY_SLUG[scope]}`, label: FAQ_CONTENT_SECTION_LABEL[scope] },
    { href: "#", label: `FAQs - ${categoryTitle}` },
  ];
}

export function getFAQCreateBreadcrumbs(category: string, scope: BrandAdminScope = "instafarms") {
  const base = FAQ_CONTENT_BASE[scope];
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: `${base}/${category}`, label: `FAQs - ${categoryTitle}` },
    { href: "#", label: "Create" },
  ];
}

export function getFAQEditBreadcrumbs(category: string, scope: BrandAdminScope = "instafarms") {
  const base = FAQ_CONTENT_BASE[scope];
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  return [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: `${base}/${category}`, label: `FAQs - ${categoryTitle}` },
    { href: "#", label: "Edit" },
  ];
}

export const FAQ_VALIDATION = {
  questionRequired: "Question is required",
  answerRequired: "Answer is required",
  questionAndAnswerRequired: "Please enter question and answer.",
  questionAndAnswerRequiredEdit: "Please enter valid question and answer.",
} as const;

export const FAQ_ERRORS = {
  unauthorized: "You are not authorized to perform this action",
  invalidId: "Invalid id.",
  notFound: "FAQ not found",
  createFailed: "Failed to create FAQ.",
  updateFailed: "Failed to update FAQ.",
  deleteFailed: "Failed to delete FAQ.",
  fetchFailed: "Failed to fetch FAQs",
} as const;

export const FAQ_SUCCESS = {
  created: "Created new FAQ.",
  updated: "FAQ updated.",
  deleted: "FAQ deleted.",
} as const;

/** Icons used in FAQ pages */
export { HiPencil, HiTrash } from "react-icons/hi";
