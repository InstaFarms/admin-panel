"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HiDotsVertical } from "react-icons/hi";
import type { GalleryData } from "@/utils/types";
import type { GalleryImageViewMode } from "@/hooks/properties/usePropertyGallery";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import GalleryImageCard from "../GalleryImageCard";

interface SortableGalleryCardProps {
  item: GalleryData;
  displayOrder: number;
  isHighlighted: boolean;
  scrollTargetRef: (el: HTMLDivElement | null) => void;
  onUpdateItem: (id: string, updates: Partial<GalleryData>) => void;
  onRemoveFromList: (id: string) => void;
  /** When true, the remove button is disabled (e.g. during API delete). */
  removing?: boolean;
  imageViewMode: GalleryImageViewMode;
  brandScope?: BrandAdminScope;
  /** Current cover slot (1..5) for this photo. */
  currentCoverSlot: number | null;
  /** Assign/remove photoId to cover slot (1..5). null removes. */
  onSetCoverSlotForPhoto: (photoId: string, slot1to5: number | null) => void;
  /** When true, card is selected for convert-to-watermark. */
  selected?: boolean;
  /** Toggle selection for convert-to-watermark. */
  onToggleSelect?: (id: string) => void;
}

export default function SortableGalleryCard({
  item,
  displayOrder,
  isHighlighted,
  scrollTargetRef,
  onUpdateItem,
  onRemoveFromList,
  removing = false,
  imageViewMode,
  brandScope,
  currentCoverSlot,
  onSetCoverSlotForPhoto,
  selected = false,
  onToggleSelect,
}: SortableGalleryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`shrink-0 flex rounded-xl overflow-hidden transition-shadow duration-200 ${
        isDragging ? "opacity-90 z-50 shadow-2xl ring-2 ring-emerald-500/50 scale-[1.02]" : ""
      } ${isHighlighted ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900 shadow-lg shadow-emerald-500/20" : ""} ${selected ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex w-10 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center bg-gray-100/80 dark:bg-gray-700/50 touch-none hover:bg-gray-200/80 dark:hover:bg-blue-700/50 transition-colors"
        title="Drag to reorder"
      >
        <HiDotsVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>
      <div ref={scrollTargetRef} className="flex-1 min-w-0">
        <GalleryImageCard
          item={item}
          onUpdate={onUpdateItem}
          onRemove={onRemoveFromList}
          removing={removing}
          imageViewMode={imageViewMode}
          brandScope={brandScope}
          displayOrder={displayOrder}
          currentCoverSlot={currentCoverSlot}
          onSetCoverSlotForPhoto={onSetCoverSlotForPhoto}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  );
}
