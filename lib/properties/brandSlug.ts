import type { BrandSlug } from "./propertyEditorDraft";

/**
 * Maps UI-selected brand id/name-like values to canonical editor brand slugs.
 * Falls back to `instafarms` as baseline when value is unknown.
 */
export const resolveBrandSlugFromId = (
  brandId: string | null | undefined,
): BrandSlug => {
  return brandId === "mago" ? brandId : "instafarms";
};

/**
 * Maps brand display names to canonical slugs.
 * Examples: "Instafarms" -> "instafarms", "Mago" -> "mago".
 */
export const resolveBrandSlugFromName = (
  brandName: string | null | undefined,
): BrandSlug => {
  const normalized = String(brandName ?? "").toLowerCase();
  if (normalized.includes("instafarm")) return "instafarms";
  if (normalized.includes("mago")) return "mago";
  return "instafarms";
};
