import { ADMIN_BASE_PATH } from "@/constants/routes";

export const SEARCH_KEYS = ["Property Name", "Property Code"] as const;
export const DEFAULT_SEARCH_KEY: (typeof SEARCH_KEYS)[number] = "Property Name";

export const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Properties" },
] as const;

/** Columns the admin list can sort on. The API also accepts "weight" (its old default). */
export const SORT_FIELDS = ["createdAt", "propertyName"] as const;
export type PropertiesSort = {
  orderBy: (typeof SORT_FIELDS)[number];
  sortorder: "asc" | "desc";
};
/** Newest first: the admin list is a work queue, so the newest property leads page 1. */
export const DEFAULT_SORT: PropertiesSort = { orderBy: "createdAt", sortorder: "desc" };

export function parseSortParams(params: {
  [key: string]: string | string[] | undefined;
}): PropertiesSort {
  const orderBy = getFirstQueryParam(params.sort);
  const sortorder = getFirstQueryParam(params.dir);
  if (!SORT_FIELDS.includes(orderBy as PropertiesSort["orderBy"])) return DEFAULT_SORT;
  return {
    orderBy: orderBy as PropertiesSort["orderBy"],
    sortorder: sortorder === "asc" ? "asc" : "desc",
  };
}

export type PropertiesListItem = {
  id: string;
  createdAt?: string | null;
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
  orderBy?: string;
  sortorder?: "asc" | "desc";
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
  sort = DEFAULT_SORT,
}: {
  includeDeletedOnly?: boolean;
  limit: number;
  offset: number;
  filterParams: PropertiesFilterParams;
  areaId?: string;
  sort?: PropertiesSort;
}): PropertiesFetchParams {
  const fetchParams: PropertiesFetchParams = {
    limit,
    offset,
    includeDeletedOnly,
    orderBy: sort.orderBy,
    sortorder: sort.sortorder,
  };

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
