import { ADMIN_BASE_PATH } from "@/constants/routes";

/** Which brand the admin API should scope requests to (via X-App-Type). */
export type BrandAdminScope = "instafarms" | "mago";

export const BRAND_ADMIN_APP_TYPE: Record<BrandAdminScope, string> = {
  instafarms: "INSTAFARMS_ADMIN",
  mago: "MAGO_ADMIN",
};

export function parseBrandAdminScope(raw: unknown): BrandAdminScope {
  return raw === "mago" ? "mago" : "instafarms";
}

/** Hub pages for CMS, carousel, and tags per brand. */
export const BRAND_CONTENT_HUB: Record<BrandAdminScope, string> = {
  instafarms: "/admin/instafarm/instafarms-settings",
  mago: "/admin/mago/mago-settings",
};

export const BRAND_CONTENT_ROUTES: Record<
  BrandAdminScope,
  {
    hub: string;
    cms: string;
    webCarousel: string;
    appCarousel: string;
    tags: string;
  }
> = {
  instafarms: {
    hub: "/admin/instafarm/instafarms-settings",
    cms: "/admin/instafarm/instafarms-settings/cms",
    webCarousel: "/admin/instafarm/instafarms-settings/carousel/web",
    appCarousel: "/admin/instafarm/instafarms-settings/carousel/app",
    tags: "/admin/instafarm/instafarms-settings/tags",
  },
  mago: {
    hub: "/admin/mago/mago-settings",
    cms: "/admin/mago/mago-settings/cms",
    webCarousel: "/admin/mago/mago-settings/carousel/web",
    appCarousel: "/admin/mago/mago-settings/carousel/app",
    tags: "/admin/mago/mago-settings/tags",
  },
};

/** FAQ list/create/edit base path per brand (category slug is appended). */
export const FAQ_CONTENT_BASE: Record<BrandAdminScope, string> = {
  instafarms: "/admin/instafarm-content/faqs",
  mago: "/admin/mago-content/faqs",
};

export const STATIC_IMAGES_BASE: Record<BrandAdminScope, string> = {
  instafarms: "/admin/static-images",
  mago: "/admin/mago/static-images",
};

export function brandContentBreadcrumbLabel(scope: BrandAdminScope): string {
  return scope === "mago" ? "Mago Content" : "Instafarm Settings";
}

export function adminHomeCrumb() {
  return { href: "/", label: "Home" } as const;
}

export function adminPanelCrumb() {
  return { href: ADMIN_BASE_PATH, label: "Admin" } as const;
}
