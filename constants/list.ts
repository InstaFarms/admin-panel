/**
 * List-page constants: search keys, filter options, pagination defaults.
 * Used by admin list pages (admins, users, cities, etc.).
 */

/** Search key options for the Admins list page (maps to backend searchBy). */
export const ADMIN_SEARCH_KEYS = ["Name", "Email", "Phone"] as const;

export type AdminSearchKey = (typeof ADMIN_SEARCH_KEYS)[number];

/** Default number of items per page when not specified in URL. */
export const DEFAULT_PAGE_SIZE = 10;

/** Maximum allowed items per page (cap for URL param). */
export const MAX_PAGE_SIZE = 100;

/** URL search param name for the search field (e.g. "Name", "Email"). */
export const SEARCH_KEY_PARAM = "searchKey";

/** URL search param name for the search query value. */
export const SEARCH_VALUE_PARAM = "searchValue";
