import { BRAND_SLUGS, type BrandSlug } from "./propertyEditorDraft";
type AnyRecord = Record<string, any>;

const ensureObject = (value: unknown): AnyRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};

const toArray = <T = any>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const flattenCommercialNode = (value: unknown): AnyRecord => {
  const node = ensureObject(value);
  const general = ensureObject(node.general);
  const dayWiseVariables = ensureObject(node.day_wise_variables);
  const specialDatesVariables = ensureObject(node.special_dates_variables);

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
    specialDates: toArray(specialDatesVariables.specialDates),
  };
};

const pick = (source: AnyRecord, keys: string[]): AnyRecord =>
  keys.reduce<AnyRecord>((acc, key) => {
    if (source[key] !== undefined) acc[key] = source[key];
    return acc;
  }, {});

const getTabWithAliases = (source: AnyRecord, keys: string[]): AnyRecord => {
  for (const key of keys) {
    const candidate = ensureObject(source[key]);
    if (Object.keys(candidate).length > 0) return candidate;
  }
  return {};
};

const isStructuredStayDetailValue = (value: unknown): boolean =>
  Array.isArray(value) || Boolean(value && typeof value === "object");

const pickBestStayDetailValue = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (isStructuredStayDetailValue(value)) return value;
  }
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const buildStayDetailsRecord = (...sources: AnyRecord[]): AnyRecord => {
  const entries: Array<[string, unknown]> = [
    [
      "bedding_availability",
      pickBestStayDetailValue(...sources.map((source) => source.bedding_availability)),
    ],
    [
      "activitiesNearbyAttractions",
      pickBestStayDetailValue(...sources.map((source) => source.activitiesNearbyAttractions)),
    ],
    [
      "experiences",
      pickBestStayDetailValue(...sources.map((source) => source.experiences)),
    ],
    [
      "nearbyAttractions",
      pickBestStayDetailValue(...sources.flatMap((source) => [source.nearbyAttractions, source.nearby_attractions])),
    ],
    [
      "foodOptions",
      pickBestStayDetailValue(...sources.flatMap((source) => [source.foodOptions, source.food_options])),
    ],
    [
      "miscCharges",
      pickBestStayDetailValue(...sources.flatMap((source) => [source.miscCharges, source.misc_charges])),
    ],
  ];

  return entries.reduce<AnyRecord>((acc, [key, value]) => {
    if (value !== undefined) acc[key] = value;
    return acc;
  }, {});
};

const toBrandSlug = (value: unknown): BrandSlug | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "instafarms" || normalized.includes("instafarm")) return "instafarms";
  if (normalized === "mago" || normalized.includes("mago")) return "mago";
  return null;
};

const collectBrandEntries = (value: unknown): Array<{ id?: string; slug?: string; name?: string }> =>
  toArray(ensureObject(value).brands);

const buildBrandKeyToSlugMap = (...sources: unknown[]): Record<string, BrandSlug> => {
  const map: Record<string, BrandSlug> = {
    instafarms: "instafarms",
    mago: "mago",
  };

  for (const source of sources) {
    const sourceObj = ensureObject(source);
    const candidates = [
      ...collectBrandEntries(sourceObj),
      ...toArray(ensureObject(sourceObj.property).brands),
      ...toArray(sourceObj.brandOptions),
      ...toArray(sourceObj.availableBrands),
      ...toArray(sourceObj.propertyBrands),
    ];

    for (const brand of candidates) {
      const slug = toBrandSlug(brand.slug) ?? toBrandSlug(brand.name);
      if (!slug) continue;
      if (brand.id) map[String(brand.id)] = slug;
      if (brand.slug) map[String(brand.slug)] = slug;
      if (brand.name) map[String(brand.name).toLowerCase()] = slug;
    }
  }

  return map;
};

const resolveBrandSlug = (key: string, map: Record<string, BrandSlug>): BrandSlug | null => {
  const direct = map[key];
  if (direct) return direct;
  const lower = key.toLowerCase();
  if (map[lower]) return map[lower];
  return toBrandSlug(key);
};

