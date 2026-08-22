"use client";

import type { SplitSectionKey } from "@/actions/propertyActions";
import type { ChildConfig } from "./ConfigureSplitsStep";

interface SplitReviewStepProps {
  source: { propertyName?: string; propertyCode?: string } | null;
  brandName: string;
  children: ChildConfig[];
  sections: SplitSectionKey[];
  sectionLabels: Record<SplitSectionKey, string>;
  commonSections: Set<SplitSectionKey>;
  assignDefault: (section: string, childIdx: number) => boolean;
}

export default function SplitReviewStep({
  source,
  brandName,
  children,
  sections,
  sectionLabels,
  commonSections,
  assignDefault,
}: SplitReviewStepProps) {
  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <h6 className="text-base font-bold text-white">Review &amp; confirm</h6>
      <p className="mt-1.5 text-[13px] text-[#8b97a6]">
        The parent stays active. These child properties will be created with the data shown.
      </p>

      {/* Parent banner */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-xl border border-[#3a2a55] bg-[#11091c] px-4 py-3.5">
        <span
          className="rounded-lg border border-[#4d3a72] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#b89cf0]"
          style={{ background: "rgba(123,79,214,.18)" }}
        >
          Parent · stays active
        </span>
        <span className="text-[14px] font-bold text-white">{source?.propertyName || "—"}</span>
        <span className="rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#9aa6b4]">
          {source?.propertyCode || "—"}
        </span>
        <span
          className="rounded-md border px-2 py-0.5 text-[11px] font-semibold text-[#7fb0ff]"
          style={{ background: "rgba(47,111,237,.10)", borderColor: "rgba(90,139,255,.4)" }}
        >
          {brandName}
        </span>
      </div>

      {/* Children grid */}
      <div
        className="mt-4 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(children.length, 1), 4)},minmax(0,1fr))` }}
      >
        {children.map((c, idx) => {
          const assignedSections = sections.filter((sec) => assignDefault(sec, idx));
          return (
            <div
              key={idx}
              className="rounded-xl border border-[#1b2433] bg-[#0a111c] p-4"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                  style={{ background: "linear-gradient(180deg,#3f7bff,#2f6fed)" }}
                >
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-white">{c.name || "—"}</div>
                  <div className="text-[11.5px] text-[#6f7c8c]">
                    {c.code}
                    {c.type ? ` · ${c.type}` : ""}
                  </div>
                </div>
              </div>

              {c.slug && (
                <div className="mb-3 break-all font-mono text-[11.5px] text-[#7d8a99]">/{c.slug}</div>
              )}

              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-[#6f7c8c]">
                Receives {assignedSections.length} sections
              </div>

              <div className="flex flex-wrap gap-1.5">
                {assignedSections.map((sec) => {
                  const isCommon = commonSections.has(sec);
                  return (
                    <span
                      key={sec}
                      className="rounded-md px-2 py-0.5 text-[11px]"
                      style={
                        isCommon
                          ? { color: "#b89cf0", background: "rgba(123,79,214,.12)", border: "1px solid rgba(123,79,214,.25)" }
                          : { color: "#7fb0ff", background: "rgba(47,111,237,.10)", border: "1px solid rgba(90,139,255,.3)" }
                      }
                    >
                      {sectionLabels[sec]}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
