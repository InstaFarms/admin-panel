"use client";

import type { SplitSectionKey } from "@/actions/propertyActions";
import type { ChildConfig } from "./ConfigureSplitsStep";

interface AssignDataStepProps {
  children: ChildConfig[];
  sections: SplitSectionKey[];
  sectionLabels: Record<SplitSectionKey, string>;
  commonSections: Set<SplitSectionKey>;
  assignMode: "matrix" | "bychild";
  brandName: string;
  onSetAssignMode: (mode: "matrix" | "bychild") => void;
  assignDefault: (section: string, childIdx: number) => boolean;
  onToggleAssign: (section: string, childIdx: number) => void;
}

function ScopeDot({ common }: { common: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-sm"
      style={{ background: common ? "#7b4fd6" : "#2f6fed" }}
    />
  );
}

function CheckBox({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-[13px] font-bold transition"
      style={
        on
          ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff" }
          : { background: "#101826", border: "1px solid #2a3648", color: "transparent" }
      }
    >
      {on ? "✓" : ""}
    </div>
  );
}

export default function AssignDataStep({
  children,
  sections,
  sectionLabels,
  commonSections,
  assignMode,
  brandName,
  onSetAssignMode,
  assignDefault,
  onToggleAssign,
}: AssignDataStepProps) {
  const tabStyle = (active: boolean) =>
    active
      ? { background: "linear-gradient(180deg,#3f7bff,#2f6fed)", color: "#fff" }
      : { background: "transparent", color: "#9aa6b4" };

  const gridTpl = `minmax(220px,2.2fr) repeat(${children.length},minmax(120px,1fr))`;
  const minW = 260 + children.length * 140;

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h6 className="text-base font-bold text-white">Assign data to each split</h6>
          <p className="mt-1.5 max-w-xl text-[13px] text-[#8b97a6]">
            Common sections are pre-copied to every split. Brand-specific sections need routing — tick where each one should land.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[#1b2433] bg-[#0a111c] p-1">
          {(["matrix", "bychild"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSetAssignMode(mode)}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition"
              style={tabStyle(assignMode === mode)}
            >
              {mode === "matrix" ? "Matrix" : "By split"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px]">
        <span className="flex items-center gap-2 text-[#b89cf0]">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#7b4fd6]" />
          Common · shared by all brands
        </span>
        <span className="flex items-center gap-2 text-[#7fc2ff]">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2f6fed]" />
          Brand-specific · {brandName}
        </span>
      </div>

      {assignMode === "matrix" ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-[#1b2433]">
          {/* Header */}
          <div
            className="grid items-center gap-2.5 border-b border-[#1b2433] bg-[#0a111c] px-4 py-3"
            style={{ gridTemplateColumns: gridTpl, minWidth: minW }}
          >
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#6f7c8c]">
              Data Section
            </div>
            {children.map((c, i) => (
              <div key={i} className="text-center">
                <div className="text-[12.5px] font-bold text-[#dbe6ff]">{c.name}</div>
                <div className="mt-0.5 text-[10.5px] text-[#6f7c8c]">{c.code}</div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {sections.map((sec, ri) => {
            const isCommon = commonSections.has(sec);
            return (
              <div
                key={sec}
                className="grid items-center gap-2.5 px-4 py-3"
                style={{
                  gridTemplateColumns: gridTpl,
                  minWidth: minW,
                  borderBottom: ri < sections.length - 1 ? "1px solid #141c28" : "none",
                  background: isCommon ? "rgba(123,79,214,.04)" : "transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <ScopeDot common={isCommon} />
                  <span className="text-[13px] font-medium text-[#dbe2ea]">{sectionLabels[sec]}</span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={
                      isCommon
                        ? { color: "#b89cf0", background: "rgba(123,79,214,.12)", border: "1px solid rgba(123,79,214,.25)" }
                        : { color: "#7fc2ff", background: "rgba(47,111,237,.10)", border: "1px solid rgba(47,111,237,.25)" }
                    }
                  >
                    {isCommon ? "Common" : "Brand"}
                  </span>
                </div>
                {children.map((_, idx) => (
                  <div key={idx} className="flex justify-center">
                    <CheckBox
                      on={assignDefault(sec, idx)}
                      onToggle={() => onToggleAssign(sec, idx)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="mt-5 grid gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(children.length, 1), 4)},minmax(0,1fr))` }}
        >
          {children.map((c, idx) => {
            const assignedCount = sections.filter((sec) => assignDefault(sec, idx)).length;
            return (
              <div key={idx} className="rounded-xl border border-[#1b2433] bg-[#0a111c] p-4">
                <div className="mb-3 flex items-center gap-2.5 border-b border-[#1b2433] pb-3">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                    style={{ background: "linear-gradient(180deg,#3f7bff,#2f6fed)" }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold text-[#eef2f7]">{c.name}</div>
                    <div className="text-[11px] text-[#6f7c8c]">{assignedCount} sections</div>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {sections.map((sec) => {
                    const on = assignDefault(sec, idx);
                    const isCommon = commonSections.has(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => onToggleAssign(sec, idx)}
                        className="flex items-center gap-2 rounded-lg px-1 py-2 text-left transition hover:bg-[#101826]"
                      >
                        <CheckBox on={on} onToggle={() => {}} />
                        <ScopeDot common={isCommon} />
                        <span className="text-[12.5px] text-[#cdd6e0]">{sectionLabels[sec]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
