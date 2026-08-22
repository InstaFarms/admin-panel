"use client";

import { Button } from "flowbite-react";
import { HiCheck, HiPhotograph, HiTrash, HiSparkles } from "react-icons/hi";
import type { GalleryImageViewMode } from "@/hooks/properties/usePropertyGallery";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import { useEffect, useRef } from "react";

interface CategoryTabToolbarProps {
  imageViewMode: GalleryImageViewMode;
  setImageViewMode: (mode: GalleryImageViewMode) => void;
  onDeleteAll: () => void;
  showDeleteAll: boolean;
  /** When true, disables the Delete All button (e.g. during API call). */
  deleting?: boolean;
  /** Number of cards selected for convert-to-watermark. When > 0, Convert button is shown. */
  selectedCount?: number;
  /** Convert selected images to watermark. */
  onConvertSelected?: () => void;
  /** When true, conversion is in progress; disables Convert button. */
  converting?: boolean;
  /** Bulk create watermarked images for all photos missing watermarks. */
  onBulkCreateWatermarks?: () => void;
  /** Force-regenerate watermarked images for ALL photos (even those that already have one). */
  onBulkRegenWatermarks?: () => void;
  /** When true, bulk creation is in progress; disables bulk button. */
  bulkCreating?: boolean;
  /** Show Update in database button when there are unsaved gallery edits. */
  showUpdateInDb?: boolean;
  /** Persist gallery edits (name, altText, category, order) to database. */
  onUpdateInDatabase?: () => void;
  /** When true, update is in progress; disables Update button. */
  updatingDb?: boolean;
  /** Controls bulk watermark button label ("instafarms" → Instafarms, "mago" → Mago). */
  brandScope?: BrandAdminScope;
}

const VIEW_OPTIONS: { mode: GalleryImageViewMode; label: string }[] = [
  { mode: "original", label: "Original images" },
  { mode: "watermarked", label: "Watermarked images" },
];

const BRAND_LABEL: Record<BrandAdminScope, string> = {
  instafarms: "Instafarms",
  mago: "Mago",
};

export default function CategoryTabToolbar({
  imageViewMode,
  setImageViewMode,
  onDeleteAll,
  showDeleteAll,
  deleting = false,
  selectedCount = 0,
  onConvertSelected,
  converting = false,
  onBulkCreateWatermarks,
  onBulkRegenWatermarks,
  bulkCreating = false,
  showUpdateInDb = false,
  onUpdateInDatabase,
  updatingDb = false,
  brandScope = "instafarms",
}: CategoryTabToolbarProps) {
  const brandLabel = BRAND_LABEL[brandScope];
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const toolbar = toolbarRef.current;
    if (!sentinel || !toolbar) return;
    const observer = new IntersectionObserver(
      ([entry]) => { toolbar.dataset.stuck = entry.isIntersecting ? "false" : "true"; },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <div ref={sentinelRef} className="h-px" />
    <div
      ref={toolbarRef}
      className="sticky top-7 z-20 flex items-center justify-between gap-3 px-1 py-2 border-b border-gray-200 dark:border-gray-700 dark:data-[stuck=true]:bg-zinc-900 dark:data-[stuck=false]:bg-transparent transition-colors duration-150 shrink-0 flex-wrap">
      <div className="flex items-center gap-1 flex-wrap">
        {VIEW_OPTIONS.map(({ mode, label }) => {
          const isSelected = imageViewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setImageViewMode(mode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSelected
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {isSelected && (
                <HiCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {showUpdateInDb && onUpdateInDatabase && (
          <Button
            size="xs"
            color="success"
            onClick={onUpdateInDatabase}
            disabled={updatingDb}
            className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
            title="Save gallery edits (name, alt text, category, order) to database"
          >
            {updatingDb ? "Updating…" : "Update in database"}
          </Button>
        )}
        {onBulkCreateWatermarks && (
          <Button
            size="xs"
            color="success"
            onClick={onBulkCreateWatermarks}
            disabled={bulkCreating || converting}
            className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
            title={`Create ${brandLabel} watermarked images for all photos missing watermarks`}
          >
            <HiSparkles className="w-4 h-4 mr-1.5" />
            {bulkCreating ? "Creating…" : `Create ${brandLabel} watermarked images`}
          </Button>
        )}
        {onBulkRegenWatermarks && (
          <Button
            size="xs"
            color="gray"
            onClick={onBulkRegenWatermarks}
            disabled={bulkCreating || converting}
            title={`Force-regenerate ${brandLabel} watermarked images for ALL photos (replaces existing)`}
          >
            <HiSparkles className="w-4 h-4 mr-1.5" />
            {bulkCreating ? "Creating…" : `Regenerate all ${brandLabel} watermarks`}
          </Button>
        )}
        {selectedCount > 0 && onConvertSelected && (
          <Button
            size="xs"
            color="success"
            onClick={onConvertSelected}
            disabled={converting}
            className="bg-emerald-600! hover:bg-emerald-700! focus:ring-emerald-500!"
            title="Convert selected to watermark"
          >
            <HiPhotograph className="w-4 h-4 mr-1.5" />
            {converting ? "Converting…" : `Convert (${selectedCount})`}
          </Button>
        )}
        {showDeleteAll && (
          <Button
            size="xs"
            color="failure"
            onClick={onDeleteAll}
            disabled={deleting}
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
            title="Delete all images in this category"
          >
            <HiTrash className="w-4 h-4 mr-1.5" />
            Delete all
          </Button>
        )}
      </div>
    </div>
    </>
  );
}
