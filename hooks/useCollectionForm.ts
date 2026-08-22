"use client";

import { useState } from "react";
import { COLLECTIONS_VALIDATION } from "@/constants/collections";

export interface CollectionFormErrors {
  name?: string | null;
  slug?: string | null;
  weight?: string | null;
}

const validateName = (v: string): string | null => {
  if (!v || v.trim().length === 0) return COLLECTIONS_VALIDATION.nameRequired;
  if (v.trim().length < 2) return COLLECTIONS_VALIDATION.nameMinLength;
  if (v.trim().length > 100) return COLLECTIONS_VALIDATION.nameMaxLength;
  return null;
};

const validateSlug = (v: string): string | null => {
  if (!v) return null; // auto-generated, optional manual entry
  if (!/^[a-z0-9-]+$/.test(v)) return COLLECTIONS_VALIDATION.slugInvalid;
  return null;
};

const validateWeight = (v: string): string | null => {
  const n = parseFloat(v);
  if (v !== "" && (isNaN(n) || n < 0)) return COLLECTIONS_VALIDATION.weightInvalid;
  return null;
};

export function useCollectionForm() {
  const [errors, setErrors] = useState<CollectionFormErrors>({});

  const validateAll = (fields: {
    name: string;
    slug: string;
    weight: string;
  }): boolean => {
    const newErrors: CollectionFormErrors = {
      name: validateName(fields.name),
      slug: validateSlug(fields.slug),
      weight: validateWeight(fields.weight),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const clearFieldError = (field: keyof CollectionFormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return { errors, setErrors, validateAll, clearFieldError };
}