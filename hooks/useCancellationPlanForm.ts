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

/**
 * Days this policy leaves uncovered between its two directions.
 *
 * Tiers match with STRICT inequalities (selectCancellationRule), so "more than
 * 7" and "fewer than 7" BOTH exclude day 7. Two tiers that look like they meet
 * at a boundary actually leave that day matching nothing, and a cancellation
 * exactly then is refunded 0% silently — not the 50% or 100% either tier reads
 * as. That is the trap this catches.
 *
 * A day D is covered when some tier matches it: `lessThan` with days > D, or
 * "more than" with days < D. So the whole covered set is
 * {D < max(lessThan days)} u {D > min(moreThan days)}, and the gap is whatever
 * sits between them.
 *
 * A one-sided policy (only "more than", or only "fewer than") is NOT flagged:
 * leaving the other end unrefunded is a normal deliberate choice, and warning
 * about it would be noise.
 */
const uncoveredDays = (tiers: CancellationTier[]): number[] => {
  const lessDays = tiers.filter((t) => t.lessThan).map((t) => Number(t.days));
  const moreDays = tiers.filter((t) => !t.lessThan).map((t) => Number(t.days));
  if (!lessDays.length || !moreDays.length) return [];
  if (lessDays.some(isNaN) || moreDays.some(isNaN)) return [];

  const coveredBelow = Math.max(...lessDays); // days strictly under this are covered
  const coveredAbove = Math.min(...moreDays); // days strictly over this are covered
  const gap: number[] = [];
  for (let day = Math.max(0, coveredBelow); day <= coveredAbove; day += 1) {
    gap.push(day);
  }
  return gap;
};

/** "day 7" / "days 5 and 6" / "days 5–9" — readable in an error message. */
const describeDays = (days: number[]): string => {
  if (days.length === 1) return `day ${days[0]}`;
  if (days.length === 2) return `days ${days[0]} and ${days[1]}`;
  return `days ${days[0]}–${days[days.length - 1]}`;
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

      // Only worth reporting once every tier is individually valid — a gap
      // computed from half-typed days would move around as the operator types.
      if (!Object.values(newErrors).some(Boolean)) {
        const gap = uncoveredDays(cancellationTiers);
        if (gap.length > 0) {
          newErrors.cancellationTiers = CANCELLATION_PLANS_VALIDATION.tierGap(
            describeDays(gap)
          );
        }
      }
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
