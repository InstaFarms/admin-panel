"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { discardAllReservationDrafts, discardReservationDraft } from "@/actions/bookingActions";

type Draft = {
  id: string;
  branchKind: string;
  status: string;
  updatedAt: string;
  payload: Record<string, unknown>;
};

const resumePath = (branchKind: string, draftId: string) => {
  const encodedId = encodeURIComponent(draftId);
  if (branchKind === "OWNER")
    return `/admin/bookings/owner-reservation/create?draftId=${encodedId}`;
  if (branchKind === "ENQUIRY")
    return `/admin/bookings/enquiry/create?draftId=${encodedId}`;
  return `/admin/bookings/create`;
};

// Deleting a draft calls the backend's "discard" endpoint (soft-delete --
// marks the row DISCARDED rather than removing it, since there's no hard-
// delete route). From the admin's point of view "delete" means it's gone,
// so discarded drafts are filtered out of this list entirely rather than
// shown in a disabled state.
export default function DraftsList({ drafts: initialDrafts }: { drafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts.filter((d) => d.status === "DRAFT"));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeCount = drafts.length;

  const deleteOne = (draft: Draft) => {
    if (!window.confirm(`Delete this ${draft.branchKind.replaceAll("_", " ").toLowerCase()} draft? This can't be undone.`)) return;
    setError(null);
    setPendingId(draft.id);
    startTransition(async () => {
      const res = await discardReservationDraft(draft.id);
      setPendingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    });
  };

  const deleteAll = () => {
    if (activeCount === 0) return;
    if (!window.confirm(`Delete all ${activeCount} draft(s)? This can't be undone.`)) return;
    setError(null);
    setPendingId("__all__");
    startTransition(async () => {
      const res = await discardAllReservationDrafts();
      setPendingId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDrafts([]);
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {activeCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={deleteAll}
            disabled={isPending}
            className="rounded-lg border border-red-300 px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
          >
            {pendingId === "__all__" ? "Deleting all…" : `Delete all (${activeCount})`}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {drafts.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {draft.branchKind.replaceAll("_", " ")} draft
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {draft.status} · last saved{" "}
                    {new Date(draft.updatedAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={resumePath(draft.branchKind, draft.id)}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    Resume
                  </Link>
                  <button
                    onClick={() => deleteOne(draft)}
                    disabled={isPending}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    {pendingId === draft.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-600 dark:text-slate-400">
            No reservation drafts yet.
          </p>
        )}
      </div>
    </div>
  );
}
