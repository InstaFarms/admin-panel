import { GALLERY_TAB_KEYS, GALLERY_TAB_TITLES } from "@/hooks/properties/usePropertyGallery";

/** Shared category options for gallery cards and download (value/label for selects). */
export const CATEGORY_OPTIONS = GALLERY_TAB_KEYS.map((value, i) => ({
  value,
  label: GALLERY_TAB_TITLES[i] ?? value,
}));
