"use client";

import {
  MergeSectionKey,
  MergeSectionMode,
  createMergedProperty,
  fetchPropertyFullData,
  getAllPropertiesForSelector,
} from "@/actions/propertyActions";
import { toLegacyPropertySnapshot } from "@/lib/properties/fullPropertyData";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RxCross2 } from "react-icons/rx";
import { HiOfficeBuilding } from "react-icons/hi";
import { MERGE_SECTION_LABELS, MERGE_SECTION_ORDER } from "./mergeConstants";
import BrandSelectionStep from "./components/BrandSelectionStep";
import ChoosePrimaryStep from "./components/ChoosePrimaryStep";
import ConfigureMergeStep, { type MergeConfig } from "./components/ConfigureMergeStep";
import ResolveDataStep from "./components/ResolveDataStep";
import MergeReviewStep from "./components/MergeReviewStep";
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

const STEPS = ["Select Brand", "Select Properties", "Choose Primary", "Configure Merge", "Resolve Data", "Review"] as const;

const slugify = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const createDefaultSources = (propertyId: string): Record<MergeSectionKey, string> =>
  MERGE_SECTION_ORDER.reduce(
    (acc, key) => { acc[key] = propertyId; return acc; },
    {} as Record<MergeSectionKey, string>
  );

const createDefaultModes = (): Record<MergeSectionKey, MergeSectionMode> =>
  MERGE_SECTION_ORDER.reduce(
    (acc, key) => { acc[key] = "INHERIT"; return acc; },
    {} as Record<MergeSectionKey, MergeSectionMode>
  );

const DEFAULT_CONFIG: MergeConfig = { name: "", code: "", type: "", codeName: "", slug: "" };

