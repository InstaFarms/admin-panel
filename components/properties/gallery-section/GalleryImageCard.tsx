"use client";

import { useState, useEffect, useRef } from "react";
import { HiArrowsExpand } from "react-icons/hi";
import { GalleryData } from "@/utils/types";
import type { GalleryImageViewMode } from "@/hooks/properties/usePropertyGallery";
import { Label, Select, TextInput } from "flowbite-react";
import FullSizeImageModal from "./FullSizeImageModal";
import CoverBlurhashPlaceholder from "./cover-images/CoverBlurhashPlaceholder";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import {
  splitFileName,
  formatImageFormat,
  extensionFromUrl,
  formatFileSize,
  aspectRatioLabel,
  is4x3AspectRatio,
} from "./cardUtils";
import { CATEGORY_OPTIONS } from "./constants";
import { normalizeKeyToTabKey } from "@/hooks/properties/usePropertyGallery";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import { resolveImageSrc } from "@/utils/image";

export interface GalleryImageCardProps {
  item: GalleryData;
  onUpdate: (id: string, updates: Partial<GalleryData>) => void;
  onRemove: (id: string) => void;
  /** When true, the remove button is disabled (e.g. during API delete). */
  removing?: boolean;
  /** Which image variant to show: original or watermarked. */
  imageViewMode: GalleryImageViewMode;
  brandScope?: BrandAdminScope;
  /** Display order (1-based position in list). When provided, shown instead of item.sortOrder for consistent 1,2,3,... */
  displayOrder?: number;
  /** Current cover slot (1..5) for this image, or null for none. */
  currentCoverSlot: number | null;
  /** Assign/remove this image to a cover slot (1..5). null removes. */
  onSetCoverSlotForPhoto: (photoId: string, slot1to5: number | null) => void;
  /** When true, card is selected for convert-to-watermark. */
  selected?: boolean;
  /** Toggle selection for convert-to-watermark. */
  onToggleSelect?: (id: string) => void;
}

function getWatermarkedUrl(item: GalleryData, brandScope?: BrandAdminScope): string | null | undefined {
  if (brandScope === "mago") return item.watermarkedUrlByMago;
  return item.watermarkedUrlByInstafarms;
}

function getImageSrcForMode(item: GalleryData, mode: GalleryImageViewMode, brandScope?: BrandAdminScope): string {
  const raw = mode === "watermarked" ? getWatermarkedUrl(item, brandScope) : item.originalUrl;
  return resolveImageSrc(raw) ?? "";
}

