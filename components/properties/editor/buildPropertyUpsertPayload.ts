"use client";

import {
  DEFAULT_PROPERTY_RELATION_INTENT,
  type PropertyUpsertPayload,
} from "@/lib/properties/propertyUpsert";
import {
  BRAND_SLUGS,
  createEmptyBrandTabBundle,
  type BrandSlug,
  type PropertyEditorDraft,
} from "@/lib/properties/propertyEditorDraft";

type AnyRecord = Record<string, unknown>;

interface BuildPropertyUpsertPayloadInput {
  draft: PropertyEditorDraft | null | undefined;
  dirtySections?: string[];
  dirtyPaths?: string[];
  serverSnapshot?: PropertyEditorDraft | null;
  brandSlugs?: BrandSlug[];
}

const ensureObject = (value: unknown): AnyRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};

const ensureArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeGalleryItem = (value: unknown, index: number): AnyRecord => {
  const source = ensureObject(value);
  const url =
    toOptionalString(source.url) ??
    toOptionalString(source.photoUrl) ??
    toOptionalString(source.watermarkedUrlByInstafarms) ??
    toOptionalString(source.rawUrl) ??
    toOptionalString(source.originalUrl) ??
    "";

  const listingUrl =
    toOptionalString(source.listingUrl) ??
    toOptionalString(source.watermarkedUrlByListing) ??
    undefined;

  const altText =
    toOptionalString(source.altText) ??
    toOptionalString(source.instafarmsAltText) ??
    undefined;

  return {
    ...source,
    id: toOptionalString(source.id),
    url,
    rawUrl: toOptionalString(source.rawUrl) ?? toOptionalString(source.originalUrl) ?? undefined,
    listingUrl,
    name: toOptionalString(source.name) ?? toOptionalString(source.fileName) ?? undefined,
    order: typeof source.order === "number"
      ? source.order
      : typeof source.sortOrder === "number"
        ? source.sortOrder
        : index + 1,
    altText,
    cover:
      typeof source.cover === "number"
        ? source.cover
        : source.isCover === true
          ? 1
          : 0,
    tag: toOptionalString(source.tag) ?? toOptionalString(source.key) ?? undefined,
  };
};

const normalizeGallery = (galleryInput: unknown): AnyRecord[] =>
  ensureArray(galleryInput).map((item, index) => normalizeGalleryItem(item, index));

const EMPTY_TO_NULL_UUID_FIELDS = [
  "areaId",
  "cityId",
  "stateId",
  "propertyTypeId",
  "secondaryAreaId1",
  "secondaryAreaId2",
  "secondaryAreaId3",
  "secondaryAreaId4",
] as const;

const normalizeUuidFieldsForPayload = (input: unknown): AnyRecord => {
  const detail = { ...ensureObject(input) };
  for (const key of EMPTY_TO_NULL_UUID_FIELDS) {
    if (detail[key] === "") detail[key] = null;
  }
  return detail;
};

const normalizeDetailForPayload = (detailInput: unknown): AnyRecord =>
  normalizeUuidFieldsForPayload(detailInput);

const toIntegerOrNull = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
};

const toDecimalOrNull = (value: unknown): string | number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? trimmed : null;
  }
  return null;
};

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const parseJsonString = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeBeddingAvailabilityForPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return [];

  const parsed = parseJsonString(trimmed);
  return Array.isArray(parsed) ? parsed : value;
};

const normalizeContentItemsFromText = (value: string) =>
  value
    .replace(/<\/(li|p|div|br)\s*>/gi, "\n")
    .replace(/<(li|p|div|br)\b[^>]*>/gi, "\n")
    .split(/\r?\n+/)
    .map((line) => stripHtml(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ label }));

const normalizeContentSectionForPayload = (value: unknown): unknown => {
  if (!value || typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseJsonString(trimmed);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return { items: parsed };
  }

  return {
    items: normalizeContentItemsFromText(trimmed),
  };
};

