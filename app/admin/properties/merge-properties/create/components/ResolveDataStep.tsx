"use client";

import type { MergeSectionKey } from "@/actions/propertyActions";

type PropertyItem = {
  id: string;
  propertyName?: string;
  propertyCode?: string;
};

interface ResolveDataStepProps {
  selectedOptions: PropertyItem[];
  sections: MergeSectionKey[];
  sectionLabels: Record<MergeSectionKey, string>;
  primaryId: string;
  normalizedById: Record<string, any>;
  winners: Record<string, string>;
  onSetWinner: (section: MergeSectionKey, propertyId: string) => void;
}

function getSectionSummary(data: any, section: MergeSectionKey): string {
  if (!data) return "—";
  switch (section) {
    case "DETAIL":
      return [data.propertyName, data.propertyCode ? `(${data.propertyCode})` : ""].filter(Boolean).join(" ") || "—";
    case "ADDRESS":
      return data.address || data.city || "—";
    case "GOOGLE_PLACE":
      return data.googlePlaceRating
        ? `${data.googlePlaceRating}★ · ${data.googlePlaceUserRatingCount ?? 0} reviews`
        : "Not linked";
    case "DAY_WISE_VARIABLES":
      return data.mondayPrice != null ? `Mon ₹${data.mondayPrice}` : "Not set";
    case "SPECIAL_DATES":
      return Array.isArray(data.specialDates) ? `${data.specialDates.length} dates` : "None";
    case "AMENITIES_ACTIVITIES":
      return Array.isArray(data.amenities) ? `${data.amenities.length} amenities` : "—";
    case "GALLERY":
      return Array.isArray(data.gallery) ? `${data.gallery.length} photos` : "None";
    case "SAFETY_HYGIENE":
      return Array.isArray(data.safetyHygiene) ? `${data.safetyHygiene.length} items` : "—";
    case "SPACES":
      return Array.isArray(data.spaces) ? `${data.spaces.length} spaces` : "None";
    case "OWNERS":
      return Array.isArray(data.owners) ? `${data.owners.length} owners` : "None";
    case "MANAGERS":
      return Array.isArray(data.managers) ? `${data.managers.length} managers` : "None";
    case "CARETAKERS":
      return Array.isArray(data.caretakers) ? `${data.caretakers.length} caretakers` : "None";
    case "PLANS":
      return Array.isArray(data.discountPlans) ? `${data.discountPlans.length} plans` : "None";
    case "ICAL_INTEGRATION":
      return Array.isArray(data.icalLinks) && data.icalLinks.length > 0 ? "Connected" : "Not connected";
    case "BEDDING_AVAILABILITY":
      return "—";
    case "ACTIVITIES_NEARBY_ATTRACTIONS":
      return "—";
    case "FOOD_OPTIONS":
      return "—";
    case "MISC_CHARGES":
      return "—";
    case "AUDIT_MANAGEMENT":
      return data.auditEnabled ? "Audit enabled" : "Audit off";
    case "OTHERS":
      return data.description ? data.description.slice(0, 40) + "…" : "—";
    default:
      return "—";
  }
}

export default function ResolveDataStep({
  selectedOptions,
  sections,
  sectionLabels,
  primaryId,
  normalizedById,
  winners,
  onSetWinner,
}: ResolveDataStepProps) {
  const winnerFor = (sec: MergeSectionKey) => winners[sec] || primaryId;

  let overrideCount = 0;
  sections.forEach((s) => { if (winnerFor(s) !== primaryId) overrideCount++; });
  const overrideSummary =
    overrideCount === 0
      ? "Primary wins all sections"
      : `${overrideCount} section${overrideCount > 1 ? "s" : ""} overridden`;

  const tgrid = `minmax(180px,1.6fr) repeat(${Math.max(selectedOptions.length, 1)},minmax(140px,1fr))`;
  const tmin = 360 + Math.max(selectedOptions.length, 1) * 150;

  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h6 className="text-base font-bold text-white">Resolve the merged data</h6>
          <p className="mt-1.5 text-[13px] text-[#8b97a6]">
            Each row shows every source side by side — choose the winning value for the merged property. Primary is pre-selected.
          </p>
        </div>
        <span
          className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ color: "#7fb0ff", background: "rgba(47,111,237,.10)", borderColor: "rgba(90,139,255,.35)" }}
        >
          {overrideSummary}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-[#1b2433]">
        {/* Header */}
        <div
          className="grid items-start gap-3 border-b border-[#1b2433] bg-[#0a111c] px-4 py-3"
          style={{ gridTemplateColumns: tgrid, minWidth: tmin }}
        >
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#6f7c8c]">
            Data Section
          </div>
          {selectedOptions.map((p) => (
            <div key={p.id} className="text-center">
              <div
                className="text-[12.5px] font-bold"
                style={{ color: p.id === primaryId ? "#7fb0ff" : "#cdd6e0" }}
              >
                {(p.propertyName || "—").split(" - ")[0]}
              </div>
              {p.id === primaryId ? (
                <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#7fb0ff]">
                  Primary
                </div>
              ) : (
                <div className="mt-0.5 text-[10px] text-[#6f7c8c]">{p.propertyCode}</div>
              )}
            </div>
          ))}
        </div>

        {/* Section rows */}
        {sections.map((sec, ri) => {
          const winner = winnerFor(sec);
          return (
            <div
              key={sec}
              className="grid items-center gap-3 px-4 py-2.5"
              style={{
                gridTemplateColumns: tgrid,
                minWidth: tmin,
                borderBottom: ri < sections.length - 1 ? "1px solid #141c28" : "none",
              }}
            >
              <div className="text-[12.5px] font-medium text-[#dbe2ea]">{sectionLabels[sec]}</div>
              {selectedOptions.map((p) => {
                const isWin = winner === p.id;
                const summary = getSectionSummary(normalizedById[p.id], sec);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSetWinner(sec, p.id)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition"
                    style={
                      isWin
                        ? { background: "rgba(47,111,237,.13)", border: "1px solid #2f6fed" }
                        : { border: "1px solid transparent" }
                    }
                  >
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition"
                      style={{ borderColor: isWin ? "#2f6fed" : "#3a4756" }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-blue-500 transition-opacity"
                        style={{ opacity: isWin ? 1 : 0 }}
                      />
                    </div>
                    <span
                      className="text-[12.5px] leading-snug"
                      style={{ color: isWin ? "#eef2f7" : "#8b97a6" }}
                    >
                      {summary}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
