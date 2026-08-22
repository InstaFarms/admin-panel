"use client";

type Brand = {
  id: "instafarms" | "mago";
  name: string;
  desc: string;
  color: string;
};

export const BRANDS: Brand[] = [
  { id: "instafarms", name: "InstaFarms", desc: "Primary booking brand", color: "#2f6fed" },
  { id: "mago", name: "Mago", desc: "Partner distribution brand", color: "#13b9a0" },
];

interface BrandSelectionStepProps {
  activeBrandId: "instafarms" | "mago" | "";
  brandCounts: { instafarms: number; mago: number };
  loading: boolean;
  intro: string;
  onPick: (id: "instafarms" | "mago") => void;
}

export default function BrandSelectionStep({
  activeBrandId,
  brandCounts,
  loading,
  intro,
  onPick,
}: BrandSelectionStepProps) {
  return (
    <div className="rounded-xl border border-[#1b2433] bg-[#0d1420] p-6">
      <h6 className="text-base font-bold text-white">Select brand</h6>
      <p className="mt-1.5 text-[13px] text-[#8b97a6]">{intro}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BRANDS.map((brand) => {
          const count = loading ? null : brandCounts[brand.id];
          const active = activeBrandId === brand.id;
          return (
            <button
              key={brand.id}
              type="button"
              onClick={() => onPick(brand.id)}
              className="flex flex-col gap-3 rounded-xl border p-5 text-left transition"
              style={
                active
                  ? { background: "rgba(47,111,237,.10)", borderColor: brand.color, boxShadow: `0 0 0 1px ${brand.color}33` }
                  : { background: "#0a111c", borderColor: "#1b2433" }
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${brand.color}cc, ${brand.color})` }}
                  >
                    {brand.name[0]}
                  </div>
                  <div>
                    <div className="text-[14.5px] font-bold text-[#eef2f7]">{brand.name}</div>
                    <div className="text-[12px] text-[#8b97a6]">{brand.desc}</div>
                  </div>
                </div>
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
                  style={{ borderColor: active ? brand.color : "#3a4756" }}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full transition-opacity"
                    style={{ background: brand.color, opacity: active ? 1 : 0 }}
                  />
                </div>
              </div>

              <div className="border-t border-[#1b2433] pt-3">
                {loading ? (
                  <div className="text-[12px] text-[#6f7c8c]">Loading properties…</div>
                ) : (
                  <div className="text-[12px] text-[#8b97a6]">
                    <span className="text-[20px] font-bold" style={{ color: brand.color }}>{count}</span>
                    {" "}propert{count === 1 ? "y" : "ies"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
