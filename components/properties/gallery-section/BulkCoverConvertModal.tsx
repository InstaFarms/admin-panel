"use client";

import { Button } from "flowbite-react";
import {
  HiCheckCircle,
  HiChevronDown,
  HiChevronUp,
  HiExclamationCircle,
  HiMinusSm,
  HiPause,
  HiPlay,
  HiSparkles,
  HiX,
} from "react-icons/hi";

export type BulkCoverConvertPropertyStatus =
  | "Queued"
  | "Converting"
  | "Saving"
  | "Done"
  | "Failed";

export interface BulkCoverConvertImageItem {
  id: string;
  slot: number;
  status: "Converted" | "Skipped" | "Failed";
  message?: string;
}

export interface BulkCoverConvertPropertyItem {
  propertyId: string;
  propertyName: string;
  totalCovers: number;
  convertedCount: number;
  status: BulkCoverConvertPropertyStatus;
  message?: string | null;
  coverDetails?: BulkCoverConvertImageItem[];
  brand?: "instafarms" | "mago";
}

interface BulkCoverConvertModalProps {
  show: boolean;
  minimized: boolean;
  properties: BulkCoverConvertPropertyItem[];
  totalConverted: number;
  totalPropertiesDone: number;
  isProcessing: boolean;
  stoppedByUser: boolean;
  userRequestedStop?: boolean;
  error?: string | null;
  onClose: () => void;
  onPauseOrCancel: () => void;
  onToggleMinimize: () => void;
}

const STATUS_STYLES: Record<BulkCoverConvertPropertyStatus, string> = {
  Queued:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  Converting:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700/50",
  Saving:
    "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-700/50",
  Done:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700/50",
  Failed:
    "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-700/50",
};

function formatProgress(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export default function BulkCoverConvertModal({
  show,
  minimized,
  properties,
  totalConverted,
  totalPropertiesDone,
  isProcessing,
  stoppedByUser,
  userRequestedStop = false,
  error,
  onClose,
  onPauseOrCancel,
  onToggleMinimize,
}: BulkCoverConvertModalProps) {
  if (!show) return null;

  const totalProperties = properties.length;
  const totalCoverTargets = properties.reduce((sum, item) => sum + item.totalCovers, 0);
  const convertingCount = properties.filter((item) => item.status === "Converting" || item.status === "Saving").length;
  const failedCount = properties.filter((item) => item.status === "Failed").length;
  const canClose = !isProcessing || stoppedByUser;
  const progressPercent = totalCoverTargets > 0 ? Math.max(4, Math.min(100, (totalConverted / totalCoverTargets) * 100)) : 0;
  const currentProperty = properties.find((item) => item.status === "Converting" || item.status === "Saving") ?? null;

  const headerContent = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
        <HiSparkles className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
          Global Cover Refresh
        </p>
        <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
          Cover image conversion console
        </h3>
      </div>
    </div>
  );

  const summaryContent = (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Properties done</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {totalPropertiesDone}
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">/ {totalProperties || 0}</span>
        </p>
      </div>
      <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Covers converted</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {totalConverted}
          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">/ {totalCoverTargets || 0}</span>
        </p>
      </div>
      <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live progress</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {formatProgress(totalConverted, totalCoverTargets)}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex w-[min(92vw,44rem)] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-slate-50 via-white to-emerald-50 shadow-[0_30px_90px_rgba(15,23,42,0.26)] backdrop-blur-xl dark:border-slate-700/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="border-b border-white/70 bg-white/75 px-5 py-4 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/75">
        <div className="flex items-start justify-between gap-4">
          {headerContent}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              aria-label={minimized ? "Restore progress console" : "Minimize progress console"}
            >
              {minimized ? <HiChevronUp className="h-5 w-5" /> : <HiMinusSm className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={!canClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              aria-label="Close progress console"
            >
              <HiX className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
          <span>{totalProperties || 0} properties discovered</span>
          <span>{convertingCount} active</span>
          <span>{failedCount} failed</span>
          {currentProperty ? (
            <span className="truncate">
              Working on <span className="font-semibold text-slate-900 dark:text-white">{currentProperty.propertyName || currentProperty.propertyId}</span>
            </span>
          ) : null}
        </div>
      </div>

      {minimized ? (
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {userRequestedStop && isProcessing
                    ? "Stopping after the current property finishes"
                : error
                  ? error
                  : isProcessing
                    ? "Processing all property cover images (Instafarms + Mago)"
                    : stoppedByUser
                      ? "Stopped after the current property"
                      : "Processing complete"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {totalConverted} covers refreshed across {Math.max(totalPropertiesDone, 0)} properties
            </p>
          </div>
          {!userRequestedStop && isProcessing ? (
            <Button size="xs" color="failure" onClick={onPauseOrCancel} className="shrink-0">
              Stop after current property
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-4 px-5 py-5">
            {summaryContent}

            {userRequestedStop && isProcessing ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100">
                <HiPause className="mt-0.5 h-5 w-5 shrink-0" />
                <p>The stop request is queued. We'll finish the property currently being processed, then pause the run.</p>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-100">
                <HiExclamationCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/75 shadow-inner shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-900/55 dark:shadow-black/20">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-700/80">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Live property queue</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This run processes Instafarms (from original) and Mago (from watermarked) cover images. Existing gallery photos stay intact.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <HiChevronDown className="h-4 w-4" />
                  Minimize
                </button>
              </div>
              <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
                {properties.length > 0 ? (
                  <div className="space-y-3">
                    {properties.map((item) => (
                      <div
                        key={item.propertyId}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-800/45"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {item.propertyName || "Unnamed property"}
                              </p>
                              {item.brand ? (
                                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.brand === "mago" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"}`}>
                                  {item.brand === "mago" ? "Mago" : "Instafarms"}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {item.convertedCount}/{item.totalCovers} cover image{item.totalCovers === 1 ? "" : "s"} refreshed
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>
                            {item.status === "Converting" || item.status === "Saving" ? (
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : null}
                            {item.status === "Done" ? <HiCheckCircle className="h-4 w-4" /> : null}
                            {item.status}
                          </span>
                        </div>
                        {item.message ? (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : isProcessing && !error ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-4 text-sm text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/45 dark:text-slate-300">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Scanning properties with cover images that still need conversion...
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No properties were queued for conversion.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 bg-white/75 px-5 py-4 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/75">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isProcessing
                ? "You can minimize this console. It will keep updating live while the batch continues."
                : stoppedByUser
                  ? "The run paused cleanly after the active property finished."
                  : "All queued properties have been processed."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!userRequestedStop && isProcessing ? (
                <Button size="sm" color="failure" onClick={onPauseOrCancel} className="flex items-center gap-2">
                  <HiPause className="h-4 w-4" />
                  Stop After Current Property
                </Button>
              ) : null}
              {userRequestedStop && isProcessing ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  <HiPlay className="h-4 w-4" />
                  Stop requested
                </span>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
