/**
 * Bookings: breadcrumbs, titles, search keys, error and validation messages.
 * Used by bookings list page, create/edit, and bookingActions.
 */

import { ADMIN_BASE_PATH } from "@/constants/routes";

// Breadcrumb configurations
export const BOOKINGS_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "#", label: "Bookings" },
  ],
  create: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "#", label: "Create" },
  ],
  edit: [
    { href: "/", label: "Home" },
    { href: ADMIN_BASE_PATH, label: "Admin" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "#", label: "Edit" },
  ],
};

// Page titles
export const BOOKINGS_TITLES = {
  list: "Bookings",
  create: "Create Booking",
  edit: "Edit Booking",
};

// Search keys for list page (must match backend searchKey mapping)
export const BOOKINGS_SEARCH_KEYS = [
  "Property Code",
  "Property Name",
  "Booking Creator Name",
] as const;

// Error messages for list and actions
export const BOOKINGS_ERRORS = {
  fetchFailed: "Failed to fetch bookings. Please try again.",
  fetchArchivedFailed: "Failed to fetch archived bookings. Please try again.",
  fetchCancelledFailed: "Failed to fetch cancelled bookings. Please try again.",
  fetchAvailabilityFailed: "Failed to fetch availability. Please try again.",
  unauthorized: "You don't have permission to view bookings.",
  createFailed: "Failed to create booking. Please check your input and try again.",
  updateFailed: "Failed to update booking. Please check your input and try again.",
  cancelFailed: "Failed to cancel booking. Please try again.",
  invalidPaymentData: "Invalid payment data. Please check payment fields.",
  invalidBookingId: "Invalid booking id",
  downloadFailed: "Failed to download bookings. Please try again.",
};

// Validation / parse error messages (shown when form parse fails)
export const BOOKINGS_VALIDATION = {
  selectProperty: "Please select a property",
  selectCustomer: "Please select a customer",
  selectBookingType: "Please select a booking type",
  selectBookingSource: "Please select a booking source",
  validNumbers: "Please enter valid numbers in all numeric fields (guest counts, amounts, etc.)",
  validCheckinCheckout: "Please select valid check-in and check-out dates",
  formValidation: "Form validation error",
};
