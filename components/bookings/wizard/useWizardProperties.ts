"use client";

import { useEffect, useState } from "react";
import { getAllPropertiesForSelector } from "@/actions/propertyActions";
import { resolveImageSrc } from "@/utils/image";
import type { PropertyLite } from "./types";

function mapProperty(p: any): PropertyLite {
  return {
    id: String(p.id ?? p.entityId ?? p.propertyId),
    name: p.propertyName ?? p.entityName ?? p.name ?? "Unnamed property",
    code: p.propertyCode ?? p.entityCode ?? undefined,
    area: p.area?.area ?? p.area ?? null,
    city: p.city?.city ?? p.city ?? null,
    propertyType: p.propertyType ?? p.type ?? null,
    baseGuests: p.baseGuestCount ?? p.baseGuests ?? p.baseOccupancy ?? null,
    maxGuests: p.maxGuestCount ?? p.maxGuests ?? p.maxOccupancy ?? null,
    rate: p.fromRateWithGst ?? p.baseRentalPrice ?? p.sellingPrice ?? p.basePrice ?? p.rackRate ?? null,
    weeklyRates: {
      0: p.sundayPriceWithGST ?? null,
      1: p.mondayPriceWithGST ?? null,
      2: p.tuesdayPriceWithGST ?? null,
      3: p.wednesdayPriceWithGST ?? null,
      4: p.thursdayPriceWithGST ?? null,
      5: p.fridayPriceWithGST ?? null,
      6: p.saturdayPriceWithGST ?? null,
    },
    imageUrl: Array.isArray(p.gallery) && p.gallery.length > 0 ? resolveImageSrc(p.gallery[0]?.url) : null,
  };
}

/**
 * Loads every property once, for the wizard's client-side property browser/select.
 * NOTE: intentionally not brand-filtered server-side -- mirrors PropertySelector's own
 * `loadAllByDefault` path, which also fetches the unfiltered list (see docs, "Known gaps").
 */
export function useWizardProperties(_brandName: string | undefined) {
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllPropertiesForSelector()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setProperties(rows.map(mapProperty));
      })
      .catch(() => {
        if (!cancelled) setProperties([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [_brandName]);

  return { properties, loading };
}