const normalizeBrandBundleForPayload = (brandBundleInput: unknown) => {
  const fallback = createEmptyBrandTabBundle();
  const bundle = ensureObject(brandBundleInput);
  const commercial = { ...ensureObject(bundle.commercial) };
  const others = { ...fallback.others, ...ensureObject(bundle.others) };

  if ("advancePaymentAmount" in commercial) {
    commercial.advancePaymentAmount = toIntegerOrNull(commercial.advancePaymentAmount);
  }
  if ("advancePaymentPercentage" in commercial) {
    commercial.advancePaymentPercentage = toDecimalOrNull(commercial.advancePaymentPercentage);
  }
  commercial.commissionPercentage = toIntegerOrNull(commercial.commissionPercentage) ?? 0;
  commercial.securityDeposit = toIntegerOrNull(commercial.securityDeposit) ?? 0;
  commercial.cookingAccessFee = toIntegerOrNull(commercial.cookingAccessFee) ?? 0;
  commercial.bonFireFee = toIntegerOrNull(commercial.bonFireFee) ?? 0;
  commercial.barbequeFee = toIntegerOrNull(commercial.barbequeFee) ?? 0;
  commercial.cleaningFee = toIntegerOrNull(commercial.cleaningFee) ?? 0;
  commercial.lateCheckoutCharges = toIntegerOrNull(commercial.lateCheckoutCharges) ?? 0;

  const galleryNode = ensureObject(bundle.gallery);

  if ("bedding_availability" in others) {
    others.bedding_availability = normalizeBeddingAvailabilityForPayload(others.bedding_availability);
  }
  if ("experiences" in others) {
    others.experiences = normalizeContentSectionForPayload(others.experiences);
  }
  if ("nearbyAttractions" in others) {
    others.nearbyAttractions = normalizeContentSectionForPayload(others.nearbyAttractions);
  }
  if ("foodOptions" in others) {
    others.foodOptions = normalizeContentSectionForPayload(others.foodOptions);
  }
  if ("miscCharges" in others) {
    others.miscCharges = normalizeContentSectionForPayload(others.miscCharges);
  }

  return {
    detail: normalizeDetailForPayload(bundle.detail),
    address: normalizeUuidFieldsForPayload({
      ...fallback.address,
      ...ensureObject(bundle.address),
    }),
    googlePlace: { ...fallback.googlePlace, ...ensureObject(bundle.googlePlace) },
    commercial,
    amenitiesActivities: {
      ...fallback.amenitiesActivities,
      ...ensureObject(bundle.amenitiesActivities),
    },
    spaces: ensureArray(bundle.spaces),
    peopleRoles: { ...fallback.peopleRoles, ...ensureObject(bundle.peopleRoles) },
    plans: { ...fallback.plans, ...ensureObject(bundle.plans) },
    others,
    gallery: {
      gallery: normalizeGallery(galleryNode.gallery),
      coverPhotos: ensureArray(galleryNode.coverPhotos),
    },
  };
};

