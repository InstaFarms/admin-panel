"use client";

import type { MergeSectionKey } from "@/actions/propertyActions";
import { Label, Select } from "flowbite-react";
import type { PropertyOption } from "./ConstituentSelectionStep";

interface SectionSourceStepProps {
  sections: MergeSectionKey[];
  labels: Record<MergeSectionKey, string>;
  selectedOptions: PropertyOption[];
  sectionSources: Record<MergeSectionKey, string>;
  onChangeSource: (section: MergeSectionKey, propertyId: string) => void;
  onSetAllSources: (propertyId: string) => void;
}

export default function SectionSourceStep({
  sections,
  labels,
  selectedOptions,
  sectionSources,
  onChangeSource,
  onSetAllSources,
}: SectionSourceStepProps) {
  const first = selectedOptions[0]?.id ?? "";

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h6 className="text-base font-bold text-white">Choose Section Sources</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            For each section, pick which selected property will be used as the baseline source.
          </p>
        </div>
        <button
          type="button"
          disabled={selectedOptions.length === 0}
          onClick={() => { if (first) onSetAllSources(first); }}
          className="rounded-lg border border-[#243044] bg-[#101826] px-4 py-2 text-[13px] font-semibold text-[#cdd6e0] transition hover:border-[#33445e] hover:bg-[#0f1825] disabled:opacity-50"
        >
          Set all to first selected
        </button>
      </div>

      {selectedOptions.length === 0 ? (
        <div className="mt-4 text-[13px] text-[#8b97a6]">Select properties first.</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {sections.map((section) => (
            <div key={section} className="rounded-xl border border-[#1b2433] bg-[#0a111c] p-3">
              <Label className="mb-1.5 block text-[12px] font-bold text-[#9aa6b4]">{labels[section]}</Label>
              <Select
                value={sectionSources[section] || first}
                onChange={(e) => onChangeSource(section, e.target.value)}
                className="[&_select]:border-[#243044] [&_select]:bg-[#101826] [&_select]:text-[#e7edf4]"
              >
                {selectedOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.propertyName || "N/A") + (p.propertyCode ? ` (${p.propertyCode})` : "")}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

