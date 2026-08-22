"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TabsRef } from "flowbite-react";
import { GalleryData } from "@/utils/types";
import { fetchPropertyGalleryAll, fetchPropertyCoverPhotos } from "@/actions/propertyActions";

export const GALLERY_TAB_KEYS = ["outdoors", "indoors", "bed-bath", "amenities"] as const;
export const GALLERY_TAB_TITLES = ["Outdoors", "Indoors", "Bed & Bath", "Amenities"];
export const GALLERY_LOAD_SIZE = 5;
/** Max cards rendered per tab to avoid browser pressure from too many DOM nodes/images */
export const GALLERY_MAX_VISIBLE = 150;

export type GalleryTabKey = (typeof GALLERY_TAB_KEYS)[number];

/** Which image variant to show in gallery tabs: original or watermarked. */
export type GalleryImageViewMode = "original" | "watermarked";

/**
 * Normalize API key (e.g. "Bed & Bath", "bed and bath") to our tab key (e.g. "bed-bath").
 * API may return "Bed & Bath" or "Outdoors" etc.; we use lowercase with hyphens.
 * Exported for use in Select components where raw key may not match option values.
 */
export function normalizeKeyToTabKey(key: string): GalleryTabKey {
  const k = (key || "").toLowerCase().trim().replace(/_/g, "-").replace(/\s+&\s+|\s+and\s+/g, "-").replace(/\s+/g, "-");
  if (GALLERY_TAB_KEYS.includes(k as GalleryTabKey)) return k as GalleryTabKey;
  // Direct match after normalizing "bed & bath" -> "bed-bath", "bed-bath" -> "bed-bath"
  if (k === "bed-bath") return "bed-bath";
  if (k === "outdoors") return "outdoors";
  if (k === "indoors") return "indoors";
  if (k === "amenities") return "amenities";
  return "outdoors"; // fallback
}

/** Tab index: 0=Outdoors, 1=Indoors, 2=Bed&Bath, 3=Amenities, 4=Upload, 5=Cover, 6=Download */
export function getCategoryTabIndexForKey(key: string): number {
  const normalizedKey = normalizeKeyToTabKey(key);
  const tabKeyIndex = GALLERY_TAB_KEYS.findIndex((k) => k === normalizedKey);
  return tabKeyIndex >= 0 ? tabKeyIndex : 0;
}

function groupGalleryByTab(gallery: GalleryData[]): Record<GalleryTabKey, GalleryData[]> {
  const out: Record<string, GalleryData[]> = {
    outdoors: [],
    indoors: [],
    "bed-bath": [],
    amenities: [],
  };
  for (const g of gallery) {
    const k = normalizeKeyToTabKey(g.key || "");
    if (k in out) out[k].push(g);
  }
  // Sort each tab by sortOrder (1, 2, 3, ...), then by id for stability
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.id ?? "").localeCompare(b.id ?? "");
    });
  }
  return out as Record<GalleryTabKey, GalleryData[]>;
}

function computeGalleryDirty(current: GalleryData[], last: GalleryData[]): boolean {
  if (current.length !== last.length) return true;
  const lastMap = new Map(last.map((g) => [g.id, g]));
  for (const g of current) {
    const l = lastMap.get(g.id);
    if (!l) return true;
    const nameA = g.fileName ?? g.caption ?? "";
    const nameB = l.fileName ?? l.caption ?? "";
    if (nameA !== nameB) return true;
    if ((g.altText ?? "") !== (l.altText ?? "")) return true;
    if ((g.key ?? "") !== (l.key ?? "")) return true;
    if ((g.sortOrder ?? 0) !== (l.sortOrder ?? 0)) return true;
  }
  return false;
}

