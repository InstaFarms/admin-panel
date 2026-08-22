"use client";

import {
  createSplitProperty,
  getAllPropertiesForSelector,
  SplitSectionKey,
  SplitSectionMode,
} from "@/actions/propertyActions";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RxCross2 } from "react-icons/rx";
import { HiOfficeBuilding } from "react-icons/hi";
import { SPLIT_SECTION_LABELS, SPLIT_SECTION_ORDER } from "./splitConstants";
import AssignDataStep from "./components/AssignDataStep";
import BrandSelectionStep from "./components/BrandSelectionStep";
import ConfigureSplitsStep, { ChildConfig } from "./components/ConfigureSplitsStep";
import SplitReviewStep from "./components/SplitReviewStep";
import StepProgress from "./components/StepProgress";
import WizardFooter from "./components/WizardFooter";
import { useDebouncedValue } from "./hooks/useDebouncedValue";

type Brand = "instafarms" | "mago";
type PropertyItem = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
  city?: string;
  area?: string;
};

const STEPS = ["Select Brand", "Select Property", "Configure Splits", "Assign Data", "Review"] as const;

const COMMON_SECTION_KEYS = new Set<SplitSectionKey>([
  "ADDRESS",
  "GOOGLE_PLACE",
  "AMENITIES_ACTIVITIES",
  "SPACES",
  "OWNERS",
  "MANAGERS",
  "CARETAKERS",
  "ICAL_INTEGRATION",
  "SAFETY_HYGIENE",
  "BEDDING_AVAILABILITY",
]);

const slugify = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const makeChild = (parentName: string, parentCode: string, idx: number): ChildConfig => {
  const letter = String.fromCharCode(65 + idx);
  const base = parentName.split(" - ")[0];
  return {
    name: `${base} — Wing ${letter}`,
    code: `${parentCode}-${letter}`,
    type: "",
    codeName: "",
    slug: slugify(`${base}-wing-${letter}`),
  };
};

const createDefaultModes = (): Record<SplitSectionKey, SplitSectionMode> =>
  SPLIT_SECTION_ORDER.reduce(
    (acc, key) => { acc[key] = "INHERIT"; return acc; },
    {} as Record<SplitSectionKey, SplitSectionMode>
  );

