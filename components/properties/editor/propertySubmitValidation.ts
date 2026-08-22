"use client";

import { BRAND_SLUGS } from "@/lib/properties/propertyEditorDraft";

type AnyRecord = Record<string, unknown>;

const toLabel = (field: string) =>
  field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

const getObject = (value: unknown): AnyRecord =>
  value && typeof value === "object" ? (value as AnyRecord) : {};

const getBrandData = (payload: AnyRecord): AnyRecord =>
  BRAND_SLUGS.reduce<AnyRecord>((acc, slug) => {
    acc[slug] = getObject(payload[slug]);
    return acc;
  }, {});

const getInstafarmsCommercial = (payload: AnyRecord): AnyRecord => {
  const instafarms = getObject(payload.instafarms);
  return getObject(instafarms.commercial);
};

const toFiniteNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getBeddingAvailabilityValidationError = (
  brandSlug: string,
  payload: AnyRecord,
): string | null => {
  const brandNode = getObject(payload[brandSlug]);
  const others = getObject(brandNode.others);
  const beddingAvailability = Array.isArray(others.bedding_availability)
    ? (others.bedding_availability as Array<AnyRecord>)
    : [];

  for (let index = 0; index < beddingAvailability.length; index += 1) {
    const card = getObject(beddingAvailability[index]);
    const title = typeof card.title === "string" ? card.title.trim() : "";
    const description =
      typeof card.description === "string" ? card.description.trim() : "";
    const icon = typeof card.icon === "string" ? card.icon.trim() : "";

    if (!title || !description || !icon) {
      return `${toLabel(brandSlug)} bedding availability card ${index + 1} requires title, icon, and description.`;
    }
  }

  return null;
};

const getStructuredSectionValidationError = ({
  brandSlug,
  payload,
  sectionKey,
  sectionLabel,
  requiresDescription,
  requiresAmount,
}: {
  brandSlug: string;
  payload: AnyRecord;
  sectionKey: string;
  sectionLabel: string;
  requiresDescription: boolean;
  requiresAmount: boolean;
}): string | null => {
  const brandNode = getObject(payload[brandSlug]);
  const others = getObject(brandNode.others);
  const section = getObject(others[sectionKey]);
  const items = Array.isArray(section.items) ? (section.items as Array<AnyRecord>) : [];

  for (let index = 0; index < items.length; index += 1) {
    const item = getObject(items[index]);
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const description =
      typeof item.description === "string" ? item.description.trim() : "";
    const amount =
      typeof item.amount === "number"
        ? String(item.amount)
        : typeof item.amount === "string"
          ? item.amount.trim()
          : "";

    if (!label) {
      return `${toLabel(brandSlug)} ${sectionLabel} item ${index + 1} requires label.`;
    }
    if (requiresDescription && !description) {
      return `${toLabel(brandSlug)} ${sectionLabel} item ${index + 1} requires description.`;
    }
    if (requiresAmount && !amount) {
      return `${toLabel(brandSlug)} ${sectionLabel} item ${index + 1} requires amount.`;
    }
  }

  return null;
};

