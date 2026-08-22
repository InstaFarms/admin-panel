"use client";

import { fetchHelperData } from "@/actions/propertyActions";
import type { PropertyType } from "@/utils/types";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export function usePropertyTypeLookup() {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [propertyTypesLoaded, setPropertyTypesLoaded] = useState(false);
  const [propertyTypesLoading, setPropertyTypesLoading] = useState(false);

  const ensurePropertyTypesLoaded = useCallback(async () => {
    if (propertyTypesLoaded || propertyTypesLoading) return;
    setPropertyTypesLoading(true);
    try {
      const result = await fetchHelperData("property-types");
      setPropertyTypes((result.data || []) as PropertyType[]);
      setPropertyTypesLoaded(true);
    } catch (err) {
      console.error("Error loading property types:", err);
      toast.error("Failed to load property types");
    } finally {
      setPropertyTypesLoading(false);
    }
  }, [propertyTypesLoaded, propertyTypesLoading]);

  return {
    propertyTypes,
    propertyTypesLoaded,
    propertyTypesLoading,
    ensurePropertyTypesLoaded,
  };
}
