export const AREAS_VALIDATION = {
    nameRequired: "Area name is required",
    nameMinLength: "Area name must be at least 2 characters",
    nameMaxLength: "Area name must be at most 100 characters",
    cityRequired: "City is required",
    stateRequired: "State is required",
    slugInvalid: "Slug must contain only lowercase letters, numbers, and hyphens",
    weightInvalid: "Weight must be a valid number",
    iconInvalidUrl: "Icon must be a valid URL starting with http:// or https://",
    iconMaxSize: "Icon file must be less than 50KB",
    iconInvalidType: "Only WebP or PNG image files are allowed",
    duplicateName: "An area with this name already exists in the selected city",
  } as const;
  
  export const AREAS_ERRORS = {
    unauthorized: "You are not authorized to perform this action",
    notFound: "Area not found",
    createFailed: "Failed to create area. Please try again",
    updateFailed: "Failed to update area. Please try again",
    deleteFailed: "Failed to delete area. Please try again",
    fetchFailed: "Failed to fetch areas. Please try again",
    fetchAreaFailed: "Failed to fetch area details. Please try again",
    networkError: "Network error. Please check your connection and try again",
    cityFetchFailed: "Failed to fetch cities for selected state",
  } as const;
  
  export const AREAS_SUCCESS = {
    created: "Area created successfully",
    updated: "Area updated successfully",
    deleted: "Area deleted successfully",
    iconUploaded: "Icon uploaded successfully",
  } as const;
  
  export const ICON_CONFIG = {
    maxSizeKB: 50,
    acceptedTypes: ".webp,.png",
    folder: "icons/areas",
  } as const;
  
  export const AREA_BREADCRUMBS = {
    list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/areas", label: "Areas" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/areas", label: "Areas" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/areas", label: "Areas" },
      { href: "#", label: "Edit" },
    ],
  } as const;
  
  export const SEARCH_KEYS = ["Name", "Weight"] as const;