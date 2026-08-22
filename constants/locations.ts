import { locationSchema } from "@repo/db/schema";
import type { BreadcrumbItemConfig } from "@/components/PageBreadcrumb";
import type { LocationDisplayMode } from "@/types/locations";

export const LOCATION_SEARCH_KEYS = ["Name", "Slug", "Tag", "Parent"] as const;

export const LOCATION_ROLE_OPTIONS = [...locationSchema.locationRoleOptions];
export const LOCATION_MARKET_TYPE_OPTIONS = [
  ...locationSchema.locationMarketTypeOptions,
];
export const LOCATION_DISPLAY_MODE_OPTIONS = [
  ...locationSchema.locationDisplayModeOptions,
];
export const LOCATION_DISPLAY_MODE_LABELS: Record<LocationDisplayMode, string> = {
  area_first: "Area First",
  listing_first: "Listing First",
  mixed: "Mixed",
};

export const LOCATION_DISPLAY_MODE_HELPERS: Record<LocationDisplayMode, string> = {
  area_first: "Show area and destination-style content first on the frontend page.",
  listing_first: "Show property listings first on the frontend page.",
  mixed: "Show both page content and property listings together on the frontend page.",
};

export const LOCATION_BREADCRUMBS: {
  list: BreadcrumbItemConfig[];
  create: BreadcrumbItemConfig[];
  edit: (label: string) => BreadcrumbItemConfig[];
  landmarks: BreadcrumbItemConfig[];
  createLandmark: BreadcrumbItemConfig[];
  editLandmark: (label: string) => BreadcrumbItemConfig[];
} = {
  list: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
  ],
  create: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
    { href: "#", label: "Create" },
  ],
  edit: (label: string) => [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
    { href: "#", label },
  ],
  landmarks: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
    { href: "/admin/locations/landmarks", label: "Landmarks" },
  ],
  createLandmark: [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
    { href: "/admin/locations/landmarks", label: "Landmarks" },
    { href: "#", label: "Create" },
  ],
  editLandmark: (label: string) => [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/locations", label: "Locations" },
    { href: "/admin/locations/landmarks", label: "Landmarks" },
    { href: "#", label },
  ],
};

export function getLocationRoleBreadcrumbs(
  baseHref: string,
  label: string
): {
  list: BreadcrumbItemConfig[];
  create: BreadcrumbItemConfig[];
  edit: (itemLabel: string) => BreadcrumbItemConfig[];
} {
  return {
    list: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: baseHref, label },
    ],
    create: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: baseHref, label },
      { href: "#", label: "Create" },
    ],
    edit: (itemLabel: string) => [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: baseHref, label },
      { href: "#", label: itemLabel },
    ],
  };
}

