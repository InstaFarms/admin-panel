"use client";

import { Spinner } from "flowbite-react";
import { HiOfficeBuilding } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";

interface ParentPropertyOption {
  id: string;
  propertyName?: string;
  propertyCode?: string;
  city?: string;
  area?: string;
}

interface ParentSelectionStepProps {
  loadingParents: boolean;
  loadingParentData: boolean;
  parentsCount: number;
  selectedParent: ParentPropertyOption | null;
  parentPropertyData: any;
  searchTerm: string;
  debouncedSearchTerm: string;
  filteredParents: ParentPropertyOption[];
  parentPropertyId: string;
  onLoadParents: () => void;
  onClearSelectedParent: () => void;
  onSearchTermChange: (value: string) => void;
  onSelectParent: (id: string) => void;
}

export default function ParentSelectionStep({
  loadingParents,
  loadingParentData,
  parentsCount,
  selectedParent,
  parentPropertyData,
  searchTerm,
  debouncedSearchTerm,
  filteredParents,
  parentPropertyId,
  onLoadParents,
  onClearSelectedParent,
  onSearchTermChange,
  onSelectParent,
}: ParentSelectionStepProps) {
  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      {/* Step header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h6 className="text-base font-bold text-white">Select the property to split</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            Search and select the parent property. Its data becomes the source for the child split.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadParents}
          disabled={loadingParents}
          className="inline-flex items-center gap-2 rounded-lg border border-[#243044] bg-[#101826] px-4 py-2 text-[13px] font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:opacity-50"
        >
          {loadingParents ? (
            <>
              <Spinner size="sm" />
              Loading…
            </>
          ) : parentsCount > 0 ? (
            "Refresh"
          ) : (
            "Load Properties"
          )}
        </button>
      </div>

      {/* Selected parent banner */}
      {selectedParent && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Splitting</div>
            <div className="mt-0.5 text-[13.5px] font-bold text-white">
              {selectedParent.propertyName}
            </div>
            <div className="mt-0.5 text-[12px] text-[#7d8a99]">
              {selectedParent.propertyCode}
              {[selectedParent.area, selectedParent.city].filter(Boolean).join(", ")
                ? ` · ${[selectedParent.area, selectedParent.city].filter(Boolean).join(", ")}`
                : ""}
            </div>
          </div>
          {parentPropertyData && (
            <span className="shrink-0 rounded-md border border-blue-500/30 bg-blue-600/15 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              Ready
            </span>
          )}
          <button
            type="button"
            onClick={onClearSelectedParent}
            aria-label="Clear selected parent"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#7d8a99] transition hover:bg-white/10 hover:text-white"
          >
            <RxCross2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
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
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search properties by name or code…"
            className="w-full rounded-xl border border-[#243044] bg-[#101826] py-3 pl-10 pr-10 text-[14px] text-[#e7edf4] placeholder-[#4a5568] outline-none transition focus:border-blue-500"
          />
          {searchTerm.trim() && (
            <button
              type="button"
              onClick={() => onSearchTermChange("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#6f7c8c] transition hover:text-white"
            >
              <RxCross2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-2 text-[12px] text-[#6f7c8c]">
          {filteredParents.length} result{filteredParents.length === 1 ? "" : "s"} found
        </div>
      </div>

      {/* Results */}
      <div className="mt-3 max-h-95 space-y-2.5 overflow-y-auto">
        {filteredParents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[#1b2433] py-10 text-center">
            <HiOfficeBuilding className="h-7 w-7 text-[#3a4756]" />
            <div className="text-[13.5px] font-semibold text-[#9aa6b4]">
              {debouncedSearchTerm.trim() ? "No properties found" : "Start typing to search properties"}
            </div>
            <div className="text-[12px] text-[#6f7c8c]">
              {debouncedSearchTerm.trim()
                ? "Try a different name or code."
                : "Type property name or code to see results."}
            </div>
          </div>
        ) : (
          filteredParents.map((p) => {
            const sel = parentPropertyId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectParent(p.id)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition"
                style={
                  sel
                    ? { background: "rgba(47,111,237,.13)", borderColor: "#2f6fed" }
                    : { background: "#0a111c", borderColor: "#1b2433" }
                }
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Radio */}
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
                    <div className="text-[14px] font-semibold text-[#eef2f7]">
                      {p.propertyName || "N/A"}
                    </div>
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

      {loadingParentData && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[#8b97a6]">
          <Spinner size="sm" />
          Loading parent data…
        </div>
      )}
    </div>
  );
}
