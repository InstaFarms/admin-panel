"use client";

/**
 * Upload flow (Upload tab) – all processing and upload from client:
 * - GallerySection renders GalleryUploadTab when Upload tab is active (line ~81).
 * - GalleryUploadTab (./GalleryUploadTab.tsx):
 *   1. User drops/selects files or ZIP → processFiles() builds entries; processEntriesPreview runs on client (watermark + thumbnail).
 *   2. User clicks "Upload to property gallery" → openUploadModal() opens modal with entries.
 *   3. User clicks "Start upload" → startUpload() runs:
 *      - getGalleryUploadUrls(propertyId, count) gets signed upload URLs only (no file content).
 *      - Client builds original (entryToFile), watermarked (from processedPhotoUrl), thumbnail (from processedThumbnailUrl).
 *      - Client uploads each file directly to Firebase Storage via signed URLs (PUT).
 *      - makeGalleryUploadsPublic(paths) makes uploaded files public.
 *      - addGalleryImagesToProperty(propertyId, uploaded) persists gallery URLs to DB only.
 * - Gallery data is read via usePropertyGallery(propertyId); new uploads appear after addGalleryImagesToProperty succeeds.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCirclePlus } from "react-icons/lu";
import { HiPhotograph, HiDownload } from "react-icons/hi";
import { TabItem, Tabs } from "flowbite-react";
import type { BrandAdminScope } from "@/constants/brandAdminScope";
import { GalleryData } from "@/utils/types";
import {
  usePropertyGallery,
  useGallerySectionTabs,
  GALLERY_TAB_KEYS,
  GALLERY_TAB_TITLES,
  GALLERY_LOAD_SIZE,
  GALLERY_MAX_VISIBLE,
} from "@/hooks/properties/usePropertyGallery";
import GalleryTabContent from "./GalleryTabContent";
import GalleryUploadTab from "./GalleryUploadTab";
import CoverImagesShowcase from "./CoverImagesShowcase";
import GalleryDownloadSection from "./GalleryDownloadSection";
import { updatePropertyGalleryItems, type GalleryItemUpdate } from "@/actions/propertyActions";

export interface GallerySectionProps {
  propertyId: string | null | undefined;
  brandScope?: BrandAdminScope;
  propertyBrandMappingId?: string | null;
  /** Cover photos from /full (fallback when cover-photos API returns empty). */
  initialCoverPhotos?: GalleryData[];
  /** Called when gallery list changes (e.g. for Update Property to save this data). */
  onGalleryChange?: (galleries: GalleryData[]) => void;
  /** Called when cover slots change. Null slots are omitted from this callback. */
  onCoverPhotosChange?: (coverPhotos: GalleryData[]) => void;
}

function padToFive<T>(arr: T[]): (T | null)[] {
  const next: (T | null)[] = [...arr].slice(0, 5);
  while (next.length < 5) next.push(null);
  return next;
}

const getCoverSignature = (items: (GalleryData | null)[]) =>
  items.map((item) => item?.id ?? "").join("|");

