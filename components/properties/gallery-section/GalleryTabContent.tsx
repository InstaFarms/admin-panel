"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import toast from "react-hot-toast";
import type { GalleryTabKey, GalleryImageViewMode } from "@/hooks/properties/usePropertyGallery";
import type { GalleryData } from "@/utils/types";
import { BRAND_ADMIN_APP_TYPE, type BrandAdminScope } from "@/constants/brandAdminScope";
import {
  deletePropertyGalleryByCategory,
  deletePropertyGalleryPhoto,
  fetchAllGalleryNeedsWatermark,
} from "@/actions/propertyActions";
import { convertGalleryToWatermarkBatch, convertGalleryToWatermarkServer, resetWatermarkRegenLogAction } from "@/actions/imageActions";
import type { BulkWatermarkItem } from "./BulkWatermarkModal";
import BulkWatermarkModal from "./BulkWatermarkModal";
import {
  ROW_FOR_SCROLL_PX,
  ROW_GAP_PX,
  LoadMoreSentinel,
  EndOfListMessage,
  NoImagesInCategoryEmptyState,
  CategoryTabToolbar,
  SortableGalleryCard,
} from "./tab-content";

const SCROLL_INITIAL_DELAY_MS = 150;
const SCROLL_POLL_MS = 50;
const SCROLL_MAX_WAIT_MS = 2000;
const SCROLL_COMPLETE_MS = 900;
const HIGHLIGHT_DURATION_MS = 2500;
const BULK_FETCH_LIMIT = 30;
const BULK_CHUNK_SIZE = 10;
const BULK_MAX_ITERATIONS = 200;

interface WatermarkRegenProgress {
  afterId?: string;
  afterName?: string;
  doneCount: number;
  totalCount?: number;
}

function watermarkProgressKey(appType: string, force: boolean): string {
  return `watermarkRegenProgress:${appType}:${force ? "force" : "missing"}`;
}

/** Reads saved bulk-watermark progress so a stopped run can resume where it left off. */
function loadWatermarkProgress(appType: string, force: boolean): WatermarkRegenProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(watermarkProgressKey(appType, force));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.doneCount !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persisted after every chunk so pausing/closing the tab never loses progress. */
function saveWatermarkProgress(appType: string, force: boolean, progress: WatermarkRegenProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(watermarkProgressKey(appType, force), JSON.stringify(progress));
  } catch {
    // best-effort — a full localStorage shouldn't block the actual watermark work
  }
}

function clearWatermarkProgress(appType: string, force: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(watermarkProgressKey(appType, force));
  } catch {
    // ignore
  }
}

export interface GalleryTabContentProps {
  propertyId: string;
  propertyBrandMappingId?: string | null;
  tabKey: GalleryTabKey;
  items: GalleryData[];
  visibleCount: number;
  maxVisible: number;
  loading: boolean;
  onLoadMore: () => void;
  onUpdateItem: (id: string, updates: Partial<GalleryData>) => void;
  onReorderInTab: (tabKey: GalleryTabKey, orderedIds: string[]) => void;
  /** Refetch gallery after Delete All or single-photo delete succeeds. */
  onRefetchGallery: () => void;
  imageViewMode: GalleryImageViewMode;
  setImageViewMode: (mode: GalleryImageViewMode) => void;
  scrollToItemId?: string | null;
  onScrolledToItem?: () => void;
  /** Switch to Upload tab (e.g. from empty state CTA). */
  onGoToUpload?: () => void;
  /** Map of photoId -> cover slot (1..5). */
  coverSlotByPhotoId: Record<string, number>;
  /** Assign/remove photoId to cover slot (1..5). null removes. */
  onSetCoverSlotForPhoto: (photoId: string, slot1to5: number | null) => void;
  /** Show Update in database button when there are unsaved edits. */
  showUpdateInDb?: boolean;
  /** Persist gallery edits to database. */
  onUpdateInDatabase?: () => void;
  /** When true, update is in progress. */
  updatingDb?: boolean;
  /** Controls which brand's watermarks are fetched and saved. */
  brandScope?: BrandAdminScope;
}

