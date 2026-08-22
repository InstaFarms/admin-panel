/**
 * Sidebar UI constants: active state and collapsed icon styles.
 * Used by CollapsedSidebarContent and ExpandedSidebarContent.
 */

/** Active/selected state: blue background, white text (collapsed + expanded). */
export const SIDEBAR_ACTIVE_CLASS =
  "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white";

/** Expanded sidebar link active state (with ! for Flowbite override). */
export const SIDEBAR_EXPANDED_ACTIVE_CLASS =
  "!bg-blue-600 !text-white hover:!bg-blue-700 dark:!bg-blue-600 dark:hover:!bg-blue-500 dark:!text-white";

/** Base class for collapsed sidebar icon buttons/links. */
export const SIDEBAR_COLLAPSED_ICON_CLASS = [
  "flex h-10 w-full shrink-0 items-center justify-center rounded-lg p-0",
  "text-gray-500 transition-colors",
  "hover:bg-gray-100 hover:text-gray-900",
  "dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white",
].join(" ");
