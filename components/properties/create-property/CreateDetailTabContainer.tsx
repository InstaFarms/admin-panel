"use client";

import DetailSection from "@/components/properties/DetailSection";
import { usePropertyTypeLookup } from "@/hooks/properties/usePropertyTypeLookup";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { useEffect } from "react";
import type { SectionChange } from "@/components/properties/editor/tabs/types";

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

interface CreateDetailTabContainerProps {
  sectionData: Record<string, unknown>;
  commercialSectionData: Record<string, unknown>;
  activeBrandName: string;
  commercialBrandSlug: BrandSlug;
  onSectionChange: SectionChange;
  fieldErrors?: { propertyName?: string; propertyCode?: string };
  codeWarning?: string;
  codeSuggestion?: string;
}

export default function CreateDetailTabContainer({
  sectionData,
  commercialSectionData,
  activeBrandName,
  commercialBrandSlug,
  onSectionChange,
  fieldErrors,
  codeWarning,
  codeSuggestion,
}: CreateDetailTabContainerProps) {
  const lookup = usePropertyTypeLookup();

  useEffect(() => {
    void lookup.ensurePropertyTypesLoaded();
  }, [lookup]);

  return (
    <DetailSection
      propertyTypes={lookup.propertyTypes}
      propertyFieldsDisabled={false}
      brandFieldsDisabled={false}
      showRequiredMarkers={true}
      fieldErrors={fieldErrors}
      codeWarning={codeWarning}
      codeSuggestion={codeSuggestion}
      propertyTypeId={(sectionData.propertyTypeId as string) || ""}
      setPropertyTypeId={(value) => onSectionChange(`${commercialBrandSlug}.detail.propertyTypeId`, value)}
      propertyName={(sectionData.propertyName as string) || ""}
      setPropertyName={(value) => {
        onSectionChange(`${commercialBrandSlug}.detail.propertyName`, value);
        // Auto-fill slug from name when slug is still empty
        const currentSlug = typeof sectionData.slug === "string" ? sectionData.slug.trim() : "";
        if (!currentSlug) {
          const derived = value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^[^a-z]+/, "") // must start with a letter
            .replace(/-+$/g, "");
          if (derived) onSectionChange(`${commercialBrandSlug}.detail.slug`, derived);
        }
      }}
      propertyCodeName={(sectionData.propertyCodeName as string) || ""}
      setPropertyCodeName={(value) => onSectionChange(`${commercialBrandSlug}.detail.propertyCodeName`, value)}
      slug={(sectionData.slug as string) || ""}
      setSlug={(value) => {
        const sanitized = value
          .toLowerCase()
          .replace(/\s+/g, "-")       // spaces → hyphens
          .replace(/[^a-z0-9-]/g, "") // strip invalid chars
          .replace(/^[^a-z]+/, "")    // must start with a letter
          .replace(/-{2,}/g, "-");    // collapse consecutive hyphens
        onSectionChange(`${commercialBrandSlug}.detail.slug`, sanitized);
      }}
      propertyCode={(sectionData.propertyCode as string) || ""}
      setPropertyCode={(value) => onSectionChange(`${commercialBrandSlug}.detail.propertyCode`, value.toUpperCase())}
      heading={(sectionData.heading as string) || ""}
      setHeading={(value) => onSectionChange(`${commercialBrandSlug}.detail.heading`, value)}
      weight={toNumberOrNull(sectionData.weight)}
      setWeight={(value) => onSectionChange(`${commercialBrandSlug}.detail.weight`, value)}
      bedroomCount={typeof sectionData.bedroomCount === "number" ? sectionData.bedroomCount : null}
      setBedroomCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.bedroomCount`, value)}
      bathroomCount={typeof sectionData.bathroomCount === "number" ? sectionData.bathroomCount : null}
      setBathroomCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.bathroomCount`, value)}
      doubleBedCount={typeof sectionData.doubleBedCount === "number" ? sectionData.doubleBedCount : null}
      setDoubleBedCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.doubleBedCount`, value)}
      singleBedCount={typeof sectionData.singleBedCount === "number" ? sectionData.singleBedCount : null}
      setSingleBedCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.singleBedCount`, value)}
      mattressCount={typeof sectionData.mattressCount === "number" ? sectionData.mattressCount : null}
      setMattressCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.mattressCount`, value)}
      baseGuestCount={typeof sectionData.baseGuestCount === "number" ? sectionData.baseGuestCount : null}
      setBaseGuestCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.baseGuestCount`, value)}
      maxGuestCount={typeof sectionData.maxGuestCount === "number" ? sectionData.maxGuestCount : null}
      setMaxGuestCount={(value) => onSectionChange(`${commercialBrandSlug}.detail.maxGuestCount`, value)}
      platformStartDate={(sectionData.platformStartDate as string | null) ?? null}
      setPlatformStartDate={(value) => onSectionChange(`${commercialBrandSlug}.detail.platformStartDate`, value)}
      allowOnlineBooking={Boolean(commercialSectionData.allowOnlineBooking)}
      setAllowOnlineBooking={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.allowOnlineBooking`, value)
      }
      allowCallBooking={Boolean(commercialSectionData.allowCallBooking)}
      setAllowCallBooking={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.allowCallBooking`, value)
      }
      allowEnquiry={Boolean(commercialSectionData.allowEnquiry)}
      setAllowEnquiry={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.allowEnquiry`, value)
      }
      activeBrandNames={[activeBrandName]}
      requiresConfirmation={Boolean(commercialSectionData.requiresConfirmation)}
      setRequiresConfirmation={(value) =>
        onSectionChange(`${commercialBrandSlug}.commercial.requiresConfirmation`, value)
      }
      checkinTime={(sectionData.checkinTime as string | null) ?? null}
      setCheckinTime={(value) =>
        onSectionChange(`${commercialBrandSlug}.detail.checkinTime`, value)
      }
      checkoutTime={(sectionData.checkoutTime as string | null) ?? null}
      setCheckoutTime={(value) =>
        onSectionChange(`${commercialBrandSlug}.detail.checkoutTime`, value)
      }
    />
  );
}
