export const CUSTOMERS_VALIDATION = {
    firstNameRequired: "First name is required",
    firstNameMinLength: "First name must be at least 2 characters",
    firstNameMaxLength: "First name must be at most 50 characters",
    lastNameMaxLength: "Last name must be at most 50 characters",
    emailRequired: "Email is required",
    emailInvalid: "Please enter a valid email address",
    mobileRequired: "Mobile number is required",
    mobileInvalid: "Please enter a valid 10-digit mobile number",
    mobileStartsWithZero: "Mobile number cannot start with 0",
    mobileDuplicate: "This mobile number is already registered to another customer",
    emailDuplicate: "This email is already registered to another customer",
    genderRequired: "Please select a gender",
    dobInvalid: "Please enter a valid date of birth",
    dobFuture: "Date of birth cannot be in the future",
  };
  
  export const CUSTOMERS_ERRORS = {
    unauthorized: "Unauthorized",
    notFound: "Customer not found",
    createFailed: "Failed to create customer",
    updateFailed: "Failed to update customer",
    deleteFailed: "Failed to delete customer",
    fetchFailed: "Failed to fetch customers",
    fetchCustomerFailed: "Failed to fetch customer",
    networkError: "Network error. Please try again.",
  };
  
  export const CUSTOMERS_SUCCESS = {
    created: "Customer created successfully",
    updated: "Customer updated successfully",
    deleted: "Customer deleted successfully",
  };
  
  export const GENDER_OPTIONS = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ] as const;
  
  export const SEARCH_KEYS = ["Name", "Email", "Mobile"] as const;
  export type CustomerSearchKey = (typeof SEARCH_KEYS)[number];
  
  export const BREADCRUMBS = {
  list: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/Instafarms-customer", label: "Instafarms Customers" },
    ],
    create: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/Instafarms-customer", label: "Instafarms Customers" },
      { href: "#", label: "Create" },
    ],
    edit: [
      { href: "/", label: "Home" },
      { href: "/admin", label: "Admin" },
      { href: "/admin/Instafarms-customer", label: "Instafarms Customers" },
      { href: "#", label: "Edit" },
    ],
  };
  
  export const TABLE_COLUMNS = [
    "S. No.",
    "Name",
    "Email",
    "Mobile Number",
    "Gender",
    "Age",
    "Actions",
  ] as const;