export default function MergePropertyWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, startSubmitTransition] = useTransition();

  const [brandId, setBrandId] = useState<Brand | "">("");
  const [propertiesByBrand, setPropertiesByBrand] = useState<Record<Brand, PropertyItem[]>>({
    instafarms: [],
    mago: [],
  });
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState("");
  const [mergeConfig, setMergeConfig] = useState<MergeConfig>(DEFAULT_CONFIG);
  const [winners, setWinners] = useState<Record<string, string>>({});
  const [normalizedById, setNormalizedById] = useState<Record<string, any>>({});
  const [loadingFullData, setLoadingFullData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const brandName = brandId === "instafarms" ? "InstaFarms" : brandId === "mago" ? "Mago" : "";

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

  const optionsById = useMemo(() => new Map(brandProperties.map((p) => [p.id, p])), [brandProperties]);

  const selectedOptions = useMemo(
    () => selectedIds.map((id) => optionsById.get(id)).filter(Boolean) as PropertyItem[],
    [selectedIds, optionsById]
  );

  const primaryProperty = useMemo(
    () => brandProperties.find((p) => p.id === primaryId) || null,
    [brandProperties, primaryId]
  );

  const winnerFor = (sec: MergeSectionKey) => winners[sec] || primaryId;

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

  const ensureNormalizedLoaded = async (ids: string[]) => {
    const missing = ids.filter((id) => id && !normalizedById[id]);
    if (missing.length === 0) return;
    setLoadingFullData(true);
    await Promise.all(
      missing.map(async (id) => {
        const res = await fetchPropertyFullData(id);
        if (res.error) return;
        const normalized = {
          ...toLegacyPropertySnapshot(res.data),
          icalLinks: res.data?.icalLinks || [],
          exportUrl: res.data?.exportUrl || "",
          auditAreas: res.data?.auditAreas || [],
        };
        setNormalizedById((prev) => ({ ...prev, [id]: normalized }));
      })
    );
    setLoadingFullData(false);
  };

  useEffect(() => {
    void ensureNormalizedLoaded(selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join("|")]);

  const chooseBrand = (id: Brand) => {
    setBrandId(id);
    setSelectedIds([]);
    setPrimaryId("");
    setMergeConfig(DEFAULT_CONFIG);
    setWinners({});
    setSearchTerm("");
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(primaryId)) setPrimaryId("");
      setWinners({});
      return next;
    });
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryId(id);
    setWinners({});
  };

  // Pre-populate configure step when primary is chosen
  useEffect(() => {
    if (!primaryId) return;
    const p = brandProperties.find((b) => b.id === primaryId);
    if (!p) return;
    const normalized = normalizedById[primaryId];
    const primaryCode = p.propertyCode || "";
    setMergeConfig({
      name: p.propertyName || "",
      code: primaryCode ? `${primaryCode}-M` : "",
      type: normalized?.propertyTypeId || "",
      codeName: normalized?.propertyCodeName || "",
      slug: slugify(primaryCode ? `${primaryCode}-m` : ""),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryId]);

  const editConfig = (field: keyof MergeConfig, val: string) => {
    setMergeConfig((prev) => {
      const next = { ...prev, [field]: val };
      // Auto-generate slug from code when code changes and slug is empty or was auto-generated
      if (field === "code" && (!prev.slug || prev.slug === slugify(prev.code))) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  const setWinner = (sec: MergeSectionKey, propertyId: string) => {
    setWinners((prev) => ({ ...prev, [sec]: propertyId }));
  };

  const isStepValid = (step: number): boolean => {
    if (step === 0) return !!brandId;
    if (step === 1) return selectedIds.length >= 2;
    if (step === 2) return !!primaryId;
    if (step === 3) return !!mergeConfig.name.trim() && !!mergeConfig.code.trim();
    return true;
  };

  const goNext = () => {
    if (!isStepValid(currentStep)) {
      if (currentStep === 0) toast.error("Select a brand to continue.");
      else if (currentStep === 1) toast.error("Pick at least two properties.");
      else if (currentStep === 2) toast.error("Choose a primary property.");
      else if (currentStep === 3) toast.error("Enter a name and code for the merged property.");
      return;
    }
    if (currentStep === 3) {
      // Trigger full-data load when moving to Resolve Data
      void ensureNormalizedLoaded(selectedIds);
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    startSubmitTransition(() => {
      void (async () => {
        try {
          if (selectedIds.length < 2) { toast.error("Please select at least 2 properties."); return; }
          if (!primaryId) { toast.error("Please choose a primary property."); return; }
          if (!mergeConfig.name.trim()) { toast.error("Enter a name for the merged property."); return; }
          if (!mergeConfig.code.trim()) { toast.error("Enter a code for the merged property."); return; }

          const sectionSources = createDefaultSources(primaryId);
          MERGE_SECTION_ORDER.forEach((sec) => {
            sectionSources[sec] = winnerFor(sec);
          });

          const sectionModes = createDefaultModes();
          (sectionModes as any).DETAIL = "CUSTOM";

          const result = await createMergedProperty({
            primaryPropertyId: primaryId,
            constituentPropertyIds: selectedIds,
            sectionModes,
            sectionSources,
            customOverrides: {
              DETAIL: {
                propertyName: mergeConfig.name.trim(),
                propertyCode: mergeConfig.code.trim(),
                propertyCodeName: mergeConfig.codeName.trim() || null,
                slug: mergeConfig.slug.trim() || null,
                propertyTypeId: mergeConfig.type || null,
              },
            },
          } as any);

          if (result.error) { toast.error(result.error); return; }

          toast.success(`Merge created · ${selectedIds.length} properties merged`);
          router.push("/admin/properties/merge-properties");
        } catch (err: any) {
          toast.error(err?.message || "Failed to create merged property.");
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
          intro="Choose the brand whose properties you want to merge. You can only merge within one brand."
          onPick={chooseBrand}
        />
      )}

      {/* Step 1: Select Properties */}
      {currentStep === 1 && (
        <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h6 className="text-base font-bold text-white">Select properties to merge</h6>
              <p className="mt-1.5 text-[13px] text-[#8b97a6]">
                Search within {brandName}. Choose at least two.
              </p>
            </div>
            <span
              className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
              style={{ color: "#7fb0ff", background: "rgba(47,111,237,.10)", borderColor: "rgba(90,139,255,.35)" }}
            >
              {selectedIds.length} selected
            </span>
          </div>

          {selectedOptions.length > 0 && (
            <div className="mt-5 rounded-xl border border-blue-500/25 bg-blue-600/10 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Selected ({selectedOptions.length})
                </span>
                {selectedOptions.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/15 px-2.5 py-1 text-[12px] font-semibold text-[#cdd6e0]"
                  >
                    <span className="max-w-[30ch] truncate">
                      {p.propertyName || "N/A"}
                      {p.propertyCode ? ` (${p.propertyCode})` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleId(p.id)}
                      aria-label="Remove"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#7d8a99] transition hover:text-white"
                    >
                      <RxCross2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedOptions.length >= 2 && (
                  <span className="ml-auto rounded-md border border-blue-500/30 bg-blue-600/15 px-2.5 py-0.5 text-[11px] font-bold text-blue-400">
                    Ready
                  </span>
                )}
              </div>
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
                placeholder="Search properties by name or code…"
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
                    : "Type a property name or code to see results."}
                </div>
              </div>
            ) : (
              filteredProperties.map((p) => {
                const on = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleId(p.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition"
                    style={
                      on
                        ? { background: "rgba(47,111,237,.13)", borderColor: "#2f6fed" }
                        : { background: "#0a111c", borderColor: "#1b2433" }
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[13px] font-bold transition"
                        style={
                          on
                            ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff" }
                            : { background: "#101826", border: "1px solid #3a4756", color: "transparent" }
                        }
                      >
                        {on ? "✓" : ""}
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

      {/* Step 2: Choose Primary */}
      {currentStep === 2 && (
        <ChoosePrimaryStep
          selectedOptions={selectedOptions}
          primaryId={primaryId}
          onSetPrimary={handleSetPrimary}
        />
      )}

      {/* Step 3: Configure Merge */}
      {currentStep === 3 && (
        <ConfigureMergeStep
          constituents={selectedOptions}
          primaryProperty={primaryProperty}
          config={mergeConfig}
          onEdit={editConfig}
        />
      )}

      {/* Step 4: Resolve Data */}
      {currentStep === 4 && (
        <>
          {loadingFullData && (
            <div className="text-[12px] text-blue-400">Loading property data for comparison…</div>
          )}
          <ResolveDataStep
            selectedOptions={selectedOptions}
            sections={MERGE_SECTION_ORDER}
            sectionLabels={MERGE_SECTION_LABELS}
            primaryId={primaryId}
            normalizedById={normalizedById}
            winners={winners}
            onSetWinner={setWinner}
          />
        </>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <MergeReviewStep
          primaryProperty={primaryProperty}
          selectedOptions={selectedOptions}
          sections={MERGE_SECTION_ORDER}
          sectionLabels={MERGE_SECTION_LABELS}
          brandName={brandName}
          winners={winners}
          normalizedById={normalizedById}
          mergeConfig={mergeConfig}
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
        submitLabel="Confirm merge"
      />
    </div>
  );
}
