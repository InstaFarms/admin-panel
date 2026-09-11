/**
 * Tab indices for the property editor.
 *
 * Kept in their own module, deliberately: PropertyEditorTabs.tsx pulls in
 * flowbite-react and GallerySection, so importing this table from there drags
 * the whole tab UI along — and a test that mocks PropertyEditorTabs loses the
 * constant with it, which is how PropertyEditor's tests came to fail with
 * "No PROPERTY_EDITOR_TAB_INDEX export is defined on the mock".
 *
 * This file has no React or UI dependencies at all.
 */
export const PROPERTY_EDITOR_TAB_INDEX = {
  DETAIL: 0,
  AUDIT: 1,
  ADDRESS: 2,
  GOOGLE_PLACE: 3,
  COMMERCIAL: 4,
  AMENITIES: 5,
  GALLERY: 6,
  SPACES: 7,
  PEOPLE: 8,
  PLANS: 9,
  ICAL: 10,
  OTHERS: 11,
  OCCASION_SCORES: 12,
  SLEEPING_SLOTS: 13,
  // Manage Rooms renders after Sleeping Slots and only for resorts; keeping the
  // conditional tab LAST keeps every unconditional tab's index stable.
  MANAGE_ROOMS: 14,
} as const;
