"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "flowbite-react";
import toast from "react-hot-toast";
import {
  BRAND_ADMIN_APP_TYPE,
  type BrandAdminScope,
  parseBrandAdminScope,
} from "@/constants/brandAdminScope";
import type { GalleryData } from "@/utils/types";
import type { GalleryImageViewMode } from "@/hooks/properties/usePropertyGallery";
import {
  updatePropertyCoverPhotos,
  fetchAllCoverPhotosNeedsConversion,
  fetchPropertyCoverPhotos,
  type CoverPhotoNeedsConversion,
} from "@/actions/propertyActions";
import { convertSingleCoverImage } from "@/actions/imageActions";
import FullSizeImageModal from "./FullSizeImageModal";
import BulkCoverConvertModal, {
  type BulkCoverConvertImageItem,
  type BulkCoverConvertPropertyItem,
} from "./BulkCoverConvertModal";
import {
  PREVIEW_WIDTH_MIN,
  PREVIEW_WIDTH_MAX,
  PRESET_WIDTHS,
  getSimulatedViewport,
  type SimulatedViewport,
  type DisplayUrlFn,
  CoverImagesLoadingState,
  CoverImagesEmptyState,
  CoverPreviewToggle,
  CoverResizeHandle,
  CoverWebsitePreviewView,
  CoverCardsView,
} from "./cover-images";

export type { SimulatedViewport } from "./cover-images";

import { resolveImageSrc } from "@/utils/image";

function getWatermarkedUrl(item: GalleryData, brandScope: BrandAdminScope): string | null | undefined {
  if (brandScope === "mago") return item.watermarkedUrlByMago || item.listingUrl;
  return item.watermarkedUrlByInstafarms || item.photoUrl;
}

function getImageSrcForMode(item: GalleryData, mode: GalleryImageViewMode, brandScope: BrandAdminScope = "instafarms"): string {
  // Cover photos from coverPhotos: prefer gridUrl || thumbnailUrl
  const coverUrl = item.gridUrl || item.thumbnailUrl;
  if (coverUrl) return resolveImageSrc(coverUrl) ?? "";

  if (mode === "original") {
    const raw = item.rawUrl || item.originalUrl || item.photoUrl || item.listingUrl;
    return resolveImageSrc(raw) ?? "";
  }
  const raw = getWatermarkedUrl(item, brandScope) || item.rawUrl || item.originalUrl || item.listingUrl;
  return resolveImageSrc(raw) ?? "";
}

const MAGO_REBUILD_FETCH_LIMIT = 100000;

function upsertPropertyRunItem(
  list: BulkCoverConvertPropertyItem[],
  incoming: BulkCoverConvertPropertyItem,
): BulkCoverConvertPropertyItem[] {
  const existingIndex = list.findIndex((item) => item.propertyId === incoming.propertyId && item.brand === incoming.brand);
  if (existingIndex === -1) return [...list, incoming];
  const next = [...list];
  next[existingIndex] = {
    ...next[existingIndex],
    ...incoming,
  };
  return next;
}

function padToFive<T>(arr: (T | null)[] | T[]): (T | null)[] {
  const next: (T | null)[] = [...arr].slice(0, 5) as (T | null)[];
  while (next.length < 5) next.push(null);
  return next;
}