export default function SplitPropertyWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, startSubmitTransition] = useTransition();

  const [brandId, setBrandId] = useState<Brand | "">("");
  const [propertiesByBrand, setPropertiesByBrand] = useState<Record<Brand, PropertyItem[]>>({
    instafarms: [],
    mago: [],
  });
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [parentPropertyId, setParentPropertyId] = useState("");
  const [children, setChildren] = useState<ChildConfig[]>([]);
  const [assign, setAssign] = useState<Record<string, Record<number, boolean>>>({});
  const [assignMode, setAssignMode] = useState<"matrix" | "bychild">("matrix");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const brandProperties = useMemo(
    () => (brandId ? propertiesByBrand[brandId] : []),
    [brandId, propertiesByBrand]
  );

  const brandCounts = useMemo(
    () => ({ instafarms: propertiesByBrand.instafarms.length, mago: propertiesByBrand.mago.length }),
    [propertiesByBrand]
  );

  const filteredProperties = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return brandProperties.filter(
      (p) =>
        (p.propertyName || "").toLowerCase().includes(q) ||
        (p.propertyCode || "").toLowerCase().includes(q)
    );
  }, [brandProperties, debouncedSearch]);

  const selectedParent = useMemo(
    () => brandProperties.find((p) => p.id === parentPropertyId) || null,
    [brandProperties, parentPropertyId]
  );

  const brandName = brandId === "instafarms" ? "InstaFarms" : brandId === "mago" ? "Mago" : "";

  const assignDefault = (sectionKey: string, idx: number): boolean => {
    const explicit = assign[sectionKey];
    if (explicit && explicit[idx] !== undefined) return explicit[idx];
    return COMMON_SECTION_KEYS.has(sectionKey as SplitSectionKey) ? true : idx === 0;
  };

  const toggleAssign = (sectionKey: string, idx: number) => {
    const cur = assignDefault(sectionKey, idx);
    setAssign((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [idx]: !cur },
    }));
  };

  useEffect(() => {
    const load = async () => {
      setLoadingProperties(true);
      const result = await getAllPropertiesForSelector();
      const all = (result.data || []) as any[];
      setPropertiesByBrand({
        instafarms: all.filter((p) =>
          (p.brandStatuses || []).some((b: any) => b.brandName?.toLowerCase() === "instafarms" && b.isActive)
        ) as PropertyItem[],
        mago: all.filter((p) =>
          (p.brandStatuses || []).some((b: any) => b.brandName?.toLowerCase() === "mago" && b.isActive)
        ) as PropertyItem[],
      });
      setLoadingProperties(false);
    };
    void load();
  }, []);

  const chooseBrand = (id: Brand) => {
    setBrandId(id);
    setParentPropertyId("");
    setChildren([]);
    setAssign({});
    setSearchTerm("");
  };

  const handleSelectParent = (id: string) => {
    setParentPropertyId(id);
    if (!id) { setChildren([]); return; }
    const p = brandProperties.find((x) => x.id === id);
    if (!p) { setChildren([]); return; }
    setChildren([
      makeChild(p.propertyName || "", p.propertyCode || "", 0),
      makeChild(p.propertyName || "", p.propertyCode || "", 1),
    ]);
    setAssign({});
  };

  const addChild = () => {
    if (children.length >= 4 || !selectedParent) return;
    setChildren((prev) => [
      ...prev,
      makeChild(selectedParent.propertyName || "", selectedParent.propertyCode || "", prev.length),
    ]);
  };

  const removeChild = (i: number) => {
    setChildren((prev) => prev.filter((_, idx) => idx !== i));
    setAssign((prev) => {
      const next: Record<string, Record<number, boolean>> = {};
      Object.keys(prev).forEach((sec) => {
        const row = prev[sec];
        const nr: Record<number, boolean> = {};
        Object.keys(row).forEach((k) => {
          const ki = +k;
          if (ki < i) nr[ki] = row[ki];
          else if (ki > i) nr[ki - 1] = row[ki];
        });
        next[sec] = nr;
      });
      return next;
    });
  };

  const editChild = (i: number, field: keyof ChildConfig, val: string) => {
    setChildren((prev) =>
      prev.map((c, idx) => {
        if (idx !== i) return c;
        const nc = { ...c, [field]: val };
        if (field === "name") nc.slug = slugify(val);
        return nc;
      })
    );
  };

  const isStepValid = (step: number): boolean => {
    if (step === 0) return !!brandId;
    if (step === 1) return !!parentPropertyId;
    if (step === 2) return children.length >= 2 && children.every((c) => c.name.trim() && c.code.trim());
    return true;
  };

  const goNext = () => {
    if (!isStepValid(currentStep)) {
      if (currentStep === 0) toast.error("Select a brand to continue.");
      else if (currentStep === 1) toast.error("Select a property to continue.");
      else if (currentStep === 2) toast.error("Each split needs a name and code.");
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    startSubmitTransition(() => {
      void (async () => {
        try {
          if (!parentPropertyId) { toast.error("No parent property selected."); return; }
          if (children.length < 2) { toast.error("Need at least 2 splits."); return; }

          const baseModes = createDefaultModes();
          const sectionModes: Record<SplitSectionKey, SplitSectionMode> = {
            ...baseModes,
            DETAIL: "CUSTOM",
          };

          const results = await Promise.all(
            children.map((child) =>
              createSplitProperty({
                parentPropertyId,
                sectionModes,
                customOverrides: {
                  DETAIL: {
                    propertyName: child.name,
                    propertyCode: child.code,
                    slug: child.slug,
                    propertyCodeName: child.codeName,
                    ...(child.type ? { propertyTypeId: child.type } : {}),
                  },
                } as any,
              })
            )
          );

          const failed = results.find((r) => r.error);
          if (failed) { toast.error(failed.error!); return; }

          toast.success(
            `Split created · ${children.length} children under ${selectedParent?.propertyCode || parentPropertyId}`
          );
          router.push("/admin/properties/split-properties");
        } catch (err: any) {
          toast.error(err?.message || "Failed to create split.");
        }
      })();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <StepProgress steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* Brand chip shown on steps > 0 */}
      {brandId && currentStep > 0 && (
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-[#1b2433] bg-[#0d1420] px-3 py-1.5">
          <div
            className="h-2 w-2 rounded-sm"
            style={{ background: brandId === "instafarms" ? "#2f6fed" : "#13b9a0" }}
          />
          <span className="text-[12px] font-semibold text-[#cdd6e0]">{brandName}</span>
          <button
            type="button"
            onClick={() => setCurrentStep(0)}
            className="ml-1 text-[11px] text-[#8b97a6] transition hover:text-white"
          >
            Change
          </button>
        </div>
      )}

      {/* Step 0: Select Brand */}
      {currentStep === 0 && (
        <BrandSelectionStep
          activeBrandId={brandId}
          brandCounts={brandCounts}
          loading={loadingProperties}
          intro="Choose the brand whose property you want to split. Brand-specific data comes from this brand."
          onPick={chooseBrand}
        />
      )}

      {/* Step 1: Select Property */}
      {currentStep === 1 && (
        <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
          <h6 className="text-base font-bold text-white">Select the property to split</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            Search within {brandName}. Its details become the source for every split.
          </p>

          {selectedParent && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Splitting</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-white">{selectedParent.propertyName}</div>
                <div className="mt-0.5 text-[12px] text-[#7d8a99]">
                  {selectedParent.propertyCode}
                  {[selectedParent.area, selectedParent.city].filter(Boolean).length > 0
                    ? ` · ${[selectedParent.area, selectedParent.city].filter(Boolean).join(", ")}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectParent("")}
                aria-label="Clear selection"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#7d8a99] transition hover:bg-white/10 hover:text-white"
              >
                <RxCross2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-5">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f7c8c" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                </svg>
              </span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search properties by name or code…`}
                className="w-full rounded-xl border border-[#243044] bg-[#101826] py-3 pl-10 pr-10 text-[14px] text-[#e7edf4] placeholder-[#4a5568] outline-none transition focus:border-blue-500"
              />
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#6f7c8c] transition hover:text-white"
                >
                  <RxCross2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 text-[12px] text-[#6f7c8c]">
              {loadingProperties
                ? `Searching ${brandName}…`
                : `${filteredProperties.length} ${filteredProperties.length === 1 ? "property" : "properties"} found`}
            </div>
          </div>

          <div className="mt-3 max-h-96 space-y-2.5 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#1b2433] py-10 text-center">
                <HiOfficeBuilding className="h-7 w-7 text-[#3a4756]" />
                <div className="text-[13.5px] font-semibold text-[#9aa6b4]">
                  {debouncedSearch.trim() ? "No properties found" : "Start typing to search properties"}
                </div>
                <div className="text-[12px] text-[#6f7c8c]">
                  {debouncedSearch.trim()
                    ? `Try a different name or code within ${brandName}.`
                    : `Type a property name or code.`}
                </div>
              </div>
            ) : (
              filteredProperties.map((p) => {
                const sel = parentPropertyId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectParent(p.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition"
                    style={
                      sel
                        ? { background: "rgba(47,111,237,.13)", borderColor: "#2f6fed" }
                        : { background: "#0a111c", borderColor: "#1b2433" }
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
                        style={{ borderColor: sel ? "#2f6fed" : "#3a4756" }}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full bg-blue-500 transition-opacity"
                          style={{ opacity: sel ? 1 : 0 }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#eef2f7]">{p.propertyName || "N/A"}</div>
                        <div className="mt-0.5 text-[12px] text-[#7d8a99]">
                          {p.propertyCode}
                          {[p.area, p.city].filter(Boolean).length > 0
                            ? ` · ${[p.area, p.city].filter(Boolean).join(", ")}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    {p.propertyCode && (
                      <span className="shrink-0 rounded-md border border-[#243044] bg-[#101826] px-2.5 py-0.5 text-[11px] text-[#6f7c8c]">
                        {p.propertyCode}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Step 2: Configure Splits */}
      {currentStep === 2 && (
        <ConfigureSplitsStep
          source={selectedParent}
          children={children}
          onAddChild={addChild}
          onRemoveChild={removeChild}
          onEditChild={editChild}
        />
      )}

      {/* Step 3: Assign Data */}
      {currentStep === 3 && (
        <AssignDataStep
          children={children}
          sections={SPLIT_SECTION_ORDER}
          sectionLabels={SPLIT_SECTION_LABELS}
          commonSections={COMMON_SECTION_KEYS}
          assignMode={assignMode}
          brandName={brandName}
          onSetAssignMode={setAssignMode}
          assignDefault={assignDefault}
          onToggleAssign={toggleAssign}
        />
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <SplitReviewStep
          source={selectedParent}
          brandName={brandName}
          children={children}
          sections={SPLIT_SECTION_ORDER}
          sectionLabels={SPLIT_SECTION_LABELS}
          commonSections={COMMON_SECTION_KEYS}
          assignDefault={assignDefault}
        />
      )}

      <WizardFooter
        currentStep={currentStep}
        lastStepIndex={STEPS.length - 1}
        submitting={submitting}
        onBack={goBack}
        onSaveDraft={() => {}}
        onNext={goNext}
        onSubmit={handleSubmit}
        submitLabel="Confirm split"
      />
    </div>
  );
}
