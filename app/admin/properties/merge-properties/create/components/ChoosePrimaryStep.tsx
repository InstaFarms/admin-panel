"use client";

type PropertyItem = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
  city?: string;
  area?: string;
};

interface ChoosePrimaryStepProps {
  selectedOptions: PropertyItem[];
  primaryId: string;
  onSetPrimary: (id: string) => void;
}

export default function ChoosePrimaryStep({
  selectedOptions,
  primaryId,
  onSetPrimary,
}: ChoosePrimaryStepProps) {
  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <h6 className="text-base font-bold text-white">Choose the primary property</h6>
      <p className="mt-1.5 text-[13px] text-[#8b97a6]">
        The primary keeps its identity and code, and wins every section unless you override it next.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {selectedOptions.map((p) => {
          const isP = primaryId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSetPrimary(p.id)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition"
              style={
                isP
                  ? { background: "rgba(47,111,237,.13)", borderColor: "#2f6fed" }
                  : { background: "#0a111c", borderColor: "#1b2433" }
              }
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
                  style={{ borderColor: isP ? "#2f6fed" : "#3a4756" }}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full bg-blue-500 transition-opacity"
                    style={{ opacity: isP ? 1 : 0 }}
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
              {isP && (
                <span
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{ background: "linear-gradient(180deg,#3f7bff,#2f6fed)" }}
                >
                  Primary
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
