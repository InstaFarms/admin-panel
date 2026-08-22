// Breadcrumb configurations
export const ACTIVITIES_BREADCRUMBS = {
    list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "#", label: "Activities" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/activities", label: "Activities" },
      { href: "#", label: "Edit" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/activities", label: "Activities" },
      { href: "#", label: "Create" },
    ],
  };
  
  // Page titles
  export const ACTIVITIES_TITLES = {
    list: "Activities",
    edit: "Edit Activity",
    create: "Create New Activity",
  };
  
  // Search configuration
  export const ACTIVITIES_SEARCH_KEYS = ["Name"] as const;
  
  // Validation messages
  export const ACTIVITIES_VALIDATION = {
    nameRequired: "Activity name is required",
    nameMinLength: "Activity name must be at least 2 characters",
    nameMaxLength: "Activity name cannot exceed 100 characters",
    iconInvalidUrl: "Icon must be a valid URL (http:// or https://)",
    iconMaxSize: "Icon must be under 1MB",
    duplicateName: "An activity with this name already exists",
  };
  
  // Error messages
  export const ACTIVITIES_ERRORS = {
    fetchFailed: "Failed to fetch activities. Please try again.",
    fetchActivityFailed: "Failed to fetch activity details. It may have been deleted.",
    createFailed: "Failed to create activity. Please check your input and try again.",
    updateFailed: "Failed to update activity. Please check your input and try again.",
    deleteFailed: "Failed to delete activity. It may be in use by properties.",
    notFound: "Activity not found",
    unauthorized: "You don't have permission to perform this action",
    networkError: "Network error. Please check your connection and try again.",
  };
  
  // Success messages
  export const ACTIVITIES_SUCCESS = {
    created: "Activity created successfully",
    updated: "Activity updated successfully",
    deleted: "Activity deleted successfully",
    iconUploaded: "Icon uploaded successfully",
  };
  
  // Icon upload configuration
  export const ICON_CONFIG = {
    maxSizeMB: 1,
    acceptedTypes: "image/*",
    folder: "icons/activities",
  };