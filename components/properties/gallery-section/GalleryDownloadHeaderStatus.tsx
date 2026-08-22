"use client";

import { useGalleryDownload } from "@/contexts/GalleryDownloadContext";
import { HiRefresh, HiArrowsExpand } from "react-icons/hi";

export function GalleryDownloadHeaderStatus() {
  const { phase, completedCount, totalCount, openModal, cancelDownload } =
    useGalleryDownload();

  const isRunning = phase === "downloading" || phase === "creating_zip";

  // Only show in navbar while download is in progress; hide when idle, done, or error
  if (!isRunning) return null;

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const statusText =
    phase === "creating_zip" ? "Creating ZIP…" : `${completedCount}/${totalCount}`;

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm shadow-sm dark:border-blue-800 dark:bg-blue-900/20">
      <HiRefresh className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
      <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
        {percent}% · {statusText}
      </span>
      <button
        type="button"
        onClick={cancelDownload}
        className="rounded px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        Cancel Task
      </button>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        title="Expand"
      >
        <HiArrowsExpand className="h-3.5 w-3.5" />
        Expand
      </button>
    </div>
  );
}

export default GalleryDownloadHeaderStatus;
