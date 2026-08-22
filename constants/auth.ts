/**
 * Auth-related constants (login, validation).
 * Used by the root login page and any auth checks.
 */

/** Indian mobile number length without country code (10 digits). */
export const PHONE_LENGTH = 10;

/** OTP length (digits) for verification. */
export const OTP_LENGTH = 6;

/** Minimum OTP length considered valid for verification. */
export const OTP_MIN_LENGTH = OTP_LENGTH;

/** Maximum OTP length (digits) accepted in the input. */
export const OTP_MAX_LENGTH = OTP_LENGTH;

/** Path for the login page (navbar and layout hide shell on this route). */
export const LOGIN_PATH = "/";

/** Regex for basic email validation (used in admin and other forms). */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cached admin user info shape (from localStorage). */
export type AdminUserInfo = { name?: string; email?: string; phone?: string } | null;
