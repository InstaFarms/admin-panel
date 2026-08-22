"use client";

import { clonePropertyBrand, deletePropertyBrand } from "@/actions/propertyActions";
import {
  checkPropertySetupReadiness,
  type PropertySetupReadiness,
} from "@/actions/propertySetupReadinessActions";
import { usePropertyBootstrap } from "@/hooks/properties/usePropertyBootstrap";
import { usePropertyServices } from "@/hooks/properties/usePropertyServices";
import {
  createEmptyBrandTabBundle,
  type BrandSlug,
} from "@/lib/properties/propertyEditorDraft";
import { resolveBrandSlugFromName } from "@/lib/properties/brandSlug";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import PendingBrandActionModal from "./PendingBrandActionModal";
import { PropertyEditorTabs, PROPERTY_EDITOR_TAB_INDEX } from "./PropertyEditorTabs";
import PropertySetupWarningBanner from "./PropertySetupWarningBanner";
import { usePropertySubmit } from "./usePropertySubmit";
import { usePropertyEditorState } from "./usePropertyEditorState";
import PropertyEditorHeader from "./PropertyEditorHeader";
import { PROPERTY_EDITOR_FORM_ID, usePropertyEditorViewModel } from "./usePropertyEditorViewModel";
import { PropertyEditorServicesProvider } from "./usePropertyEditorServicesContext";

interface BrandOption {
  id: string;
  name: string;
}

interface PropertyEditorProps {
  propertyId?: string | null;
  brands?: BrandOption[];
}

type PendingBrandAction =
  | {
      mode: "switch" | "add";
      brand: {
        id: string;
        name: string;
        slug: BrandSlug;
      };
    }
  | null;

