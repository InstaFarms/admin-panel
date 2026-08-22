// Breadcrumb configurations
export const AMENITIES_BREADCRUMBS = {
    list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "#", label: "Amenities" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/amenities", label: "Amenities" },
      { href: "#", label: "Edit" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/amenities", label: "Amenities" },
      { href: "#", label: "Create" },
    ],
  };
  
  // Page titles
  export const AMENITIES_TITLES = {
    list: "Amenities",
    edit: "Edit Amenity",
    create: "Create New Amenity",
  };
  
  // Search configuration
  export const AMENITIES_SEARCH_KEYS = ["Name"] as const;
  
  // Validation messages
  export const AMENITIES_VALIDATION = {
    nameRequired: "Amenity name is required",
    nameMinLength: "Amenity name must be at least 2 characters",
    nameMaxLength: "Amenity name cannot exceed 100 characters",
    iconInvalidUrl: "Icon must be a valid URL (http:// or https://)",
    iconMaxSize: "Icon must be under 1MB",
    duplicateName: "An amenity with this name already exists",
  };
  
  // Error messages
  export const AMENITIES_ERRORS = {
    fetchFailed: "Failed to fetch amenities. Please try again.",
    fetchAmenityFailed: "Failed to fetch amenity details. It may have been deleted.",
    createFailed: "Failed to create amenity. Please check your input and try again.",
    updateFailed: "Failed to update amenity. Please check your input and try again.",
    deleteFailed: "Failed to delete amenity. It may be in use by properties.",
    notFound: "Amenity not found",
    unauthorized: "You don't have permission to perform this action",
    networkError: "Network error. Please check your connection and try again.",
  };
  
  // Success messages
  export const AMENITIES_SUCCESS = {
    created: "Amenity created successfully",
    updated: "Amenity updated successfully",
    deleted: "Amenity deleted successfully",
    iconUploaded: "Icon uploaded successfully",
  };
  
  // Icon upload configuration
  export const ICON_CONFIG = {
    maxSizeMB: 1,
    acceptedTypes: "image/*",
    folder: "icons/amenities",
  };