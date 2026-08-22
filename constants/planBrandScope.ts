import { ADMIN_BASE_PATH } from "@/constants/routes";

/** Brand line for admin discount / cancellation plan CRUD (matches collections). */
export type PlanBrandScope = "instafarms" | "mago";

export const PLAN_BRAND_APP_TYPE: Record<PlanBrandScope, string> = {
  instafarms: "INSTAFARMS_ADMIN",
  mago: "MAGO_ADMIN",
};

export const DISCOUNT_PLANS_LIST_BASE_PATH: Record<PlanBrandScope, string> = {
  instafarms: "/admin/instafarm/discount-plans",
  mago: "/admin/mago/discount-plans",
};

export const CANCELLATION_PLANS_LIST_BASE_PATH: Record<PlanBrandScope, string> = {
  instafarms: "/admin/instafarm/cancellation-plans",
  mago: "/admin/mago/cancellation-plans",
};

export const LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH: Record<PlanBrandScope, string> = {
  instafarms: "/admin/instafarm/last-minute-discount-plans",
  mago: "/admin/mago/last-minute-discount-plans",
};

export function parsePlanBrandScope(raw: unknown): PlanBrandScope {
  return raw === "mago" ? "mago" : "instafarms";
}

export function getDiscountPlanBrandBreadcrumbs(scope: PlanBrandScope) {
  const base = DISCOUNT_PLANS_LIST_BASE_PATH[scope];
  const listLabel = scope === "mago" ? "Mago Discount Plans" : "Instafarms Discount Plans";
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

export function getCancellationPlanBrandBreadcrumbs(scope: PlanBrandScope) {
  const base = CANCELLATION_PLANS_LIST_BASE_PATH[scope];
  const listLabel = scope === "mago" ? "Mago Cancellation Plans" : "Instafarms Cancellation Plans";
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

export function getLastMinuteDiscountPlanBrandBreadcrumbs(scope: PlanBrandScope) {
  const base = LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[scope];
  const listLabel =
    scope === "mago"
      ? "Mago Last Minute Discount Plans"
      : "Instafarms Last Minute Discount Plans";
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
