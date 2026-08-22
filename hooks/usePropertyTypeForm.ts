"use client";

import { useState } from "react";
import { PROPERTY_TYPES_VALIDATION } from "@/constants/propertyTypes";

export interface PropertyTypeFormErrors {
  name?: string | null;
}

export function usePropertyTypeForm() {
  const [errors, setErrors] = useState<PropertyTypeFormErrors>({});

  const validateAll = (fields: { name: string }): boolean => {
    const newErrors: PropertyTypeFormErrors = {
      name: !fields.name || fields.name.trim().length === 0
        ? PROPERTY_TYPES_VALIDATION.nameRequired
        : fields.name.trim().length < 2
          ? PROPERTY_TYPES_VALIDATION.nameMinLength
          : fields.name.trim().length > 100
            ? PROPERTY_TYPES_VALIDATION.nameMaxLength
            : null,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const clearFieldError = (field: keyof PropertyTypeFormErrors) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  return { errors, validateAll, clearFieldError };
}