export default function GalleryImageCard({
  item,
  onUpdate,
  onRemove,
  removing = false,
  imageViewMode,
  brandScope,
  displayOrder,
  currentCoverSlot,
  onSetCoverSlotForPhoto,
  selected = false,
  onToggleSelect,
}: GalleryImageCardProps) {
  const [error, setError] = useState(false);
  const [fullSizeOpen, setFullSizeOpen] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [pendingCoverSlot, setPendingCoverSlot] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const src = getImageSrcForMode(item, imageViewMode, brandScope);
  const showImg = src && !error;
  const fullName = item.fileName ?? item.caption ?? item.altText ?? "";
  const { base: nameBase, extension: fileExtension } = splitFileName(fullName);

  // Format: item.format > filename extension > URL path extension (so JPG/PNG/WEBP always show when known)
  const formatFromFile = formatImageFormat(fileExtension);
  const formatFromUrl = src ? formatImageFormat(extensionFromUrl(src)) : "—";
  const formatLabel = item.format ?? (formatFromFile !== "—" ? formatFromFile : formatFromUrl);

  useEffect(() => {
    setDimensions(null);
    if (!showImg || !src) return;
    const checkCached = () => {
      const el = imgRef.current;
      if (el?.complete && el.naturalWidth > 0) {
        setDimensions({ width: el.naturalWidth, height: el.naturalHeight });
      }
    };
    const id = setTimeout(checkCached, 0);
    return () => clearTimeout(id);
  }, [src, showImg]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const sizeParts: string[] = [];
  const w = dimensions?.width ?? item.width;
  const h = dimensions?.height ?? item.height;
  if (w != null && h != null) sizeParts.push(`${w}×${h}`);
  if (item.fileSize != null) {
    sizeParts.push(formatFileSize(item.fileSize));
  }
  const sizeLabel = sizeParts.length ? sizeParts.join(" • ") : "—";
  const aspectRatioLabelText =
    w != null && h != null
      ? aspectRatioLabel(w, h)
      : item.aspectRatio != null
        ? `${Number(item.aspectRatio).toFixed(2)}:1`
        : "—";

  return (
    <article className="relative w-full px-5 shrink-0 rounded-r-xl overflow-hidden bg-white dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-600/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row">
      <span
        className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-gray-800/80 dark:bg-green-900/90 text-green-200 text-xs font-mono shadow-sm max-w-[calc(100%-1rem)] break-all"
        title={item.id}
      >
        ImageId : {item.id}
      </span>
      <div className="relative w-full sm:w-80 shrink-0 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center min-h-[220px] sm:min-h-0 aspect-[4/3] sm:aspect-auto group">
        {item.blurHash && <CoverBlurhashPlaceholder blurHash={item.blurHash} />}
        {onToggleSelect && (
          <div
            className="absolute top-2 left-2 z-10 flex items-center justify-center p-1 rounded-md bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200/80 dark:border-gray-600/80 cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            title={selected ? "Deselect" : "Select for conversion"}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
          </div>
        )}
        {showImg ? (
          <>
            <img
              ref={imgRef}
              src={src}
              alt={item.altText ?? ""}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain p-1 z-[1]"
              onLoad={onImgLoad}
              onError={() => setError(true)}
            />
            <button
              type="button"
              onClick={() => setFullSizeOpen(true)}
              className="absolute bottom-2 right-2 z-[2] flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200/80 dark:border-gray-600/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 opacity-90 hover:opacity-100"
              title="View full screen"
            >
              <HiArrowsExpand className="w-4 h-4 shrink-0" />
            </button>
          </>
        ) : (
          <div className="relative z-[1] flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
            <span className="text-sm font-medium">
              {imageViewMode === "watermarked" ? "No watermarked image" : "No image"}
            </span>
          </div>
        )}
        {currentCoverSlot != null && currentCoverSlot >= 1 && currentCoverSlot <= 5 && (
          <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-md font-semibold uppercase tracking-wide shadow-sm">
            Cover {currentCoverSlot}
          </span>
        )}
      </div>

      {fullSizeOpen && showImg && (
        <FullSizeImageModal src={src} alt={item.altText ?? ""} onClose={() => setFullSizeOpen(false)} />
      )}

      <ConfirmModal
        showModal={pendingCoverSlot != null}
        title="Not a 4:3 aspect ratio"
        confirmationText={
          <>
            This image is not 4:3 aspect ratio ({aspectRatioLabelText}), which is preferred for covers. Use it as
            cover anyway?
          </>
        }
        tone="warning"
        confirmLabel="Use as cover"
        cancelLabel="Cancel"
        acceptCallback={() => {
          if (pendingCoverSlot != null) {
            onSetCoverSlotForPhoto(item.id, pendingCoverSlot);
          }
          setPendingCoverSlot(null);
        }}
        closeCallback={() => setPendingCoverSlot(null)}
      />

      <div className="relative flex-1 flex flex-col gap-4 p-5 sm:p-6 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-900/50 bg-white dark:bg-gray-900/50 min-w-0 [&_input]:dark:!bg-gray-600 [&_input]:dark:!text-white [&_input]:dark:!border-gray-500 [&_select]:dark:!bg-gray-600 [&_select]:dark:!text-white [&_select]:dark:!border-gray-500">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px] space-y-1">
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
                <span
                  className="inline-flex items-center px-3 rounded-lg border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0"
                  title="File type"
                >
                  {fileExtension}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-[140px] space-y-1">
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
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label htmlFor={`category-${item.id}`} className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
              Category
            </Label>
            <Select
              id={`category-${item.id}`}
              value={normalizeKeyToTabKey(item.key ?? "")}
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
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label htmlFor={`coverSlot-${item.id}`} className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
              Cover slot
            </Label>
            <Select
              id={`coverSlot-${item.id}`}
              value={currentCoverSlot ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v) || v <= 0) {
                  onSetCoverSlotForPhoto(item.id, null);
                  return;
                }
                const slot = Math.min(5, Math.max(1, v));
                if (w == null || h == null) {
                  toast.error("Cannot set as cover: image dimensions unknown.");
                  return;
                }
                if (w <= h) {
                  toast.error("Only horizontal (landscape) images can be set as cover.");
                  return;
                }
                if (!is4x3AspectRatio(w, h)) {
                  setPendingCoverSlot(slot);
                  return;
                }
                onSetCoverSlotForPhoto(item.id, slot);
              }}
              className="w-full text-sm"
            >
              <option value={0}>None</option>
              <option value={1}>Cover 1 (Primary)</option>
              <option value={2}>Cover 2</option>
              <option value={3}>Cover 3</option>
              <option value={4}>Cover 4</option>
              <option value={5}>Cover 5</option>
            </Select>
          </div>
        </div>
        {(displayOrder != null || item.sortOrder != null) && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order</span>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-md bg-gray-200 dark:bg-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200">
              {displayOrder ?? item.sortOrder ?? "—"}
            </span>
          </div>
        )}
        <div className="pt-2 mt-auto">
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={removing}
            className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            title="Remove from list"
          >
            {removing ? "Removing…" : "Remove from list"}
          </button>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/90 dark:border-gray-600/90 bg-white/90 dark:bg-gray-800/90 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm">
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Format</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{formatLabel}</span>
        </span>
        <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden />
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Size</span>
          <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{sizeLabel}</span>
        </span>
        <span className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden />
        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Ratio</span>
          <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-200">{aspectRatioLabelText}</span>
        </span>
      </div>
    </article>
  );
}
