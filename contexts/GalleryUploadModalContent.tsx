"use client";

import { useMemo, useState, useEffect } from "react";
import { Button, ModalBody, ModalFooter } from "flowbite-react";
import { HiUpload, HiRefresh, HiPhotograph, HiCheck, HiX, HiMinus } from "react-icons/hi";
import type { UploadJob, UploadPhase } from "./GalleryUploadContext";
import type { UploadModalImageTab } from "@/components/properties/gallery-section/upload-tab";
import {
  formatBytes,
  validateAllEntries,
} from "@/components/properties/gallery-section/upload-tab/utils";
import UploadStatusList from "@/components/properties/gallery-section/upload-tab/UploadStatusList";

export interface GalleryUploadModalContentProps {
  phase: UploadPhase;
  currentJob: UploadJob | null;
  overallError: string | null;
  completedCount: number;
  totalCount: number;
  onStartUpload: () => void;
  onCancel: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onValidationResults: (results: Record<string, import("@/components/properties/gallery-section/upload-tab").ImageValidationResult>) => void;
}

export default function GalleryUploadModalContent({
  phase,
  currentJob,
  overallError,
  completedCount,
  totalCount,
  onStartUpload,
  onCancel,
  onClose,
  onMinimize,
  onValidationResults,
}: GalleryUploadModalContentProps) {
  const [imageTab, setImageTab] = useState<UploadModalImageTab>("raw");

  const entries = currentJob?.entries ?? [];
  const validationResults = currentJob?.validationResults ?? null;

  useEffect(() => {
    if (!currentJob || currentJob.validationResults != null || phase === "uploading") return;
    validateAllEntries(currentJob.entries).then(onValidationResults);
  }, [currentJob, phase, onValidationResults]);

  const uploadStatuses = currentJob?.uploadStatuses ?? {};

  const successCount = entries.filter((e) => uploadStatuses[e.item.id]?.status === "success").length;
  const errorCount = entries.filter((e) => uploadStatuses[e.item.id]?.status === "error").length;
  const pendingCount = totalCount - successCount - errorCount;
  const doneCount = successCount + errorCount;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isUploading = phase === "uploading";

  const totalImageCount = useMemo(() => {
    const originals = entries.length;
    const watermarked = entries.filter(
      (e) => !e.processingPhotoError && e.processedPhotoUrl
    ).length;
    return originals + watermarked;
  }, [entries]);

  const totalSizeBytes = useMemo(
    () =>
      entries.reduce(
        (sum, e) => sum + (e.fileSize ?? 0) + (e.processedPhotoSize ?? 0),
        0
      ),
    [entries]
  );
  const totalSizeStr = totalSizeBytes > 0 ? formatBytes(totalSizeBytes) : null;

  const toConvert = useMemo(() => entries.filter((e) => e.needsConversion), [entries]);
  const noConversion = useMemo(() => entries.filter((e) => !e.needsConversion), [entries]);
  const toConvertImageCount = useMemo(
    () =>
      toConvert.reduce(
        (sum, e) =>
          sum + 1 + (!e.processingPhotoError && e.processedPhotoUrl ? 1 : 0),
        0
      ),
    [toConvert]
  );
  const noConversionImageCount = useMemo(
    () =>
      noConversion.reduce(
        (sum, e) =>
          sum + 1 + (!e.processingPhotoError && e.processedPhotoUrl ? 1 : 0),
        0
      ),
    [noConversion]
  );

  return (
    <>
      <div className="rounded-t-xl border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800/80 dark:to-gray-800/40 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Upload images to property gallery
            </h2>
            {entries.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <HiPhotograph className="w-4 h-4 text-gray-400" />
                  {totalImageCount} image{totalImageCount !== 1 ? "s" : ""}{" "}
                  <span className="text-gray-400 dark:text-gray-500">
                    (originals + watermarked)
                  </span>
                </span>
                {validationResults == null && !isUploading && (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <HiRefresh className="w-4 h-4 animate-spin" />
                    Validating…
                  </span>
                )}
                {totalSizeStr != null && (
                  <span className="text-gray-400 dark:text-gray-500">· {totalSizeStr} total size</span>
                )}
              </p>
            )}
            {isUploading && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Note: Refreshing the page (F5) will cancel this upload.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={isUploading ? onMinimize : onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-600 dark:hover:text-gray-200 shrink-0"
            aria-label={isUploading ? "Minimize" : "Close"}
            title={isUploading ? "Minimize" : "Close"}
          >
            <HiMinus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ModalBody className="px-6 py-0 flex flex-col gap-5 min-h-0 bg-gray-50/50 dark:bg-gray-900/50">
        {isUploading && totalCount > 0 && (
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 bg-white dark:bg-gray-800/80 py-4 px-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <HiRefresh className="w-4 h-4 text-emerald-500 animate-spin" />
                Upload in progress
              </span>
              <span className="tabular-nums text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                <strong className="text-gray-700 dark:text-gray-300 tabular-nums">{doneCount}</strong>
                {" / "}
                <strong className="text-gray-700 dark:text-gray-300 tabular-nums">{totalCount}</strong>
                {" images"}
              </span>
              {successCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <HiCheck className="w-3.5 h-3.5" />
                  {successCount} done
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <HiX className="w-3.5 h-3.5" />
                  {errorCount} failed
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{pendingCount} pending</span>
              )}
            </div>
          </div>
        )}

        {overallError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{overallError}</p>
          </div>
        )}

        <section className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-700/50 shrink-0 w-fit">
            {(
              [
                { id: "raw" as const, label: "Original Images" },
                { id: "photo" as const, label: "Watermarked Images" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setImageTab(id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  imageTab === id
                    ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-600/50 bg-white dark:bg-gray-800/50 shadow-sm overflow-hidden flex-1 min-h-[320px] flex flex-col">
            <UploadStatusList
              entries={entries}
              statuses={uploadStatuses}
              imageVariant={imageTab}
              validationResults={validationResults}
            />
          </div>
        </section>
      </ModalBody>

      <ModalFooter className="border-t border-gray-200 dark:border-gray-600/50 bg-gray-50/50 dark:bg-gray-800/30 py-4 px-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 order-first w-full sm:order-none sm:w-auto sm:mr-auto">
          <span>Conversion:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/80 dark:bg-amber-900/30 px-2 py-1 text-amber-800 dark:text-amber-200">
            To WebP {toConvertImageCount} <span className="opacity-80">images</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/80 dark:bg-emerald-900/30 px-2 py-1 text-emerald-800 dark:text-emerald-200">
            No conversion {noConversionImageCount} <span className="opacity-80">images</span>
          </span>
        </div>
        {isUploading ? (
          <Button
            color="failure"
            onClick={onCancel}
            className="rounded-xl px-5 py-2.5 font-medium"
          >
            Cancel Task
          </Button>
        ) : phase === "done" || phase === "error" ? (
          <Button
            color="gray"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 font-medium"
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              color="gray"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 font-medium"
            >
              Cancel
            </Button>
            <Button
              color="success"
              onClick={onStartUpload}
              disabled={validationResults == null || totalCount === 0}
              className="rounded-xl px-6 py-2.5 font-semibold shadow-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiUpload className="w-5 h-5 mr-2" />
              Start upload
              {validationResults != null && totalCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded bg-white/25 text-sm">
                  {totalCount} image{totalCount !== 1 ? "s" : ""}
                </span>
              )}
            </Button>
          </>
        )}
      </ModalFooter>
    </>
  );
}
