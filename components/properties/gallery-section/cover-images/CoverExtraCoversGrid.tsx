"use client";

import type { GalleryData } from "@/utils/types";
import { getCoverSlotLabel } from "./constants";
import type { DisplayUrlFn } from "./constants";
import CoverImageActionButtons from "./CoverImageActionButtons";
import CoverImagePlaceholder from "./CoverImagePlaceholder";
import CoverBlurhashPlaceholder from "./CoverBlurhashPlaceholder";

interface CoverExtraCoversGridProps {
  extraCovers: GalleryData[];
  displayUrl: DisplayUrlFn;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
}

export default function CoverExtraCoversGrid({
  extraCovers,
  displayUrl,
  onEdit,
  onFullscreen,
}: CoverExtraCoversGridProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        These are the extra cover images (not shown in the website hero; they appear in the gallery).
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {extraCovers.map((item) => {
          const url = displayUrl(item);
          return (
            <div key={item.id} className="group/extra relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 ring-1 ring-gray-200/80 dark:ring-gray-600/50">
              {item.blurHash && <CoverBlurhashPlaceholder blurHash={item.blurHash} />}
              {url ? (
                <img src={url} alt={item.altText || item.fileName || "Extra cover"} className="absolute inset-0 w-full h-full object-cover z-[1]" />
              ) : !item.blurHash ? (
                <CoverImagePlaceholder />
              ) : null}
              <span className="absolute top-2 left-2 rounded bg-gray-800/80 px-2 py-0.5 text-xs font-medium text-white">
                {getCoverSlotLabel(item.sortOrder ?? null)}
              </span>
              <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover/extra:opacity-100 transition-opacity">
                <CoverImageActionButtons item={item} onEdit={onEdit} onFullscreen={onFullscreen} size="compact" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
