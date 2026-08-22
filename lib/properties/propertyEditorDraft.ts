export type PropertySourceType = "INSTAFARMS_EXCLUSIVE" | "MAGO" | "ELIVAAS";

export const PROPERTY_SOURCES: PropertySourceType[] = ["INSTAFARMS_EXCLUSIVE", "MAGO", "ELIVAAS"];

// Legacy aliases for backward compatibility during the refactor
export type BrandSlug = PropertySourceType;
export const BRAND_SLUGS: BrandSlug[] = PROPERTY_SOURCES;

export interface BrandTabBundle {
  detail: Record<string, unknown>;
  address: Record<string, unknown>;
  googlePlace: Record<string, unknown>;
  commercial: Record<string, unknown>;
  amenitiesActivities: Record<string, unknown>;
  spaces: unknown[];
  peopleRoles: Record<string, unknown>;
  plans: Record<string, unknown>;
  others: Record<string, unknown>;
  gallery?: {
    gallery: unknown[];
    coverPhotos: unknown[];
  };
}

export type PropertyEditorDraft = Record<PropertySourceType, BrandTabBundle>;

export const createEmptyBrandTabBundle = (): BrandTabBundle => ({
  detail: {},
  address: {},
  googlePlace: {},
  commercial: {},
  amenitiesActivities: {},
  spaces: [],
  peopleRoles: {},
  plans: {},
  others: {},
  gallery: {
    gallery: [],
    coverPhotos: [],
  },
});

export const createEmptyPropertyEditorDraft = (): PropertyEditorDraft => ({
  INSTAFARMS_EXCLUSIVE: createEmptyBrandTabBundle(),
  MAGO: createEmptyBrandTabBundle(),
  ELIVAAS: createEmptyBrandTabBundle(),
});