export interface UsePropertyGalleryResult {
  allGallery: GalleryData[];
  /** Cover photos from properties.coverPhotos (up to 5, order preserved). */
  coverPhotos: GalleryData[];
  /** True when gallery has local edits (name, altText, category, order) not yet saved. */
  isDirty: boolean;
  loading: boolean;
  byTab: Record<GalleryTabKey, GalleryData[]>;
  visibleByTab: Record<string, number>;
  loadMore: (tabKey: string) => void;
  /** Ensure at least minCount items are visible in the tab (e.g. for scroll-to-item). */
  ensureVisibleCount: (tabKey: string, minCount: number) => void;
  updateGalleryItem: (id: string, updates: Partial<GalleryData>) => void;
  /** Reorder items in a tab; orderedIds is the new order of item ids, sortOrder will be set to 1, 2, 3, ... */
  reorderInTab: (tabKey: GalleryTabKey, orderedIds: string[]) => void;
  /** Remove item from the in-memory list only (no API/DB delete). */
  removeFromList: (id: string) => void;
  /** Which image variant to show: original, watermarked, or thumbnail. Only one is active (ticked). */
  imageViewMode: GalleryImageViewMode;
  /** Set which image variant to show. */
  setImageViewMode: (mode: GalleryImageViewMode) => void;
  /** Refetch gallery from server (e.g. after upload). */
  refetchGallery: () => void;
}

