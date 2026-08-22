"use client";

import type { GalleryData } from "@/utils/types";
import type { DisplayUrlFn } from "./constants";
import CoverCard from "./CoverCard";

interface CoverCardsViewProps {
  /** Cover slots 1..5 (null = empty slot). */
  slots: (GalleryData | null)[];
  displayUrl: DisplayUrlFn;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
  onDeselectCoverSlot: (slotIndex: number) => void;
}

export default function CoverCardsView({
  slots,
  displayUrl,
  onEdit,
  onFullscreen,
  onDeselectCoverSlot,
}: CoverCardsViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((item, index) => (
        <CoverCard
          key={item?.id ?? `cover-slot-${index}`}
          item={item}
          slotIndex={index}
          displayUrl={displayUrl}
          onEdit={onEdit}
          onFullscreen={onFullscreen}
          onDeselect={() => onDeselectCoverSlot(index)}
        />
      ))}
    </div>
  );
}
