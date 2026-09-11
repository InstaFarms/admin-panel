"use client";

import { useState } from "react";
import {
  COUPONS_VALIDATION,
  DAYS_OF_WEEK,
  type DiscountType,
} from "@/constants/coupons";

export interface CouponFormErrors {
  name?: string | null;
  code?: string | null;
  discountPercentage?: string | null;
  flatDiscount?: string | null;
  maxDiscountAmount?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  applicableDays?: string | null;
  minOrderValue?: string | null;
  entityIds?: string | null;
  brandId?: string | null;
}

const validateName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return COUPONS_VALIDATION.nameRequired;
  if (v.trim().length < 2) return COUPONS_VALIDATION.nameMinLength;
  if (v.trim().length > 100) return COUPONS_VALIDATION.nameMaxLength;
  return null;
};

const validateCode = (v: string): string | null => {
  if (!v || v.trim().length === 0) return COUPONS_VALIDATION.codeRequired;
  if (!/^[A-Z0-9]+$/.test(v.trim().toUpperCase()))
    return COUPONS_VALIDATION.codeInvalid;
  return null;
};

const validateDates = (
  from: string,
  until: string,
  isEdit = false,
): { validFrom?: string | null; validUntil?: string | null } => {
  const errors: { validFrom?: string | null; validUntil?: string | null } = {};
  if (!from) errors.validFrom = COUPONS_VALIDATION.validFromRequired;
  if (!until) errors.validUntil = COUPONS_VALIDATION.validUntilRequired;
  if (from && until && new Date(until) < new Date(from)) {
    errors.validUntil = COUPONS_VALIDATION.validUntilBeforeFrom;
  }
  return errors;
};

const validateDiscount = (
  type: DiscountType,
  percentage: string,
  flat: string,
): { discountPercentage?: string | null; flatDiscount?: string | null } => {
  if (type === "percentage") {
    const pct = parseFloat(percentage);
    if (!percentage)
      return { discountPercentage: COUPONS_VALIDATION.discountRequired };
    if (isNaN(pct) || pct <= 0 || pct > 100)
      return { discountPercentage: COUPONS_VALIDATION.percentageRange };
  } else {
    const f = parseFloat(flat);
    if (!flat) return { flatDiscount: COUPONS_VALIDATION.discountRequired };
    if (isNaN(f) || f <= 0)
      return { flatDiscount: COUPONS_VALIDATION.flatNegative };
  }
  return {};
};

export function useCouponForm(isEdit = false) {
  const [errors, setErrors] = useState<CouponFormErrors>({});

  /**
   * Validates the whole form and returns the computed errors — null when valid.
   *
   * It returns the ERRORS rather than a bare boolean because the caller needs
   * the messages, not just "did it fail". CouponEditor used to take the boolean
   * and then read the `errors` STATE to build its toast, but that state is only
   * written by the setErrors below, which React has not applied yet in the same
   * tick — so the caller read the PREVIOUS render's errors. On a first submit
   * that is `{}`, so every specific reason ("Discount percentage must be
   * between 1 and 100") was computed and then thrown away in favour of the
   * generic "Please fix the errors before submitting."
   */
  const validateAll = (fields: {
    name: string;
    code: string;
    discountType: DiscountType;
    discountPercentage: string;
    flatDiscount: string;
    maxDiscountAmount: string;
    validFrom: string;
    validUntil: string;
    applicableDays: string[];
    minOrderValue: string;
    newUsersOnly: boolean;
    appliesToAllEntities: boolean;
    entityIds: string[];
    brandId: string;
  }): CouponFormErrors | null => {
    const newErrors: CouponFormErrors = {
      name: validateName(fields.name),
      code: validateCode(fields.code),
      brandId: fields.brandId ? null : "Please select a brand.",
      ...validateDiscount(
        fields.discountType,
        fields.discountPercentage,
        fields.flatDiscount,
      ),
      ...validateDates(fields.validFrom, fields.validUntil, isEdit),
      applicableDays:
        fields.applicableDays.length === 0
          ? COUPONS_VALIDATION.applicableDaysRequired
          : null,
      entityIds: null,
      minOrderValue:
        parseFloat(fields.minOrderValue || "0") < 0
          ? COUPONS_VALIDATION.minOrderNegative
          : null,
    };

    setErrors(newErrors);
    return Object.values(newErrors).some(Boolean) ? newErrors : null;
  };

  const clearFieldError = (field: keyof CouponFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return { errors, setErrors, validateAll, clearFieldError };
}
