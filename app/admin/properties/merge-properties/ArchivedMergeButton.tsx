"use client";

import { useState, useEffect, useCallback } from "react";
import { Archive } from "lucide-react";
import { fetchDisabledMergeMappings } from "@/actions/propertyActions";
import ArchivedMergePropertiesDrawer from "@/components/properties/ArchivedMergePropertiesDrawer";

type MergeRow = {
  mergedPropertyId: string;
  mergedProperty: any | null;
  constituentProperties: any[];
};

export default function ArchivedMergeButton() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MergeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    void fetchDisabledMergeMappings().then((result) => {
      if (result.error) {
        setFetchError(result.error);
        setLoading(false);
        return;
      }
      setRows((result.data || []) as MergeRow[]);
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

      <ArchivedMergePropertiesDrawer
        open={open}
        onClose={() => setOpen(false)}
        rows={rows}
        loading={loading}
        error={fetchError}
        onRestored={refresh}
      />
    </>
  );
}