export default function GallerySection({
  propertyId,
  brandScope,
  propertyBrandMappingId,
  initialCoverPhotos,
  onGalleryChange,
  onCoverPhotosChange,
}: GallerySectionProps) {
  const {
    allGallery,
    coverPhotos,
    isDirty,
    loading,
    byTab,
    visibleByTab,
    loadMore,
    ensureVisibleCount,
    updateGalleryItem,
    reorderInTab,
    removeFromList,
    imageViewMode,
    setImageViewMode,
    refetchGallery,
  } = usePropertyGallery(propertyId, initialCoverPhotos, propertyBrandMappingId);
  const { activeTab, setActiveTab, scrollToItemId, setScrollToItemId, tabsRef, handleCoverEdit } =
    useGallerySectionTabs(byTab, ensureVisibleCount);

  const goToUploadTab = useCallback(() => {
    setActiveTab(4);
    tabsRef.current?.setActiveTab(4);
  }, [setActiveTab]);

  const [draftCoverPhotos, setDraftCoverPhotos] = useState<(GalleryData | null)[]>([null, null, null, null, null]);
  const lastEmittedCoverSignatureRef = useRef<string>("");
  const onGalleryChangeRef = useRef<typeof onGalleryChange>(onGalleryChange);
  const onCoverPhotosChangeRef = useRef<typeof onCoverPhotosChange>(onCoverPhotosChange);

  useEffect(() => {
    onGalleryChangeRef.current = onGalleryChange;
  }, [onGalleryChange]);

  useEffect(() => {
    onCoverPhotosChangeRef.current = onCoverPhotosChange;
  }, [onCoverPhotosChange]);

  useEffect(() => {
    const next = padToFive(coverPhotos);
    setDraftCoverPhotos((prev) => {
      if (getCoverSignature(prev) === getCoverSignature(next)) return prev;
      return next;
    });
  }, [propertyId, coverPhotos]);

  const coverSlotByPhotoId = useMemo(() => {
    const map: Record<string, number> = {};
    draftCoverPhotos.forEach((p, idx) => {
      if (p?.id) map[p.id] = idx + 1;
    });
    return map;
  }, [draftCoverPhotos]);

  const setCoverSlotForPhoto = useCallback((photoId: string, slot1to5: number | null) => {
    const item = allGallery.find((g) => g.id === photoId);
    setDraftCoverPhotos((prev) => {
      const next = prev.map((p) => (p?.id === photoId ? null : p));
      if (slot1to5 != null && slot1to5 >= 1 && slot1to5 <= 5 && item) {
        next[slot1to5 - 1] = item;
      }
      return next;
    });
  }, [allGallery]);

  useEffect(() => {
    onGalleryChangeRef.current?.(allGallery);
  }, [allGallery]);

  useEffect(() => {
    const padded = padToFive(draftCoverPhotos);
    const signature = getCoverSignature(padded);
    if (signature === lastEmittedCoverSignatureRef.current) return;
    lastEmittedCoverSignatureRef.current = signature;

    const selectedCovers = padded.filter((item): item is GalleryData => Boolean(item));
    onCoverPhotosChangeRef.current?.(selectedCovers);
  }, [draftCoverPhotos]);

  const [updatingDb, setUpdatingDb] = useState(false);
  const handleUpdateInDatabase = useCallback(async () => {
    if (!propertyId || !isDirty) return;
    setUpdatingDb(true);
    try {
      // Build updates: per-category sortOrder (1, 2, 3, ...) - unique per (propertyId, category)
      const updates: GalleryItemUpdate[] = [];
      for (const tabKey of GALLERY_TAB_KEYS) {
        const items = byTab[tabKey] ?? [];
        items.forEach((g, idx) => {
          updates.push({
            photoId: g.id,
            name: g.fileName ?? g.name ?? g.caption ?? undefined,
            altText: g.altText ?? g.instafarmsAltText ?? undefined,
            key: g.key ?? tabKey,
            sortOrder: idx + 1, // 1, 2, 3, ... per category
          });
        });
      }
      const result = await updatePropertyGalleryItems(propertyId, updates, {
        propertyBrandMappingId: propertyBrandMappingId ?? undefined,
      });
      if (result.error) {
        window.alert(result.error);
        return;
      }
      refetchGallery();
    } finally {
      setUpdatingDb(false);
    }
  }, [propertyId, propertyBrandMappingId, isDirty, byTab, refetchGallery]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const galleryWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrap = galleryWrapRef.current;
    if (!sentinel || !wrap) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        wrap.dataset.stuck = entry.isIntersecting ? "false" : "true";
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!propertyId) {
    return <div className="py-8 text-center text-gray-500">Select a property to view gallery.</div>;
  }

  return (
    <div className="space-y-0">
      <div className="-mx-4 px-4 pb-2 pt-0">
        <div ref={galleryWrapRef} className="gallery-tabs-with-upload">
        <div ref={sentinelRef} className="h-px" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .gallery-tabs-with-upload [role="tablist"] {
            position: sticky;
            top: -1rem;
            z-index: 30;
            background-color: rgb(250 250 250);
            padding-bottom: 0.125rem;
            padding-top: 0.125rem;
            margin-bottom: 0.125rem;
            border-bottom: 1px solid rgb(229 231 235);
            transition: background-color 0.15s ease;
          }
          .dark .gallery-tabs-with-upload [role="tablist"] {
            background-color: rgb(15 23 42);
            border-bottom-color: rgb(51 65 85);
          }
          .dark .gallery-tabs-with-upload[data-stuck="true"] [role="tablist"] {
            background-color: rgb(24 24 27);
            border-bottom-color: rgb(39 39 42);
          }
          .gallery-tabs-with-upload[data-stuck="true"] [role="tablist"] {
            background-color: rgb(255 255 255);
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(5)[aria-selected="true"],
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(6)[aria-selected="true"],
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(7)[aria-selected="true"] {
            background-color: rgb(5 150 105);
            border-color: rgb(5 150 105);
            color: white;
          }
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(5)[aria-selected="true"]:hover,
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(6)[aria-selected="true"]:hover,
          .gallery-tabs-with-upload [role="tablist"] > *:nth-child(7)[aria-selected="true"]:hover {
            background-color: rgb(4 120 87);
            border-color: rgb(4 120 87);
            color: white;
          }
        `,
          }}
        />
        <Tabs
          ref={tabsRef}
          theme={{
            tabpanel: "pt-0",
            tablist: {
              tabitem: {
                base: "flex items-center justify-center rounded-t-lg px-2 py-3 text-xs font-medium first:ml-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500",
              },
            },
          }}
          onActiveTabChange={(tab) => setActiveTab(typeof tab === "number" ? tab : 0)}
        >
          {GALLERY_TAB_TITLES.map((title, index) => {
            const tabKey = GALLERY_TAB_KEYS[index];
            const items = byTab[tabKey] ?? [];
            const visibleCount = visibleByTab[tabKey] ?? GALLERY_LOAD_SIZE;
            const count = items.length;
            return (
              <TabItem
                key={tabKey}
                active={activeTab === index}
                title={
                  <span className="inline-flex items-center gap-2">
                    {title}
                    <span className="inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-gray-200/80 dark:bg-gray-600/80 text-gray-600 dark:text-gray-300">
                      {count}
                    </span>
                  </span>
                }
              >
                <div style={{ display: activeTab === index ? "block" : "none" }} aria-hidden={activeTab !== index}>
                  <GalleryTabContent
                    propertyId={propertyId}
                    tabKey={tabKey}
                    items={items}
                    visibleCount={visibleCount}
                    maxVisible={GALLERY_MAX_VISIBLE}
                    loading={loading}
                    onLoadMore={() => loadMore(tabKey)}
                    onUpdateItem={updateGalleryItem}
                    onReorderInTab={reorderInTab}
                    onRefetchGallery={refetchGallery}
                    propertyBrandMappingId={propertyBrandMappingId}
                    imageViewMode={imageViewMode}
                    setImageViewMode={setImageViewMode}
                    scrollToItemId={scrollToItemId}
                    onScrolledToItem={() => setScrollToItemId(null)}
                    onGoToUpload={goToUploadTab}
                    coverSlotByPhotoId={coverSlotByPhotoId}
                    onSetCoverSlotForPhoto={setCoverSlotForPhoto}
                    showUpdateInDb={isDirty}
                    onUpdateInDatabase={handleUpdateInDatabase}
                    updatingDb={updatingDb}
                    brandScope={brandScope}
                  />
                </div>
              </TabItem>
            );
          })}
          <TabItem
            key="upload"
            active={activeTab === 4}
            title={
              <span className="inline-flex items-center gap-2">
                <LuCirclePlus className="w-4 h-4" /> Upload
              </span>
            }
          >
            {activeTab === 4 && (
              <GalleryUploadTab
                propertyId={propertyId}
                propertyBrandMappingId={propertyBrandMappingId}
                brandScope={brandScope}
                onUploadSuccess={refetchGallery}
              />
            )}
          </TabItem>
          <TabItem
            key="cover"
            active={activeTab === 5}
            title={
              <span className="inline-flex items-center gap-2">
                <HiPhotograph className="w-4 h-4" /> Cover Images
              </span>
            }
          >
            {activeTab === 5 && (
              <CoverImagesShowcase
                propertyId={propertyId}
                propertyBrandMappingId={propertyBrandMappingId}
                brandScope={brandScope}
                serverCoverPhotos={coverPhotos}
                draftCoverPhotos={draftCoverPhotos}
                onChangeDraftCoverPhotos={setDraftCoverPhotos}
                onSaved={() => refetchGallery()}
                loading={loading}
                imageViewMode={imageViewMode}
                onEdit={handleCoverEdit}
                onGoToUpload={goToUploadTab}
              />
            )}
          </TabItem>
          <TabItem
            key="download"
            active={activeTab === 6}
            title={
              <span className="inline-flex items-center gap-2">
                <HiDownload className="w-4 h-4" /> Download Images
              </span>
            }
          >
            {activeTab === 6 && (
              <GalleryDownloadSection
                allGallery={allGallery}
                coverPhotos={draftCoverPhotos.filter(Boolean) as GalleryData[]}
                propertyBrandMappingId={propertyBrandMappingId}
                brandScope={brandScope}
              />
            )}
          </TabItem>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
