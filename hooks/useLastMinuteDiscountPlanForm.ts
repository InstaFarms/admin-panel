"use client";

import { useState } from "react";

import { LAST_MINUTE_DISCOUNT_PLANS_VALIDATION } from "@/constants/last-minute-discount-plans";

export interface LastMinuteDiscountTier {
  thresholdDays: number;
  discountType: "percentage" | "flat";
  discountPercentage: string;
  flatDiscount: string;
  maxDiscountAmount: string;
}

export interface LastMinuteDiscountPlanFormValues {
  name: string;
  isActive: boolean;
  discountTiers: LastMinuteDiscountTier[];
}

export interface LastMinuteDiscountPlanFormErrors {
  name?: string | null;
  discountTiers?: string | null;
  [key: `tier-${number}-thresholdDays`]: string | null;
  [key: `tier-${number}-discountPercentage`]: string | null;
  [key: `tier-${number}-flatDiscount`]: string | null;
  [key: `tier-${number}-maxDiscountAmount`]: string | null;
}

const validateName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameRequired;
  if (trimmed.length < 2) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameMinLength;
  if (trimmed.length > 100) return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.nameMaxLength;
  return null;
};

const validateThresholdDays = (value: number | string): string | null => {
  const numberValue = typeof value === "string" ? parseInt(value, 10) : value;
  if (Number.isNaN(numberValue) || numberValue <= 0) {
    return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.thresholdDaysInvalid;
  }
  return null;
};

const validateDiscountPercentage = (value: string): string | null => {
  if (!value) return null;
  const numberValue = parseFloat(value);
  if (Number.isNaN(numberValue) || numberValue <= 0 || numberValue > 100) {
    return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.discountPercentageInvalid;
  }
  return null;
};

const validateFlatDiscount = (value: string): string | null => {
  if (!value) return null;
  const numberValue = parseInt(value, 10);
  if (Number.isNaN(numberValue) || numberValue < 0) {
    return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.flatDiscountInvalid;
  }
  return null;
};

const validateMaxDiscountAmount = (value: string): string | null => {
  if (!value) return null;
  const numberValue = parseInt(value, 10);
  if (Number.isNaN(numberValue) || numberValue < 0) {
    return LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.maxDiscountInvalid;
  }
  return null;
};

const validateTier = (
  tier: LastMinuteDiscountTier,
  index: number
): Record<string, string | null> => {
  const errors: Record<string, string | null> = {};

  const thresholdDaysError = validateThresholdDays(tier.thresholdDays);
  if (thresholdDaysError) errors[`tier-${index}-thresholdDays`] = thresholdDaysError;

  const percentageError = validateDiscountPercentage(tier.discountPercentage);
  if (percentageError) errors[`tier-${index}-discountPercentage`] = percentageError;

  const flatError = validateFlatDiscount(tier.flatDiscount);
  if (flatError) errors[`tier-${index}-flatDiscount`] = flatError;

  const maxDiscountError = validateMaxDiscountAmount(tier.maxDiscountAmount);
  if (maxDiscountError) errors[`tier-${index}-maxDiscountAmount`] = maxDiscountError;

  if (tier.discountType === "percentage") {
    if (!tier.discountPercentage || tier.flatDiscount) {
      errors[`tier-${index}-discountPercentage`] =
        LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierIncomplete;
    }
  } else if (!tier.flatDiscount || tier.discountPercentage) {
    errors[`tier-${index}-flatDiscount`] =
      LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierIncomplete;
  }

  return errors;
};

const validateTiers = (
  tiers: LastMinuteDiscountTier[]
): Record<string, string | null> => {
  const errors: Record<string, string | null> = {};
  const thresholdIndexes = new Map<number, number[]>();

  tiers.forEach((tier, index) => {
    Object.assign(errors, validateTier(tier, index));

    const thresholdDays = Number(tier.thresholdDays);
    if (!Number.isNaN(thresholdDays) && thresholdDays > 0) {
      const indexes = thresholdIndexes.get(thresholdDays) ?? [];
      indexes.push(index);
      thresholdIndexes.set(thresholdDays, indexes);
    }
  });

  thresholdIndexes.forEach((indexes) => {
    if (indexes.length <= 1) return;

    indexes.forEach((index) => {
      errors[`tier-${index}-thresholdDays`] =
        LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.duplicateThresholdDays;
    });
  });

  return errors;
};

export function useLastMinuteDiscountPlanForm(
  initial?: Partial<LastMinuteDiscountPlanFormValues>
) {
  const [name, setNameRaw] = useState(initial?.name ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [discountTiers, setDiscountTiersRaw] = useState<LastMinuteDiscountTier[]>(
    initial?.discountTiers ?? [
      {
        thresholdDays: 1,
        discountType: "percentage",
        discountPercentage: "",
        flatDiscount: "",
        maxDiscountAmount: "0",
      },
    ]
  );
  const [errors, setErrors] = useState<LastMinuteDiscountPlanFormErrors>({});

  const setName = (value: string) => {
    setNameRaw(value);
    setErrors((prev) => ({ ...prev, name: validateName(value) }));
  };

  const clearTierErrors = (prev: LastMinuteDiscountPlanFormErrors) => {
    const next = { ...prev };
    Object.keys(next).forEach((key) => {
      if (key.startsWith("tier-")) delete next[key as keyof LastMinuteDiscountPlanFormErrors];
    });
    return next;
  };

  const setDiscountTiers = (tiers: LastMinuteDiscountTier[]) => {
    setDiscountTiersRaw(tiers);
    setErrors((prev) => ({
      ...clearTierErrors(prev),
      ...validateTiers(tiers),
    }));
  };

  const updateDiscountTier = (
    index: number,
    field: keyof LastMinuteDiscountTier,
    value: string | number
  ) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setDiscountTiersRaw(updatedTiers);

    const tierErrors = validateTiers(updatedTiers);
    setErrors((prev) => {
      const next = clearTierErrors(prev);
      Object.assign(next, tierErrors);
      return next;
    });
  };

  const setDiscountTypeExclusive = (
    index: number,
    type: "percentage" | "flat",
    value = ""
  ) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = {
      ...updatedTiers[index],
      discountType: type,
      discountPercentage: type === "percentage" ? value : "",
      flatDiscount: type === "flat" ? value : "",
      maxDiscountAmount:
        type === "percentage" ? updatedTiers[index].maxDiscountAmount : "0",
    };
    setDiscountTiersRaw(updatedTiers);

    const tierErrors = validateTiers(updatedTiers);
    setErrors((prev) => {
      const next = clearTierErrors(prev);
      Object.assign(next, tierErrors);
      return next;
    });
  };

  const validate = (): boolean => {
    const nextErrors: LastMinuteDiscountPlanFormErrors = {
      name: validateName(name),
    };

    if (discountTiers.length === 0) {
      nextErrors.discountTiers = LAST_MINUTE_DISCOUNT_PLANS_VALIDATION.tierRequired;
    } else {
      Object.assign(nextErrors, validateTiers(discountTiers));
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  return {
    name,
    setName,
    isActive,
    setIsActive,
    discountTiers,
    setDiscountTiers,
    updateDiscountTier,
    setDiscountTypeExclusive,
    errors,
    setErrors,
    validate,
  };
}
