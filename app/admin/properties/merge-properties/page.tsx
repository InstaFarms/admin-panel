import Pagination from "@/components/Pagination";
import { fetchMergedPropertyMappingsPaginated } from "@/actions/propertyActions";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import Link from "next/link";
import MergePropertyRowActions from "./MergePropertyRowActions";
import ArchivedMergeButton from "./ArchivedMergeButton";

export const dynamic = "force-dynamic";

export default async function MergePropertiesPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const result = await fetchMergedPropertyMappingsPaginated({ limit, offset });

  if (result.error) {
    return (
      <div className="p-8 text-center text-red-400">Error: {result.error}</div>
    );
  }

  const rows = (result.data || []) as any[];

  const showLocation = (property: any) => {
    const parts = [property?.area, property?.city, property?.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="min-h-screen p-6 pb-20 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2f6fed" strokeWidth="1.9">
                <path d="M4 5h6M4 19h6M10 5l5 7-5 7M20 12h-7" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-white">Merge Properties</h1>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-[#7d8a99]">
            <Link href="/" className="hover:text-[#cfd8e2]">Home</Link>
            <span className="text-[#3a4756]">›</span>
            <Link href="/admin" className="hover:text-[#cfd8e2]">Admin</Link>
            <span className="text-[#3a4756]">›</span>
            <Link href="/admin/properties" className="hover:text-[#cfd8e2]">Properties</Link>
            <span className="text-[#3a4756]">›</span>
            <span className="text-[#cfd8e2]">Merge</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ArchivedMergeButton />
          <Link
            href="/admin/properties/merge-properties/create"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Merge
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#1b2433] bg-[#0d1420]">
        {/* Table header */}
        <div className="grid grid-cols-[1.8fr_2.2fr_1.2fr_1fr_auto] gap-4 border-b border-[#1b2433] px-6 py-4 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#6f7c8c]">
          <div>Merged Property</div>
          <div>Source Properties</div>
          <div>Code Name</div>
          <div>Capacity</div>
          <div>Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-[#6f7c8c]">
            No merge property mappings found.
          </div>
        ) : (
          rows.map((row, index) => {
            const mp = row.mergedProperty;
            const loc = mp ? showLocation(mp) : null;
            const constituents: any[] = Array.isArray(row.constituentProperties)
              ? row.constituentProperties
              : [];
            return (
              <div
                key={row.mergedPropertyId ?? index}
                className="grid grid-cols-[1.8fr_2.2fr_1.2fr_1fr_auto] gap-4 border-b border-[#141c28] px-6 py-5 transition hover:bg-[#0d1420]"
              >
                {/* Merged Property */}
                <div className="min-w-0 self-center">
                  {mp ? (
                    <>
                      <Link
                        href={`/admin/properties/${mp.id}`}
                        className="truncate text-[14px] font-semibold text-blue-400 hover:underline"
                      >
                        {mp.name || mp.heading || mp.propertyName || "N/A"}
                      </Link>
                      <div className="mt-1 text-[12px] text-[#7d8a99]">
                        {mp.propertyCode || ""}
                        {loc ? ` · ${loc}` : ""}
                      </div>
                    </>
                  ) : (
                    <span className="text-[13px] text-[#6f7c8c]">N/A</span>
                  )}
                </div>

                {/* Source Properties */}
                <div className="flex flex-col gap-2.5">
                  {constituents.length > 0 ? (
                    constituents.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-blue-500" />
                        <Link
                          href={`/admin/properties/${p.id}`}
                          className="text-[13px] text-[#cdd6e0] hover:underline"
                        >
                          {p.propertyName || "N/A"}
                        </Link>
                        {p.propertyCode && (
                          <span className="shrink-0 rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#6f7c8c]">
                            {p.propertyCode}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-[13px] text-[#6f7c8c]">N/A</span>
                  )}
                </div>

                {/* Code Name */}
                <div className="self-center text-[12.5px] leading-snug text-[#9aa6b4]">
                  {mp?.propertyCodeName || <span className="text-[#4a5568]">—</span>}
                </div>

                {/* Capacity */}
                <div className="self-center text-[12.5px] text-[#9aa6b4]">
                  {mp?.bedroomCount != null || mp?.maxGuestCount != null ? (
                    <span>
                      {mp?.bedroomCount != null && <span>Bed {mp.bedroomCount}</span>}
                      {mp?.bedroomCount != null && mp?.maxGuestCount != null && (
                        <span className="text-[#4a5568]"> · </span>
                      )}
                      {mp?.maxGuestCount != null && <span>Max {mp.maxGuestCount}</span>}
                    </span>
                  ) : (
                    <span className="text-[#4a5568]">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="self-center">
                  {mp ? (
                    <MergePropertyRowActions
                      mergedPropertyId={mp.id}
                      isDisabled={Boolean(mp.isDisabled || mp.is_disabled)}
                    />
                  ) : (
                    <span className="text-[13px] text-[#6f7c8c]">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4">
        <Pagination />
      </div>
    </div>
  );
}