const isBrandMapShape = (value: AnyRecord): boolean => {
  const values = Object.values(value);
  const nonNullValues = values.filter((entry) => entry !== null && entry !== undefined);
  return (
    nonNullValues.length > 0 &&
    nonNullValues.every((entry) => typeof entry === "object" && !Array.isArray(entry))
  );
};

export interface PropertyFullTabs {
  detail: AnyRecord;
  address: AnyRecord;
  googlePlace: AnyRecord;
  commercial?: AnyRecord;
  brandData: Partial<Record<
    BrandSlug,
    {
      commercial: AnyRecord & { specialDates: any[] };
      plans: { discountPlans: any[]; shortTermCancellation: any | null; longTermCancellation: any | null };
      others: AnyRecord;
    }
  >>;
  amenitiesActivities: { amenities: any[]; activities: any[] };
  gallery: { gallery: any[]; coverPhotos: any[] };
  spaces: { spaceProperties: any[] };
  peopleRoles: { owners: any[]; managers: any[]; caretakers: any[] };
}

export interface PropertyFullCanonicalTabsPayload {
  detail?: AnyRecord;
  details?: AnyRecord;
  detailes?: AnyRecord;
  address?: AnyRecord;
  googlePlace?: AnyRecord;
  brandData?: Record<string, { commercial?: AnyRecord; plans?: AnyRecord; others?: AnyRecord }>;
  amenitiesActivities?: { amenities?: any[]; activities?: any[] };
  gallery?: { gallery?: any[]; coverPhotos?: any[] };
  spaces?: { spaceProperties?: any[] };
  peopleRoles?: { owners?: any[]; managers?: any[]; caretakers?: any[] };
}

export interface PropertyFullDataV2 {
  property?: AnyRecord;
  specialDates?: any[];
  gallery?: any[];
  coverPhotos?: any[];
  amenities?: any[];
  activities?: any[];
  safetyHygiene?: any[];
  owners?: any[];
  managers?: any[];
  caretakers?: any[];
  discountPlans?: any[];
  shortTermCancellation?: any | null;
  longTermCancellation?: any | null;
  spaceProperties?: any[];
  tabs?: Partial<PropertyFullTabs>;
}

export type PropertyFullPayload =
  | Record<
      "instafarms" | "mago",
      {
        detail?: AnyRecord;
        address?: AnyRecord;
        googlePlace?: AnyRecord;
        commercial?: AnyRecord;
        amenitiesActivities?: { amenities?: any[]; activities?: any[] };
        spaces?: any[] | { spaceProperties?: any[] };
        peopleRoles?: { owners?: any[]; managers?: any[]; caretakers?: any[] };
        plans?: AnyRecord;
        others?: AnyRecord;
        gallery?: { gallery?: any[]; coverPhotos?: any[] };
      }
    >
  | PropertyFullDataV2
  | PropertyFullCanonicalTabsPayload
  | Partial<PropertyFullTabs>;

const isBrandFirstPayloadShape = (value: AnyRecord): boolean => {
  const instafarms = ensureObject(value.instafarms);
  return Object.keys(instafarms).length > 0;
};

export interface NormalizedPropertyFullData {
  property: AnyRecord;
  specialDates: any[];
  gallery: any[];
  coverPhotos: any[];
  amenities: any[];
  activities: any[];
  safetyHygiene: any[];
  owners: any[];
  managers: any[];
  caretakers: any[];
  discountPlans: any[];
  shortTermCancellation: any | null;
  longTermCancellation: any | null;
  spaceProperties: any[];
  tabs: PropertyFullTabs;
}

const normalizeBrandTabMap = (
  value: unknown,
  keyToSlugMap: Record<string, BrandSlug>,
): Partial<Record<BrandSlug, AnyRecord>> => {
  const tab = ensureObject(value);
  if (Object.keys(tab).length === 0) return {};

  if (!isBrandMapShape(tab)) {
    return { instafarms: tab };
  }

  const bySlug: Partial<Record<BrandSlug, AnyRecord>> = {};
  for (const [key, entry] of Object.entries(tab)) {
    const slug = resolveBrandSlug(key, keyToSlugMap);
    if (!slug) continue;
    const current = ensureObject(bySlug[slug]);
    bySlug[slug] = { ...current, ...ensureObject(entry) };
  }
  return bySlug;
};

