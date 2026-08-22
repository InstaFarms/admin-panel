export type LocationRole =
  | "state"
  | "city"
  | "destination"
  | "region"
  | "area"
  | "locality";

export type LocationMarketType =
  | "urban"
  | "leisure"
  | "nearby_escape"
  | "business"
  | "pilgrimage"
  | "mixed";

export type LocationDisplayMode = "area_first" | "listing_first" | "mixed";

export interface BrandLocationFaq {
  question: string;
  answer: string;
  isActive: boolean;
  weight: number;
}

export interface BrandLocationInfo {
  title?: string;
  description?: string;
  howToReach?: {
    title?: string;
    description?: string;
    nearByPlaces?: string[];
  };
  mapSearchKey?: string;
  nearByAttractions?: string[];
}

export interface BrandLocationMeta {
  metaTitle?: string;
  metaDescription?: string;
  metaUrl?: string;
  metaImage?: string;
  metaKeywords?: string;
}

export interface BrandLocationDetail {
  brandId: string;
  locationId?: string;
  slug?: string | null;
  heading?: string | null;
  description?: string | null;
  isActive?: boolean;
  weight?: string | number | null;
  featured?: boolean;
  icon?: string | null;
  faqs?: BrandLocationFaq[];
  info?: BrandLocationInfo;
  meta?: BrandLocationMeta;
}

export interface NearbyLocationMapping {
  id?: string;
  locationId?: string;
  nearbyLocationId: string;
  nearbyLocationName?: string;
  nearbyLocationSlug?: string;
  nearbyLocationRoles?: LocationRole[];
  sortOrder?: string | number | null;
}

export interface LocationLandmark {
  id: string;
  landmark: string;
  slug?: string | null;
  icon?: string | null;
  locationId: string;
  locationName?: string;
  locationSlug?: string;
  locationRoles?: LocationRole[];
}

export interface LocationListItem {
  id: string;
  name: string;
  slug: string;
  locationTag?: string | null;
  locationRoles: LocationRole[];
  parentId?: string | null;
  parentName?: string | null;
  parentSlug?: string | null;
  marketType: LocationMarketType;
  displayMode: LocationDisplayMode;
  isActive: boolean;
  brandSlug?: string | null;
  brandIsActive?: boolean | null;
  brandWeight?: string | null;
  brandFeatured?: boolean | null;
  brandIcon?: string | null;
}

export interface LocationDetail extends LocationListItem {
  createdAt?: string;
  updatedAt?: string;
  activeBrandId?: string | null;
  activeBrandDetail?: BrandLocationDetail | null;
  configuredBrandIds?: string[];
  brandDetails?: BrandLocationDetail[];
  nearbyMappings?: NearbyLocationMapping[];
}

export interface LocationOption {
  id: string;
  name: string;
  slug: string;
  locationTag?: string | null;
  locationRoles: LocationRole[];
  parentId?: string | null;
  marketType: LocationMarketType;
  displayMode: LocationDisplayMode;
  isActive: boolean;
}
