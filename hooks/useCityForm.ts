// hooks/useCityForm.ts
"use client";

import { useState } from "react";
import {
  CITIES_VALIDATION,
  ICON_CONFIG,
} from "@/constants/cities";

export interface CityFormData {
  city: string;
  stateId: string;
  weight: string;
  featured: boolean;
  slug: string;
  iconUrl: string;
}

export interface CityFormErrors {
  city?: string | null;
  stateId?: string | null;
  weight?: string | null;
  slug?: string | null;
  icon?: string | null;
}

const generateSlug = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const validateCityName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return CITIES_VALIDATION.nameRequired;
  if (name.trim().length < 2) return CITIES_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return CITIES_VALIDATION.nameMaxLength;
  return null;
};

const validateStateId = (stateId: string): string | null => {
  if (!stateId || stateId.trim().length === 0) return CITIES_VALIDATION.stateRequired;
  return null;
};

const validateWeight = (weight: string): string | null => {
  if (weight === "" || weight === null) return null; // optional
  const num = parseFloat(weight);
  if (isNaN(num) || num < 0) return CITIES_VALIDATION.weightInvalid;
  return null;
};

const validateSlug = (slug: string): string | null => {
  if (!slug || slug.trim().length === 0) return null; // auto-generated, optional
  if (!/^[a-z0-9-]+$/.test(slug)) return CITIES_VALIDATION.slugInvalid;
  return null;
};

export function useCityForm(initial?: Partial<CityFormData>) {
  const [city, setCity] = useState(initial?.city ?? "");
  const [stateId, setStateId] = useState(initial?.stateId ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? "");
  const [iconUploading, setIconUploading] = useState(false);
  const [errors, setErrors] = useState<CityFormErrors>({});

  const handleCityChange = (value: string) => {
    setCity(value);
    if (!initial?.slug) {
      setSlug(generateSlug(value));
    }
    setErrors((prev) => ({ ...prev, city: validateCityName(value) }));
  };

  const handleStateChange = (value: string) => {
    setStateId(value);
    setErrors((prev) => ({ ...prev, stateId: validateStateId(value) }));
  };

  const handleWeightChange = (value: string) => {
    setWeight(value);
    setErrors((prev) => ({ ...prev, weight: validateWeight(value) }));
  };

  const handleIconFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    uploadFn: (formData: FormData) => Promise<{ error?: string; success?: { url?: string; rawUrl?: string } }>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== ICON_CONFIG.mimeType) {
      setErrors((prev) => ({ ...prev, icon: CITIES_VALIDATION.iconInvalidType }));
      return;
    }

    if (file.size > ICON_CONFIG.maxSizeKB * 1024) {
      setErrors((prev) => ({ ...prev, icon: CITIES_VALIDATION.iconMaxSize }));
      return;
    }

    setIconUploading(true);
    setErrors((prev) => ({ ...prev, icon: null }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", ICON_CONFIG.folder);
      formData.append("withWatermark", "false");

      const result = await uploadFn(formData);
      if (result.error) {
        setErrors((prev) => ({ ...prev, icon: result.error }));
        return;
      }
      const url = result.success?.url ?? result.success?.rawUrl ?? "";
      if (url) {
        setIconUrl(url);
      }
    } catch {
      setErrors((prev) => ({ ...prev, icon: "Failed to upload icon. Please try again." }));
    } finally {
      setIconUploading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: CityFormErrors = {
      city: validateCityName(city),
      stateId: validateStateId(stateId),
      weight: validateWeight(weight),
      slug: validateSlug(slug),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  return {
    // Values
    city, setCity: handleCityChange,
    stateId, setStateId: handleStateChange,
    weight, setWeight: handleWeightChange,
    featured, setFeatured,
    slug, setSlug,
    iconUrl, setIconUrl,
    iconUploading,
    errors, setErrors,
    // Helpers
    handleIconFileChange,
    validate,
    generateSlug,
  };
}