export default function GalleryTabContent({
  propertyId,
  propertyBrandMappingId,
  tabKey,
  items,
  visibleCount,
  maxVisible,
  loading,
  onLoadMore,
  onUpdateItem,
  onReorderInTab,
  onRefetchGallery,
  imageViewMode,
  setImageViewMode,
  scrollToItemId,
  onScrolledToItem,
  onGoToUpload,
  coverSlotByPhotoId,
  onSetCoverSlotForPhoto,
  showUpdateInDb = false,
  onUpdateInDatabase,
  updatingDb = false,
  brandScope = "instafarms",
}: GalleryTabContentProps) {
  const appType = BRAND_ADMIN_APP_TYPE[brandScope];
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<HTMLDivElement | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

  const cappedTotal = Math.min(items.length, maxVisible);
  const hasMore = visibleCount < cappedTotal;
  const visible = items.slice(0, Math.min(visibleCount, cappedTotal));
  const reachedShowcaseLimit = items.length > maxVisible && visible.length >= maxVisible;
  const scrollToIndex = scrollToItemId ? items.findIndex((i) => i.id === scrollToItemId) : -1;
  const scrollToInRange = scrollToIndex >= 0 && scrollToIndex < visibleCount;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = visible.findIndex((i) => i.id === active.id);
      const newIndex = visible.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reorderedVisible = arrayMove(visible, oldIndex, newIndex);
      const reorderedIds = reorderedVisible.map((i) => i.id);
      const restIds = items.slice(visibleCount).map((i) => i.id);
      const fullOrderedIds = [...reorderedIds, ...restIds];
      onReorderInTab(tabKey, fullOrderedIds);
    },
    [visible, items, visibleCount, tabKey, onReorderInTab]
  );

  const [deleting, setDeleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ current: 0, total: 0 });

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkWatermarkItem[]>([]);
  const [bulkTotalConverted, setBulkTotalConverted] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkStoppedByUser, setBulkStoppedByUser] = useState(false);
  const [bulkUserRequestedStop, setBulkUserRequestedStop] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkGrandTotal, setBulkGrandTotal] = useState<number | null>(null);
  const [bulkResumedCount, setBulkResumedCount] = useState(0);
  const bulkCancelledRef = useRef(false);
  const bulkForceAllRef = useRef(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRemoveSingle = useCallback(
    async (photoId: string) => {
      if (!window.confirm("Remove this image from the gallery? This cannot be undone.")) return;
      setRemovingId(photoId);
      try {
        const result = await deletePropertyGalleryPhoto(propertyId, photoId, {
          propertyBrandMappingId: propertyBrandMappingId ?? undefined,
        });
        if (result.error) {
          window.alert(result.error);
          return;
        }
        onRefetchGallery();
      } finally {
        setRemovingId(null);
      }
    },
    [propertyId, propertyBrandMappingId, onRefetchGallery]
  );

  const handleDeleteAll = useCallback(async () => {
    const count = items.length;
    if (count === 0) return;
    if (!window.confirm(`Delete all ${count} image${count === 1 ? "" : "s"} in this category? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const result = await deletePropertyGalleryByCategory(propertyId, tabKey, {
        propertyBrandMappingId: propertyBrandMappingId ?? undefined,
      });
      if (result.error) {
        window.alert(result.error);
        return;
      }
      onRefetchGallery();
    } finally {
      setDeleting(false);
    }
  }, [propertyId, propertyBrandMappingId, tabKey, items.length, onRefetchGallery]);

  const handleConvertSelected = useCallback(async () => {
    const ordered = visible.filter((i) => selectedIds.has(i.id));
    if (ordered.length === 0) return;

    setConverting(true);
    setConvertProgress({ current: 0, total: ordered.length });

    try {
      const items = ordered
        .map((item) => {
          const sourceUrl = item.originalUrl || item.watermarkedUrlByInstafarms || "";
          const orig = (item.originalUrl || item.rawUrl || "").trim();
          const watermarked = (item.watermarkedUrlByInstafarms || "").trim();
          const hasUnwatermarkedOriginal = Boolean(
            orig || !watermarked || (orig && watermarked && orig === watermarked)
          );
          return {
            id: item.id,
            sourceUrl,
            fileName: item.fileName ?? item.caption ?? undefined,
            hasUnwatermarkedOriginal,
          };
        })
        .filter((i) => Boolean(i.sourceUrl));

      if (items.length === 0) {
        toast.error("No valid source images to convert.");
        return;
      }

      const result = await convertGalleryToWatermarkServer(propertyId, items, {
        propertyBrandMappingId: propertyBrandMappingId ?? undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setSelectedIds(new Set());
      onRefetchGallery();
      toast.success(
        `Converted ${result.convertedCount ?? 0} image${(result.convertedCount ?? 0) === 1 ? "" : "s"} to watermark.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Conversion failed");
    } finally {
      setConverting(false);
      setConvertProgress({ current: 0, total: 0 });
    }
  }, [propertyId, propertyBrandMappingId, visible, selectedIds, onRefetchGallery]);

  const handleBulkCreateWatermarks = useCallback((force = false, options?: { restart?: boolean }) => {
    const saved = options?.restart ? null : loadWatermarkProgress(appType, force);
    if (options?.restart) {
      clearWatermarkProgress(appType, force);
      void resetWatermarkRegenLogAction(appType, force);
    }

    setBulkModalOpen(true);
    setBulkItems([]);
    setBulkTotalConverted(saved?.doneCount ?? 0);
    setBulkResumedCount(saved?.doneCount ?? 0);
    setBulkGrandTotal(saved?.totalCount ?? null);
    setBulkProcessing(true);
    setBulkStoppedByUser(false);
    setBulkUserRequestedStop(false);
    setBulkError(null);
    bulkCancelledRef.current = false;
    bulkForceAllRef.current = force;

    (async () => {
      let hasProcessedAny = false;
      let iterations = 0;
      let afterId: string | undefined = saved?.afterId;
      let afterName: string | undefined = saved?.afterName;
      let doneCount = saved?.doneCount ?? 0;
      let grandTotal = saved?.totalCount;
      try {
        while (iterations++ < BULK_MAX_ITERATIONS) {
          if (bulkCancelledRef.current) break;

          const { photos, total, error: fetchErr } = await fetchAllGalleryNeedsWatermark(BULK_FETCH_LIMIT, {
            appType,
            forceAll: force,
            afterId,
            afterName,
          });

          if (fetchErr) {
            setBulkError(fetchErr);
            break;
          }
          if (grandTotal == null && typeof total === "number") {
            grandTotal = total;
            setBulkGrandTotal(total);
          }
          if (!photos?.length) {
            if (!hasProcessedAny && doneCount === 0) {
              setBulkError("All images already have watermarks.");
            }
            clearWatermarkProgress(appType, force);
            break;
          }
          hasProcessedAny = true;

          const newItems: BulkWatermarkItem[] = photos.map((p) => ({
            id: p.id,
            fileName: p.fileName ?? p.name ?? null,
            propertyName: p.propertyName ?? null,
            status: "Pending" as const,
          }));
          setBulkItems((prev) => [...prev, ...newItems]);

          for (let i = 0; i < photos.length; i += BULK_CHUNK_SIZE) {
            if (bulkCancelledRef.current) break;

            const batch = photos.slice(i, i + BULK_CHUNK_SIZE);
            setBulkItems((prev) =>
              prev.map((it) =>
                batch.some((b) => b.id === it.id) ? { ...it, status: "Converting" as const } : it
              )
            );

            const convertInput = batch.map((p) => ({
              id: p.id,
              sourceUrl: p.originalUrl,
              fileName: p.fileName ?? p.name ?? undefined,
              propertyName: p.propertyName ?? undefined,
              hasUnwatermarkedOriginal: true,
            }));

            const byProperty = new Map<string, typeof convertInput>();
            for (const p of batch) {
              const pid = p.propertyId;
              if (!byProperty.has(pid)) byProperty.set(pid, []);
              byProperty.get(pid)!.push(convertInput.find((c) => c.id === p.id)!);
            }

            const groups = Array.from(byProperty.entries()).map(([propertyId, items]) => ({ propertyId, items }));
            const result = await convertGalleryToWatermarkBatch(groups, { appType, force });
            if (result.error) {
              setBulkError(result.error);
              break;
            }
            const succeededIds = new Set(result.succeededIds ?? []);

            setBulkItems((prev) =>
              prev.map((it) => {
                if (!batch.some((b) => b.id === it.id)) return it;
                const status = succeededIds.has(it.id) ? "Done" : "Failed";
                return { ...it, status };
              })
            );
            doneCount += succeededIds.size;
            setBulkTotalConverted(doneCount);

            // Force mode has no "missing watermark" filter to naturally exclude
            // finished photos, so the cursor must advance past every attempted photo
            // (success or failure) or the same page would repeat forever. Persisted
            // after every chunk (not just every page) so Pause/close-tab never loses
            // more than the one in-flight chunk.
            if (force) {
              const lastInBatch = batch[batch.length - 1];
              afterId = lastInBatch.id;
              afterName = lastInBatch.propertyName ?? afterName;
            }
            saveWatermarkProgress(appType, force, { afterId, afterName, doneCount, totalCount: grandTotal });
          }

          if (photos.length < BULK_FETCH_LIMIT) {
            clearWatermarkProgress(appType, force);
            break;
          }
        }
      } finally {
        setBulkProcessing(false);
        if (bulkCancelledRef.current) setBulkStoppedByUser(true);
        onRefetchGallery();
      }
    })();
  }, [appType, onRefetchGallery]);

  const handleBulkPauseOrCancel = useCallback(() => {
    bulkCancelledRef.current = true;
    setBulkUserRequestedStop(true);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: scrollRef.current, rootMargin: "100px", threshold: 0 }
    );
    const root = scrollRef.current;
    if (root) observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    if (!scrollToItemId || scrollToIndex < 0) return;
    if (scrollToIndex >= visibleCount && hasMore) onLoadMore();
  }, [scrollToItemId, scrollToIndex, visibleCount, hasMore, onLoadMore]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (completionTimeoutRef.current) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, []);

  // Scroll to item (e.g. after "Edit" from cover) and highlight; cleanup cancels pending timeouts when deps change
  useEffect(() => {
    if (!scrollToItemId || scrollToIndex < 0 || !onScrolledToItem || !scrollToInRange) return;
    const idToHighlight = scrollToItemId;
    const index = scrollToIndex;
    const performScroll = () => {
      const el = scrollRef.current;
      const target = scrollTargetRef.current;
      if (!el || !target) return false;
      if (el.offsetHeight === 0) return false;
      const top = index * (ROW_FOR_SCROLL_PX + ROW_GAP_PX);
      el.scrollTo({ top: Math.max(0, top - 24), behavior: "auto" });
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      completionTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current && idToHighlight) setHighlightItemId(idToHighlight);
        onScrolledToItem();
        completionTimeoutRef.current = null;
      }, SCROLL_COMPLETE_MS) as unknown as ReturnType<typeof setTimeout>;
      return true;
    };
    let elapsed = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const tryScroll = () => {
      if (performScroll()) return;
      elapsed += SCROLL_POLL_MS;
      if (elapsed < SCROLL_MAX_WAIT_MS) timeoutId = window.setTimeout(tryScroll, SCROLL_POLL_MS) as unknown as ReturnType<typeof setTimeout>;
    };
    timeoutId = window.setTimeout(tryScroll, SCROLL_INITIAL_DELAY_MS) as unknown as ReturnType<typeof setTimeout>;
    return () => {
      window.clearTimeout(timeoutId);
      if (completionTimeoutRef.current) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [scrollToItemId, scrollToIndex, scrollToInRange, onScrolledToItem]);

  useEffect(() => {
    if (!highlightItemId) return;
    const t = setTimeout(() => setHighlightItemId(null), HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(t);
  }, [highlightItemId]);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading gallery…</div>;

  const hasItems = items.length > 0;

  const selectedCount = visible.filter((i) => selectedIds.has(i.id)).length;

  return (
    <div className="flex flex-col">
      {converting && (
        <div
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white dark:bg-gray-800 px-8 py-6 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Converting {convertProgress.current}/{convertProgress.total}…
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Please wait. Do not navigate away.</p>
          </div>
        </div>
      )}
      <CategoryTabToolbar
        imageViewMode={imageViewMode}
        setImageViewMode={setImageViewMode}
        onDeleteAll={handleDeleteAll}
        showDeleteAll={hasItems}
        deleting={deleting}
        selectedCount={selectedCount}
        onConvertSelected={handleConvertSelected}
        converting={converting}
        onBulkCreateWatermarks={() => handleBulkCreateWatermarks(false)}
        onBulkRegenWatermarks={() => handleBulkCreateWatermarks(true)}
        bulkCreating={bulkProcessing}
        showUpdateInDb={showUpdateInDb}
        onUpdateInDatabase={onUpdateInDatabase}
        updatingDb={updatingDb}
        brandScope={brandScope}
      />
      <BulkWatermarkModal
        show={bulkModalOpen}
        items={bulkItems}
        totalConverted={bulkTotalConverted}
        grandTotal={bulkGrandTotal}
        resumedCount={bulkResumedCount}
        isProcessing={bulkProcessing}
        stoppedByUser={bulkStoppedByUser}
        userRequestedStop={bulkUserRequestedStop}
        error={bulkError}
        title={`Creating ${brandScope === "mago" ? "Mago" : "Instafarms"} watermarked images`}
        onClose={() => setBulkModalOpen(false)}
        onPauseOrCancel={handleBulkPauseOrCancel}
        onStartOver={() => handleBulkCreateWatermarks(bulkForceAllRef.current, { restart: true })}
      />
      <div className="mt-3">
      {!hasItems ? (
        <NoImagesInCategoryEmptyState onGoToUpload={onGoToUpload} />
      ) : (
      <div ref={scrollRef} className="overflow-y-auto max-h-[85vh] min-h-100 pr-2 flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-4">
              {visible.map((item, index) => (
                <SortableGalleryCard
                  key={item.id}
                  item={item}
                  displayOrder={index + 1}
                  isHighlighted={item.id === highlightItemId}
                  scrollTargetRef={(el) => {
                    if (item.id === scrollToItemId) scrollTargetRef.current = el;
                  }}
                  onUpdateItem={onUpdateItem}
                  onRemoveFromList={handleRemoveSingle}
                  removing={removingId === item.id}
                  imageViewMode={imageViewMode}
                  currentCoverSlot={coverSlotByPhotoId[item.id] ?? null}
                  onSetCoverSlotForPhoto={onSetCoverSlotForPhoto}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {hasMore && (
                <LoadMoreSentinel
                  sentinelRef={sentinelRef}
                  className="flex flex-col gap-3 py-6 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-800/50"
                />
              )}
              {!hasMore && (
                <EndOfListMessage
                  className="py-6 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 text-center"
                  message={
                    reachedShowcaseLimit
                      ? `Max showcase limit reached (${maxVisible} images).`
                      : "This is the end - no more images in this tab."
                  }
                />
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      )}
      </div>
    </div>
  );
}
