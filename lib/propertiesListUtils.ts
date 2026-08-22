import { ADMIN_BASE_PATH } from "@/constants/routes";

export const SEARCH_KEYS = ["Property Name", "Property Code"] as const;
export const DEFAULT_SEARCH_KEY: (typeof SEARCH_KEYS)[number] = "Property Name";

export const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Properties" },
] as const;

export type PropertiesListItem = {
  id: string;
  propertyName?: string | null;
  name?: string | null;
  heading?: string | null;
  propertyCodeName?: string | null;
  propertyCode?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  destination?: string | null;
  locality?: string | null;
  region?: string | null;
  isDisabled?: boolean | null;
  is_disabled?: boolean | null;
  isAuditConfigLocked?: boolean | null;
  brandStatuses?: Array<{
    brandId: string;
    brandName?: string | null;
    isActive: boolean;
  }>;
};

export type PropertiesFetchParams = {
  includeDeletedOnly?: boolean;
  limit: number;
  offset: number;
  searchBy?: "propertyName" | "propertyCode" | "location";
  searchKey?: string;
  areaId?: string;
  brandId?: string;
};

export type PropertiesFilterParams = {
  searchKey: string;
  searchValue: string;
} | null;

const SEARCH_KEY_TO_API_FIELD: Record<
  (typeof SEARCH_KEYS)[number],
  NonNullable<PropertiesFetchParams["searchBy"]>
> = {
  "Property Name": "propertyName",
  "Property Code": "propertyCode",
};

export function getFirstQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildPropertiesFetchParams({
  includeDeletedOnly = false,
  limit,
  offset,
  filterParams,
  areaId,
}: {
  includeDeletedOnly?: boolean;
  limit: number;
  offset: number;
  filterParams: PropertiesFilterParams;
  areaId?: string;
}): PropertiesFetchParams {
  const fetchParams: PropertiesFetchParams = { limit, offset, includeDeletedOnly };

  if (filterParams && filterParams.searchValue) {
    const mappedSearchBy =
      SEARCH_KEY_TO_API_FIELD[
        filterParams.searchKey as keyof typeof SEARCH_KEY_TO_API_FIELD
      ];
    if (mappedSearchBy) {
      fetchParams.searchBy = mappedSearchBy;
      fetchParams.searchKey = filterParams.searchValue;
    }
  }

  if (areaId) {
    fetchParams.searchBy = "location";
    fetchParams.searchKey = areaId;
  }

  return fetchParams;
}

export function getPropertyDisplayName(property: PropertiesListItem): string {
  return property.propertyName ?? property.name ?? property.heading ?? "N/A";
}

const normalizeLocationPart = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function getPropertyLocationLines(property: PropertiesListItem): {
  primary: string;
  secondary?: string;
} {
  const primaryParts = [
    normalizeLocationPart(property.area),
    normalizeLocationPart(property.city),
    normalizeLocationPart(property.state),
  ].filter((value, index, arr): value is string =>
    Boolean(value) && arr.indexOf(value) === index
  );

  const secondary =
    normalizeLocationPart(property.destination) ??
    normalizeLocationPart(property.locality) ??
    normalizeLocationPart(property.region) ??
    undefined;

  return {
    primary: primaryParts.join(", ") || "N/A",
    secondary,
  };
}

export function formatPropertyLocation(property: PropertiesListItem): string {
  const { primary, secondary } = getPropertyLocationLines(property);
  return secondary ? `${primary}, ${secondary}` : primary;
}

export function isPropertyLive(property: PropertiesListItem): boolean {
  return !Boolean(property.isDisabled || property.is_disabled);
}
