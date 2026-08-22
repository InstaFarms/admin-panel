"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "flowbite-react";
import { HiPause, HiCheck, HiExclamation } from "react-icons/hi";

export type BulkWatermarkItemStatus = "Pending" | "Converting" | "Done" | "Failed";

export interface BulkWatermarkItem {
  id: string;
  fileName: string | null;
  propertyName: string | null;
  status: BulkWatermarkItemStatus;
}

interface BulkWatermarkModalProps {
  show: boolean;
  items: BulkWatermarkItem[];
  totalConverted: number;
  /** Total photos in scope for this run, from the server's first-page count. Null until known. */
  grandTotal?: number | null;
  /** How many of totalConverted came from a previous, resumed run (0 for a fresh run). */
  resumedCount?: number;
  /** True while the processing loop is running (fetching or converting). */
  isProcessing: boolean;
  /** True when user clicked Pause/Cancel and we are finishing the current batch. */
  stoppedByUser: boolean;
  /** True when user clicked Pause/Cancel but processing is still finishing current batch. */
  userRequestedStop?: boolean;
  /** Error message if initial fetch failed (e.g. no images need conversion). */
  error?: string | null;
  /** Modal header title, e.g. "Creating Instafarms watermarked images". */
  title?: string;
  onClose: () => void;
  onPauseOrCancel: () => void;
  /** Discard saved progress and reprocess everything from the beginning. */
  onStartOver?: () => void;
}


export default function BulkWatermarkModal({
  show,
  items,
  totalConverted,
  grandTotal = null,
  resumedCount = 0,
  isProcessing,
  stoppedByUser,
  userRequestedStop = false,
  error,
  title = "Creating Instafarms watermarked images",
  onClose,
  onPauseOrCancel,
  onStartOver,
}: BulkWatermarkModalProps) {
  const canClose = !isProcessing || stoppedByUser;
  const pendingCount = items.filter((i) => i.status === "Pending").length;
  const convertingCount = items.filter((i) => i.status === "Converting").length;
  const doneCount = items.filter((i) => i.status === "Done").length;
  const failedCount = items.filter((i) => i.status === "Failed").length;

  return (
    <Modal
      show={show}
      onClose={() => canClose && onClose()}
      size="6xl"
      dismissible={canClose}
      className="[&>div]:max-w-6xl [&>div]:w-full [&>div]:rounded-xl"
    >
      <ModalHeader className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 [&>button]:hidden">
        <span className="text-lg font-semibold">{title}</span>
      </ModalHeader>
      <ModalBody className="flex flex-col max-h-[60vh] p-0">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3 m-6 text-amber-800 dark:text-amber-200">
            <HiExclamation className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Sticky header: banners + stats stay visible; only the table below scrolls. */}
            <div className="shrink-0 px-6 pt-6">
              {userRequestedStop && isProcessing && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mb-4 text-amber-800 dark:text-amber-200 text-sm">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  <p>Pause/Cancel will take effect after the current files finish processing.</p>
                </div>
              )}
              {resumedCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 px-4 py-3 mb-4 text-sky-800 dark:text-sky-200 text-sm">
                  <p>Resumed from a previous run — {resumedCount} already done, continuing from there.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Total converted:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {totalConverted}
                    {grandTotal != null ? ` / ${grandTotal}` : ""}
                  </span>
                </span>
                {items.length > 0 && (
                  <>
                    <span className="text-gray-500">
                      Pending: {pendingCount} · Converting: {convertingCount} · Done: {doneCount}
                      {failedCount > 0 && ` · Failed: ${failedCount}`}
                    </span>
                  </>
                )}
              </div>
            </div>
            {items.length > 0 ? (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">ID</th>
                        <th className="text-left py-2 px-3 font-medium">Property</th>
                        <th className="text-left py-2 px-3 font-medium">File name</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-2 px-3 font-mono text-xs text-gray-600 dark:text-gray-400 break-all" title={item.id}>
                            {item.id}
                          </td>
                          <td className="py-2 px-3 truncate max-w-45" title={item.propertyName ?? ""}>
                            {item.propertyName ?? "—"}
                          </td>
                          <td className="py-2 px-3 truncate max-w-50" title={item.fileName ?? ""}>
                            {item.fileName ?? "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                item.status === "Done"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                  : item.status === "Failed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                  : item.status === "Converting"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {item.status === "Converting" && (
                                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              )}
                              {item.status === "Done" && <HiCheck className="w-4 h-4" />}
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isProcessing && !error ? (
              <p className="text-gray-500 dark:text-gray-400 px-6 pb-6">Checking for images…</p>
            ) : null}
          </>
        )}
      </ModalBody>
      <ModalFooter className="border-t border-gray-200 dark:border-gray-600 flex flex-wrap gap-2">
        {isProcessing && !stoppedByUser && !userRequestedStop && (
          <Button size="sm" color="gray" onClick={onPauseOrCancel} className="flex items-center gap-2">
            <HiPause className="w-4 h-4" />
            Pause
          </Button>
        )}
        {isProcessing && !stoppedByUser && !userRequestedStop && (
          <Button size="sm" color="failure" onClick={onPauseOrCancel}>
            Cancel
          </Button>
        )}
        {onStartOver && canClose && (stoppedByUser || resumedCount > 0) && (
          <Button size="sm" color="gray" onClick={onStartOver}>
            Start Over
          </Button>
        )}
        <Button size="sm" color="gray" onClick={onClose} disabled={!canClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
