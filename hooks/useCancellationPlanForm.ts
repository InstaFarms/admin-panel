"use client";

import { useState } from "react";
import { CANCELLATION_PLANS_VALIDATION } from "@/constants/cancellation-plans";

export interface CancellationTier {
  percentage: string;
  days: number;
  lessThan: boolean;
}

export interface CancellationPlanFormValues {
  name: string;
  isActive: boolean;
  cancellationTiers: CancellationTier[];
}

export interface CancellationPlanFormErrors {
  name?: string | null;
  cancellationTiers?: string | null;
  [key: `tier-${number}-percentage`]: string | null;
  [key: `tier-${number}-days`]: string | null;
}

const validateName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return CANCELLATION_PLANS_VALIDATION.nameRequired;
  if (v.trim().length < 2) return CANCELLATION_PLANS_VALIDATION.nameMinLength;
  if (v.trim().length > 100) return CANCELLATION_PLANS_VALIDATION.nameMaxLength;
  return null;
};

const validatePercentage = (value: string): string | null => {
  if (!value || value.trim().length === 0) return CANCELLATION_PLANS_VALIDATION.percentageRequired;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 100) return CANCELLATION_PLANS_VALIDATION.percentageInvalid;
  return null;
};

const validateDays = (value: number | string): string | null => {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (isNaN(num) || num < 0) return CANCELLATION_PLANS_VALIDATION.daysInvalid;
  return null;
};

const validateTier = (tier: CancellationTier, index: number): Record<string, string | null> => {
  const errors: Record<string, string | null> = {};
  
  const percentageError = validatePercentage(tier.percentage);
  if (percentageError) errors[`tier-${index}-percentage`] = percentageError;
  
  const daysError = validateDays(tier.days);
  if (daysError) errors[`tier-${index}-days`] = daysError;
  
  return errors;
};

export function useCancellationPlanForm(initial?: Partial<CancellationPlanFormValues>) {
  const [name, setNameRaw] = useState(initial?.name ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [cancellationTiers, setCancellationTiersRaw] = useState<CancellationTier[]>(
    initial?.cancellationTiers ?? [{ percentage: "", days: 0, lessThan: true }]
  );
  const [errors, setErrors] = useState<CancellationPlanFormErrors>({});

  const setName = (v: string) => {
    setNameRaw(v);
    setErrors((prev) => ({ ...prev, name: validateName(v) }));
  };

  const setCancellationTiers = (tiers: CancellationTier[]) => {
    setCancellationTiersRaw(tiers);
    // Clear tier errors when tiers change
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith("tier-")) delete newErrors[key as keyof CancellationPlanFormErrors];
    });
    setErrors(newErrors);
  };

  const updateCancellationTier = (index: number, field: keyof CancellationTier, value: string | number | boolean) => {
    const updatedTiers = [...cancellationTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setCancellationTiers(updatedTiers);
    
    // Validate the updated tier
    const tierErrors = validateTier(updatedTiers[index], index);
    setErrors((prev) => {
      const newErrors = { ...prev };
      // Clear previous errors for this tier
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`tier-${index}-`)) {
          delete newErrors[key as keyof CancellationPlanFormErrors];
        }
      });
      // Add new errors
      Object.assign(newErrors, tierErrors);
      return newErrors;
    });
  };

  const validate = (): boolean => {
    const newErrors: CancellationPlanFormErrors = {
      name: validateName(name),
    };

    if (cancellationTiers.length === 0) {
      newErrors.cancellationTiers = CANCELLATION_PLANS_VALIDATION.tierRequired;
    } else {
      cancellationTiers.forEach((tier, index) => {
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
    cancellationTiers,
    setCancellationTiers,
    updateCancellationTier,
    errors,
    setErrors,
    validate,
  };
}
