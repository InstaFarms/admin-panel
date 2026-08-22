"use client";

import { useMemo, useState } from "react";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from "flowbite-react";
import { HiUpload, HiRefresh, HiPhotograph, HiCheck, HiX } from "react-icons/hi";
import type { UploadEntry, UploadStatusState, UploadModalImageTab } from "./types";
import { formatBytes } from "./utils";
import UploadStatusList from "./UploadStatusList";

interface UploadModalProps {
  show: boolean;
  uploading: boolean;
  entries: UploadEntry[];
  toConvert: UploadEntry[];
  noConversion: UploadEntry[];
  uploadStatuses: Record<string, UploadStatusState>;
  onClose: () => void;
  onStartUpload: () => void;
}

export default function UploadModal({
  show,
  uploading,
  entries,
  toConvert,
  noConversion,
  uploadStatuses,
  onClose,
  onStartUpload,
}: UploadModalProps) {
  const totalCount = entries.length;
  const successCount = entries.filter((e) => uploadStatuses[e.item.id]?.status === "success").length;
  const errorCount = entries.filter((e) => uploadStatuses[e.item.id]?.status === "error").length;
  const pendingCount = totalCount - successCount - errorCount;
  const doneCount = successCount + errorCount;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Total images = originals + watermarked (one of each per entry when available)
  const totalImageCount = useMemo(() => {
    const originals = entries.length;
    const watermarked = entries.filter(
      (e) => !e.processingPhotoError && e.processedPhotoUrl
    ).length;
    return originals + watermarked;
  }, [entries]);

  // Total size = sum of original + watermarked sizes for all entries
  const totalSizeBytes = useMemo(
    () =>
      entries.reduce(
        (sum, e) => sum + (e.fileSize ?? 0) + (e.processedPhotoSize ?? 0),
        0
      ),
    [entries]
  );
  const totalSizeStr = totalSizeBytes > 0 ? formatBytes(totalSizeBytes) : null;

  // Footer: conversion counts as total images (original + watermarked) per group
  const toConvertImageCount = useMemo(() => {
    return toConvert.reduce(
      (sum, e) =>
        sum + 1 + (!e.processingPhotoError && e.processedPhotoUrl ? 1 : 0),
      0
    );
  }, [toConvert]);
  const noConversionImageCount = useMemo(() => {
    return noConversion.reduce(
      (sum, e) =>
        sum + 1 + (!e.processingPhotoError && e.processedPhotoUrl ? 1 : 0),
      0
    );
  }, [noConversion]);

  const [imageTab, setImageTab] = useState<UploadModalImageTab>("raw");

  // Modal only displays entries (raw/watermark/thumbnail URLs). No reprocessing: watermark and
  // thumbnail are generated once in the preview section via processEntriesPreview in GalleryUploadTab.
  return (
    <Modal
      show={show}
      onClose={() => !uploading && onClose()}
      size="6xl"
      dismissible={!uploading}
      className="[&>div]:max-w-6xl [&>div]:w-full [&>div]:rounded-2xl [&>div]:overflow-hidden [&>div]:shadow-2xl [&>div]:border-0"
    >
      <ModalHeader className="border-b border-gray-200/80 dark:border-gray-600/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-800/80 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <span className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <HiUpload className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Upload images to property gallery</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <HiPhotograph className="w-4 h-4 text-gray-400" />
                  {totalImageCount} image{totalImageCount !== 1 ? "s" : ""}{" "}
                  <span className="text-gray-400 dark:text-gray-500">
                    (originals + watermarked)
                  </span>
                </span>
                {totalSizeStr != null && (
                  <span className="text-gray-400 dark:text-gray-500">· {totalSizeStr} total size</span>
                )}
              </p>
            </div>
          </span>
        </div>
      </ModalHeader>
      <ModalBody className="px-6 py-0 flex flex-col gap-5 min-h-0 bg-gray-50/50 dark:bg-gray-900/50">
        {uploading && totalCount > 0 && (
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

        <section className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            {uploading && totalCount > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {doneCount} / {totalCount} completed
              </span>
            )}
          </div>
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
        <Button
          color="gray"
          onClick={onClose}
          disabled={uploading}
          className="rounded-xl px-5 py-2.5 font-medium shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </Button>
        <Button
          color="success"
          onClick={onStartUpload}
          disabled={uploading}
          className="rounded-xl px-6 py-2.5 font-semibold shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-60"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <HiRefresh className="w-5 h-5 animate-spin" />
              Uploading…
            </span>
          ) : (
            <>
              <HiUpload className="w-5 h-5 mr-2" />
              Start upload
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
