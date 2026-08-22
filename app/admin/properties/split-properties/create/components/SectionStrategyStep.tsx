"use client";

import { SplitSectionKey, SplitSectionMode } from "@/actions/propertyActions";
import { Button, Radio } from "flowbite-react";

interface SectionStrategyStepProps {
  sections: SplitSectionKey[];
  sectionModes: Record<SplitSectionKey, SplitSectionMode>;
  labels: Record<SplitSectionKey, string>;
  descriptions: Record<SplitSectionKey, string>;
  recommendations: Record<SplitSectionKey, string>;
  selectedPreset: "MOSTLY_INHERIT" | "PRICING_ONLY_CUSTOM" | "MARKETING_VARIANT" | null;
  onPreset: (preset: "MOSTLY_INHERIT" | "PRICING_ONLY_CUSTOM" | "MARKETING_VARIANT") => void;
  onResetPreset: () => void;
  onSectionModeChange: (section: SplitSectionKey, mode: SplitSectionMode) => void;
}

export default function SectionStrategyStep({
  sections,
  sectionModes,
  labels,
  descriptions,
  recommendations,
  selectedPreset,
  onPreset,
  onResetPreset,
  onSectionModeChange,
}: SectionStrategyStepProps) {
  const isLocked = (section: SplitSectionKey) => section === "GALLERY";
  const editableSections = sections.filter((s) => !isLocked(s));
  const allCustomized = editableSections.length > 0 && editableSections.every((section) => sectionModes[section] === "CUSTOM");
  const bulkToggleLabel = allCustomized ? "Select all inherit" : "Select all customize";

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div className="mb-4">
        <h6 className="text-base font-bold text-white">Choose Section Strategy</h6>
        <p className="mt-1.5 text-[13px] text-[#8b97a6]">
          Decide which sections inherit from the parent and which get custom values for this split.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="xs"
          color={selectedPreset === "MOSTLY_INHERIT" ? "blue" : "light"}
          onClick={() => onPreset("MOSTLY_INHERIT")}
          className="!rounded-full px-3"
        >
          Mostly Inherit
        </Button>
        <Button
          size="xs"
          color={selectedPreset === "PRICING_ONLY_CUSTOM" ? "blue" : "light"}
          onClick={() => onPreset("PRICING_ONLY_CUSTOM")}
          className="!rounded-full px-3"
        >
          Pricing Only Custom
        </Button>
        <Button
          size="xs"
          color={selectedPreset === "MARKETING_VARIANT" ? "blue" : "light"}
          onClick={() => onPreset("MARKETING_VARIANT")}
          className="!rounded-full px-3"
        >
          Marketing Variant
        </Button>
        <Button size="xs" color="light" onClick={onResetPreset} className="!rounded-full px-3">
          Reset Preset
        </Button>
        <Button
          size="xs"
          color={allCustomized ? "success" : "blue"}
          onClick={() => {
            const nextMode: SplitSectionMode = allCustomized ? "INHERIT" : "CUSTOM";
            editableSections.forEach((section) => onSectionModeChange(section, nextMode));
          }}
          className="!rounded-full px-3 outline-none border-none ring-none focus:ring-0 focus:ring-offset-0"
        >
          {bulkToggleLabel}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {sections.map((section) => (
          (() => {
            const locked = isLocked(section);
            const effectiveMode: SplitSectionMode = locked ? "INHERIT" : sectionModes[section];
            return (
          <div
            key={section}
            className={`rounded-xl border p-3 transition ${
              effectiveMode === "CUSTOM"
                ? "border-blue-500 bg-blue-950/20 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
                : "border-slate-700/70 bg-slate-900/30 hover:border-slate-500"
            }`}
          >
            <div className="mb-1 text-sm font-semibold text-white">{labels[section]}</div>
            <div className="mb-2 text-xs leading-relaxed text-slate-300">{descriptions[section]}</div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                {recommendations[section]}
              </span>
              {locked ? (
                <span className="inline-flex rounded-full bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-200">
                  Locked: always inherit
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm transition ${
                  effectiveMode === "INHERIT"
                    ? "border-emerald-500 bg-emerald-950/30 text-emerald-200"
                    : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                }`}
              >
                <Radio
                  checked={effectiveMode === "INHERIT"}
                  onChange={() => {
                    if (locked) return;
                    onSectionModeChange(section, "INHERIT");
                  }}
                  name={`${section}-mode`}
                />
                <span>Inherit</span>
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm transition ${
                  effectiveMode === "CUSTOM"
                    ? "border-blue-500 bg-blue-950/30 text-blue-200"
                    : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Radio
                  disabled={locked}
                  checked={effectiveMode === "CUSTOM"}
                  onChange={() => {
                    if (locked) return;
                    onSectionModeChange(section, "CUSTOM");
                  }}
                  name={`${section}-mode`}
                />
                <span>Customize</span>
              </label>
            </div>
          </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}
