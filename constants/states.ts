export const STATES_VALIDATION = {
    nameRequired: "State name is required",
    nameMinLength: "State name must be at least 2 characters",
    nameMaxLength: "State name must be at most 100 characters",
    weightInvalid: "Weight must be a valid number",
    iconMaxSize: "Icon file must be less than 50KB",
    iconInvalidType: "Only WebP image files are allowed",
    slugInvalid: "Slug must contain only lowercase letters, numbers, and hyphens",
  } as const;
  
  export const STATES_ERRORS = {
    unauthorized: "You are not authorized to perform this action",
    notFound: "State not found",
    createFailed: "Failed to create state. Please try again",
    updateFailed: "Failed to update state. Please try again",
    deleteFailed: "Failed to delete state. Please try again",
    fetchFailed: "Failed to fetch states. Please try again",
    fetchStateFailed: "Failed to fetch state details. Please try again",
    networkError: "Network error. Please check your connection and try again",
    duplicateName: "A state with this name already exists",
  } as const;
  
  export const STATES_SUCCESS = {
    created: "State created successfully",
    updated: "State updated successfully",
    deleted: "State deleted successfully",
    iconUploaded: "Icon uploaded successfully",
  } as const;
  
  export const STATE_ICON_CONFIG = {
    maxSizeKB: 50,
    acceptedTypes: ".webp",
    folder: "states",
  } as const;
  
  export const STATE_BREADCRUMBS = {
    list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "#", label: "States" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/states", label: "States" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/states", label: "States" },
      { href: "#", label: "Edit" },
    ],
  } as const;
  
  export const STATE_SEARCH_KEYS = ["Name", "Weight"] as const;