"use client";

import type { GalleryData } from "@/utils/types";
import { getCoverSlotLabel } from "./constants";
import type { DisplayUrlFn } from "./constants";
import CoverImagePlaceholder from "./CoverImagePlaceholder";
import CoverImageActionButtons from "./CoverImageActionButtons";
import CoverBlurhashPlaceholder from "./CoverBlurhashPlaceholder";

interface CoverCardProps {
  item: GalleryData | null;
  /** 0-based slot index (0..4). */
  slotIndex: number;
  displayUrl: DisplayUrlFn;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
  onDeselect: () => void;
}

export default function CoverCard({
  item,
  slotIndex,
  displayUrl,
  onEdit,
  onFullscreen,
  onDeselect,
}: CoverCardProps) {
  const url = item ? displayUrl(item) : "";
  const slotLabel = getCoverSlotLabel(slotIndex + 1);

  return (
    <article className="group relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg ring-1 ring-gray-200/80 dark:ring-gray-600/50 hover:ring-emerald-400/60 dark:hover:ring-emerald-500/50 hover:shadow-xl transition-all duration-300">
      <div className="aspect-[4/3] relative bg-gray-200 dark:bg-gray-700">
        {item?.blurHash && <CoverBlurhashPlaceholder blurHash={item.blurHash} />}
        {url ? (
          <img
            src={url}
            alt={item?.altText || item?.fileName || "Cover image"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : !item?.blurHash ? (
          <CoverImagePlaceholder iconSize="w-16 h-16" />
        ) : null}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
            {slotLabel}
          </span>
        </div>
        {slotIndex === 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-lg bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
              Primary
            </span>
          </div>
        )}
        {item && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CoverImageActionButtons
              item={item}
              onEdit={onEdit}
              onFullscreen={onFullscreen}
              size="compact"
            />
          </div>
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {item?.key || "Cover"}
          </p>
          <p
            className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
            title={item?.altText || item?.fileName || ""}
          >
            {item?.altText || item?.fileName || "Empty slot"}
          </p>
        </div>
        {item ? (
          <button
            type="button"
            onClick={onDeselect}
            className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            Deselect cover image
          </button>
        ) : null}
      </div>
    </article>
  );
}