export default function PropertyEditor({ propertyId, brands = [] }: PropertyEditorProps) {
  const [requestedBrandId, setRequestedBrandId] = useState<string | null>(null);
  const [pendingBrandAction, setPendingBrandAction] = useState<PendingBrandAction>(null);
  const [brandTransition, setBrandTransition] = useState<{ id: string; name: string } | null>(null);
  const [activeScope, setActiveScope] = useState<"property" | "brand">("property");
  const [pendingScopeSwitch, setPendingScopeSwitch] = useState(false);
  const [propertyUpdatedAt, setPropertyUpdatedAt] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<number>(PROPERTY_EDITOR_TAB_INDEX.DETAIL);
  const bootstrap = usePropertyBootstrap(propertyId, requestedBrandId);
  const services = usePropertyServices(propertyId);
  const editorState = usePropertyEditorState(bootstrap.initialSnapshot);

  // Load property types eagerly so isResort can be computed without waiting for Detail tab
  useEffect(() => {
    void bootstrap.ensurePropertyTypesLoaded();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const activeBrandSlug = bootstrap.selectedBrandSlug;
  const activeDraft = editorState.draft?.[activeBrandSlug] ?? createEmptyBrandTabBundle();
  const draftDetail = (activeDraft.detail ?? {}) as Record<string, unknown>;
  const draftPropertyName =
    typeof draftDetail.propertyName === "string" ? draftDetail.propertyName : "";
  const activeBrandDirty = editorState.dirtyPaths.some(
    (path) => path === activeBrandSlug || path.startsWith(`${activeBrandSlug}.`),
  );

  // Derive isResort: match propertyTypeId in draft against bootstrap-loaded property types.
  const isResort = useMemo(() => {
    const typeId = draftDetail.propertyTypeId as string | undefined;
    if (!typeId || !bootstrap.propertyTypes.length) return false;
    const matched = bootstrap.propertyTypes.find((pt: any) => pt.id === typeId);
    return matched?.name?.toLowerCase() === "resort";
  }, [draftDetail.propertyTypeId, bootstrap.propertyTypes]);

  const availableBrands = useMemo(() => {
    if (bootstrap.availableBrands.length > 0) return bootstrap.availableBrands;
    if (!bootstrap.isEditMode) {
      const createBrand = brands.find(
        (brand) => resolveBrandSlugFromName(brand.name) === activeBrandSlug,
      );
      return createBrand
        ? [{ id: createBrand.id, name: createBrand.name, slug: activeBrandSlug }]
        : [{ id: activeBrandSlug, name: "Instafarms", slug: activeBrandSlug }];
    }
    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: resolveBrandSlugFromName(brand.name),
    }));
  }, [bootstrap.availableBrands, brands]);

  const addableBrands = useMemo(() => {
    const activeSlugs = new Set(availableBrands.map((brand) => brand.slug));
    return brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: resolveBrandSlugFromName(brand.name),
      }))
      .filter((brand) => !activeSlugs.has(brand.slug));
  }, [availableBrands, brands]);
  const activeBrandName =
    availableBrands.find((brand) => brand.slug === activeBrandSlug)?.name ??
    (activeBrandSlug === "instafarms" ? "Instafarms" : activeBrandSlug === "mago" ? "Mago" : "Listing");
  const activeBrand = availableBrands.find((brand) => brand.slug === activeBrandSlug) ?? null;
  const isBrandSwitching =
    Boolean(propertyId) &&
    bootstrap.loading &&
    Boolean(brandTransition) &&
    brandTransition?.id !== bootstrap.selectedBrandId;

  useEffect(() => {
    if (bootstrap.propertyUpdatedAt !== undefined) {
      setPropertyUpdatedAt(bootstrap.propertyUpdatedAt);
    }
  }, [bootstrap.propertyUpdatedAt]);

  const [setupReadiness, setSetupReadiness] = useState<PropertySetupReadiness | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setSetupReadiness(null);
      return;
    }
    let cancelled = false;
    checkPropertySetupReadiness(propertyId)
      .then((data) => {
        if (!cancelled) setSetupReadiness(data);
      })
      .catch((err) => {
        console.error("Failed to check property setup readiness:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const { loading, handleSubmit } = usePropertySubmit({
    editorState,
    isEditMode: bootstrap.isEditMode,
    saveUnsavedAreas: services.saveUnsavedAreas,
    propertyId,
    activeBrandSlug,
    propertyUpdatedAt,
    onUpdatedAtChange: setPropertyUpdatedAt,
    onSuccess: () => {
      setPendingBrandAction(null);
    },
  });

  const { pageTitle } = usePropertyEditorViewModel({
    draftPropertyName,
    propertyId,
  });

  useEffect(() => {
    if (!brandTransition) return;
    if (bootstrap.loading) return;
    if (bootstrap.error) {
      toast.error(bootstrap.error, {
        id: "property-brand-switch",
      });
      setBrandTransition(null);
      return;
    }
    if (!bootstrap.selectedBrandId || bootstrap.selectedBrandId === brandTransition.id) {
      toast.success(`${brandTransition.name} is now ready.`, {
        id: "property-brand-switch",
      });
      setBrandTransition(null);
    }
  }, [brandTransition, bootstrap.error, bootstrap.loading, bootstrap.selectedBrandId]);

  const performBrandAction = async (action: NonNullable<PendingBrandAction>) => {
    if (action.mode === "switch") {
      setBrandTransition({ id: action.brand.id, name: action.brand.name });
      setRequestedBrandId(action.brand.id);
      toast.loading(`Switching to ${action.brand.name}...`, {
        id: "property-brand-switch",
      });
      return;
    }

    if (!propertyId) {
      toast.error("Create the property first before adding another brand.");
      return;
    }

    if (!activeBrand?.id) {
      toast.error("Current brand details are unavailable.");
      return;
    }

    const result = await clonePropertyBrand(
      propertyId,
      activeBrand.id,
      action.brand.id,
      action.brand.name,
    );

    if (result.error) {
      toast.dismiss("property-brand-switch");
      toast.error(result.error);
      setBrandTransition(null);
      return;
    }

    setBrandTransition({ id: action.brand.id, name: action.brand.name });
    toast.loading(`Loading ${action.brand.name}...`, {
      id: "property-brand-switch",
    });
    toast.success(result.success || `${action.brand.name} added successfully.`);
    setRequestedBrandId(action.brand.id);
  };

  const handlePropertyPillSelect = () => {
    if (activeScope === "property") return;
    if (!activeBrandDirty) {
      setActiveScope("property");
      return;
    }
    setPendingScopeSwitch(true);
  };

  const handleBrandSelect = async (brand: { id: string; name: string; slug: BrandSlug }) => {
    if (brand.slug === activeBrandSlug && activeScope === "brand") return;
    const action = { mode: "switch" as const, brand };
    if (!activeBrandDirty) {
      await performBrandAction(action);
      setActiveScope("brand");
      return;
    }
    setPendingBrandAction(action);
  };

  const handleBrandAdd = async (brand: { id: string; name: string; slug: BrandSlug }) => {
    const action = { mode: "add" as const, brand };
    if (!activeBrandDirty) {
      await performBrandAction(action);
      return;
    }
    setPendingBrandAction(action);
  };

  const handleBrandRemove = async (brand: { id: string; name: string; slug: BrandSlug }) => {
    if (!propertyId) return;
    if (isBrandSwitching) return;
    const confirmed = window.confirm(
      `Remove ${brand.name} from active brands for this property? You can add it back later.`,
    );
    if (!confirmed) return;

    const result = await deletePropertyBrand(propertyId, brand.id, brand.name);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(result.success || `${brand.name} removed from active brands successfully.`);
    const remainingBrands = availableBrands.filter((entry) => entry.slug !== brand.slug);
    const nextBrand = remainingBrands[0] ?? null;
    setRequestedBrandId(nextBrand?.id ?? null);
  };

  const handleSaveAndContinue = async () => {
    if (!pendingBrandAction) return;
    const nextAction = pendingBrandAction;
    const didSave = await handleSubmit();
    if (!didSave) return;
    await performBrandAction(nextAction);
    setActiveScope("brand");
  };

  const handleDiscardAndContinue = async () => {
    if (!pendingBrandAction) return;
    const nextAction = pendingBrandAction;
    editorState.resetDraft();
    setPendingBrandAction(null);
    await performBrandAction(nextAction);
    setActiveScope("brand");
  };

  const handleScopeSaveAndContinue = async () => {
    const didSave = await handleSubmit();
    if (!didSave) return;
    setPendingScopeSwitch(false);
    setActiveScope("property");
  };

  const handleScopeDiscardAndContinue = () => {
    editorState.resetDraft();
    setPendingScopeSwitch(false);
    setActiveScope("property");
  };

  return (
    <PropertyEditorServicesProvider
      value={{
        services,
        bootstrapLoading: bootstrap.loading,
        }}
      >
      <form id={PROPERTY_EDITOR_FORM_ID} className="flex flex-col gap-6">
        <PendingBrandActionModal
          open={Boolean(pendingBrandAction)}
          currentBrandName={activeBrandName}
          targetBrandName={pendingBrandAction?.brand.name ?? activeBrandName}
          loading={loading}
          onSaveAndContinue={handleSaveAndContinue}
          onDiscardAndContinue={handleDiscardAndContinue}
          onCancel={() => setPendingBrandAction(null)}
        />
        <PendingBrandActionModal
          open={pendingScopeSwitch}
          currentBrandName={activeBrandName}
          targetBrandName="Property"
          loading={loading}
          onSaveAndContinue={handleScopeSaveAndContinue}
          onDiscardAndContinue={handleScopeDiscardAndContinue}
          onCancel={() => setPendingScopeSwitch(false)}
        />
        <PropertyEditorHeader
          title={pageTitle}
          titleTooltip={draftPropertyName || undefined}
          propertyDerivativeType={bootstrap.propertyDerivativeType}
          isDirty={activeBrandDirty}
          isEditMode={bootstrap.isEditMode}
          loading={loading}
          isBrandSwitching={isBrandSwitching}
          switchingBrandName={brandTransition?.name ?? null}
          propertyId={propertyId}
          activeBrandSlug={activeBrandSlug}
          activeScope={activeScope}
          activeTabIndex={activeEditorTab}
          activeBrandName={activeBrandName}
          availableBrands={availableBrands}
          addableBrands={addableBrands}
          onSubmit={handleSubmit}
          onPropertyPillSelect={handlePropertyPillSelect}
          onBrandSelect={handleBrandSelect}
          onBrandRemove={handleBrandRemove}
          onBrandAdd={handleBrandAdd}
        />

        <PropertySetupWarningBanner issues={setupReadiness?.issues ?? []} />

        {bootstrap.loading && propertyId ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/90 px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {brandTransition ? `Switching to ${brandTransition.name}` : "Loading property data"}
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
              {brandTransition
                ? `Please wait while we load the latest data for ${brandTransition.name}.`
                : "Please wait while we load the property information."}
            </p>
          </div>
        ) : (
          <PropertyEditorTabs
            propertyId={propertyId}
            isEditMode={bootstrap.isEditMode}
            brands={brands}
            activeBrandId={activeBrand?.id ?? bootstrap.selectedBrandId ?? null}
            draft={editorState.draft}
            activeBrandSlug={activeBrandSlug}
            activeScope={activeScope}
            onSectionChange={editorState.patchAtPath}
            onActiveTabChange={setActiveEditorTab}
            isResort={isResort}
            gstPolicy={bootstrap.gstPolicy}
          />
        )}
      </form>
    </PropertyEditorServicesProvider>
  );
}
