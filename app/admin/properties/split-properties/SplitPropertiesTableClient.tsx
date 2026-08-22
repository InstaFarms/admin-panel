"use client";

import { useMemo, useState, useCallback } from "react";
import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { togglePropertyStatus } from "@/actions/propertyActions";

type SplitChild = {
  childPropertyId: string;
  childProperty: any | null;
};

type SplitGroup = {
  parentPropertyId: string;
  parentProperty: any | null;
  children: SplitChild[];
};

function showLocation(property: any) {
  if (property?.area == null && property?.city == null && property?.state == null) return null;
  return [property?.area, property?.city, property?.state].filter(Boolean).join(", ");
}

export default function SplitPropertiesTableClient({
  groups,
  offset,
}: {
  groups: SplitGroup[];
  offset: number;
}) {
  const router = useRouter();
  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());

  const safeGroups = useMemo(() => (Array.isArray(groups) ? groups : []), [groups]);

  const handleArchive = useCallback(async (propertyId: string) => {
    setArchivingIds((prev) => new Set(prev).add(propertyId));
    const result = await togglePropertyStatus(propertyId, false);
    setArchivingIds((prev) => { const next = new Set(prev); next.delete(propertyId); return next; });
    if (!result?.error) {
      router.refresh();
    }
  }, [router]);

  return (
    <>
      {safeGroups.map((group) => {
        const parent = group.parentProperty;
        const loc = showLocation(parent);
        return (
          <div
            key={group.parentPropertyId}
            className="grid grid-cols-[2fr_2.5fr_1fr_1fr_auto] gap-4 border-b border-[#141c28] px-6 py-5 transition hover:bg-[#0d1420]"
          >
            {/* Parent Property */}
            <div className="min-w-0 self-center">
              {parent ? (
                <>
                  <Link
                    href={`/admin/properties/${parent.id}`}
                    className="truncate text-[14px] font-semibold text-blue-400 hover:underline"
                  >
                    {parent.propertyName || parent.name || parent.heading || "N/A"}
                  </Link>
                  <div className="mt-1 text-[12px] text-[#7d8a99]">
                    {parent.propertyCode || ""}
                    {loc ? ` · ${loc}` : ""}
                  </div>
                </>
              ) : (
                <span className="text-[13px] text-[#6f7c8c]">N/A</span>
              )}
            </div>

            {/* Split Into */}
            <div className="flex flex-col">
              {group.children.map((child) => {
                const cp = child.childProperty;
                return (
                  <div key={child.childPropertyId} className="flex items-center gap-2.5 py-1.25">
                    {cp ? (
                      <Link
                        href={`/admin/properties/${cp.id}`}
                        className="text-[13px] text-[#cdd6e0] hover:underline"
                      >
                        {cp.propertyName || cp.name || cp.heading || "N/A"}
                      </Link>
                    ) : (
                      <span className="text-[13px] text-[#6f7c8c]">N/A</span>
                    )}
                    {cp?.propertyCode && (
                      <span className="shrink-0 rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#6f7c8c]">
                        {cp.propertyCode}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Code Name */}
            <div className="flex flex-col gap-2.5">
              {group.children.map((child) => {
                const cp = child.childProperty;
                return (
                  <div key={child.childPropertyId} className="flex items-center">
                    {cp?.propertyCodeName ? (
                      <span className="text-[13px] text-[#cdd6e0]">{cp.propertyCodeName}</span>
                    ) : (
                      <span className="text-[13px] text-[#6f7c8c]">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Capacity */}
            <div className="flex flex-col gap-2.5">
              {group.children.map((child) => {
                const cp = child.childProperty;
                const bedrooms = cp?.bedroomCount ?? cp?.bedroom_count ?? null;
                const maxGuests = cp?.maxGuestCount ?? cp?.max_guest_count ?? null;
                return (
                  <div key={child.childPropertyId} className="flex items-center gap-2">
                    {cp ? (
                      <>
                        {bedrooms != null && (
                          <span className="flex items-center gap-1 text-[12px] text-[#cdd6e0]">
                            <span className="text-[#6f7c8c]">Bed</span> {bedrooms}
                          </span>
                        )}
                        {bedrooms != null && maxGuests != null && (
                          <span className="text-[#3a4756]">·</span>
                        )}
                        {maxGuests != null && (
                          <span className="flex items-center gap-1 text-[12px] text-[#cdd6e0]">
                            <span className="text-[#6f7c8c]">Max</span> {maxGuests}
                          </span>
                        )}
                        {bedrooms == null && maxGuests == null && (
                          <span className="text-[13px] text-[#6f7c8c]">—</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[13px] text-[#6f7c8c]">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              {group.children.map((child) => {
                const cp = child.childProperty;
                const isArchiving = cp?.id ? archivingIds.has(cp.id) : false;
                return (
                  <div key={child.childPropertyId} className="flex items-center">
                    {cp ? (
                      <button
                        type="button"
                        aria-label="Archive property"
                        title="Archive property"
                        disabled={isArchiving}
                        onClick={() => handleArchive(cp.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isArchiving ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-amber-400 border-t-transparent" />
                        ) : (
                          <Archive size={14} />
                        )}
                      </button>
                    ) : (
                      <span className="text-[13px] text-[#6f7c8c]">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
