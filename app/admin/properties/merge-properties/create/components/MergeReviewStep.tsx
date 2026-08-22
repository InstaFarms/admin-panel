"use client";

import type { MergeSectionKey } from "@/actions/propertyActions";
import type { MergeConfig } from "./ConfigureMergeStep";

type PropertyItem = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
};

interface MergeReviewStepProps {
  primaryProperty: PropertyItem | null;
  selectedOptions: PropertyItem[];
  sections: MergeSectionKey[];
  sectionLabels: Record<MergeSectionKey, string>;
  brandName: string;
  winners: Record<string, string>;
  normalizedById: Record<string, any>;
  mergeConfig: MergeConfig;
}

export default function MergeReviewStep({
  primaryProperty,
  selectedOptions,
  sections,
  sectionLabels,
  brandName,
  winners,
  mergeConfig,
}: MergeReviewStepProps) {
  const winnerFor = (sec: MergeSectionKey): PropertyItem | null => {
    const wId = winners[sec] || primaryProperty?.id || "";
    return selectedOptions.find((p) => p.id === wId) || primaryProperty;
  };

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <h6 className="text-base font-bold text-white">Review the merged property</h6>
      <p className="mt-1.5 text-[13px] text-[#8b97a6]">
        Confirm everything looks right before creating the merged property.
      </p>

      {/* Merged identity summary */}
      <div className="mt-5 flex flex-wrap items-start gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-4">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Merged Property</div>
          <div className="mt-1 text-[17px] font-bold text-white">{mergeConfig.name || "—"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 font-mono text-[11px] text-[#cdd6e0]">
              {mergeConfig.code || "—"}
            </span>
            {mergeConfig.codeName && (
              <span className="text-[12px] text-[#6f7c8c]">{mergeConfig.codeName}</span>
            )}
            {mergeConfig.slug && (
              <span className="font-mono text-[11px] text-[#4a5568]">/{mergeConfig.slug}</span>
            )}
          </div>
        </div>
        <div className="text-right text-[12px] text-[#6f7c8c]">
          <div>{brandName}</div>
          <div className="mt-0.5">{selectedOptions.length} properties merged</div>
          {primaryProperty && (
            <div className="mt-0.5 text-[11px]">
              Primary: {primaryProperty.propertyName}
            </div>
          )}
        </div>
      </div>

      {/* Constituents */}
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedOptions.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b2433] bg-[#0a111c] px-2.5 py-1 text-[12px] text-[#9aa6b4]"
          >
            <span className="h-1.5 w-1.5 rounded-sm bg-blue-500" />
            {p.propertyName || "—"}
            {p.propertyCode && <span className="text-[#4a5568]">({p.propertyCode})</span>}
          </span>
        ))}
      </div>

      {/* Section sources table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[#1b2433]">
        {sections.map((sec, i) => {
          const winner = winnerFor(sec);
          return (
            <div
              key={sec}
              className="grid items-center gap-4 px-4 py-3.5"
              style={{
                gridTemplateColumns: "1.1fr 1.4fr 1fr",
                borderBottom: i < sections.length - 1 ? "1px solid #141c28" : "none",
              }}
            >
              <div className="text-[13px] text-[#dbe2ea]">{sectionLabels[sec]}</div>
              <div className="text-[13px] font-semibold text-[#eef2f7]">
                {winner?.propertyName || "—"}
              </div>
              <div className="text-[12px] text-[#7d8a99]">
                from {winner?.propertyCode || "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
