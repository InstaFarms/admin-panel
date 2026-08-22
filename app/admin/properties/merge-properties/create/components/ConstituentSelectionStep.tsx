"use client";

import { Spinner } from "flowbite-react";
import { HiOfficeBuilding } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";

export type PropertyOption = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
  city?: string;
  area?: string;
};

interface ConstituentSelectionStepProps {
  loading: boolean;
  optionsCount: number;
  selectedIds: string[];
  selectedOptions: PropertyOption[];
  searchTerm: string;
  debouncedSearchTerm: string;
  filteredOptions: PropertyOption[];
  onLoadOptions: () => void;
  onSearchTermChange: (value: string) => void;
  onToggleId: (id: string) => void;
  onRemoveId: (id: string) => void;
  onClearAll: () => void;
}

export default function ConstituentSelectionStep({
  loading,
  optionsCount,
  selectedIds,
  selectedOptions,
  searchTerm,
  debouncedSearchTerm,
  filteredOptions,
  onLoadOptions,
  onSearchTermChange,
  onToggleId,
  onRemoveId,
  onClearAll,
}: ConstituentSelectionStepProps) {
  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      {/* Step header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h6 className="text-base font-bold text-white">Select properties to merge</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            Search within all properties. Choose at least two to combine into one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadOptions}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[#243044] bg-[#101826] px-4 py-2 text-[13px] font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                Loading…
              </>
            ) : optionsCount > 0 ? (
              "Refresh"
            ) : (
              "Load Properties"
            )}
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={loading}
              className="rounded-lg border border-[#243044] bg-[#101826] px-4 py-2 text-[13px] font-semibold text-[#8b97a6] transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Selected chips */}
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
                  onClick={() => onRemoveId(p.id)}
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
          {filteredOptions.length} result{filteredOptions.length === 1 ? "" : "s"} found
        </div>
      </div>

      {/* Results */}
      <div className="mt-3 max-h-96 space-y-2.5 overflow-y-auto">
        {filteredOptions.length === 0 ? (
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
          filteredOptions.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleId(p.id)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition"
                style={
                  checked
                    ? { background: "rgba(47,111,237,.13)", borderColor: "#2f6fed" }
                    : { background: "#0a111c", borderColor: "#1b2433" }
                }
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Checkbox */}
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[13px] font-bold transition"
                    style={
                      checked
                        ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff" }
                        : { background: "#101826", border: "1px solid #3a4756", color: "transparent" }
                    }
                  >
                    {checked ? "✓" : ""}
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
    </div>
  );
}
