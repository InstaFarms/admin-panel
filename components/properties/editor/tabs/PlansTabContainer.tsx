"use client";

import PlansSection from "@/components/properties/PlansSection";
import { usePropertyEditorServicesContext } from "@/components/properties/editor/usePropertyEditorServicesContext";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { PLAN_BRAND_APP_TYPE } from "@/constants/planBrandScope";
import type { CancellationPlan, DiscountPlan } from "@/utils/types";
import { useState } from "react";
import type { SectionChange } from "./types";

interface PlansTabContainerProps {
  sectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
  plansBrandSlug: BrandSlug;
}

// The create-property flow types this as "INSTAFARMS_EXCLUSIVE" / "MAGO" / "ELIVAAS",
// but the existing-property edit flow (usePropertyBootstrap) actually passes the legacy
// lowercase slugs ("instafarms" / "mago") at runtime — see the casing note in
// buildPropertyUpsertPayload.ts. Match case-insensitively so both flows resolve correctly.
// Discount/cancellation plans only exist under the InstaFarms and Mago brands, so any
// other source (e.g. ELIVAAS) falls back to InstaFarms' plan scope.
const planAppTypeForBrandSlug = (slug: BrandSlug): string =>
  String(slug).toUpperCase() === "MAGO" ? PLAN_BRAND_APP_TYPE.mago : PLAN_BRAND_APP_TYPE.instafarms;

export default function PlansTabContainer({
  sectionData,
  onSectionChange,
  plansBrandSlug,
}: PlansTabContainerProps) {
  const { services } = usePropertyEditorServicesContext();
  const planAppType = planAppTypeForBrandSlug(plansBrandSlug);
  const [discountSearchQuery, setDiscountSearchQuery] = useState("");
  const [shortTermSearchQuery, setShortTermSearchQuery] = useState("");
  const [longTermSearchQuery, setLongTermSearchQuery] = useState("");
  const [discountSearchResults, setDiscountSearchResults] = useState<DiscountPlan[]>([]);
  const [shortTermSearchResults, setShortTermSearchResults] = useState<CancellationPlan[]>([]);
  const [longTermSearchResults, setLongTermSearchResults] = useState<CancellationPlan[]>([]);

  const updateArrayAtPath = <T,>(path: string, updater: (prev: T[]) => T[]) => {
    onSectionChange(path, (prev: T[] | undefined) => updater(Array.isArray(prev) ? prev : []));
  };

  return (
    <PlansSection
      discountPlans={(Array.isArray(sectionData.discountPlans) ? sectionData.discountPlans : []) as DiscountPlan[]}
      shortTermCancellationPlan={(sectionData.shortTermCancellationPlan as CancellationPlan) || null}
      longTermCancellationPlan={(sectionData.longTermCancellationPlan as CancellationPlan) || null}
      discountSearchQuery={discountSearchQuery}
      setDiscountSearchQuery={setDiscountSearchQuery}
      shortTermSearchQuery={shortTermSearchQuery}
      setShortTermSearchQuery={setShortTermSearchQuery}
      longTermSearchQuery={longTermSearchQuery}
      setLongTermSearchQuery={setLongTermSearchQuery}
      discountSearchResults={discountSearchResults}
      shortTermSearchResults={shortTermSearchResults}
      longTermSearchResults={longTermSearchResults}
      searchDiscountPlans={async (query) => {
        setDiscountSearchQuery(query);
        const result = await services.searchDiscountPlans(query, planAppType);
        if (Array.isArray(result)) setDiscountSearchResults(result as DiscountPlan[]);
      }}
      searchShortTermPlans={async (query) => {
        setShortTermSearchQuery(query);
        const result = await services.searchShortTermPlans(query, planAppType);
        if (Array.isArray(result)) setShortTermSearchResults(result as CancellationPlan[]);
      }}
      searchLongTermPlans={async (query) => {
        setLongTermSearchQuery(query);
        const result = await services.searchLongTermPlans(query, planAppType);
        if (Array.isArray(result)) setLongTermSearchResults(result as CancellationPlan[]);
      }}
      addDiscountPlan={(plan) =>
        updateArrayAtPath<DiscountPlan>(`${plansBrandSlug}.plans.discountPlans`, (prev) =>
          prev.some((item) => item.id === plan.id) ? prev : [...prev, plan],
        )
      }
      removeDiscountPlan={(planId) =>
        updateArrayAtPath<DiscountPlan>(`${plansBrandSlug}.plans.discountPlans`, (prev) =>
          prev.filter((item) => item.id !== planId),
        )
      }
      addShortTermPlan={(plan) =>
        onSectionChange(`${plansBrandSlug}.plans.shortTermCancellationPlan`, plan)
      }
      removeShortTermPlan={() =>
        onSectionChange(`${plansBrandSlug}.plans.shortTermCancellationPlan`, null)
      }
      addLongTermPlan={(plan) =>
        onSectionChange(`${plansBrandSlug}.plans.longTermCancellationPlan`, plan)
      }
      removeLongTermPlan={() =>
        onSectionChange(`${plansBrandSlug}.plans.longTermCancellationPlan`, null)
      }
    />
  );
}

