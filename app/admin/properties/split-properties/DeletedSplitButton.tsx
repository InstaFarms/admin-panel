"use client";

import { useState, useEffect, useCallback } from "react";
import { Archive } from "lucide-react";
import { fetchDisabledSplitMappings } from "@/actions/propertyActions";
import DeletedSplitPropertiesDrawer from "@/components/properties/DeletedSplitPropertiesDrawer";

type SplitGroup = {
  parentPropertyId: string;
  parentProperty: any | null;
  children: { childPropertyId: string; childProperty: any | null }[];
};

export default function DeletedSplitButton() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    void fetchDisabledSplitMappings().then((result) => {
      if (result.error) {
        setFetchError(result.error);
        setLoading(false);
        return;
      }
      const rows = (result.data || []) as any[];
      const map: Record<string, SplitGroup> = {};
      for (const row of rows) {
        const key = row.parentPropertyId as string;
        if (!map[key]) {
          map[key] = { parentPropertyId: key, parentProperty: row.parentProperty || null, children: [] };
        }
        map[key].children.push({ childPropertyId: row.childPropertyId, childProperty: row.childProperty || null });
      }
      setGroups(Object.values(map));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#2a3a4a] bg-[#111c28] px-4 py-2.5 text-sm font-semibold text-[#7d9ab5] transition hover:bg-[#162030]"
      >
        <Archive size={15} />
        Archived Properties
      </button>

      <DeletedSplitPropertiesDrawer
        open={open}
        onClose={() => setOpen(false)}
        groups={groups}
        loading={loading}
        error={fetchError}
        onRestored={refresh}
      />
    </>
  );
}
