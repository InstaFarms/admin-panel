"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Label, Select, TabItem, Tabs } from "flowbite-react";
import type { GalleryData } from "@/utils/types";
import { resolveImageSrc } from "@/utils/image";

const GALLERY_TAB_KEYS = ["outdoors", "indoors", "bed-bath", "amenities"] as const;
const PAGE_SIZE = 5;
const GALLERY_TAB_TITLES: Record<(typeof GALLERY_TAB_KEYS)[number], string> = {
  outdoors: "Outdoors",
  indoors: "Indoors",
  "bed-bath": "Bed & Bath",
  amenities: "Amenities",
};

function normalizeKeyToTabKey(key: string): (typeof GALLERY_TAB_KEYS)[number] {
  const k = (key || "")
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/\s+&\s+|\s+and\s+/g, "-")
    .replace(/\s+/g, "-");
  if (k === "outdoors" || k === "indoors" || k === "bed-bath" || k === "amenities") return k;
  return "outdoors";
}

function getImageUrl(image: Partial<GalleryData> | null | undefined): string {
  if (!image) return "";
  const raw =
    image.photoUrl ||
    image.watermarkedUrlByInstafarms ||
    image.originalUrl ||
    image.rawUrl ||
    image.thumbnailUrl ||
    "";
  return resolveImageSrc(raw) ?? "";
}

function padToFive<T>(arr: T[]): (T | null)[] {
  const next: (T | null)[] = [...arr].slice(0, 5);
  while (next.length < 5) next.push(null);
  return next;
}