export const buildRelationIntentFromDirtySections = (input: BuildPropertyUpsertPayloadInput) => {
  const relationIntent = {
    ...DEFAULT_PROPERTY_RELATION_INTENT,
  } as Record<string, "replace" | "unchanged">;
  const hasServerSnapshot = Boolean(input.serverSnapshot);
  const dirtySections = new Set<string>(ensureArray<string>(input.dirtySections));
  const dirtyPaths = new Set<string>(ensureArray<string>(input.dirtyPaths));

  if (!hasServerSnapshot) return relationIntent;

  const matchesAnyDirtyPath = (prefixes: string[]) =>
    Array.from(new Set([...dirtyPaths, ...dirtySections])).some((dirty) =>
      prefixes.some((prefix) => dirty === prefix || dirty.startsWith(`${prefix}.`)),
    );
  // Prefix against the brand keys actually present on the draft/snapshot being
  // diffed, not the canonical BRAND_SLUGS list. The property-source migration
  // renamed BRAND_SLUGS to the new PropertySource casing (INSTAFARMS_EXCLUSIVE/
  // MAGO/ELIVAAS), but the existing-property edit flow (usePropertyBootstrap)
  // still builds drafts keyed by the legacy lowercase slugs (instafarms/mago/
  // listing). Matching against the wrong casing meant every dirty path silently
  // missed, so relationIntent always came out "unchanged" and edits to owners/
  // managers/caretakers/amenities/plans/etc. never got saved even though the
  // request "succeeded". Deriving prefixes from the actual object keys keeps
  // this correct regardless of which casing scheme is in play at runtime.
  const runtimeBrandSlugs = Array.from(
    new Set([
      ...Object.keys(ensureObject(input.serverSnapshot)),
      ...Object.keys(ensureObject(input.draft)),
    ]),
  );
  const perBrandPrefixes = (suffix: string) => runtimeBrandSlugs.map((slug) => `${slug}.${suffix}`);

  relationIntent.amenities = matchesAnyDirtyPath(perBrandPrefixes("amenitiesActivities.amenities"))
    ? "replace"
    : "unchanged";
  relationIntent.activities = matchesAnyDirtyPath(perBrandPrefixes("amenitiesActivities.activities"))
    ? "replace"
    : "unchanged";
  relationIntent.specialDates = matchesAnyDirtyPath(perBrandPrefixes("commercial.specialDates"))
    ? "replace"
    : "unchanged";
  relationIntent.owners = matchesAnyDirtyPath(perBrandPrefixes("peopleRoles.owners"))
    ? "replace"
    : "unchanged";
  relationIntent.managers = matchesAnyDirtyPath(perBrandPrefixes("peopleRoles.managers"))
    ? "replace"
    : "unchanged";
  relationIntent.caretakers = matchesAnyDirtyPath(perBrandPrefixes("peopleRoles.caretakers"))
    ? "replace"
    : "unchanged";
  relationIntent.supervisors = matchesAnyDirtyPath(perBrandPrefixes("peopleRoles.supervisors"))
    ? "replace"
    : "unchanged";
  relationIntent.plans = matchesAnyDirtyPath(perBrandPrefixes("plans")) ? "replace" : "unchanged";
  relationIntent.spaces = matchesAnyDirtyPath(perBrandPrefixes("spaces")) ? "replace" : "unchanged";
  relationIntent.gallery = matchesAnyDirtyPath(perBrandPrefixes("gallery")) ? "replace" : "unchanged";
  relationIntent.safetyHygiene = "unchanged";

  return relationIntent;
};

export const buildPropertyUpsertPayload = (
  input: BuildPropertyUpsertPayloadInput,
): PropertyUpsertPayload => {
  const draft = ensureObject(input.draft);
  // Trust the caller's brandSlugs as-is rather than gating them through
  // BRAND_SLUGS: that constant holds the new PropertySource casing
  // (INSTAFARMS_EXCLUSIVE/MAGO/ELIVAAS), but callers on the existing-property
  // edit flow still pass the legacy lowercase slug (see the note in
  // buildRelationIntentFromDirtySections above). Filtering against the wrong
  // casing silently dropped every requested slug, so a Mago-tab edit ended up
  // saving whatever the "instafarms" fallback below produced instead.
  const requestedBrandSlugs = ensureArray<BrandSlug>(input.brandSlugs);
  const draftBrandSlugs = (requestedBrandSlugs.length > 0 ? requestedBrandSlugs : BRAND_SLUGS).filter((slug) =>
    Object.prototype.hasOwnProperty.call(draft, slug),
  );
  if (requestedBrandSlugs.length === 0 && !draftBrandSlugs.includes("instafarms")) {
    draftBrandSlugs.unshift("instafarms");
  }

  const normalizedDraft = draftBrandSlugs.reduce<
    Partial<Record<BrandSlug, ReturnType<typeof normalizeBrandBundleForPayload>>>
  >(
    (acc, slug) => {
      acc[slug] = normalizeBrandBundleForPayload(draft[slug]);
      return acc;
    },
    {},
  );

  const payload = {
    ...normalizedDraft,
    relationIntent: buildRelationIntentFromDirtySections(input),
  } as PropertyUpsertPayload;

  return payload;
};