function downloadBulkLog(
  items: BulkCoverConvertPropertyItem[],
  brandLabel: string,
  totalConverted: number,
  stoppedByUser: boolean,
) {
  if (!items.length) return;

  const now = new Date();
  const dateStr = now.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const totalCovers = items.reduce((s, i) => s + i.totalCovers, 0);
  const doneCount = items.filter((i) => i.status === "Done").length;
  const failedCount = items.filter((i) => i.status === "Failed").length;
  const skippedCount = items.filter((i) => i.status === "Queued").length;
  const runStatus = stoppedByUser ? "Stopped by user" : "Completed";

  const LINE = "=".repeat(72);
  const line = "-".repeat(72);

  const header = [
    LINE,
    `  COVER IMAGE CONVERSION LOG`,
    `  Brand      : ${brandLabel}`,
    `  Date       : ${dateStr}`,
    `  Run Status : ${runStatus}`,
    LINE,
    `  Properties : ${doneCount + failedCount} processed / ${items.length} discovered`,
    `  Covers     : ${totalConverted} converted / ${totalCovers} total`,
    `  Done       : ${doneCount}   |   Failed : ${failedCount}   |   Not Reached : ${skippedCount}`,
    LINE,
  ].join("\n");

  const statusOrder: Record<BulkCoverConvertPropertyStatus, number> = {
    Failed: 0, Done: 1, Saving: 2, Converting: 3, Queued: 4,
  };
  const sorted = [...items].sort((a, b) => {
    const od = statusOrder[a.status] - statusOrder[b.status];
    return od !== 0 ? od : (a.propertyName || "").localeCompare(b.propertyName || "");
  });

  const statusLabel: Record<BulkCoverConvertPropertyStatus, string> = {
    Done: "✓ DONE",
    Failed: "✗ FAILED",
    Saving: "~ SAVING",
    Converting: "~ CONVERTING",
    Queued: "○ NOT REACHED",
  };

  const coverStatusIcon: Record<BulkCoverConvertImageItem["status"], string> = {
    Converted: "✓",
    Skipped:   "○",
    Failed:    "✗",
  };

  const blocks: string[] = [];
  for (const item of sorted) {
    const label = statusLabel[item.status].padEnd(14);
    const coverStr = `${item.convertedCount} / ${item.totalCovers} cover${item.totalCovers === 1 ? "" : "s"}`;
    const rows = [
      `[ ${label} ]  ${item.propertyName || "Unnamed property"}`,
      `  Property ID  : ${item.propertyId}`,
      `  Covers       : ${coverStr}`,
    ];
    if (item.message) rows.push(`  Note         : ${item.message}`);
    if (item.status === "Queued") rows.push(`  ⚠  Not reached — run ended before this property was processed.`);

    if (item.coverDetails?.length) {
      rows.push("");
      for (const cd of item.coverDetails) {
        const icon = coverStatusIcon[cd.status];
        const idShort = cd.id.replace(/-/g, "").slice(0, 20);
        const detail = cd.message ? `  — ${cd.message}` : "";
        rows.push(`  Slot ${cd.slot}  ${icon} ${cd.status.padEnd(10)}  ${idShort}${detail}`);
      }
    }

    rows.push(line);
    blocks.push(rows.join("\n"));
  }

  const content = [header, "", ...blocks].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cover-log-${brandLabel.toLowerCase()}-${now.toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

interface CoverImagesShowcaseProps {
  propertyId: string | null | undefined;
  propertyBrandMappingId?: string | null;
  brandScope?: BrandAdminScope;
  /** Cover photos from properties.coverPhotos (server state). */
  serverCoverPhotos: GalleryData[];
  /** Draft cover photos (user edits). */
  draftCoverPhotos: (GalleryData | null)[];
  onChangeDraftCoverPhotos: (next: (GalleryData | null)[]) => void;
  onSaved?: () => void;
  loading: boolean;
  imageViewMode: GalleryImageViewMode;
  onEdit?: (item: GalleryData) => void;
  onGoToUpload?: () => void;
}

export default function CoverImagesShowcase({
  propertyId,
  propertyBrandMappingId,
  brandScope = "instafarms",
  serverCoverPhotos,
  draftCoverPhotos,
  onChangeDraftCoverPhotos,
  onSaved,
  loading,
  imageViewMode,
  onEdit,
  onGoToUpload,
}: CoverImagesShowcaseProps) {
  const normalizedBrandScope = parseBrandAdminScope(brandScope);
  const brandAppType = BRAND_ADMIN_APP_TYPE[normalizedBrandScope];
  const brandLabel = normalizedBrandScope === "mago" ? "Mago" : "Instafarms";
  const [showWebsitePreview, setShowWebsitePreview] = useState(true);
  const [fullscreenItem, setFullscreenItem] = useState<GalleryData | null>(null);
  const [previewWidthPx, setPreviewWidthPx] = useState<number>(PRESET_WIDTHS.laptop);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalMinimized, setBulkModalMinimized] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkCoverConvertPropertyItem[]>([]);
  const [bulkTotalConverted, setBulkTotalConverted] = useState(0);
  const [bulkTotalPropertiesDone, setBulkTotalPropertiesDone] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkStoppedByUser, setBulkStoppedByUser] = useState(false);
  const [bulkUserRequestedStop, setBulkUserRequestedStop] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkCancelledRef = useRef(false);
  const bulkItemsRef = useRef<BulkCoverConvertPropertyItem[]>([]);
  const bulkStoppedByUserRef = useRef(false);
  const bulkTotalConvertedRef = useRef(0);

  const serverPadded = useMemo(() => padToFive(serverCoverPhotos), [serverCoverPhotos]);

  const isDirty = useMemo(() => {
    const draft = padToFive(draftCoverPhotos);
    for (let i = 0; i < 5; i++) {
      const a = draft[i]?.id ?? null;
      const b = serverPadded[i]?.id ?? null;
      if (a !== b) return true;
    }
    return false;
  }, [draftCoverPhotos, serverPadded]);

  const slots: (GalleryData | null)[] = useMemo(() => {
    if (isDirty) return padToFive(draftCoverPhotos);
    return serverPadded;
  }, [isDirty, draftCoverPhotos, serverPadded]);

  const displayUrl: DisplayUrlFn = useCallback(
    (item) => getImageSrcForMode(item, imageViewMode, normalizedBrandScope),
    [imageViewMode, normalizedBrandScope]
  );

  const handleResize = useCallback((deltaX: number) => {
    setPreviewWidthPx((w) =>
      Math.min(PREVIEW_WIDTH_MAX, Math.max(PREVIEW_WIDTH_MIN, w + deltaX))
    );
  }, []);

  const setViewportPreset = useCallback((mode: SimulatedViewport) => {
    setPreviewWidthPx(PRESET_WIDTHS[mode]);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleReset = useCallback(() => {
    onChangeDraftCoverPhotos(serverPadded);
  }, [onChangeDraftCoverPhotos, serverPadded]);

  const handleDeselectCoverSlot = useCallback(
    (slotIndex: number) => {
      const next = padToFive(slots);
      if (slotIndex < 0 || slotIndex >= next.length) return;
      next[slotIndex] = null;
      onChangeDraftCoverPhotos(next);
    },
    [onChangeDraftCoverPhotos, slots],
  );

  const handleSave = useCallback(async () => {
    if (!propertyId?.trim()) {
      toast.error("Missing propertyId.");
      return;
    }
    setIsSaving(true);
    try {
      // Keep full 5-slot array to preserve positions (null = empty slot)
      let slotsToSave: (GalleryData | null)[] = padToFive(slots);

      // Convert any items that still need grid/thumbnail
      const needConversion = slotsToSave
        .map((p, slotIndex) => ({ p, slotIndex }))
        .filter(
          (e): e is { p: GalleryData; slotIndex: number } =>
            e.p != null && !(e.p.gridUrl || e.p.thumbnailUrl)
        );
      if (needConversion.length > 0) {
        const enrichedMap = new Map<string, GalleryData>();
        for (const { p: item, slotIndex } of needConversion) {
          const sourceUrl =
            item.originalUrl ||
            item.rawUrl ||
            item.watermarkedUrlByInstafarms ||
            item.photoUrl ||
            "";
          if (!sourceUrl) {
            toast.error(`Cannot save: cover image needs a valid source URL.`);
            return;
          }
          const res = await convertSingleCoverImage(propertyId, sourceUrl, item.id, brandAppType, slotIndex + 1);
          if ("error" in res || !("gridUrl" in res)) {
            toast.error(("error" in res ? res.error : undefined) || "Failed to convert cover image.");
            return;
          }
          enrichedMap.set(item.id, {
            ...item,
            gridUrl: res.gridUrl,
            thumbnailUrl: res.thumbnailUrl,
            blurHash: res.blurHash,
          });
        }
        slotsToSave = slotsToSave.map((p) =>
          p ? (enrichedMap.get(p.id) ?? p) : null
        );
        onChangeDraftCoverPhotos(padToFive(slotsToSave));
      }

      const result = await updatePropertyCoverPhotos(propertyId, slotsToSave, {
        propertyBrandMappingId: propertyBrandMappingId ?? undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Cover images updated.");
      if (Array.isArray(result?.coverPhotos)) {
        onChangeDraftCoverPhotos(padToFive(result.coverPhotos));
      }
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  }, [propertyId, propertyBrandMappingId, slots, onChangeDraftCoverPhotos, onSaved]);

  const handleBulkConvert = useCallback(() => {
    setBulkModalOpen(true);
    setBulkModalMinimized(false);
    setBulkItems([]);
    setBulkTotalConverted(0);
    setBulkTotalPropertiesDone(0);
    setBulkProcessing(true);
    setBulkStoppedByUser(false);
    setBulkUserRequestedStop(false);
    setBulkError(null);
    bulkCancelledRef.current = false;
    bulkItemsRef.current = [];
    bulkStoppedByUserRef.current = false;
    bulkTotalConvertedRef.current = 0;

    function upsertItem(incoming: BulkCoverConvertPropertyItem) {
      setBulkItems((prev) => {
        const next = upsertPropertyRunItem(prev, incoming);
        bulkItemsRef.current = next;
        return next;
      });
    }

    async function runBrandPass(
      appType: string,
      brand: "instafarms" | "mago",
      getSourceUrl: (cover: GalleryData, matchedNeed: CoverPhotoNeedsConversion) => string,
      sharedState: { localTotalConverted: number; completedPropertyIds: Set<string> },
    ): Promise<boolean> {
      let fetchOffset = 0;

      while (true) {
        if (bulkCancelledRef.current) return false;

        const { items, error: fetchErr } = await fetchAllCoverPhotosNeedsConversion(
          MAGO_REBUILD_FETCH_LIMIT,
          appType,
          { includeAlreadyConverted: true, offset: fetchOffset },
        );

        if (fetchErr) {
          setBulkError(fetchErr);
          return false;
        }
        if (!items?.length) break;

        fetchOffset += items.length;

        const groupedByProperty = items.reduce<Map<string, Array<(typeof items)[number]>>>((map, item) => {
          const key = item.propertyId;
          const current = map.get(key);
          if (current) current.push(item);
          else map.set(key, [item]);
          return map;
        }, new Map());

        for (const [propId, propertyItems] of groupedByProperty.entries()) {
          if (bulkCancelledRef.current) break;

          const propertyName = propertyItems[0]?.propertyName ?? "";
          const totalCovers = propertyItems.length;
          upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount: 0, status: "Queued", brand, message: "Queued for cover regeneration." });
          upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount: 0, status: "Converting", brand, message: `Refreshing ${totalCovers} cover image${totalCovers === 1 ? "" : "s"} for this property.` });

          const currentCoversResult = await fetchPropertyCoverPhotos(propId, undefined, { appType });

          if (currentCoversResult.error) {
            upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount: 0, status: "Failed", brand, message: currentCoversResult.error });
            setBulkError(currentCoversResult.error);
            return false;
          }

          const currentCovers = padToFive(
            Array.isArray(currentCoversResult.coverPhotos) ? currentCoversResult.coverPhotos : [],
          );
          const coverNeedsMap = new Map(propertyItems.map((item) => [item.id, item]));
          let convertedCount = 0;
          let propertyFailed = false;
          const nextCoverSlots: (GalleryData | null)[] = [...currentCovers];
          const coverDetails: BulkCoverConvertImageItem[] = [];

          for (let slotIndex = 0; slotIndex < nextCoverSlots.length; slotIndex += 1) {
            const cover = nextCoverSlots[slotIndex];
            if (!cover?.id) continue;
            const matchedNeed = coverNeedsMap.get(cover.id);
            if (!matchedNeed) {
              coverDetails.push({ id: cover.id, slot: slotIndex + 1, status: "Skipped", message: "No source image found in photos table." });
              continue;
            }

            upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Converting", brand, message: `Converting cover ${convertedCount + 1} of ${totalCovers} for slot ${slotIndex + 1}.` });

            const sourceUrl = getSourceUrl(cover, matchedNeed);
            const conversionResult = await convertSingleCoverImage(propId, sourceUrl, cover.id, appType, slotIndex + 1);

            if ("error" in conversionResult) {
              propertyFailed = true;
              coverDetails.push({ id: cover.id, slot: slotIndex + 1, status: "Failed", message: conversionResult.error });
              upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Failed", brand, message: conversionResult.error, coverDetails });
              setBulkError(conversionResult.error);
              break;
            }

            nextCoverSlots[slotIndex] = {
              ...cover,
              gridUrl: conversionResult.gridUrl,
              thumbnailUrl: conversionResult.thumbnailUrl,
              blurHash: conversionResult.blurHash,
            };
            convertedCount += 1;
            coverDetails.push({ id: cover.id, slot: slotIndex + 1, status: "Converted" });
            upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Converting", brand, message: `Converted ${convertedCount} of ${totalCovers} cover image${totalCovers === 1 ? "" : "s"}.` });
          }

          if (propertyFailed) break;

          upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Saving", brand, message: "Saving refreshed cover slots for this property.", coverDetails });

          const updateResult = await updatePropertyCoverPhotos(propId, nextCoverSlots, { appType });

          if (updateResult.error) {
            upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Failed", brand, message: updateResult.error, coverDetails });
            setBulkError(updateResult.error);
            return false;
          }

          upsertItem({ propertyId: propId, propertyName, totalCovers, convertedCount, status: "Done", brand, message: `Finished regenerating ${convertedCount} cover image${convertedCount === 1 ? "" : "s"}.`, coverDetails });
          sharedState.localTotalConverted += convertedCount;
          bulkTotalConvertedRef.current = sharedState.localTotalConverted;
          setBulkTotalConverted(sharedState.localTotalConverted);
          sharedState.completedPropertyIds.add(`${brand}:${propId}`);
          setBulkTotalPropertiesDone(sharedState.completedPropertyIds.size);

          if (bulkCancelledRef.current) break;
        }

        if ((items?.length ?? 0) < MAGO_REBUILD_FETCH_LIMIT) break;
      }

      return true;
    }

    (async () => {
      const sharedState = { localTotalConverted: 0, completedPropertyIds: new Set<string>() };
      try {
        // Pass 1: Instafarms — convert from original image
        const instaOk = await runBrandPass(
          BRAND_ADMIN_APP_TYPE.instafarms,
          "instafarms",
          (cover, matchedNeed) => cover.rawUrl || cover.originalUrl || matchedNeed.sourceUrl,
          sharedState,
        );

        // Pass 2: Mago — convert from Mago-watermarked image
        if (instaOk && !bulkCancelledRef.current) {
          await runBrandPass(
            BRAND_ADMIN_APP_TYPE.mago,
            "mago",
            (cover, matchedNeed) => cover.watermarkedUrlByMago || cover.listingUrl || matchedNeed.sourceUrl,
            sharedState,
          );
        }
      } finally {
        const wasStopped = bulkCancelledRef.current;
        setBulkProcessing(false);
        if (wasStopped) {
          setBulkStoppedByUser(true);
          bulkStoppedByUserRef.current = true;
        }
        downloadBulkLog(bulkItemsRef.current, "All", bulkTotalConvertedRef.current, wasStopped);
        onSaved?.();
      }
    })();
  }, [onSaved]);

  const handleBulkPauseOrCancel = useCallback(() => {
    bulkCancelledRef.current = true;
    setBulkUserRequestedStop(true);
  }, []);

  if (loading) return <CoverImagesLoadingState />;
  const hasAnyCover = slots.some((p) => p != null);

  const mainImage = slots[0] ?? undefined;
  const sideImagesPadded: (GalleryData | null)[] = slots.slice(1, 5);
  while (sideImagesPadded.length < 4) sideImagesPadded.push(null);
  const extraCovers: GalleryData[] = [];
  const simulatedViewport = getSimulatedViewport(previewWidthPx);

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cover images from{" "}
          <span className="font-semibold">properties.coverPhotos</span>. Use the gallery tabs to assign images to cover slots (1-5). Order is preserved on save. The refresh button runs a global cover rebuild for all properties across both Instafarms (from original images) and Mago (from watermarked images), even though it lives on this property screen.
        </p>
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <Button
            color="light"
            size="sm"
            disabled={bulkProcessing}
            onClick={handleBulkConvert}
            className="whitespace-nowrap"
          >
            Refresh cover images
          </Button>
          <Button color="light" size="sm" disabled={!isDirty || isSaving} onClick={handleReset}>
            Reset
          </Button>
          <button
            type="button"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className="rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            {isSaving ? "Saving..." : "Save cover images"}
          </button>
        </div>
      </div>
      <CoverPreviewToggle
        showWebsitePreview={showWebsitePreview}
        onToggle={setShowWebsitePreview}
        activeViewport={simulatedViewport}
        onViewportPreset={setViewportPreset}
        previewWidthPx={previewWidthPx}
        isDragging={isDragging}
      />
      {hasAnyCover ? (
        showWebsitePreview ? (
          <div className="rounded-xl overflow-hidden flex items-stretch gap-0">
            <div
              style={{ width: previewWidthPx, minWidth: PREVIEW_WIDTH_MIN }}
              className="flex flex-col overflow-x-auto shrink-0 transition-[width] duration-150"
            >
              <div className="p-4 md:p-6">
                <CoverWebsitePreviewView
                  mainImage={mainImage}
                  sideImagesPadded={sideImagesPadded}
                  extraCovers={extraCovers}
                  displayUrl={displayUrl}
                  onEdit={onEdit}
                  onFullscreen={setFullscreenItem}
                  simulatedViewport={simulatedViewport}
                />
              </div>
            </div>
            <CoverResizeHandle
              onResize={handleResize}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            />
          </div>
        ) : (
          <CoverCardsView
            slots={slots}
            displayUrl={displayUrl}
            onEdit={onEdit}
            onFullscreen={setFullscreenItem}
            onDeselectCoverSlot={handleDeselectCoverSlot}
          />
        )
      ) : (
        <CoverImagesEmptyState onGoToUpload={onGoToUpload} />
      )}
      {fullscreenItem && (
        <FullSizeImageModal
          src={displayUrl(fullscreenItem) || "/placeholder.jpg"}
          alt={fullscreenItem.altText || fullscreenItem.fileName || "Cover image"}
          onClose={() => setFullscreenItem(null)}
        />
      )}
        <BulkCoverConvertModal
          show={bulkModalOpen}
          minimized={bulkModalMinimized}
          properties={bulkItems}
          totalConverted={bulkTotalConverted}
          totalPropertiesDone={bulkTotalPropertiesDone}
          isProcessing={bulkProcessing}
          stoppedByUser={bulkStoppedByUser}
          userRequestedStop={bulkUserRequestedStop}
          error={bulkError}
          onClose={() => {
            if (bulkItemsRef.current.length > 0) {
              downloadBulkLog(
                bulkItemsRef.current,
                "All",
                bulkTotalConvertedRef.current,
                bulkStoppedByUserRef.current,
              );
            }
            setBulkModalOpen(false);
          }}
          onPauseOrCancel={handleBulkPauseOrCancel}
          onToggleMinimize={() => setBulkModalMinimized((value) => !value)}
        />
      </div>
  );
}
