"use client";

import { HiCheck, HiX, HiRefresh } from "react-icons/hi";
import type { UploadEntry, UploadStatusState, UploadSubStatus, UploadModalImageTab, ImageValidationResult } from "./types";
import { getStatusDisplay, formatBytes } from "./utils";

function EntryImagePreview({
  entry,
  variant,
}: {
  entry: UploadEntry;
  variant: UploadModalImageTab;
}) {
  if (variant === "raw") {
    return entry.objectUrl ? (
      <img
        src={entry.objectUrl}
        alt=""
        className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
      />
    ) : (
      <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
        N/A
      </div>
    );
  }
  if (variant === "photo") {
    // Modal only displays; watermark is generated once in preview. Show N/A until ready (no spinner = no reprocessing here).
    if (entry.processingPhoto) {
      return (
        <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
          N/A
        </div>
      );
    }
    const url = entry.processedPhotoUrl ?? null;
    const hasError = Boolean(entry.processingPhotoError);
    return (
      <div className="flex flex-col gap-0.5">
        {url ? (
          <img
            src={url}
            alt=""
            className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
            N/A
          </div>
        )}
        {hasError && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium" title={entry.processingPhotoError ?? undefined}>
            Will not be uploaded
          </span>
        )}
      </div>
    );
  }
  return null;
}

const SUB_STATUS_LABELS: Record<string, string> = {
  raw: "Original",
  photo: "Watermarked",
};

function SubStatusBadge({ type, status }: { type: string; status: UploadSubStatus }) {
  const label = SUB_STATUS_LABELS[type] ?? type;
  const isPending = status === "pending" || status === undefined;
  const isUploading = status === "uploading";
  const isSuccess = status === "success";
  const isError = status === "error";
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-medium">
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      {isPending && <span className="text-gray-400 dark:text-gray-500">Pending</span>}
      {isUploading && (
        <span className="text-amber-600 dark:text-amber-400">
          <HiRefresh className="w-3 h-3 animate-spin inline" />
        </span>
      )}
      {isSuccess && <HiCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
      {isError && <HiX className="w-3 h-3 text-red-600 dark:text-red-400" />}
    </span>
  );
}

interface UploadStatusListProps {
  entries: UploadEntry[];
  statuses: Record<string, UploadStatusState>;
  imageVariant?: UploadModalImageTab;
  validationResults?: Record<string, ImageValidationResult> | null;
}

export default function UploadStatusList({ entries, statuses, imageVariant, validationResults }: UploadStatusListProps) {
  return (
    <ul className="space-y-1.5 flex-1 min-h-0 overflow-y-auto p-1.5">
      {entries.map((e) => {
        const state = statuses[e.item.id] ?? { status: "pending" as const };
        const validation = validationResults?.[e.item.id];
        const { status, message, uploadedSize, rawStatus, photoStatus, listingStatus } = state;
        const { label, color } = getStatusDisplay(status, message);
        // Use variant-specific size: watermarked/thumbnail show only their actual size; if unavailable show nothing
        const sizeBytes =
          imageVariant === "photo"
            ? e.processedPhotoSize ?? undefined
            : uploadedSize ?? e.fileSize;
        const sizeStr = sizeBytes != null ? formatBytes(sizeBytes) : null;
        const isPending = status === "pending";
        const isConverting = status === "converting";
        const isUploading = status === "uploading";
        const isSuccess = status === "success";
        const isError = status === "error";
        return (
          <li
            key={e.item.id}
            className="flex flex-col gap-2 text-sm py-2.5 px-3 rounded-lg bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              {imageVariant != null && (
                <div className="shrink-0">
                  <EntryImagePreview entry={e} variant={imageVariant} />
                </div>
              )}
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <span
                  className="truncate text-gray-700 dark:text-gray-300 font-mono text-xs"
                  title={e.item.fileName || e.item.id}
                >
                  {e.item.fileName || e.item.id}
                </span>
                {sizeStr != null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isSuccess && uploadedSize != null ? `Uploaded ${sizeStr}` : `Size: ${sizeStr}`}
                  </span>
                )}
              </div>
              <span className="shrink-0">
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {sizeStr != null ? `${sizeStr} · Pending` : validation != null ? "Ready" : "Validating…"}
                  </span>
                )}
                {isConverting && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <HiRefresh className="w-3.5 h-3.5 animate-spin" />
                    {label}
                  </span>
                )}
                {isUploading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <HiRefresh className="w-3.5 h-3.5 animate-spin" />
                    Uploading (original, watermarked)
                  </span>
                )}
                {isSuccess && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <HiCheck className="w-3.5 h-3.5" />
                    {sizeStr != null ? `Uploaded ${sizeStr}` : "Done"}
                  </span>
                )}
                {isError && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 ${color}`}
                    title={message}
                  >
                    <HiX className="w-3.5 h-3.5" />
                    Failed
                  </span>
                )}
              </span>
            </div>
            {isError && message && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5" title={message}>
                {message}
              </p>
            )}
            {validation != null && (isPending || isSuccess || isError) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(validation.checks).map(([key, { ok, message: msg }]) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      ok
                        ? "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }`}
                    title={msg}
                  >
                    {ok ? <HiCheck className="w-3 h-3" /> : <HiX className="w-3 h-3" />}
                    {key === "format" ? "Format" : key === "fileSize" ? "Size" : key === "orientation" ? "Orientation" : key === "resolution" ? "Resolution" : "Aspect"}
                  </span>
                ))}
                {validation.warnings.map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  >
                    ⚠ {w}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <SubStatusBadge type="raw" status={rawStatus ?? "pending"} />
              <SubStatusBadge type="photo" status={photoStatus ?? "pending"} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
