/**
 * Shared UI copy and message helpers.
 * Use for empty states, toasts, and other reused text across list/error components.
 */

/**
 * Returns the empty-state message for a list page.
 * @param entityName - Plural entity name for the list (e.g. "admins", "users").
 * @param hasSearch - Whether the user has applied a search/filter.
 */
export function getEmptyListMessage(
  entityName: string,
  hasSearch: boolean
): string {
  if (hasSearch) {
    return `No ${entityName} found matching your search`;
  }
  return `No ${entityName} found`;
}