export const validatePropertySubmitPayload = (
  payload: AnyRecord,
): string | null => {
  const detail = getObject(getObject(payload.instafarms).detail);
  const brandData = getBrandData(payload);
  const instafarmsCommercial = getInstafarmsCommercial(payload);

  const findNegativeField = (keys: string[]) =>
    keys.find((key) => {
      const value = detail[key] ?? instafarmsCommercial[key] ?? payload[key];
      return typeof value === "number" && value < 0;
    });

  const weekdayPriceFields = [
    "mondayPrice",
    "tuesdayPrice",
    "wednesdayPrice",
    "thursdayPrice",
    "fridayPrice",
    "saturdayPrice",
    "sundayPrice",
    "securityDeposit",
    "commissionPercentage",
    "cookingAccessFee",
    "bonFireFee",
    "barbequeFee",
    "cleaningFee",
    "lateCheckoutCharges",
  ];
  const negativePriceField = findNegativeField(weekdayPriceFields);
  if (negativePriceField) {
    return `${toLabel(negativePriceField)} cannot be negative.`;
  }

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const extraGuestFieldSuffixes = [
    "AdultExtraGuestCharge",
    "ChildExtraGuestCharge",
    "InfantExtraGuestCharge",
  ];
  const negativeExtraGuestField = findNegativeField(
    days.flatMap((day) =>
      extraGuestFieldSuffixes.map(
        (suffix) => `${day}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`,
      ),
    ),
  );
  if (negativeExtraGuestField) {
    return `${toLabel(negativeExtraGuestField)} cannot be negative.`;
  }

  const countFields = [
    "bedroomCount",
    "bathroomCount",
    "doubleBedCount",
    "singleBedCount",
    "mattressCount",
    "baseGuestCount",
    "maxGuestCount",
  ];
  const negativeCountField = findNegativeField(countFields);
  if (negativeCountField) {
    return `${toLabel(negativeCountField)} cannot be negative.`;
  }

  if (instafarmsCommercial.advancePaymentEnabled === true) {
    const amountRaw = instafarmsCommercial.advancePaymentAmount;
    const percentageRaw = instafarmsCommercial.advancePaymentPercentage;
    const hasAmount = toFiniteNumberOrNull(amountRaw) !== null;
    const hasPercentage = toFiniteNumberOrNull(percentageRaw) !== null;
    if (hasAmount && hasPercentage) {
      return "Please fill either Advance Amount OR Advance Percentage field. You cannot fill both.";
    }
    if (!hasAmount && !hasPercentage) {
      return "Please fill either Advance Amount OR Advance Percentage.";
    }
  }

  const duplicateLabels: string[] = [];
  for (const [slug, node] of Object.entries(brandData)) {
    const commercial = getObject(getObject(node).commercial);
    const specialDates = Array.isArray(commercial.specialDates)
      ? (commercial.specialDates as Array<AnyRecord>)
      : [];

    const seenDates = new Set<string>();
    const duplicateDates: string[] = [];
    for (const sd of specialDates) {
      if (!sd.date) continue;
      const date = String(sd.date);
      if (seenDates.has(date)) duplicateDates.push(date);
      else seenDates.add(date);
    }
    if (duplicateDates.length > 0) {
      duplicateLabels.push(`${slug}: ${duplicateDates.join(", ")}`);
    }
  }

  if (duplicateLabels.length > 0) {
    return `Repeated dates are not allowed in special dates. Duplicates found in ${duplicateLabels.join(" | ")}`;
  }

  for (const slug of BRAND_SLUGS) {
    const beddingAvailabilityError = getBeddingAvailabilityValidationError(slug, payload);
    if (beddingAvailabilityError) return beddingAvailabilityError;

    const sectionValidationConfigs = [
      {
        sectionKey: "experiences",
        sectionLabel: "Experiences",
        requiresDescription: false,
        requiresAmount: false,
      },
      {
        sectionKey: "nearbyAttractions",
        sectionLabel: "Nearby Attractions",
        requiresDescription: true,
        requiresAmount: false,
      },
      {
        sectionKey: "foodOptions",
        sectionLabel: "Food Options",
        requiresDescription: false,
        requiresAmount: false,
      },
      {
        sectionKey: "miscCharges",
        sectionLabel: "Misc Charges",
        requiresDescription: false,
        requiresAmount: false,
      },
    ] as const;

    for (const config of sectionValidationConfigs) {
      const sectionValidationError = getStructuredSectionValidationError({
        brandSlug: slug,
        payload,
        ...config,
      });
      if (sectionValidationError) return sectionValidationError;
    }
  }

  return null;
};

export const confirmAdvanceAmountIfHigherThanBase = (
  payload: AnyRecord,
): boolean => {
  const instafarmsCommercial = getInstafarmsCommercial(payload);
  if (instafarmsCommercial.advancePaymentEnabled !== true) return true;
  const advanceAmount = toFiniteNumberOrNull(instafarmsCommercial.advancePaymentAmount);
  if (advanceAmount === null) return true;
  const mondayPrice = toFiniteNumberOrNull(instafarmsCommercial.mondayPrice);

  const currentBasePrice =
    mondayPrice !== null ? mondayPrice : 0;

  if (
    currentBasePrice > 0 &&
    advanceAmount > currentBasePrice
  ) {
    return window.confirm(
      "This advance amount is higher than your base price per night. Do you want to continue?",
    );
  }

  return true;
};
