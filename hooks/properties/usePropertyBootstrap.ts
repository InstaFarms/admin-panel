"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type {
  Activity,
  Amenity,
  PropertyType,
  State,
  _Area,
  _City,
} from "@/utils/types";
import { fetchHelperData, fetchPropertyFullData } from "@/actions/propertyActions";
import { fetchAccommodationGstConfig } from "@/actions/taxConfigurationActions";
import type { BrandTabBundle, PropertyEditorDraft } from "@/lib/properties/propertyEditorDraft";
import {
  BRAND_SLUGS,
  createEmptyBrandTabBundle,
  createEmptyPropertyEditorDraft,
  type BrandSlug,
} from "@/lib/properties/propertyEditorDraft";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const numberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const toFieldName = (dayKey: (typeof DAY_KEYS)[number], suffix: string) =>
  `${dayKey}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;

/**
 * Currently effective accommodation GST boundary/rates (see
 * apps/if-api/src/routes/tax-configuration.ts). Used as the fallback
 * default when the caller hasn't fetched a live policy yet.
 */
export type GstPolicy = { boundary: number; lower: number; higher: number };
const DEFAULT_GST_POLICY: GstPolicy = { boundary: 7500, lower: 5, higher: 18 };

const computeDayWiseCommercialDerivedFields = (
  commercial: Record<string, unknown>,
  maxGuestCount: number | null,
  gstPolicy: GstPolicy = DEFAULT_GST_POLICY,
): Record<string, unknown> => {
  const next = { ...commercial };

  for (const dayKey of DAY_KEYS) {
    const price = numberOrNull(next[toFieldName(dayKey, "Price")]);
    const adultExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "AdultExtraGuestCharge")],
    );
    const childExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "ChildExtraGuestCharge")],
    );
    const infantExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "InfantExtraGuestCharge")],
    );
    const floatingAdultExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "FloatingAdultExtraGuestCharge")],
    );
    const floatingChildExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "FloatingChildExtraGuestCharge")],
    );
    const floatingInfantExtraGuestCharge = numberOrNull(
      next[toFieldName(dayKey, "FloatingInfantExtraGuestCharge")],
    );
    const baseGuestCount = numberOrNull(next[toFieldName(dayKey, "BaseGuestCount")]);

    const maxExtraGuestPriceKey = toFieldName(dayKey, "MaxExtraGuestPrice");
    const maxTotalKey = toFieldName(dayKey, "MaxTotal");
    const gstSlabKey = toFieldName(dayKey, "GSTslab");

    const hasAnyExtraGuestCharge =
      adultExtraGuestCharge != null ||
      childExtraGuestCharge != null ||
      infantExtraGuestCharge != null ||
      floatingAdultExtraGuestCharge != null ||
      floatingChildExtraGuestCharge != null ||
      floatingInfantExtraGuestCharge != null;

    if (hasAnyExtraGuestCharge) {
      const derivedMaxExtraGuestPrice = Math.max(
        adultExtraGuestCharge ?? 0,
        childExtraGuestCharge ?? 0,
        infantExtraGuestCharge ?? 0,
        floatingAdultExtraGuestCharge ?? 0,
        floatingChildExtraGuestCharge ?? 0,
        floatingInfantExtraGuestCharge ?? 0,
      );
      next[maxExtraGuestPriceKey] = derivedMaxExtraGuestPrice;
    }

    const derivedMaxExtraGuestPrice = numberOrNull(next[maxExtraGuestPriceKey]);
    const hasInputsForTotal =
      price != null ||
      baseGuestCount != null ||
      maxGuestCount != null ||
      derivedMaxExtraGuestPrice != null;

    if (
      hasInputsForTotal &&
      (maxGuestCount ?? 0) > 0 &&
      (baseGuestCount ?? 0) > 0
    ) {
      const extraGuests = Math.max(0, (maxGuestCount ?? 0) - (baseGuestCount ?? 0));
      next[maxTotalKey] = (price ?? 0) + extraGuests * (derivedMaxExtraGuestPrice ?? 0);
    }

    // GST slab suggestion is based on the day's own price against the
    // accommodation GST boundary -- not maxTotal's speculative max-extra-
    // guest total, which made the suggestion depend on guest-count fields
    // that are often unset. Never overwrites a slab already chosen/saved.
    const existingGstSlab = numberOrNull(next[gstSlabKey]);
    if (existingGstSlab == null && price != null) {
      next[gstSlabKey] =
        price > gstPolicy.boundary ? gstPolicy.higher : gstPolicy.lower;
    }

    const gstSlab = numberOrNull(next[gstSlabKey]) ?? 0;
    const withGstMappings = [
      ["Price", "PriceWithGST"],
      ["AdultExtraGuestCharge", "AdultExtraGuestChargeWithGST"],
      ["ChildExtraGuestCharge", "ChildExtraGuestChargeWithGST"],
      ["InfantExtraGuestCharge", "InfantExtraGuestChargeWithGST"],
      ["FloatingAdultExtraGuestCharge", "FloatingAdultExtraGuestChargeWithGST"],
      ["FloatingChildExtraGuestCharge", "FloatingChildExtraGuestChargeWithGST"],
      ["FloatingInfantExtraGuestCharge", "FloatingInfantExtraGuestChargeWithGST"],
    ] as const;

    for (const [baseSuffix, withGstSuffix] of withGstMappings) {
      const baseValue = numberOrNull(next[toFieldName(dayKey, baseSuffix)]);
      if (baseValue != null) {
        next[toFieldName(dayKey, withGstSuffix)] = Math.round(
          (baseValue + (baseValue * gstSlab) / 100) * 100,
        ) / 100;
      }
    }
  }

  return next;
};

const computeSpecialDateDerivedFields = (
  entry: Record<string, unknown>,
  maxGuestCount: number | null,
  gstPolicy: GstPolicy = DEFAULT_GST_POLICY,
): Record<string, unknown> => {
  const next = { ...entry };
  const discount = numberOrNull(next.discount) ?? 0;
  const adultExtraGuestCharge = numberOrNull(next.adultExtraGuestCharge) ?? 0;
  const childExtraGuestCharge = numberOrNull(next.childExtraGuestCharge) ?? 0;
  const infantExtraGuestCharge = numberOrNull(next.infantExtraGuestCharge) ?? 0;
  const floatingAdultExtraGuestCharge =
    numberOrNull(next.floatingAdultExtraGuestCharge) ?? 0;
  const floatingChildExtraGuestCharge =
    numberOrNull(next.floatingChildExtraGuestCharge) ?? 0;
  const floatingInfantExtraGuestCharge =
    numberOrNull(next.floatingInfantExtraGuestCharge) ?? 0;
  const baseGuestCount = numberOrNull(next.baseGuestCount) ?? 0;
  const basePrice = numberOrNull(next.price) ?? 0;

  const maxPerGuestCharge = Math.max(
    adultExtraGuestCharge,
    childExtraGuestCharge,
    infantExtraGuestCharge,
    floatingAdultExtraGuestCharge,
    floatingChildExtraGuestCharge,
    floatingInfantExtraGuestCharge,
  );

  if (maxPerGuestCharge === 0 || (maxGuestCount ?? 0) === 0 || baseGuestCount === 0) {
    next.maxExtraGuestPrice = null;
  } else {
    const discountedExtraAdultCharge = adultExtraGuestCharge * (1 - discount / 100);
    const discountedMaxGuestCharge = maxPerGuestCharge * (1 - discount / 100);
    const maxExtraGuests = (maxGuestCount ?? 0) - baseGuestCount;
    next.maxExtraGuestPrice = Math.round(
      maxExtraGuests * Math.max(discountedExtraAdultCharge, discountedMaxGuestCharge),
    );
  }

  const maxExtraGuestPrice = numberOrNull(next.maxExtraGuestPrice) ?? 0;
  if (basePrice === 0) {
    next.maxTotal = null;
  } else {
    const discountedBasePrice = basePrice * (1 - discount / 100);
    next.maxTotal = Math.round(discountedBasePrice + maxExtraGuestPrice);
  }

  // GST slab suggestion is based on the day's own price against the
  // accommodation GST boundary, matching the day-wise pricing table's rule
  // exactly (this used to use maxTotal and a wrong 12% lower band that
  // diverged from the day-wise 5%). Never overwrites a slab already chosen.
  const existingGstSlab = numberOrNull(next.gstSlab);
  if (existingGstSlab == null && basePrice > 0) {
    next.gstSlab =
      basePrice > gstPolicy.boundary ? gstPolicy.higher : gstPolicy.lower;
  }

  return next;
};

const normalizeCommercialDerivedFields = (
  commercial: Record<string, unknown>,
  detail: Record<string, unknown>,
  gstPolicy: GstPolicy = DEFAULT_GST_POLICY,
): Record<string, unknown> => {
  const maxGuestCount = numberOrNull(detail.maxGuestCount);
  const next = computeDayWiseCommercialDerivedFields(commercial, maxGuestCount, gstPolicy);

  if (Array.isArray(next.specialDates)) {
    next.specialDates = next.specialDates.map((entry) =>
      computeSpecialDateDerivedFields(asRecord(entry), maxGuestCount, gstPolicy),
    );
  }

  return next;
};

const normalizeCommercialNode = (value: unknown): Record<string, unknown> => {
  const node = asRecord(value);
  const general = asRecord(node.general);
  const dayWiseVariables = asRecord(node.day_wise_variables);
  const specialDatesVariables = asRecord(node.special_dates_variables);

  if (
    Object.keys(general).length === 0 &&
    Object.keys(dayWiseVariables).length === 0 &&
    Object.keys(specialDatesVariables).length === 0
  ) {
    return node;
  }

  return {
    ...general,
    ...dayWiseVariables,
    specialDates: Array.isArray(specialDatesVariables.specialDates)
      ? specialDatesVariables.specialDates
      : [],
  };
};

const normalizeAddressNode = (value: unknown): Record<string, unknown> => {
  const node = asRecord(value);
  const rawAddress = node.address;
  if (typeof rawAddress !== "string") {
    return node;
  }

  const trimmed = rawAddress.trim();
  if (!trimmed.startsWith("{")) {
    return node;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return node;
    }

    const parsedRecord = parsed as Record<string, unknown>;
    return {
      ...node,
      stateId: node.stateId ?? parsedRecord.stateId ?? "",
      cityId: node.cityId ?? parsedRecord.cityId ?? "",
      areaId: node.areaId ?? parsedRecord.areaId ?? "",
      secondaryAreaId1: node.secondaryAreaId1 ?? parsedRecord.secondaryAreaId1 ?? null,
      secondaryAreaId2: node.secondaryAreaId2 ?? parsedRecord.secondaryAreaId2 ?? null,
      secondaryAreaId3: node.secondaryAreaId3 ?? parsedRecord.secondaryAreaId3 ?? null,
      secondaryAreaId4: node.secondaryAreaId4 ?? parsedRecord.secondaryAreaId4 ?? null,
      address:
        typeof parsedRecord.address === "string" && parsedRecord.address.trim().length > 0
          ? parsedRecord.address
          : rawAddress,
      landmark: node.landmark ?? parsedRecord.landmark ?? null,
      pincode: node.pincode ?? parsedRecord.pincode ?? "",
      latitude: node.latitude ?? parsedRecord.latitude ?? "",
      longitude: node.longitude ?? parsedRecord.longitude ?? "",
      mapLink: node.mapLink ?? parsedRecord.mapLink ?? "",
    };
  } catch {
    return node;
  }
};

const normalizeBrandTabBundle = (
  value: unknown,
  gstPolicy: GstPolicy = DEFAULT_GST_POLICY,
): BrandTabBundle => {
  const fallback = createEmptyBrandTabBundle();
  const node = asRecord(value);
  const detail = { ...fallback.detail, ...asRecord(node.detail) };
  const commercial = normalizeCommercialDerivedFields(
    { ...fallback.commercial, ...normalizeCommercialNode(node.commercial) },
    detail,
    gstPolicy,
  );

  return {
    detail,
    address: { ...fallback.address, ...normalizeAddressNode(node.address) },
    googlePlace: { ...fallback.googlePlace, ...asRecord(node.googlePlace) },
    commercial,
    amenitiesActivities: {
      ...fallback.amenitiesActivities,
      ...asRecord(node.amenitiesActivities),
    },
    spaces: Array.isArray(node.spaces) ? node.spaces : fallback.spaces,
    peopleRoles: { ...fallback.peopleRoles, ...asRecord(node.peopleRoles) },
    plans: { ...fallback.plans, ...asRecord(node.plans) },
    others: { ...fallback.others, ...asRecord(node.others) },
    gallery:
      node.gallery && typeof node.gallery === "object"
        ? {
            gallery: Array.isArray(asRecord(node.gallery).gallery)
              ? (asRecord(node.gallery).gallery as unknown[])
              : [],
            coverPhotos: Array.isArray(asRecord(node.gallery).coverPhotos)
              ? (asRecord(node.gallery).coverPhotos as unknown[])
              : [],
          }
        : fallback.gallery,
  };
};

const buildLocalDraftSnapshot = (): PropertyEditorDraft => createEmptyPropertyEditorDraft();

export interface PropertyBootstrapBrandOption {
  id: string;
  name: string;
  slug: BrandSlug;
  isActive?: boolean;
  propertyBrandMappingId?: string | null;
  viewUrl?: string | null;
}

const toBrandSlug = (value: unknown): BrandSlug => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("mago")) return "mago";
  if (raw.includes("listing")) return "listing";
  return "instafarms";
};

const resolveSelectedBrandSlug = (raw: Record<string, unknown>): BrandSlug => {
  const explicit = toBrandSlug(raw.selectedBrandSlug);
  if (raw.selectedBrandSlug !== undefined) return explicit;
  const firstPresent = BRAND_SLUGS.find((slug) =>
    Object.prototype.hasOwnProperty.call(raw, slug) &&
    Object.keys(asRecord(raw[slug])).length > 0,
  );
  return firstPresent ?? "instafarms";
};

const normalizeDraftSnapshot = (
  raw: Record<string, unknown>,
  selectedBrandSlug: BrandSlug,
  gstPolicy: GstPolicy = DEFAULT_GST_POLICY,
): PropertyEditorDraft => {
  const next = createEmptyPropertyEditorDraft();
  next[selectedBrandSlug] = normalizeBrandTabBundle(raw[selectedBrandSlug], gstPolicy);
  return next;
};

const normalizeAvailableBrands = (raw: Record<string, unknown>): PropertyBootstrapBrandOption[] => {
  const explicitBrands = Array.isArray(raw.availableBrands) ? raw.availableBrands : [];
  if (explicitBrands.length > 0) {
    return explicitBrands
      .map((entry) => asRecord(entry))
      .filter(
        (entry) =>
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          entry.isActive !== false,
      )
      .map((entry) => ({
        id: String(entry.id),
        name: String(entry.name),
        slug: toBrandSlug(entry.slug ?? entry.name),
        isActive: entry.isActive === false ? false : true,
        propertyBrandMappingId: typeof entry.propertyBrandMappingId === "string" ? entry.propertyBrandMappingId : null,
        viewUrl: typeof entry.viewUrl === "string" ? entry.viewUrl : null,
      }));
  }

  return BRAND_SLUGS.filter((slug) => Object.keys(asRecord(raw[slug])).length > 0).map((slug) => ({
    id: slug,
    name: slug === "instafarms" ? "Instafarms" : slug === "mago" ? "Mago" : "Listing",
    slug,
    isActive: true,
  }));
};

export function usePropertyBootstrap(propertyId?: string | null, requestedBrandId?: string | null) {
  const isEditMode = !!propertyId;

  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [amenitiesLoaded, setAmenitiesLoaded] = useState<boolean>(false);
  const [amenitiesLoading, setAmenitiesLoading] = useState<boolean>(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState<boolean>(false);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(false);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [propertyTypesLoaded, setPropertyTypesLoaded] = useState<boolean>(false);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState<boolean>(false);

  const [stateData, setStateData] = useState<State[]>([]);
  const [cityData, setCityData] = useState<_City[]>([]);
  const [areaData, setAreaData] = useState<_Area[]>([]);
  const [addressLookupsLoaded, setAddressLookupsLoaded] = useState<boolean>(false);
  const [addressLookupsLoading, setAddressLookupsLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<PropertyEditorDraft | null>(null);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<BrandSlug>("instafarms");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<PropertyBootstrapBrandOption[]>([]);
  const [propertyUpdatedAt, setPropertyUpdatedAt] = useState<string | null>(null);
  const [propertyDerivativeType, setPropertyDerivativeType] = useState<string | null>(null);
  const [gstPolicy, setGstPolicy] = useState<GstPolicy>(DEFAULT_GST_POLICY);

  useEffect(() => {
    if (!propertyId) return;

    const loadPropertyData = async () => {
      setLoading(true);
      setError(null);
      setAmenitiesLoaded(false);
      setAmenitiesLoading(false);
      setAllAmenities([]);
      setActivitiesLoaded(false);
      setActivitiesLoading(false);
      setAllActivities([]);
      setPropertyTypesLoaded(false);
      setPropertyTypesLoading(false);
      setPropertyTypes([]);
      setAddressLookupsLoaded(false);
      setAddressLookupsLoading(false);
      setStateData([]);
      setCityData([]);
      setAreaData([]);

      try {
        console.log(
          `[usePropertyBootstrap] Requesting full data for propertyId=${propertyId} with includeGallery=false`,
        );
        const result = await fetchPropertyFullData(propertyId, {
          includeGallery: false,
          brandId: requestedBrandId || undefined,
        });
        if (result.error) throw new Error(result.error);

        console.log(
          `[usePropertyBootstrap] Raw backend payload for propertyId=${propertyId}:`,
          result.data,
        );
        const fullData = asRecord(result.data);
        console.log(`[usePropertyBootstrap] Received full data for propertyId=${propertyId}:`, fullData);
        if (Object.keys(fullData).length === 0) throw new Error("No property data returned");

        const nextSelectedBrandSlug = resolveSelectedBrandSlug(fullData);
        const nextSelectedBrandId =
          typeof fullData.selectedBrandId === "string" ? fullData.selectedBrandId : requestedBrandId || null;
        setSelectedBrandSlug(nextSelectedBrandSlug);
        setSelectedBrandId(nextSelectedBrandId);
        setAvailableBrands(normalizeAvailableBrands(fullData));

        const gstConfigResult = await fetchAccommodationGstConfig(nextSelectedBrandId);
        const resolvedGstPolicy = gstConfigResult.success ? gstConfigResult.policy : DEFAULT_GST_POLICY;
        setGstPolicy(resolvedGstPolicy);

        setInitialSnapshot(normalizeDraftSnapshot(fullData, nextSelectedBrandSlug, resolvedGstPolicy));
        setPropertyUpdatedAt(
          typeof fullData.propertyUpdatedAt === "string" ? fullData.propertyUpdatedAt : null,
        );
        const brandData = asRecord(fullData[nextSelectedBrandSlug]);
        const detail = asRecord(brandData.detail);
        setPropertyDerivativeType(typeof detail.propertyDerivativeType === "string" ? detail.propertyDerivativeType : null);
      } catch (err) {
        console.error("Error fetching property:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch property";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void loadPropertyData();
  }, [propertyId, requestedBrandId]);

  useEffect(() => {
    if (propertyId) return;
    const initialCreateSnapshot = buildLocalDraftSnapshot();
    setInitialSnapshot(initialCreateSnapshot);
    setSelectedBrandSlug("instafarms");
    setSelectedBrandId(null);
    setAvailableBrands([]);
  }, [propertyId]);

  useEffect(() => {
    const loadLocations = async () => {
      const result = await fetchHelperData("states");
      setStateData(result.data || []);
      setAddressLookupsLoaded(true);
    };
    if (!propertyId) void loadLocations();
  }, [propertyId]);

  const ensureAmenitiesLoaded = useCallback(async () => {
    if (amenitiesLoaded || amenitiesLoading) return;

    setAmenitiesLoading(true);
    try {
      const result = await fetchHelperData("amenities");
      setAllAmenities(result.data || []);
      setAmenitiesLoaded(true);
    } catch (err) {
      console.error("Error loading amenities:", err);
      toast.error("Failed to load amenities");
    } finally {
      setAmenitiesLoading(false);
    }
  }, [amenitiesLoaded, amenitiesLoading]);

  const ensureActivitiesLoaded = useCallback(async () => {
    if (activitiesLoaded || activitiesLoading) return;

    setActivitiesLoading(true);
    try {
      const result = await fetchHelperData("activities");
      setAllActivities(result.data || []);
      setActivitiesLoaded(true);
    } catch (err) {
      console.error("Error loading activities:", err);
      toast.error("Failed to load activities");
    } finally {
      setActivitiesLoading(false);
    }
  }, [activitiesLoaded, activitiesLoading]);

  const ensurePropertyTypesLoaded = useCallback(async () => {
    if (propertyTypesLoaded || propertyTypesLoading) return;

    setPropertyTypesLoading(true);
    try {
      const result = await fetchHelperData("property-types");
      setPropertyTypes(result.data || []);
      setPropertyTypesLoaded(true);
    } catch (err) {
      console.error("Error loading property types:", err);
      toast.error("Failed to load property types");
    } finally {
      setPropertyTypesLoading(false);
    }
  }, [propertyTypesLoaded, propertyTypesLoading]);

  const ensureAddressLookupsLoaded = useCallback(async () => {
    if (addressLookupsLoaded || addressLookupsLoading) return;

    setAddressLookupsLoading(true);
    try {
      const result = await fetchHelperData("states");
      setStateData(result.data || []);
      setAddressLookupsLoaded(true);
    } catch (err) {
      console.error("Error loading address lookup data:", err);
      toast.error("Failed to load location data");
    } finally {
      setAddressLookupsLoading(false);
    }
  }, [addressLookupsLoaded, addressLookupsLoading]);

  return {
    isEditMode,
    initialSnapshot,
    loading,
    error,
    selectedBrandSlug,
    selectedBrandId,
    availableBrands,
    propertyUpdatedAt,
    propertyDerivativeType,
    gstPolicy,
    ensurePropertyTypesLoaded,
    ensureAddressLookupsLoaded,
    ensureAmenitiesLoaded,
    ensureActivitiesLoaded,
    propertyTypes,
    allAmenities,
    allActivities,
    amenitiesLoaded,
    amenitiesLoading,
    activitiesLoaded,
    activitiesLoading,
    stateData,
    cityData,
    areaData,
  };
}

export type UsePropertyBootstrapReturn = ReturnType<typeof usePropertyBootstrap>;
