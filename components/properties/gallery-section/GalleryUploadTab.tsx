"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import type { GalleryData } from "@/utils/types";
import { getWatermarkImageDataUrl } from "@/actions/imageActions";
import toast from "react-hot-toast";
import { useGalleryUpload } from "@/contexts/GalleryUploadContext";
import { BRAND_ADMIN_APP_TYPE, type BrandAdminScope } from "@/constants/brandAdminScope";
import {
  DropZone,
  UploadPreviewSection,
  IMAGE_MIME,
  fileToGalleryItem,
  zipToGalleryItems,
  processEntriesPreview,
  validateAllEntries,
  type UploadEntry,
} from "./upload-tab";

interface GalleryUploadTabProps {
  propertyId: string | null | undefined;
  propertyBrandMappingId?: string | null;
  brandScope?: BrandAdminScope;
  /** Called after a batch of images is successfully added to the property (use to refetch gallery). */
  onUploadSuccess?: () => void;
}

export default function GalleryUploadTab({
  propertyId,
  propertyBrandMappingId,
  brandScope = "instafarms",
  onUploadSuccess,
}: GalleryUploadTabProps) {
  const appType = BRAND_ADMIN_APP_TYPE[brandScope];
  const { phase, prepareUpload } = useGalleryUpload();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [validationResults, setValidationResults] = useState<Record<string, import("./upload-tab").ImageValidationResult> | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingIdsRef = useRef<Set<string>>(new Set());

  const uploading = phase === "uploading";

  // When context upload completes successfully, clear local entries and refetch gallery
  useEffect(() => {
    if (phase === "done") {
      setEntries([]);
      onUploadSuccess?.();
    }
  }, [phase, onUploadSuccess]);

  const addEntries = useCallback(
    (newEntries: { item: GalleryData; url: string; needsConversion: boolean; fileSize?: number; rawFormat?: string }[]) => {
      const uploadEntries: UploadEntry[] = newEntries.map((e) => ({
        item: e.item,
        objectUrl: e.url,
        needsConversion: e.needsConversion,
        fileSize: e.fileSize,
        rawFormat: e.rawFormat ?? null,
        processingPhoto: true,
        processingThumbnail: true,
      }));
      setEntries((prev) => [...prev, ...uploadEntries]);
      setError(null);
      setValidationResults(null);
    },
    []
  );

  // Validate all entries when they change (rules: format, size, orientation, resolution, 4:3)
  useEffect(() => {
    if (entries.length === 0) {
      setValidationResults(null);
      return;
    }
    let cancelled = false;
    setIsValidating(true);
    validateAllEntries(entries)
      .then((results) => {
        if (!cancelled) {
          setValidationResults(results);
        }
      })
      .finally(() => {
        if (!cancelled) setIsValidating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  // Run watermark + thumbnail preview after entries are in state (thumbnail conversion kept for future use; not uploaded or displayed).
  useEffect(() => {
    const needsProcessing = (e: UploadEntry) =>
      e.processingPhoto === true || e.processingThumbnail === true;
    const toProcess = entries.filter(
      (e) => needsProcessing(e) && !processingIdsRef.current.has(e.item.id)
    );
    if (toProcess.length === 0) return;

    const ids = new Set(toProcess.map((e) => e.item.id));
    ids.forEach((id) => processingIdsRef.current.add(id));

    const getWatermarkData = async () => {
      const timeoutMs = 15000;
      try {
        const data = await Promise.race([
          getWatermarkImageDataUrl(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs)
          ),
        ]);
        if (!data?.dataUrl) {
          toast.error(
            "Instafarm watermark not configured. Configure it in Settings to see watermarked previews."
          );
        }
        return { dataUrl: data?.dataUrl ?? null, displayNumber: data?.displayNumber ?? null };
      } catch {
        toast.error(
          "Failed to load watermark. Configure Instafarm watermark in Settings to see watermarked previews."
        );
        return { dataUrl: null, displayNumber: null };
      }
    };

    const onEntryUpdate = (id: string, updates: Record<string, unknown>) => {
      setEntries((prev) =>
        prev.map((e) => (e.item.id === id ? { ...e, ...updates } : e))
      );
    };

    processEntriesPreview(toProcess, getWatermarkData, onEntryUpdate).finally(() => {
      ids.forEach((id) => processingIdsRef.current.delete(id));
    });
  }, [entries]);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setIsProcessing(true);
      setError(null);
      try {
        const first = list[0]!;
        const isZip =
          list.length === 1 &&
          (/\.zip$/i.test(first.name) ||
            first.type === "application/zip" ||
            first.type === "application/x-zip-compressed");
        if (isZip) {
          const items = await zipToGalleryItems(first);
          if (items.length === 0) {
            setError("No image files found in the ZIP. Use image files (.jpg, .png, .gif, .webp, .bmp, .tiff, .heic, .svg, .ico, etc.).");
          } else {
            addEntries(items);
          }
        } else {
          const imageFiles = list.filter((f) => IMAGE_MIME.test(f.type));
          if (imageFiles.length === 0) {
            setError(
              "No image files found. Drop a .zip of images or image files (e.g. .jpg, .png, .webp, .gif, .bmp, .tiff, .heic, .svg, .ico)."
            );
            return;
          }
          addEntries(imageFiles.map((file) => fileToGalleryItem(file, v4())));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process files.");
      } finally {
        setIsProcessing(false);
      }
    },
    [addEntries]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer?.items;
      const files = e.dataTransfer?.files;
      if (items?.length) {
        const fileList: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const file = items[i]?.kind === "file" ? items[i].getAsFile() : null;
          if (file) fileList.push(file);
        }
        if (fileList.length > 0) processFiles(fileList);
      } else if (files?.length) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) processFiles(e.target.files);
      e.target.value = "";
    },
    [processFiles]
  );

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.item.id === id);
      if (entry) {
        URL.revokeObjectURL(entry.objectUrl);
        if (entry.processedPhotoUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.processedPhotoUrl);
        if (entry.processedThumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.processedThumbnailUrl);
      }
      return prev.filter((e) => e.item.id !== id);
    });
  }, []);

  const handleRemoveAll = useCallback(() => {
    setValidationResults(null);
    setEntries((prev) => {
      prev.forEach((e) => {
        URL.revokeObjectURL(e.objectUrl);
        if (e.processedPhotoUrl?.startsWith("blob:")) URL.revokeObjectURL(e.processedPhotoUrl);
        if (e.processedThumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(e.processedThumbnailUrl);
      });
      return [];
    });
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<GalleryData>) => {
    setEntries((prev) =>
      prev.map((e) => (e.item.id === id ? { ...e, item: { ...e.item, ...updates } } : e))
    );
  }, []);

  const openUploadModal = useCallback(() => {
    if (propertyId && entries.length > 0) {
      prepareUpload(
        propertyId,
        propertyBrandMappingId,
        entries,
        validationResults ?? undefined,
        appType,
      );
    }
  }, [propertyId, propertyBrandMappingId, entries, validationResults, prepareUpload, appType]);

  return (
    <div className="space-y-6">
      <DropZone
        isDragging={isDragging}
        isProcessing={isProcessing}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onFileInput={handleFileInput}
        inputRef={inputRef}
      />

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <UploadPreviewSection
        entries={entries}
        propertyId={propertyId}
        uploading={uploading}
        validationResults={validationResults}
        isValidating={isValidating}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        onRemoveAll={handleRemoveAll}
        onOpenUploadModal={openUploadModal}
      />
    </div>
  );
}
