// constants/cities.ts

export const CITIES_VALIDATION = {
    nameRequired: "City name is required",
    nameMinLength: "City name must be at least 2 characters",
    nameMaxLength: "City name must be at most 100 characters",
    cityTagRequired: "City tag is required",
    cityTagInvalid: "City tag must be exactly 3 uppercase letters",
    stateRequired: "State is required",
    weightInvalid: "Weight must be a non-negative number",
    slugInvalid: "Slug can only contain lowercase letters, numbers, and hyphens",
    iconInvalidType: "Only WebP format is accepted",
    iconMaxSize: "Icon must be less than 50KB",
    iconInvalidUrl: "Icon URL must start with http:// or https://",
    duplicateName: "A city with this name already exists in the selected state",
  };
  
  export const CITIES_ERRORS = {
    unauthorized: "Unauthorized",
    notFound: "City not found",
    createFailed: "Failed to create city",
    updateFailed: "Failed to update city",
    deleteFailed: "Failed to delete city. It may be in use.",
    fetchFailed: "Failed to fetch cities",
    fetchCityFailed: "Failed to fetch city",
    networkError: "Network error. Please try again.",
    inUse: "Cannot delete city; it is in use by areas or properties",
  };
  
  export const CITIES_SUCCESS = {
    created: "City created successfully",
    updated: "City updated successfully",
    deleted: "City deleted successfully",
  };
  
  export const ICON_CONFIG = {
    maxSizeKB: 50,
    acceptedTypes: ".webp",
    mimeType: "image/webp",
    folder: "cities/icons",
  };
  
  export const SEARCH_KEYS = ["Name", "Weight"] as const;
  export type CitySearchKey = (typeof SEARCH_KEYS)[number];
  
  export const BREADCRUMBS = {
    list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/cities", label: "Cities" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/cities", label: "Cities" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/cities", label: "Cities" },
      { href: "#", label: "Edit" },
    ],
  };
  
  export const TABLE_COLUMNS = [
    "S. No.",
    "City",
    "City Tag",
    "Slug",
    "State",
    "Featured",
    "Weight",
    "Actions",
  ] as const;