const extractBrandTabMap = (
  rawBrandData: unknown,
  tabKey: "commercial" | "plans" | "others",
): AnyRecord => {
  const source = ensureObject(rawBrandData);
  if (Object.keys(source).length === 0) return {};

  // section-first shape: brandData.commercial.<brandKey>
  const sectionFirst = ensureObject(source[tabKey]);
  if (Object.keys(sectionFirst).length > 0 && isBrandMapShape(sectionFirst)) {
    return sectionFirst;
  }

  // brand-first shape: brandData.<brandKey>.commercial
  const output: AnyRecord = {};
  for (const [brandKey, node] of Object.entries(source)) {
    const nodeObj = ensureObject(node);
    const tabObj = ensureObject(nodeObj[tabKey]);
    if (Object.keys(tabObj).length > 0) {
      output[brandKey] = tabObj;
    }
  }
  return output;
};

export function normalizePropertyFullData(payload: unknown): NormalizedPropertyFullData {
  const outer = ensureObject(payload);
  const source = ensureObject(outer.data !== undefined ? outer.data : outer) as PropertyFullDataV2;
  const sourceAny = source as AnyRecord;
  if (isBrandFirstPayloadShape(sourceAny)) {
    const brandNode = (slug: BrandSlug) => ensureObject(sourceAny[slug]);
    const instafarmsNode = brandNode("instafarms");
    const detail = ensureObject(instafarmsNode.detail);
    const address = ensureObject(instafarmsNode.address);
    const googlePlace = ensureObject(instafarmsNode.googlePlace);
    const amenitiesActivities = ensureObject(instafarmsNode.amenitiesActivities);
    const peopleRoles = ensureObject(instafarmsNode.peopleRoles);
    const instafarmsPlans = ensureObject(instafarmsNode.plans);
    const instafarmsOthers = ensureObject(instafarmsNode.others);
    const brandFirstStayDetails = buildStayDetailsRecord(
      instafarmsOthers,
      detail,
      ensureObject(sourceAny.property),
      sourceAny,
    );
    const instafarmsGallery = ensureObject(instafarmsNode.gallery);
    const spacesRaw = instafarmsNode.spaces;
    const spaceProperties = Array.isArray(spacesRaw)
      ? spacesRaw
      : toArray(ensureObject(spacesRaw).spaceProperties);
    const gallery = toArray(instafarmsGallery.gallery);
    const coverPhotos = toArray(instafarmsGallery.coverPhotos);
    const amenities = toArray(amenitiesActivities.amenities);
    const activities = toArray(amenitiesActivities.activities);
    const owners = toArray(peopleRoles.owners);
    const managers = toArray(peopleRoles.managers);
    const caretakers = toArray(peopleRoles.caretakers);
    const discountPlans = toArray(instafarmsPlans.discountPlans);
    const shortTermCancellation =
      instafarmsPlans.shortTermCancellation ??
      instafarmsPlans.shortTermCancellationPlan ??
      null;
    const longTermCancellation =
      instafarmsPlans.longTermCancellation ??
      instafarmsPlans.longTermCancellationPlan ??
      null;

    const brandData: PropertyFullTabs["brandData"] = {};
    for (const slug of BRAND_SLUGS) {
      const node = brandNode(slug);
      if (Object.keys(node).length === 0) continue;
      const commercial = ensureObject(node.commercial);
      const plans = ensureObject(node.plans);
      const others = slug === "instafarms"
        ? {
            ...ensureObject(node.others),
            ...brandFirstStayDetails,
          }
        : ensureObject(node.others);
      brandData[slug] = {
        commercial: {
          ...flattenCommercialNode(commercial),
          specialDates: toArray(flattenCommercialNode(commercial).specialDates),
        } as AnyRecord & { specialDates: any[] },
        plans: {
          ...plans,
          discountPlans: toArray(plans.discountPlans),
          shortTermCancellation:
            plans.shortTermCancellation ?? plans.shortTermCancellationPlan ?? null,
          longTermCancellation:
            plans.longTermCancellation ?? plans.longTermCancellationPlan ?? null,
        },
        others,
      };
    }

    const instafarmsCommercial = ensureObject(brandData.instafarms?.commercial);
    const tabs: PropertyFullTabs = {
      detail,
      address,
      googlePlace,
      brandData,
      amenitiesActivities: { amenities, activities },
      gallery: { gallery, coverPhotos },
      spaces: { spaceProperties },
      peopleRoles: { owners, managers, caretakers },
    };

    return {
      property: {
        ...detail,
        ...address,
        ...googlePlace,
        ...instafarmsCommercial,
        ...instafarmsOthers,
        ...brandFirstStayDetails,
        specialDates: toArray(instafarmsCommercial.specialDates),
        gallery,
        coverPhotos,
        amenities,
        activities,
        owners,
        managers,
        caretakers,
        discountPlans,
        shortTermCancellation,
        longTermCancellation,
        spaceProperties,
      },
      specialDates: toArray(instafarmsCommercial.specialDates),
      gallery,
      coverPhotos,
      amenities,
      activities,
      safetyHygiene: [],
      owners,
      managers,
      caretakers,
      discountPlans,
      shortTermCancellation,
      longTermCancellation,
      spaceProperties,
      tabs,
    };
  }

  const legacyProperty = ensureObject(source.property);
  const tabsFromNested = ensureObject(source.tabs);
  const keyToSlugMap = buildBrandKeyToSlugMap(outer, sourceAny, legacyProperty);

  const topLevelTabsCandidate = {
    detail: getTabWithAliases(sourceAny, ["detail", "details", "detailes"]),
    address: getTabWithAliases(sourceAny, ["address"]),
    googlePlace: getTabWithAliases(sourceAny, ["googlePlace"]),
    amenitiesActivities: getTabWithAliases(sourceAny, ["amenitiesActivities"]),
    gallery: getTabWithAliases(sourceAny, ["gallery"]),
    spaces: getTabWithAliases(sourceAny, ["spaces"]),
    peopleRoles: getTabWithAliases(sourceAny, ["peopleRoles"]),
    brandData: getTabWithAliases(sourceAny, ["brandData"]),
  };
  const hasTopLevelTabs = Object.values(topLevelTabsCandidate).some(
    (value) => Object.keys(ensureObject(value)).length > 0,
  );
  const tabsRaw =
    hasTopLevelTabs
      ? topLevelTabsCandidate
      : Object.keys(tabsFromNested).length > 0
        ? tabsFromNested
        : {};

  const detail = Object.keys(ensureObject(tabsRaw.detail)).length
    ? ensureObject(tabsRaw.detail)
    : legacyProperty;

  const address = Object.keys(ensureObject(tabsRaw.address)).length
    ? ensureObject(tabsRaw.address)
    : pick(detail, [
        "stateId",
        "cityId",
        "areaId",
        "secondaryAreaId1",
        "secondaryAreaId2",
        "secondaryAreaId3",
        "secondaryAreaId4",
        "address",
        "landmark",
        "pincode",
        "latitude",
        "longitude",
        "mapLink",
      ]);

  const googlePlace = Object.keys(ensureObject(tabsRaw.googlePlace)).length
    ? ensureObject(tabsRaw.googlePlace)
    : pick(detail, [
        "googlePlaceId",
        "googlePlaceRating",
        "googlePlaceUserRatingCount",
        "googlePlaceReviews",
        "nearbyPlaces",
      ]);

  const tabLevelBrandData = ensureObject(tabsRaw.brandData);
  const topLevelBrandData = ensureObject(sourceAny.brandData);
  const topLevelCommercials = ensureObject(sourceAny.commercials ?? sourceAny.commercial);
  const topLevelPlans = ensureObject(sourceAny.plans);
  const topLevelOthers = ensureObject(sourceAny.others ?? sourceAny.other);

  const commercialByBrand = {
    ...normalizeBrandTabMap(extractBrandTabMap(tabLevelBrandData, "commercial"), keyToSlugMap),
    ...normalizeBrandTabMap(extractBrandTabMap(topLevelBrandData, "commercial"), keyToSlugMap),
    ...normalizeBrandTabMap(topLevelCommercials, keyToSlugMap),
  };
  const plansByBrand = {
    ...normalizeBrandTabMap(extractBrandTabMap(tabLevelBrandData, "plans"), keyToSlugMap),
    ...normalizeBrandTabMap(extractBrandTabMap(topLevelBrandData, "plans"), keyToSlugMap),
    ...normalizeBrandTabMap(topLevelPlans, keyToSlugMap),
  };
  const othersByBrand = {
    ...normalizeBrandTabMap(extractBrandTabMap(tabLevelBrandData, "others"), keyToSlugMap),
    ...normalizeBrandTabMap(extractBrandTabMap(topLevelBrandData, "others"), keyToSlugMap),
    ...normalizeBrandTabMap(topLevelOthers, keyToSlugMap),
  };

  const commercialKeys = [
    "commissionPercentage",
    "bookingSourceCommissions",
    "securityDeposit",
    "cookingAccessFee",
    "bonFireFee",
    "barbequeFee",
    "cleaningFee",
    "lateCheckoutCharges",
    "advancePaymentEnabled",
    "advancePaymentAmount",
    "advancePaymentPercentage",
    "enableFloatingGuests",
    "checkinTime",
    "checkoutTime",
    "normalWalletReleaseTiming",
    "normalWalletReleaseOffsetDays",
    "normalWalletReleaseTime",
    "icalWalletReleaseTiming",
    "icalWalletReleaseOffsetDays",
    "icalWalletReleaseTime",
  ];
  const specialDates = toArray(ensureObject(commercialByBrand.instafarms).specialDates);
  const tabsAmenitiesActivities = ensureObject(tabsRaw.amenitiesActivities);
  const tabsGallery = ensureObject(tabsRaw.gallery);
  const tabsPeopleRoles = ensureObject(tabsRaw.peopleRoles);
  const tabsSpaces = ensureObject(tabsRaw.spaces);

  const amenities = toArray(tabsAmenitiesActivities.amenities ?? source.amenities);
  const activities = toArray(tabsAmenitiesActivities.activities ?? source.activities);
  const gallery = toArray(tabsGallery.gallery ?? source.gallery);
  const coverPhotos = toArray(tabsGallery.coverPhotos ?? source.coverPhotos);
  const owners = toArray(tabsPeopleRoles.owners ?? source.owners);
  const managers = toArray(tabsPeopleRoles.managers ?? source.managers);
  const caretakers = toArray(tabsPeopleRoles.caretakers ?? source.caretakers);
  const instafarmsPlans = ensureObject(plansByBrand.instafarms);
  const discountPlans = toArray(instafarmsPlans.discountPlans ?? instafarmsPlans.discountPlan ?? source.discountPlans);

  const shortTermCancellation =
    instafarmsPlans.shortTermCancellation ??
    instafarmsPlans.shortTermCancellationPlan ??
    source.shortTermCancellation ??
    sourceAny.shortTermCancellationPlan ??
    null;
  const longTermCancellation =
    instafarmsPlans.longTermCancellation ??
    instafarmsPlans.longTermCancellationPlan ??
    source.longTermCancellation ??
    sourceAny.longTermCancellationPlan ??
    null;

  const spaceProperties = toArray(tabsSpaces.spaceProperties ?? source.spaceProperties);

  const stayDetailsFallback = buildStayDetailsRecord(
    ensureObject(othersByBrand.instafarms),
    legacyProperty,
    detail,
    sourceAny,
  );
  const instafarmsOthers = {
    ...pick(detail, [
      "description",
      "homeRulesTruths",
      "homeRulesAndTruth",
      "bookingPolicy",
      "faqs",
      "metaTitle",
      "metaUrl",
      "metaDescription",
      "metaKeyword",
      "meta",
    ]),
    ...ensureObject(othersByBrand.instafarms),
    ...stayDetailsFallback,
  };
  const others = instafarmsOthers;

  const brandData: PropertyFullTabs["brandData"] = {};
  const hasExplicitBrandData =
    Object.keys(tabLevelBrandData).length > 0 ||
    Object.keys(topLevelBrandData).length > 0;
  const presentBrandSlugs = Array.from(
    new Set(
      BRAND_SLUGS.filter((slug) => {
        const hasCommercial = Object.keys(ensureObject(commercialByBrand[slug])).length > 0;
        const hasPlans = Object.keys(ensureObject(plansByBrand[slug])).length > 0;
        const hasOthers = Object.keys(ensureObject(othersByBrand[slug])).length > 0;
        return hasCommercial || hasPlans || hasOthers;
      }),
    ),
  );
  const slugsToNormalize =
    presentBrandSlugs.length > 0
      ? presentBrandSlugs
      : hasExplicitBrandData
        ? []
        : (["instafarms"] as BrandSlug[]);

  for (const slug of slugsToNormalize) {
    const rawCommercial = ensureObject(commercialByBrand[slug]);
    const rawPlans = ensureObject(plansByBrand[slug]);
    const rawOthers = ensureObject(othersByBrand[slug]);

    const normalizedCommercial: AnyRecord = {
      ...(slug === "instafarms" ? pick(detail, commercialKeys) : {}),
      ...flattenCommercialNode(rawCommercial),
      specialDates: toArray(flattenCommercialNode(rawCommercial).specialDates),
    };
    const normalizedPlans = {
      ...rawPlans,
      discountPlans: toArray(
        rawPlans.discountPlans ??
          rawPlans.discountPlan ??
          (slug === "instafarms" ? source.discountPlans : []),
      ),
      shortTermCancellation:
        rawPlans.shortTermCancellation ??
        rawPlans.shortTermCancellationPlan ??
        (slug === "instafarms"
          ? source.shortTermCancellation ?? sourceAny.shortTermCancellationPlan
          : null) ??
        null,
      longTermCancellation:
        rawPlans.longTermCancellation ??
        rawPlans.longTermCancellationPlan ??
        (slug === "instafarms"
          ? source.longTermCancellation ?? sourceAny.longTermCancellationPlan
          : null) ??
        null,
    };
    const normalizedOthers =
      slug === "instafarms"
        ? {
            ...pick(detail, [
              "description",
              "homeRulesTruths",
              "homeRulesAndTruth",
              "bookingPolicy",
              "faqs",
              "metaTitle",
              "metaUrl",
              "metaDescription",
              "metaKeyword",
              "meta",
            ]),
            ...rawOthers,
            ...stayDetailsFallback,
          }
        : rawOthers;

    brandData[slug] = {
      commercial: normalizedCommercial as AnyRecord & { specialDates: any[] },
      plans: normalizedPlans,
      others: normalizedOthers,
    };
  }

  const instafarmsCommercial = ensureObject(brandData.instafarms?.commercial);

  const tabs: PropertyFullTabs = {
    detail,
    address,
    googlePlace,
    brandData,
    amenitiesActivities: { amenities, activities },
    gallery: { gallery, coverPhotos },
    spaces: { spaceProperties },
    peopleRoles: { owners, managers, caretakers },
  };

  return {
    property: {
      ...legacyProperty,
      ...detail,
      ...instafarmsCommercial,
      ...others,
      specialDates,
      gallery,
      coverPhotos,
      amenities,
      activities,
      owners,
      managers,
      caretakers,
      discountPlans,
      shortTermCancellation,
      longTermCancellation,
      spaceProperties,
    },
    specialDates,
    gallery,
    coverPhotos,
    amenities,
    activities,
    safetyHygiene: toArray(source.safetyHygiene),
    owners,
    managers,
    caretakers,
    discountPlans,
    shortTermCancellation,
    longTermCancellation,
    spaceProperties,
    tabs,
  };
}

export function toLegacyPropertySnapshot(payload: unknown): AnyRecord {
  const normalized = normalizePropertyFullData(payload);
  return {
    ...normalized.property,
    specialDates: normalized.specialDates,
    gallery: normalized.gallery,
    coverPhotos: normalized.coverPhotos,
    amenities: normalized.amenities,
    activities: normalized.activities,
    safetyHygiene: normalized.safetyHygiene,
    owners: normalized.owners,
    managers: normalized.managers,
    caretakers: normalized.caretakers,
    discountPlans: normalized.discountPlans,
    shortTermCancellationPlan: normalized.shortTermCancellation,
    longTermCancellationPlan: normalized.longTermCancellation,
    spaces: normalized.spaceProperties,
  };
}
