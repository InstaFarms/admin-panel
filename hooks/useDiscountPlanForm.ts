"use client";

import { useState } from "react";
import { DISCOUNT_PLANS_VALIDATION } from "@/constants/discount-plans";

export interface DiscountTier {
  minDays: number;
  discountPercentage: string;
  flatDiscount: string;
}

export interface DiscountPlanFormValues {
  name: string;
  isActive: boolean;
  discountTiers: DiscountTier[];
}

export interface DiscountPlanFormErrors {
  name?: string | null;
  discountTiers?: string | null;
  [key: `tier-${number}-minDays`]: string | null;
  [key: `tier-${number}-discountPercentage`]: string | null;
  [key: `tier-${number}-flatDiscount`]: string | null;
}

const validateName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return DISCOUNT_PLANS_VALIDATION.nameRequired;
  if (v.trim().length < 2) return DISCOUNT_PLANS_VALIDATION.nameMinLength;
  if (v.trim().length > 100) return DISCOUNT_PLANS_VALIDATION.nameMaxLength;
  return null;
};

const validateMinDays = (value: number | string): string | null => {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (isNaN(num) || num < 0) return DISCOUNT_PLANS_VALIDATION.minDaysInvalid;
  return null;
};

const validateDiscountPercentage = (value: string): string | null => {
  if (value === "" || value === undefined) return null; // optional
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 100) return DISCOUNT_PLANS_VALIDATION.discountPercentageInvalid;
  return null;
};

const validateFlatDiscount = (value: string): string | null => {
  if (value === "" || value === undefined) return null; // optional
  const num = parseInt(value);
  if (isNaN(num) || num < 0) return DISCOUNT_PLANS_VALIDATION.flatDiscountInvalid;
  return null;
};

const validateTier = (tier: DiscountTier, index: number): Record<string, string | null> => {
  const errors: Record<string, string | null> = {};
  
  const minDaysError = validateMinDays(tier.minDays);
  if (minDaysError) errors[`tier-${index}-minDays`] = minDaysError;
  
  const discountPercentageError = validateDiscountPercentage(tier.discountPercentage);
  if (discountPercentageError) errors[`tier-${index}-discountPercentage`] = discountPercentageError;
  
  const flatDiscountError = validateFlatDiscount(tier.flatDiscount);
  if (flatDiscountError) errors[`tier-${index}-flatDiscount`] = flatDiscountError;
  
  // Check if tier has at least one discount type
  if (!tier.discountPercentage && !tier.flatDiscount) {
    errors[`tier-${index}-discountPercentage`] = DISCOUNT_PLANS_VALIDATION.tierIncomplete;
  }
  
  return errors;
};

export function useDiscountPlanForm(initial?: Partial<DiscountPlanFormValues>) {
  const [name, setNameRaw] = useState(initial?.name ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [discountTiers, setDiscountTiersRaw] = useState<DiscountTier[]>(
    initial?.discountTiers ?? [{ minDays: 0, discountPercentage: "", flatDiscount: "" }]
  );
  const [errors, setErrors] = useState<DiscountPlanFormErrors>({});

  const setName = (v: string) => {
    setNameRaw(v);
    setErrors((prev) => ({ ...prev, name: validateName(v) }));
  };

  const setDiscountTiers = (tiers: DiscountTier[]) => {
    setDiscountTiersRaw(tiers);
    // Clear tier errors when tiers change
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith("tier-")) delete newErrors[key as keyof DiscountPlanFormErrors];
    });
    setErrors(newErrors);
  };

  const updateDiscountTier = (index: number, field: keyof DiscountTier, value: string | number) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setDiscountTiers(updatedTiers);
    
    // Validate the updated tier
    const tierErrors = validateTier(updatedTiers[index], index);
    setErrors((prev) => {
      const newErrors = { ...prev };
      // Clear previous errors for this tier
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`tier-${index}-`)) {
          delete newErrors[key as keyof DiscountPlanFormErrors];
        }
      });
      // Add new errors
      Object.assign(newErrors, tierErrors);
      return newErrors;
    });
  };

  /** Set discount percentage OR flat discount for a tier; clears the other so only one is set. */
  const setDiscountTypeExclusive = (
    index: number,
    type: "discountPercentage" | "flatDiscount",
    value: string
  ) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = {
      ...updatedTiers[index],
      discountPercentage: type === "discountPercentage" ? value : "",
      flatDiscount: type === "flatDiscount" ? value : "",
    };
    setDiscountTiersRaw(updatedTiers);
    const tierErrors = validateTier(updatedTiers[index], index);
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`tier-${index}-`)) {
          delete newErrors[key as keyof DiscountPlanFormErrors];
        }
      });
      Object.assign(newErrors, tierErrors);
      return newErrors;
    });
  };

  const validate = (): boolean => {
    const newErrors: DiscountPlanFormErrors = {
      name: validateName(name),
    };

    if (discountTiers.length === 0) {
      newErrors.discountTiers = DISCOUNT_PLANS_VALIDATION.tierRequired;
    } else {
      discountTiers.forEach((tier, index) => {
        const tierErrors = validateTier(tier, index);
        Object.assign(newErrors, tierErrors);
      });
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
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
