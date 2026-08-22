"use client";

import { useState } from "react";
import { LANDMARKS_VALIDATION } from "@/constants/landmarks";

export interface LandmarkFormErrors {
  landmark?: string | null;
  stateId?: string | null;
  cityId?: string | null;
  areaId?: string | null;
  slug?: string | null;
}

const validateName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return LANDMARKS_VALIDATION.nameRequired;
  if (v.trim().length < 2) return LANDMARKS_VALIDATION.nameMinLength;
  if (v.trim().length > 100) return LANDMARKS_VALIDATION.nameMaxLength;
  return null;
};

const validateSlug = (v: string): string | null => {
  if (!v) return null; // slug is optional (auto-generated)
  if (!/^[a-z0-9-]+$/.test(v)) return LANDMARKS_VALIDATION.slugInvalid;
  return null;
};

export function useLandmarkForm() {
  const [errors, setErrors] = useState<LandmarkFormErrors>({});

  const validateAll = (fields: {
    landmark: string;
    stateId: string;
    cityId: string;
    areaId: string;
    slug: string;
  }): boolean => {
    const newErrors: LandmarkFormErrors = {
      landmark: validateName(fields.landmark),
      stateId: !fields.stateId ? LANDMARKS_VALIDATION.stateRequired : null,
      cityId: !fields.cityId ? LANDMARKS_VALIDATION.cityRequired : null,
      areaId: !fields.areaId ? LANDMARKS_VALIDATION.areaRequired : null,
      slug: validateSlug(fields.slug),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const clearFieldError = (field: keyof LandmarkFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return { errors, setErrors, validateAll, clearFieldError };
}