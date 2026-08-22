"use client";

import { useState, useMemo } from "react";
import { ModalBody } from "flowbite-react";
import { HiCheck, HiX, HiRefresh, HiMinus } from "react-icons/hi";
import type { DownloadJob, DownloadItem, DownloadPhase } from "./GalleryDownloadContext";

const FOLDER_TABS = [
  { key: "original" as const, label: "Original" },
  { key: "watermarked" as const, label: "Watermarked" },
  { key: "thumbnails" as const, label: "Thumbnails" },
  { key: "grid" as const, label: "Grid" },
] as const;

type FolderKey = (typeof FOLDER_TABS)[number]["key"];

export interface GalleryDownloadModalContentProps {
  phase: DownloadPhase;
  currentJob: DownloadJob | null;
  overallError: string | null;
  completedCount: number;
  totalCount: number;
  onCancel: () => void;
  onClose: () => void;
}

export default function GalleryDownloadModalContent({
  phase,
  currentJob,
  overallError,
  completedCount,
  totalCount,
  onCancel,
  onClose,
}: GalleryDownloadModalContentProps) {
  const [activeFolderTab, setActiveFolderTab] = useState<FolderKey>("original");
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isRunning = phase === "downloading" || phase === "creating_zip";

  const itemsByFolder = useMemo((): Record<FolderKey, DownloadItem[]> => {
    const empty: Record<FolderKey, DownloadItem[]> = {
      original: [],
      watermarked: [],
      thumbnails: [],
      grid: [],
    };
    if (!currentJob?.items.length) return empty;
    const groups: Record<FolderKey, DownloadItem[]> = {
      original: [],
      watermarked: [],
      thumbnails: [],
      grid: [],
    };
    for (const item of currentJob.items) {
      const key: FolderKey =
        item.folder === "watermarked"
          ? "watermarked"
          : item.folder === "thumbnails"
            ? "thumbnails"
            : item.folder === "grid"
              ? "grid"
              : "original";
      groups[key].push(item);
    }
    return groups;
  }, [currentJob?.items]);

  const statusLabel =
    phase === "idle"
      ? "Idle"
      : phase === "downloading"
        ? "Downloading images"
        : phase === "creating_zip"
          ? "Creating ZIP…"
          : phase === "done"
            ? "Complete"
            : "Error";

  return (
    <>
      <div className="rounded-t-xl border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800/40 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Gallery Download
            </h2>
            {isRunning && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Note: Refreshing the page (F5) will cancel this download.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
            title="Close"
          >
            <HiMinus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ModalBody className="space-y-4 p-6">
        {/* Status + progress merged */}
        <div
          className={`
            rounded-lg border px-4 py-3
            ${phase === "error" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10" : ""}
            ${phase === "done" ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10" : ""}
            ${isRunning ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10" : ""}
            ${phase === "idle" ? "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50" : ""}
          `}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm">
                {phase === "downloading" && (
                  <HiRefresh className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                )}
                {phase === "creating_zip" && (
                  <HiRefresh className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
                )}
                {phase === "done" && (
                  <HiCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {phase === "error" && (
                  <HiX className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                {phase === "idle" && (
                  <HiCheck className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {statusLabel}
              </p>
            </div>
            {totalCount > 0 && (
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white shrink-0">
                {completedCount} / {totalCount} · {percent}%
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        {overallError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{overallError}</p>
          </div>
        )}

        {/* Image list by folder (tabs) */}
        {currentJob && currentJob.items.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
              {FOLDER_TABS.map((tab) => {
                const count = itemsByFolder[tab.key]?.length ?? 0;
                const active = activeFolderTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFolderTab(tab.key)}
                    className={`
                      flex-1 min-w-0 px-3 py-2.5 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5
                      ${active
                        ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 dark:border-emerald-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"}
                    `}
                  >
                    <span className="truncate">{tab.label}</span>
                    {count > 0 && <span className="tabular-nums opacity-80">({count})</span>}
                  </button>
                );
              })}
            </div>
            <div className="max-h-96 overflow-y-auto">
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {(itemsByFolder[activeFolderTab] ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                      {item.label}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1">
                      {item.status === "pending" && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          Pending
                        </span>
                      )}
                      {item.status === "downloading" && (
                        <span className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          <HiRefresh className="h-3 w-3 animate-spin" />
                          Downloading
                        </span>
                      )}
                      {item.status === "done" && (
                        <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <HiCheck className="h-3 w-3" />
                          Done
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300" title={item.error}>
                          <HiX className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {(itemsByFolder[activeFolderTab]?.length ?? 0) === 0 && (
                <p className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                  No images in this category
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {isRunning && (
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Cancel Task
            </button>
          </div>
        )}
      </ModalBody>
    </>
  );
}
