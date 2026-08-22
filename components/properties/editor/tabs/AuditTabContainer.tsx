"use client";

import AuditAreasSection from "@/components/properties/AuditAreasSection";
import { usePropertyEditorServicesContext } from "@/components/properties/editor/usePropertyEditorServicesContext";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { useEffect } from "react";
import type { SectionChange } from "./types";

interface AuditTabContainerProps {
  commercialSectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
  commercialBrandSlug: BrandSlug;
}

export default function AuditTabContainer({}: AuditTabContainerProps) {
  const { services, bootstrapLoading } = usePropertyEditorServicesContext();
  const { ensureAuditAreasLoaded } = services;

  useEffect(() => {
    void ensureAuditAreasLoaded();
  }, [ensureAuditAreasLoaded]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <AuditAreasSection
        auditAreas={services.auditAreas}
        auditAreasLoaded={services.auditAreasLoaded}
        unsavedAuditItems={services.unsavedAuditItems}
        isLoading={bootstrapLoading || services.auditAreasLoading}
        onEnsureAreasLoaded={ensureAuditAreasLoaded}
        onAddArea={services.handleAddAuditArea}
        onRemoveArea={services.handleRemoveAuditArea}
        getAreaItems={services.getAuditAreaItems}
        onAddItem={services.handleAddChecklistItem}
        onUpdateItem={services.handleUpdateChecklistItem}
        onRemoveItem={services.handleRemoveChecklistItem}
      />
    </div>
  );
}

