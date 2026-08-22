"use client";

import { useState, useTransition } from "react";
import { Button } from "flowbite-react";
import { syncPreviewElivaas, forceFullSyncElivaas, backfillElivaasSettings, getBackfillStatus } from "@/actions/elivaasActions";
import type { ElivaasPropertyDiff } from "@/actions/elivaasActions";
import SyncPreviewModal from "./SyncPreviewModal";

export default function SyncButton() {
  const [isPending,      startTransition]      = useTransition();
  const [isFullSyncing,  startFullSync]        = useTransition();
  const [isBackfilling,  startBackfill]        = useTransition();
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null);
  const [diff,           setDiff]              = useState<ElivaasPropertyDiff | null>(null);
  const [error,          setError]             = useState("");
  const [doneMsg,        setDoneMsg]           = useState("");

  function handleReload() {
    setError("");
    setDoneMsg("");
    startTransition(async () => {
      const result = await syncPreviewElivaas();
      if (result.success) {
        setDiff(result.data);
      } else {
        setError(result.message);
      }
    });
  }

  function handleForceRefresh() {
    setError("");
    setDoneMsg("");
    startFullSync(async () => {
      const result = await forceFullSyncElivaas();
      if (result.success) {
        setDoneMsg(`Full sync done — ${result.totalUpserted} properties refreshed with images, amenities & more.`);
        setTimeout(() => setDoneMsg(""), 8000);
      } else {
        setError(result.message);
      }
    });
  }

  function handleClose() {
    setDiff(null);
  }

  function handleDone({ upserted, removed }: { upserted: number; removed: number }) {
    setDiff(null);
    setDoneMsg(`Applied: ${upserted} added/updated, ${removed} removed.`);
    setTimeout(() => setDoneMsg(""), 5000);
  }

  function handleBackfill() {
    setError("");
    setDoneMsg("");
    setBackfillProgress(null);

    // Poll progress every 2s while the backfill runs
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        const status = await getBackfillStatus();
        if (status.total > 0) setBackfillProgress(status);
      }, 2000);
    };
    const stopPolling = () => { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } };

    startPolling();
    startBackfill(async () => {
      try {
        const result = await backfillElivaasSettings();
        stopPolling();
        setBackfillProgress(null);
        if (result.success) {
          setDoneMsg(`Done — ${result.imported} properties imported (${result.total} total).`);
          setTimeout(() => setDoneMsg(""), 8000);
        } else {
          setError(result.message ?? "Backfill failed");
        }
      } catch (e: any) {
        stopPolling();
        setBackfillProgress(null);
        setError(e.message);
      }
    });
  }

  const busy = isPending || isFullSyncing || isBackfilling;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          color="dark"
          size="sm"
          onClick={handleReload}
          disabled={busy}
        >
          {isPending ? "Fetching changes…" : "Reload from Elivaas"}
        </Button>
        <Button
          color="light"
          size="sm"
          onClick={handleForceRefresh}
          disabled={busy}
          title="Re-fetch all 400+ properties and refresh images, amenities, house rules, metrics etc."
        >
          {isFullSyncing ? "Refreshing all…" : "Force Refresh All"}
        </Button>
        <Button
          color="light"
          size="sm"
          onClick={handleBackfill}
          disabled={busy}
          title="One-time: copy catalog data into admin settings for all properties that don't have settings yet"
        >
          {isBackfilling
            ? backfillProgress
              ? `Importing… ${backfillProgress.done}/${backfillProgress.total}`
              : "Starting import…"
            : "Import Catalog → Settings"}
        </Button>
        {isBackfilling && backfillProgress && backfillProgress.total > 0 && (
          <div className="flex items-center gap-2 min-w-[160px]">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round((backfillProgress.done / backfillProgress.total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums shrink-0">
              {Math.round((backfillProgress.done / backfillProgress.total) * 100)}%
            </span>
          </div>
        )}
        {doneMsg && <span className="text-sm text-emerald-600 font-medium">{doneMsg}</span>}
        {error   && <span className="text-sm text-red-600">Error: {error}</span>}
      </div>

      {diff && (
        <SyncPreviewModal diff={diff} onClose={handleClose} onDone={handleDone} />
      )}
    </>
  );
}
