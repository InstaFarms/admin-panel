"use client";

import { useState, useEffect, useRef } from "react";
import { HiArrowsExpand } from "react-icons/hi";
import { Label, Select, TextInput } from "flowbite-react";
import type { GalleryData } from "@/utils/types";
import { HiCheck, HiX } from "react-icons/hi";
import type { UploadEntry, ImageValidationResult } from "./types";
import FullSizeImageModal from "../FullSizeImageModal";
import {
  splitFileName,
  formatImageFormat,
  formatFileSize,
  aspectRatioLabel,
} from "../cardUtils";
import { CATEGORY_OPTIONS } from "../constants";

export type PreviewTabIndex = 0 | 1; // rawURL | PhotoURL (thumbnail tab removed; conversion logic kept for future use)

export interface EntryPreviewCardProps {
  entry: UploadEntry;
  activeTab: PreviewTabIndex;
  validationResult?: ImageValidationResult | null;
  onUpdate: (id: string, updates: Partial<GalleryData>) => void;
  onRemove: (id: string) => void;
}

export default function EntryPreviewCard({
  entry,
  activeTab,
  validationResult,
  onUpdate,
  onRemove,
}: EntryPreviewCardProps) {
  const [fullSizeOpen, setFullSizeOpen] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const displayedImgRef = useRef<HTMLImageElement | null>(null);
  const item = entry.item;
  const rawUrl = entry.objectUrl;
  const photoUrl = entry.processedPhotoUrl ?? null;
  const loadingPhoto = entry.processingPhoto === true;
  const photoError = entry.processingPhotoError ?? null;
  const fullName = item.fileName ?? item.caption ?? item.altText ?? "";
  const { base: nameBase, extension: fileExtension } = splitFileName(fullName);

  // When watermark failed, show nothing (no fallback to raw); card always shown.
  const currentSrc =
    activeTab === 0
      ? rawUrl
      : loadingPhoto
        ? null
        : photoError
          ? null
          : photoUrl ?? rawUrl;
  const showFullScreenButton = Boolean(currentSrc);

  useEffect(() => {
    setDimensions(null);
    if (!currentSrc) return;
    const checkCached = () => {
      const el = displayedImgRef.current;
      if (el && el.complete && el.naturalWidth > 0) {
        setDimensions({ width: el.naturalWidth, height: el.naturalHeight });
      }
    };
    const id = setTimeout(checkCached, 0);
    return () => clearTimeout(id);
  }, [currentSrc]);

  const onDisplayedImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const setDisplayedImgRef = (el: HTMLImageElement | null) => {
    displayedImgRef.current = el;
  };

  const formatLabel =
    activeTab === 0
      ? (entry.rawFormat ?? formatImageFormat(fileExtension))
      : "JPG";
  const sizeParts: string[] = [];
  if (dimensions) sizeParts.push(`${dimensions.width}×${dimensions.height}`);
  if (activeTab === 0 && entry.fileSize != null) sizeParts.push(formatFileSize(entry.fileSize));
  // Watermarked and thumbnail: show only actual size when available; otherwise show nothing
  if (activeTab === 1 && entry.processedPhotoSize != null) sizeParts.push(formatFileSize(entry.processedPhotoSize));
  const sizeLabel = sizeParts.length ? sizeParts.join(" • ") : null;
  const aspectRatioLabelText = dimensions ? aspectRatioLabel(dimensions.width, dimensions.height) : "—";

  const emptyPlaceholder = (errorText?: string | null) => (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 p-3 text-center">
      <span className="text-sm">—</span>
      {errorText && (
        <span className="text-xs text-red-500 dark:text-red-400 max-w-full break-words" title={errorText}>
          {errorText}
        </span>
      )}
    </div>
  );

  const loadingSpinner = (label: string) => (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );

  const imageOrPlaceholder = (url: string | null, errorText?: string | null) =>
    url ? (
      <img
        ref={setDisplayedImgRef}
        src={url}
        alt={item.altText ?? ""}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-contain p-1"
        onLoad={onDisplayedImageLoad}
      />
    ) : (
      emptyPlaceholder(errorText)
    );

  const renderImageBlock = () => {
    if (activeTab === 0) return imageOrPlaceholder(rawUrl ?? null);
    if (activeTab === 1) {
      if (loadingPhoto) return loadingSpinner("Processing watermark…");
      if (photoError) return emptyPlaceholder(photoError);
      return imageOrPlaceholder(photoUrl ?? rawUrl ?? null);
    }
    return null;
  };

  return (
    <article className="relative w-full shrink-0 rounded-r-xl overflow-hidden bg-white dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-600/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row">
      <div className="relative w-full sm:w-80 shrink-0 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center min-h-[220px] sm:min-h-0 aspect-[4/3] sm:aspect-auto group">
        {renderImageBlock()}
        {showFullScreenButton && (
          <button
            type="button"
            onClick={() => setFullSizeOpen(true)}
            className="absolute bottom-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200/80 dark:border-gray-600/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 opacity-90 hover:opacity-100"
            title="View full screen"
          >
            <HiArrowsExpand className="w-4 h-4 shrink-0" />
          </button>
        )}
      </div>

      {fullSizeOpen && currentSrc && (
        <FullSizeImageModal
          src={currentSrc}
          alt={item.altText ?? ""}
          onClose={() => setFullSizeOpen(false)}
        />
      )}

      <div className="relative flex-1 flex flex-col gap-4 p-5 sm:p-6 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-900/50 bg-white dark:bg-gray-900/50 min-w-0 [&_input]:dark:!bg-gray-600 [&_input]:dark:!text-white [&_input]:dark:!border-gray-500 [&_select]:dark:!bg-gray-600 [&_select]:dark:!text-white [&_select]:dark:!border-gray-500">
        <div className="space-y-1">
          <Label htmlFor={`name-${item.id}`} className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
            Name
          </Label>
          <div className="flex items-stretch gap-2">
            <TextInput
              id={`name-${item.id}`}
              value={nameBase}
              onChange={(e) =>
                onUpdate(item.id, {
                  fileName: e.target.value.trim() ? e.target.value + fileExtension : fileExtension,
                })
              }
              className="flex-1 min-w-0 text-sm"
              placeholder="Image name"
            />
            {fileExtension && (
              <span className="inline-flex items-center px-3 rounded-lg border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
                {fileExtension}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`alt-${item.id}`} className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
            Alt text
          </Label>
          <TextInput
            id={`alt-${item.id}`}
            value={item.altText ?? ""}
            onChange={(e) => onUpdate(item.id, { altText: e.target.value })}
            className="w-full text-sm"
            placeholder="Describe for accessibility"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`category-${item.id}`} className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
            Category
          </Label>
          <Select
            id={`category-${item.id}`}
            value={item.key ?? ""}
            onChange={(e) => onUpdate(item.id, { key: e.target.value })}
            className="w-full text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="pt-2 mt-auto">
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-xs text-red-600 dark:text-red-400 hover:underline"
            title="Remove from list"
          >
            Remove from list
          </button>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/90 dark:border-gray-600/90 bg-white/90 dark:bg-gray-800/90 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm">
        {validationResult != null && (
            <>
            {validationResult.uploadable ? (
              (() => {
                const hasIssues = Object.values(validationResult.checks).some((c) => !c.ok);
                return hasIssues ? (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" title="Image has issues but can still be uploaded">
                    <HiCheck className="w-3 h-3 shrink-0" />
                    Has issues
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <HiCheck className="w-3 h-3 shrink-0" />
                    Ready
                  </span>
                );
              })()
            ) : (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" title="Could not load image — upload will likely fail">
                <HiX className="w-3 h-3 shrink-0" />
                Invalid
              </span>
            )}
            {Object.entries(validationResult.checks).map(([key, { ok, message }]) => {
              const label =
                key === "format"
                  ? "Format"
                  : key === "fileSize"
                    ? "Size"
                    : key === "orientation"
                      ? "Orient"
                      : key === "resolution"
                        ? "Res"
                        : "4:3";
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ok
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  }`}
                  title={message}
                >
                  {ok ? <HiCheck className="w-3 h-3 shrink-0" /> : <HiX className="w-3 h-3 shrink-0" />}
                  {label}
                </span>
              );
            })}
            <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden />
          </>
        )}
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Format</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{formatLabel}</span>
        </span>
        {sizeLabel != null && (
          <>
            <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden />
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Size</span>
              <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{sizeLabel}</span>
            </span>
          </>
        )}
        <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden />
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Ratio</span>
          <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{aspectRatioLabelText}</span>
        </span>
      </div>
    </article>
  );
}