export function usePropertyGallery(
  propertyId: string | null | undefined,
  initialCoverPhotos?: GalleryData[],
  propertyBrandMappingId?: string | null
): UsePropertyGalleryResult {
  const [allGallery, setAllGallery] = useState<GalleryData[]>([]);
  const [lastFetchedGallery, setLastFetchedGallery] = useState<GalleryData[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<GalleryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageViewMode, setImageViewMode] = useState<GalleryImageViewMode>("original");
  const [visibleByTab, setVisibleByTab] = useState<Record<string, number>>({
    outdoors: GALLERY_LOAD_SIZE,
    indoors: GALLERY_LOAD_SIZE,
    "bed-bath": GALLERY_LOAD_SIZE,
    amenities: GALLERY_LOAD_SIZE,
  });

  useEffect(() => {
    if (!propertyId?.trim()) {
      setAllGallery([]);
      setCoverPhotos([]);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchPropertyGalleryAll(propertyId, propertyBrandMappingId ?? undefined),
      fetchPropertyCoverPhotos(propertyId, propertyBrandMappingId ?? undefined),
    ])
      .then(([galleryResult, coverResult]) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[GallerySection] fetchPropertyGalleryAll result:", {
            propertyId,
            propertyBrandMappingId,
            galleryResult,
          });
          console.log("[GallerySection] fetchPropertyCoverPhotos result:", {
            propertyId,
            propertyBrandMappingId,
            coverResult,
          });
        }
        const list = Array.isArray(galleryResult?.data) ? galleryResult.data : [];
        setAllGallery(list);
        setLastFetchedGallery(list);
        const photos = Array.isArray(coverResult?.coverPhotos) ? coverResult.coverPhotos : [];
        setCoverPhotos(photos);
      })
      .catch((err) => {
        console.error("usePropertyGallery fetch error:", err);
        setAllGallery([]);
        setLastFetchedGallery([]);
        setCoverPhotos([]);
      })
      .finally(() => setLoading(false));
  }, [propertyId, propertyBrandMappingId]);

  const byTab = useMemo(() => groupGalleryByTab(allGallery), [allGallery]);

  /** Cover photos from API, or initialCoverPhotos from /full when API returns empty. */
  const effectiveCoverPhotos = useMemo(() => {
    if (Array.isArray(coverPhotos) && coverPhotos.length > 0) return coverPhotos;
    return Array.isArray(initialCoverPhotos) ? initialCoverPhotos : [];
  }, [coverPhotos, initialCoverPhotos]);

  const isDirty = useMemo(
    () => computeGalleryDirty(allGallery, lastFetchedGallery),
    [allGallery, lastFetchedGallery]
  );

  const updateGalleryItem = useCallback((id: string, updates: Partial<GalleryData>) => {
    setAllGallery((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const loadMore = useCallback((tabKey: string) => {
    setVisibleByTab((prev) => {
      const current = prev[tabKey] ?? GALLERY_LOAD_SIZE;
      const next = Math.min(current + GALLERY_LOAD_SIZE, GALLERY_MAX_VISIBLE);
      return { ...prev, [tabKey]: next };
    });
  }, []);

  const ensureVisibleCount = useCallback((tabKey: string, minCount: number) => {
    setVisibleByTab((prev) => {
      const current = prev[tabKey] ?? GALLERY_LOAD_SIZE;
      const next = Math.min(Math.max(current, minCount), GALLERY_MAX_VISIBLE);
      return { ...prev, [tabKey]: next };
    });
  }, []);

  const reorderInTab = useCallback((tabKey: string, orderedIds: string[]) => {
    setAllGallery((prev) =>
      prev.map((g) => {
        const k = normalizeKeyToTabKey(g.key || "");
        if (k !== tabKey) return g;
        const idx = orderedIds.indexOf(g.id);
        if (idx === -1) return g;
        return { ...g, sortOrder: idx + 1 };
      })
    );
  }, []);

  const removeFromList = useCallback((id: string) => {
    setAllGallery((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const refetchGallery = useCallback(() => {
    if (!propertyId?.trim()) return;
    setLoading(true);
    Promise.all([
      fetchPropertyGalleryAll(propertyId, propertyBrandMappingId ?? undefined),
      fetchPropertyCoverPhotos(propertyId, propertyBrandMappingId ?? undefined),
    ])
      .then(([galleryResult, coverResult]) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[GallerySection] refetchPropertyGalleryAll result:", {
            propertyId,
            propertyBrandMappingId,
            galleryResult,
          });
          console.log("[GallerySection] refetchPropertyCoverPhotos result:", {
            propertyId,
            propertyBrandMappingId,
            coverResult,
          });
        }
        const list = Array.isArray(galleryResult?.data) ? galleryResult.data : [];
        setAllGallery(list);
        setLastFetchedGallery(list);
        const photos = Array.isArray(coverResult?.coverPhotos) ? coverResult.coverPhotos : [];
        setCoverPhotos(photos);
      })
      .catch((err) => {
        console.error("usePropertyGallery refetch error:", err);
        setAllGallery([]);
        setLastFetchedGallery([]);
        setCoverPhotos([]);
      })
      .finally(() => setLoading(false));
  }, [propertyId, propertyBrandMappingId]);

  return {
    allGallery,
    coverPhotos: effectiveCoverPhotos,
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
  };
}

export interface UseGallerySectionTabsResult {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  scrollToItemId: string | null;
  setScrollToItemId: (id: string | null) => void;
  tabsRef: React.RefObject<TabsRef | null>;
  handleCoverEdit: (item: GalleryData) => void;
}

export function useGallerySectionTabs(
  byTab: Record<GalleryTabKey, GalleryData[]>,
  ensureVisibleCount: (tabKey: string, minCount: number) => void
): UseGallerySectionTabsResult {
  const [activeTab, setActiveTab] = useState(0);
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState<{ itemId: string; tabIndex: number } | null>(null);
  const tabsRef = useRef<TabsRef | null>(null);

  const handleCoverEdit = useCallback((item: GalleryData) => {
    const key = item.key ?? "";
    const tabIndex = getCategoryTabIndexForKey(key);
    setPendingScroll({ itemId: item.id, tabIndex });
    setActiveTab(tabIndex);
    tabsRef.current?.setActiveTab(tabIndex);
  }, []);

  useEffect(() => {
    if (pendingScroll == null) return;
    if (activeTab !== pendingScroll.tabIndex) return;
    const { itemId, tabIndex } = pendingScroll;
    setPendingScroll(null);
    const tabKey = GALLERY_TAB_KEYS[tabIndex];
    if (tabKey) {
      const tabItems = byTab[tabKey] ?? [];
      const index = tabItems.findIndex((i) => i.id === itemId);
      if (index >= 0) ensureVisibleCount(tabKey, index + 1);
    }
    const t = setTimeout(() => setScrollToItemId(itemId), 400);
    return () => clearTimeout(t);
  }, [pendingScroll, activeTab, byTab, ensureVisibleCount]);

  return {
    activeTab,
    setActiveTab,
    scrollToItemId,
    setScrollToItemId,
    tabsRef,
    handleCoverEdit,
  };
}
