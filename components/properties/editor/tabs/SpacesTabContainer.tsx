"use client";

import SpacesSection from "@/components/properties/SpacesSection";
import type { SectionChange } from "./types";

interface SpacesTabContainerProps {
  sectionData: unknown[];
  propertyId?: string | null;
  onSectionChange: SectionChange;
}

export default function SpacesTabContainer({
  sectionData,
  propertyId,
  onSectionChange,
}: SpacesTabContainerProps) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <SpacesSection
        spaces={sectionData as any[]}
        propertyId={propertyId}
        updateSpace={(spaceId, field, value) =>
          onSectionChange("spaces", (prev: any[] | undefined) =>
            (Array.isArray(prev) ? prev : []).map((space) =>
              space.spaceId === spaceId ? { ...space, [field]: value } : space,
            ),
          )
        }
      />
    </div>
  );
}