export default function SplitGallerySection({
  gallery,
  coverPhotos,
  onGalleryChange,
  onCoverPhotosChange,
}: {
  gallery: GalleryData[];
  coverPhotos: (GalleryData | null)[];
  onGalleryChange?: (gallery: GalleryData[]) => void;
  onCoverPhotosChange?: (coverPhotos: (GalleryData | null)[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetTab, setTargetTab] = useState<(typeof GALLERY_TAB_KEYS)[number]>("outdoors");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [visibleByTab, setVisibleByTab] = useState<Record<(typeof GALLERY_TAB_KEYS)[number], number>>({
    outdoors: PAGE_SIZE,
    indoors: PAGE_SIZE,
    "bed-bath": PAGE_SIZE,
    amenities: PAGE_SIZE,
  });
  const sentinelRefs = useRef<Record<(typeof GALLERY_TAB_KEYS)[number], HTMLDivElement | null>>({
    outdoors: null,
    indoors: null,
    "bed-bath": null,
    amenities: null,
  });

  useEffect(() => {
    const validIds = new Set((gallery || []).map((item) => item.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [gallery]);

  const grouped = useMemo(() => {
    const out = GALLERY_TAB_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: [] as GalleryData[] }),
      {} as Record<(typeof GALLERY_TAB_KEYS)[number], GalleryData[]>
    );
    for (const image of gallery || []) {
      const key = normalizeKeyToTabKey(image?.key || "");
      out[key].push(image);
    }
    for (const key of GALLERY_TAB_KEYS) {
      out[key].sort((a, b) => {
        const x = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const y = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (x !== y) return x - y;
        return (a.id || "").localeCompare(b.id || "");
      });
    }
    return out;
  }, [gallery]);

  useEffect(() => {
    setVisibleByTab({
      outdoors: PAGE_SIZE,
      indoors: PAGE_SIZE,
      "bed-bath": PAGE_SIZE,
      amenities: PAGE_SIZE,
    });
  }, [gallery]);

  useEffect(() => {
    const activeTabKey = GALLERY_TAB_KEYS[activeTabIndex];
    if (!activeTabKey) return;
    const sentinel = sentinelRefs.current[activeTabKey];
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleByTab((prev) => {
          const total = grouped[activeTabKey]?.length ?? 0;
          const current = prev[activeTabKey] ?? PAGE_SIZE;
          if (current >= total) return prev;
          return {
            ...prev,
            [activeTabKey]: Math.min(current + PAGE_SIZE, total),
          };
        });
      },
      { root: null, rootMargin: "120px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTabIndex, grouped, visibleByTab]);

  const safeCoverPhotos = useMemo(
    () => padToFive((coverPhotos || []).filter(Boolean) as GalleryData[]),
    [coverPhotos]
  );

  const selectedCount = selectedIds.size;
  const imageMap = useMemo(() => new Map((gallery || []).map((item) => [item.id, item])), [gallery]);
  const selectedInTargetCount = useMemo(
    () => (gallery || []).filter((item) => selectedIds.has(item.id) && normalizeKeyToTabKey(item.key) === targetTab).length,
    [gallery, selectedIds, targetTab]
  );

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const removeSelected = () => {
    if (!onGalleryChange || selectedCount === 0) return;
    const nextGallery = (gallery || []).filter((item) => !selectedIds.has(item.id));
    const nextCovers = safeCoverPhotos.map((item) => (item && selectedIds.has(item.id) ? null : item));
    onGalleryChange(nextGallery);
    onCoverPhotosChange?.(nextCovers);
    setSelectedIds(new Set());
  };

  const moveSelected = () => {
    if (!onGalleryChange || selectedCount === 0) return;
    const nextGallery = (gallery || []).map((item) =>
      selectedIds.has(item.id) ? { ...item, key: targetTab } : item
    );
    onGalleryChange(nextGallery);
  };

  const selectAll = () => {
    setSelectedIds(new Set((gallery || []).map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const setCoverSlotForImage = (imageId: string, slotValue: string) => {
    const image = imageMap.get(imageId);
    if (!image || !onCoverPhotosChange) return;
    const slot = Number(slotValue);
    const next = safeCoverPhotos.map((item) => (item?.id === imageId ? null : item));
    if (slot >= 1 && slot <= 5) {
      next[slot - 1] = image;
    }
    onCoverPhotosChange(next);
  };

  const getCoverSlotByImageId = (imageId: string): string => {
    const idx = safeCoverPhotos.findIndex((item) => item?.id === imageId);
    return idx === -1 ? "0" : String(idx + 1);
  };

  const clearCoverSlot = (index: number) => {
    if (!onCoverPhotosChange) return;
    const next = [...safeCoverPhotos];
    next[index] = null;
    onCoverPhotosChange(next);
  };

  return (
    <div className="space-y-1">
      <Card className="border border-blue-200/70 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="text-[11px] text-gray-700 dark:text-gray-200">
              <span className="font-semibold">{selectedCount}</span> image{selectedCount === 1 ? "" : "s"} selected
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" color="light" className="h-6 px-1.5 text-[10px]" onClick={selectAll} disabled={(gallery || []).length === 0}>
                Select all
              </Button>
              <Button size="xs" color="light" className="h-6 px-1.5 text-[10px]" onClick={clearSelection} disabled={selectedCount === 0}>
                Clear selection
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <div className="min-w-[130px]">
              <Select
                id="move-selected-tab"
                sizing="sm"
                className="text-[11px]"
                value={targetTab}
                onChange={(e) => setTargetTab(e.target.value as (typeof GALLERY_TAB_KEYS)[number])}
              >
                {GALLERY_TAB_KEYS.map((tabKey) => (
                  <option key={tabKey} value={tabKey}>
                    {GALLERY_TAB_TITLES[tabKey]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              size="xs"
              color="info"
              disabled={selectedCount === 0 || selectedInTargetCount === selectedCount}
              onClick={moveSelected}
              className="h-6 bg-blue-500 px-1.5 text-[10px] hover:bg-blue-800"
            >
              Move {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
            <Button size="xs" color="failure" disabled={selectedCount === 0} onClick={removeSelected} className="h-6 bg-red-500 px-1.5 text-[10px] hover:bg-red-800">
              Remove {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              {selectedCount > 0
                ? `${selectedInTargetCount} already in ${GALLERY_TAB_TITLES[targetTab]}`
                : "Select images to move or remove"}
            </div>
          </div>
        </div>
      </Card>
      <Tabs onActiveTabChange={(index) => setActiveTabIndex(typeof index === "number" ? index : 0)}>
        {GALLERY_TAB_KEYS.map((tabKey) => {
          const items = grouped[tabKey];
          const visibleCount = visibleByTab[tabKey] ?? PAGE_SIZE;
          const visibleItems = items.slice(0, visibleCount);
          const hasMore = visibleCount < items.length;
          return (
            <TabItem
              key={tabKey}
              title={
                <span className="inline-flex items-center gap-2">
                  {GALLERY_TAB_TITLES[tabKey]}
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-gray-200/80 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-600/80 dark:text-gray-300">
                    {items.length}
                  </span>
                </span>
              }
            >
              {items.length === 0 ? (
                <div className="py-8 text-sm text-gray-500 dark:text-gray-400">
                  No images available in this category.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleItems.map((image) => {
                    const src = getImageUrl(image);
                    return (
                      <Card key={image.id} className="overflow-hidden">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start">
                          <div className="w-full md:w-[220px] md:min-w-[220px]">
                            {src ? (
                              <img
                                src={src}
                                alt={image.altText || image.fileName || image.name || "Gallery image"}
                                className="h-36 w-full rounded-lg object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-36 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                                Image unavailable
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedIds.has(image.id)}
                                onChange={(e) => toggleSelection(image.id, e.target.checked)}
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Select</span>
                            </div>

                            <div className="truncate font-medium text-gray-800 dark:text-gray-100">
                              {image.fileName || image.name || "Untitled"}
                            </div>
                            <div className="truncate">{image.altText || "No alt text"}</div>

                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <div>
                                <Label htmlFor={`category-${image.id}`}>Place</Label>
                                <Select
                                  id={`category-${image.id}`}
                                  sizing="sm"
                                  value={normalizeKeyToTabKey(image.key)}
                                  onChange={(e) => {
                                    if (!onGalleryChange) return;
                                    const nextGallery = (gallery || []).map((item) =>
                                      item.id === image.id ? { ...item, key: e.target.value } : item
                                    );
                                    onGalleryChange(nextGallery);
                                  }}
                                >
                                  {GALLERY_TAB_KEYS.map((key) => (
                                    <option key={key} value={key}>
                                      {GALLERY_TAB_TITLES[key]}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor={`cover-slot-${image.id}`}>Cover Slot</Label>
                                <Select
                                  id={`cover-slot-${image.id}`}
                                  sizing="sm"
                                  value={getCoverSlotByImageId(image.id)}
                                  onChange={(e) => setCoverSlotForImage(image.id, e.target.value)}
                                >
                                  <option value="0">Not cover</option>
                                  <option value="1">Cover 1</option>
                                  <option value="2">Cover 2</option>
                                  <option value="3">Cover 3</option>
                                  <option value="4">Cover 4</option>
                                  <option value="5">Cover 5</option>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  <div ref={(el) => { sentinelRefs.current[tabKey] = el; }} className="h-3 w-full" />
                  {!hasMore ? (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                      End of section
                    </div>
                  ) : (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                      Scroll to load more
                    </div>
                  )}
                </div>
              )}
            </TabItem>
          );
        })}
        <TabItem title="Cover Images">
          <div className="space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-300">Click any image card to assign cover slot, or clear below.</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {safeCoverPhotos.map((cover, idx) => {
                const src = getImageUrl(cover);
                return (
                  <Card key={`cover-slot-${idx}`} className="overflow-hidden">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Cover {idx + 1}</span>
                      <Button size="xs" color="light" onClick={() => clearCoverSlot(idx)}>
                        Clear
                      </Button>
                    </div>
                    {src ? (
                      <img
                        src={src}
                        alt={cover?.altText || cover?.fileName || cover?.name || `Cover ${idx + 1}`}
                        className="h-32 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        Empty slot
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </TabItem>
      </Tabs>
    </div>
  );
}

