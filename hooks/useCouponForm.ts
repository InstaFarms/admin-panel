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
  }): boolean => {
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
    return !Object.values(newErrors).some(Boolean);
  };

  const clearFieldError = (field: keyof CouponFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return { errors, setErrors, validateAll, clearFieldError };
}
