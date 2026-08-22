import Pagination from "@/components/Pagination";
import { fetchSplitPropertyMappingsPaginated } from "@/actions/propertyActions";
import { parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import Link from "next/link";
import SplitPropertiesTableClient from "./SplitPropertiesTableClient";
import DeletedSplitButton from "./DeletedSplitButton";

export const dynamic = "force-dynamic";

export default async function SplitPropertiesPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);

  const result = await fetchSplitPropertyMappingsPaginated({ limit, offset });

  if (result.error) {
    return (
      <div className="p-8 text-center text-red-400">Error: {result.error}</div>
    );
  }

  const rows = (result.data || []) as any[];

  // Group flat rows by parent property
  type SplitGroup = {
    parentPropertyId: string;
    parentProperty: any | null;
    children: { childPropertyId: string; childProperty: any | null }[];
  };

  const groupedMap: Record<string, SplitGroup> = {};
  for (const row of rows) {
    const key = row.parentPropertyId as string;
    if (!groupedMap[key]) {
      groupedMap[key] = {
        parentPropertyId: key,
        parentProperty: row.parentProperty || null,
        children: [],
      };
    }
    groupedMap[key].children.push({
      childPropertyId: row.childPropertyId,
      childProperty: row.childProperty || null,
    });
  }
  const groups: SplitGroup[] = Object.values(groupedMap);

  return (
    <div className="min-h-screen p-6 pb-20 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-600/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2f6fed" strokeWidth="1.9">
                <path d="M12 3v6M12 9l-5 5M12 9l5 5M4 19h6M14 19h6" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-white">Split Properties</h1>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[13px] text-[#7d8a99]">
            <Link href="/" className="hover:text-[#cfd8e2]">Home</Link>
            <span className="text-[#3a4756]">›</span>
            <Link href="/admin" className="hover:text-[#cfd8e2]">Admin</Link>
            <span className="text-[#3a4756]">›</span>
            <Link href="/admin/properties" className="hover:text-[#cfd8e2]">Properties</Link>
            <span className="text-[#3a4756]">›</span>
            <span className="text-[#cfd8e2]">Split</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeletedSplitButton />
          <Link
            href="/admin/properties/split-properties/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Split
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#1b2433] bg-[#0d1420]">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2.5fr_1fr_1fr_auto] gap-4 border-b border-[#1b2433] px-6 py-4 text-[11.5px] font-bold uppercase tracking-[.07em] text-[#6f7c8c]">
          <div>Parent Property</div>
          <div>Split Into</div>
          <div>Code Name</div>
          <div>Capacity</div>
          <div>Actions</div>
        </div>

        {groups.length === 0 ? (
          <div className="py-16 text-center text-[14px] text-[#6f7c8c]">
            No split property mappings found.
          </div>
        ) : (
          <SplitPropertiesTableClient groups={groups} offset={offset} />
        )}
      </div>

      <div className="mt-4">
        <Pagination />
      </div>
    </div>
  );
}
