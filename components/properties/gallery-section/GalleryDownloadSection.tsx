"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Checkbox } from "flowbite-react";
import { GalleryData } from "@/utils/types";
import toast from "react-hot-toast";
import { HiDownload } from "react-icons/hi";
import { HiPhotograph } from "react-icons/hi";
import { useGalleryDownload, type DownloadItem } from "@/contexts/GalleryDownloadContext";
import { CATEGORY_OPTIONS } from "./constants";
import { normalizeKeyToTabKey } from "@/hooks/properties/usePropertyGallery";

export interface GalleryDownloadSectionProps {
  allGallery: GalleryData[];
  /** Cover photos from properties.coverPhotos (up to 5). */
  coverPhotos: GalleryData[];
  propertyBrandMappingId?: string | null;
  brandScope?: "instafarms" | "mago";
}

/** Item shape for building the list (context adds status/error). */
type DownloadItemInput = Omit<DownloadItem, "status" | "error">;

export default function GalleryDownloadSection({
  allGallery,
  coverPhotos,
  propertyBrandMappingId,
  brandScope,
}: GalleryDownloadSectionProps) {
  const { startDownload, closeModal, phase } = useGalleryDownload();
  const isDownloadBusy = phase === "downloading" || phase === "creating_zip";
  const hasBrandScopedGallery = Boolean(propertyBrandMappingId?.trim());

  useEffect(() => {
    return () => {
      closeModal();
    };
  }, [closeModal]);
  const [downloadWatermark, setDownloadWatermark] = useState(true);
  const [downloadOriginal, setDownloadOriginal] = useState(true);
  const [downloadThumbnail, setDownloadThumbnail] = useState(false);
  const [downloadGrid, setDownloadGrid] = useState(false);
  const [downloadCoverOnly, setDownloadCoverOnly] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, true]))
  );

  /** Map gallery id -> full gallery item (for originalUrl, watermarkedUrlByInstafarms). */
  const galleryById = useMemo(() => new Map(allGallery.map((g) => [g.id, g])), [allGallery]);

  const filteredGallery = useMemo(() => {
    if (!hasBrandScopedGallery) return [];
    if (downloadCoverOnly) {
      // Use cover photos; merge with allGallery by id to get originalUrl/watermarkedUrl when same photo exists in gallery.
      const photos = (Array.isArray(coverPhotos) ? coverPhotos : []).filter((p) => p?.id) as GalleryData[];
      return photos.map((cover) => {
        const gallery = galleryById.get(cover.id);
        if (!gallery) return cover;
        return {
          ...cover,
          rawUrl: cover.rawUrl || gallery.rawUrl || gallery.originalUrl,
          originalUrl: cover.originalUrl || gallery.originalUrl,
          watermarkedUrlByInstafarms: cover.watermarkedUrlByInstafarms || gallery.watermarkedUrlByInstafarms,
          photoUrl: cover.photoUrl || gallery.photoUrl || gallery.watermarkedUrlByInstafarms,
          listingUrl: cover.listingUrl || gallery.listingUrl,
        };
      });
    }
    const hasCategoryFilter = CATEGORY_OPTIONS.some((o) => categoryFilters[o.value]);
    if (hasCategoryFilter) {
      const keySet = new Set(
        CATEGORY_OPTIONS.filter((o) => categoryFilters[o.value]).map((o) => o.value)
      );
      return allGallery.filter((g) => keySet.has(normalizeKeyToTabKey(g.key || "")));
    }
    return allGallery;
  }, [allGallery, categoryFilters, downloadCoverOnly, coverPhotos, galleryById, hasBrandScopedGallery]);

  const allCategoriesSelected = useMemo(
    () => CATEGORY_OPTIONS.every((o) => categoryFilters[o.value]),
    [categoryFilters]
  );

  const hasAnyCategorySelected = useMemo(
    () => CATEGORY_OPTIONS.some((o) => categoryFilters[o.value]),
    [categoryFilters]
  );

  const toggleAllCategories = useCallback(() => {
    if (allCategoriesSelected) {
      setCategoryFilters((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, false])));
    } else {
      setDownloadCoverOnly(false);
      setCategoryFilters((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, true])));
    }
  }, [allCategoriesSelected]);

  const buildDownloadList = useCallback((): DownloadItemInput[] => {
    const items: DownloadItemInput[] = [];
    const seen = new Set<string>();
    for (const g of filteredGallery) {
      const baseName = `${(g.key || "cover").replace(/\s+/g, "-")}_${g.id}`;
      const rawUrl = g.rawUrl || g.originalUrl;
      const watermarkedUrl =
        g.photoUrl || g.listingUrl || g.watermarkedUrlByInstafarms;
      if (downloadOriginal && rawUrl) {
        const id = `${g.id}_raw`;
        if (!seen.has(id)) {
          seen.add(id);
          items.push({ id, label: `${baseName}.jpg`, folder: "original", url: rawUrl });
        }
      }
      if (downloadWatermark && watermarkedUrl) {
        const id = `${g.id}_photo`;
        if (!seen.has(id)) {
          seen.add(id);
          items.push({
            id,
            label: `${baseName}_watermarked.jpg`,
            folder: "watermarked",
            url: watermarkedUrl,
          });
        }
      }
      if (downloadCoverOnly && downloadThumbnail && g.thumbnailUrl) {
        const id = `${g.id}_thumb`;
        if (!seen.has(id)) {
          seen.add(id);
          items.push({
            id,
            label: `${baseName}_thumb.jpg`,
            folder: "thumbnails",
            url: g.thumbnailUrl,
          });
        }
      }
      if (downloadCoverOnly && downloadGrid && g.gridUrl) {
        const id = `${g.id}_grid`;
        if (!seen.has(id)) {
          seen.add(id);
          items.push({
            id,
            label: `${baseName}_grid.jpg`,
            folder: "grid",
            url: g.gridUrl,
          });
        }
      }
    }
    return items;
  }, [
    filteredGallery,
    downloadOriginal,
    downloadWatermark,
    downloadThumbnail,
    downloadGrid,
    downloadCoverOnly,
  ]);

  const downloadItemCount = useMemo(() => buildDownloadList().length, [buildDownloadList]);
  const selectedImageCount = filteredGallery.length;
  const originalAvailableCount = useMemo(
    () => filteredGallery.filter((g) => Boolean(g.rawUrl || g.originalUrl)).length,
    [filteredGallery]
  );
  const watermarkedAvailableCount = useMemo(
    () =>
      filteredGallery.filter((g) =>
        Boolean(g.photoUrl || g.listingUrl || g.watermarkedUrlByInstafarms)
      ).length,
    [filteredGallery]
  );
  const thumbnailAvailableCount = useMemo(
    () => filteredGallery.filter((g) => Boolean(g.thumbnailUrl)).length,
    [filteredGallery]
  );
  const gridAvailableCount = useMemo(
    () => filteredGallery.filter((g) => Boolean(g.gridUrl)).length,
    [filteredGallery]
  );

  const handleDownloadClick = useCallback(() => {
    if (isDownloadBusy) {
      toast.error("A download is already in progress.");
      return;
    }
    const items = buildDownloadList();
    if (items.length === 0) {
      toast.error("No images to download. Adjust filters or ensure images have URLs.");
      return;
    }
    startDownload(items);
  }, [buildDownloadList, startDownload, isDownloadBusy]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/20 dark:to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400">
            <HiDownload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Download Images
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasBrandScopedGallery
                ? `Export ${brandScope === "mago" ? "Mago" : "Instafarms"} brand images as a single ZIP file`
                : "Brand-specific gallery data is unavailable for this property/brand selection"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-900/10 p-4 border border-emerald-100 dark:border-emerald-800/40">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 px-4 py-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Selected images</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{selectedImageCount}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 px-4 py-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Originals available</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{originalAvailableCount}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 px-4 py-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Watermarked available</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{watermarkedAvailableCount}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 px-4 py-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Thumbnails available</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{thumbnailAvailableCount}</p>
            </div>
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/40 px-4 py-3 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Grid available</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{gridAvailableCount}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            Total ZIP files = selected variant count, not just gallery image count. Each image can contribute an original file, a watermarked file, and for cover-only downloads a thumbnail and grid file.
          </p>
        </div>

        {/* Image type */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-700/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <HiPhotograph className="h-4 w-4 text-gray-400" />
            Image type
          </p>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
            <Checkbox
              checked={downloadOriginal}
              onChange={(e) => setDownloadOriginal(e.target.checked)}
              disabled={!hasBrandScopedGallery}
              className="focus:ring-emerald-500"
            />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Original
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
            <Checkbox
              checked={downloadWatermark}
              onChange={(e) => setDownloadWatermark(e.target.checked)}
              disabled={!hasBrandScopedGallery}
              className="focus:ring-emerald-500"
            />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Watermarked
              </span>
            </label>
            {downloadCoverOnly && (
              <>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={downloadThumbnail}
                    onChange={(e) => setDownloadThumbnail(e.target.checked)}
                    disabled={!hasBrandScopedGallery}
                    className="focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    Thumbnail images
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={downloadGrid}
                    onChange={(e) => setDownloadGrid(e.target.checked)}
                    disabled={!hasBrandScopedGallery}
                    className="focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    Grid images
                  </span>
                </label>
              </>
            )}
          </div>
        </div>

        {/* Categories — disabled when Cover images only is on */}
        <div
          className={`rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-700/50 transition-opacity ${
            downloadCoverOnly ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Filter by category
            </p>
            <button
              type="button"
              onClick={toggleAllCategories}
              disabled={downloadCoverOnly || !hasBrandScopedGallery}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
            >
              {allCategoriesSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => {
              const checked = categoryFilters[opt.value] ?? false;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const nextChecked = !(categoryFilters[opt.value] ?? false);
                    if (nextChecked) setDownloadCoverOnly(false);
                    setCategoryFilters((prev) => ({ ...prev, [opt.value]: nextChecked }));
                  }}
                  disabled={!hasBrandScopedGallery}
                  className={`
                    rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                    ${checked
                      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
                    }
                  `}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {downloadCoverOnly && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Uncheck &quot;Cover images only&quot; to filter by category.
            </p>
          )}
        </div>

        {/* Cover only — disabled when any category is selected */}
        <div
          className={`rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-700/50 transition-opacity ${
            hasAnyCategorySelected ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <label className={`flex items-center gap-3 group ${hasAnyCategorySelected ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <Checkbox
              checked={downloadCoverOnly}
              disabled={hasAnyCategorySelected || !hasBrandScopedGallery}
              onChange={(e) => {
                const checked = e.target.checked;
                setDownloadCoverOnly(checked);
                if (checked) {
                  setCategoryFilters((prev) =>
                    Object.fromEntries(Object.keys(prev).map((k) => [k, false]))
                  );
                }
              }}
              className="focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
              Cover images only
            </span>
          </label>
          {hasAnyCategorySelected && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Deselect all categories to use cover-only filter.
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="pt-4 flex justify-center">
          <Button
            color="success"
            onClick={handleDownloadClick}
            disabled={
              isDownloadBusy ||
              filteredGallery.length === 0 ||
              !hasBrandScopedGallery ||
              !(
                downloadOriginal ||
                downloadWatermark ||
                (downloadCoverOnly && (downloadThumbnail || downloadGrid))
              )
            }
            className="w-full sm:w-auto min-w-[240px] py-3 px-6 rounded-xl font-semibold text-base shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:hover:scale-100"
          >
            <HiDownload className="h-5 w-5 mr-2 shrink-0" />
            <span>Download as ZIP</span>
            {downloadItemCount > 0 && (
              <span className="ml-2.5 px-2.5 py-0.5 rounded-md bg-white/25 text-sm font-medium backdrop-blur-sm">
                {downloadItemCount} {downloadItemCount === 1 ? "file" : "files"}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
