"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "flowbite-react";
import toast from "react-hot-toast";
import type { GalleryData } from "@/utils/types";
import { getGalleryUploadKeys } from "@/actions/imageActions";
import { addGalleryImagesToProperty } from "@/actions/propertyActions";
import { putToSignedUrl } from "@/utils/signedUpload";
import {
  entryToFile,
  blobUrlToFile,
  buildGalleryDataFromClientUrls,
  loadImageMetadata,
} from "@/components/properties/gallery-section/upload-tab";
import type {
  UploadEntry,
  UploadStatusState,
  ImageValidationResult,
} from "@/components/properties/gallery-section/upload-tab";
import { validateAllEntries } from "@/components/properties/gallery-section/upload-tab";
import GalleryUploadModalContent from "./GalleryUploadModalContent";
import { captureError } from "@/lib/sentry";

/* ============================
   TYPES
============================ */

export type UploadPhase = "idle" | "uploading" | "done" | "error";

export interface UploadJob {
  id: string;
  propertyId: string;
  propertyBrandMappingId?: string | null;
  appType?: string;
  entries: UploadEntry[];
  uploadStatuses: Record<string, UploadStatusState>;
  /** Validation results per entry id; null while validating. */
  validationResults: Record<string, ImageValidationResult> | null;
}

interface GalleryUploadState {
  phase: UploadPhase;
  currentJob: UploadJob | null;
  overallError: string | null;
  modalOpen: boolean;
}

interface GalleryUploadContextValue extends GalleryUploadState {
  completedCount: number;
  totalCount: number;
  prepareUpload: (
    propertyId: string,
    propertyBrandMappingId: string | null | undefined,
    entries: UploadEntry[],
    validationResults?: Record<string, ImageValidationResult> | null,
    appType?: string
  ) => void;
  updateValidationResults: (results: Record<string, ImageValidationResult>) => void;
  startUpload: () => void;
  openModal: () => void;
  minimizeModal: () => void;
  closeModal: () => void;
  cancelUpload: () => void;
  dismissSuccessPopup: () => void;
}

/* ============================
   CONTEXT
============================ */

const GalleryUploadContext = createContext<GalleryUploadContextValue | null>(null);

export function useGalleryUpload() {
  const ctx = useContext(GalleryUploadContext);
  if (!ctx) {
    throw new Error("useGalleryUpload must be used within GalleryUploadProvider");
  }
  return ctx;
}

/* ============================
   HELPERS
============================ */

const UPLOAD_CONCURRENCY = 4;

function revokeEntryBlobUrls(entry: UploadEntry) {
  try {
    if (entry.objectUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.objectUrl);
    if (entry.processedPhotoUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.processedPhotoUrl);
    if (entry.processedThumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(entry.processedThumbnailUrl);
  } catch {
    // ignore
  }
}

/* ============================
   PROVIDER
============================ */

export function GalleryUploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GalleryUploadState>({
    phase: "idle",
    currentJob: null,
    overallError: null,
    modalOpen: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const jobRunningRef = useRef(false);

  const completedCount = state.currentJob
    ? state.currentJob.entries.filter(
        (e) =>
          state.currentJob!.uploadStatuses[e.item.id]?.status === "success" ||
          state.currentJob!.uploadStatuses[e.item.id]?.status === "error"
      ).length
    : 0;
  const totalCount = state.currentJob ? state.currentJob.entries.length : 0;

  const runUploadJob = useCallback(async (job: UploadJob, entriesToUpload: UploadEntry[]) => {
    if (jobRunningRef.current) return; // Prevent double invocation (double-click, Strict Mode, etc.)
    jobRunningRef.current = true;
    cancelledRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    const updateStatuses = (updater: (prev: Record<string, UploadStatusState>) => Record<string, UploadStatusState>) => {
      setState((s) => {
        if (s.currentJob?.id !== job.id) return s;
        return {
          ...s,
          currentJob: {
            ...s.currentJob,
            uploadStatuses: updater(s.currentJob.uploadStatuses),
          },
        };
      });
    };

    setState((s) => ({ ...s, phase: "uploading", overallError: null }));

    const { propertyId, appType } = job;
    const entries = entriesToUpload;

    try {
      const urlResult = await getGalleryUploadKeys(propertyId, entries.length, appType);
      if (urlResult.error || !urlResult.slots) {
        toast.error(urlResult.error ?? "Failed to get upload keys");
        updateStatuses(() =>
          entries.reduce<Record<string, UploadStatusState>>((acc, e) => {
            acc[e.item.id] = {
              status: "error",
              message: urlResult.error,
              rawStatus: "error",
              photoStatus: "error",
              listingStatus: "error",
            };
            return acc;
          }, {})
        );
        setState((s) => ({ ...s, phase: "error" }));
        return;
      }

      if (signal.aborted || cancelledRef.current) return;

      const slots = urlResult.slots;
      const uploadedResults: (GalleryData | null)[] = new Array(entries.length);

      const putToR2 = (key: string, file: File) =>
        putToSignedUrl(`/api/r2-upload/image?key=${encodeURIComponent(key)}`, file, signal);

      const validationResults = job.validationResults ?? {};

      const formatToMimeType = (format: string): string | null => {
        const f = format.toUpperCase();
        if (f === "JPG" || f === "JPEG") return "image/jpeg";
        if (f === "PNG") return "image/png";
        if (f === "WEBP") return "image/webp";
        if (f === "AVIF") return "image/avif";
        if (f === "GIF") return "image/gif";
        if (f === "BMP") return "image/bmp";
        if (f === "TIFF") return "image/tiff";
        if (f === "HEIC") return "image/heic";
        if (f === "HEIF") return "image/heif";
        if (f === "SVG") return "image/svg+xml";
        if (f === "ICO") return "image/x-icon";
        return null;
      };

      const processEntry = async (
        i: number,
        entry: UploadEntry,
        slot: (typeof slots)[number]
      ): Promise<{ galleryItem: GalleryData; size: number }> => {
        const name = entry.item.fileName || "image";
        const [originalFile, watermarkedFile] = await Promise.all([
          entryToFile(entry),
          !entry.processingPhotoError && entry.processedPhotoUrl?.startsWith("blob:")
            ? blobUrlToFile(entry.processedPhotoUrl, `${name}.jpg`, "image/jpeg")
            : Promise.resolve(null),
        ]);
        await Promise.all([
          putToR2(slot.original.key, originalFile),
          watermarkedFile ? putToR2(slot.watermarked.key, watermarkedFile) : Promise.resolve(),
        ]);

        const vr = validationResults[entry.item.id];
        const srcForImage = entry.processedPhotoUrl?.startsWith("blob:")
          ? entry.processedPhotoUrl
          : entry.objectUrl;
        // Always load image to get dimensions + blurHash (validation may not have them)
        const metadataFromImage = await loadImageMetadata(srcForImage);
        const width = metadataFromImage?.width ?? vr?.width;
        const height = metadataFromImage?.height ?? vr?.height;
        const aspectRatio = metadataFromImage?.aspectRatio ??
          (width != null && height != null && height > 0 ? width / height : undefined);
        const blurHash = metadataFromImage?.blurHash ?? "";
        const mimeType =
          originalFile.type ||
          (entry.rawFormat ? formatToMimeType(entry.rawFormat) : null) ||
          "image/webp";

        const galleryItem = buildGalleryDataFromClientUrls(
          entry,
          {
            originalUrl: slot.original.key,
            watermarkedUrl: watermarkedFile != null ? slot.watermarked.key : "",
            thumbnailUrl: "", // Thumbnail upload disabled; conversion logic kept for future use
          },
          {
            fileSize: originalFile.size,
            mimeType,
            width: width ?? undefined,
            height: height ?? undefined,
            aspectRatio,
            blurHash: blurHash || undefined,
          }
        );
        return { galleryItem, size: originalFile.size };
      };

      const failedMessages: string[] = [];
      for (let start = 0; start < entries.length; start += UPLOAD_CONCURRENCY) {
        if (signal.aborted || cancelledRef.current) break;
        const end = Math.min(start + UPLOAD_CONCURRENCY, entries.length);
        const chunkResults = await Promise.all(
          Array.from({ length: end - start }, (_, j) => {
            const i = start + j;
            const entry = entries[i]!;
            const slot = slots[i]!;
            return processEntry(i, entry, slot)
              .then((result) => ({ i, success: true as const, ...result }))
              .catch((err) => {
                captureError(err);
                return {
                  i,
                  success: false as const,
                  id: entry.item.id,
                  message: err instanceof Error ? err.message : "Upload failed",
                };
              });
          })
        );
        for (const r of chunkResults) {
          if (r.success) {
            uploadedResults[r.i] = r.galleryItem;
            updateStatuses((prev) => ({
              ...prev,
              [entries[r.i]!.item.id]: {
                status: "success",
                uploadedSize: r.size,
                rawStatus: "success",
                photoStatus: "success",
                listingStatus: "success",
              },
            }));
          } else {
            failedMessages.push(r.message);
            updateStatuses((prev) => ({
              ...prev,
              [r.id]: {
                status: "error",
                message: r.message,
                rawStatus: "error",
                photoStatus: "error",
                listingStatus: "error",
              },
            }));
          }
        }
      }

      if (signal.aborted || cancelledRef.current) {
        setState((s) => ({
          ...s,
          phase: "idle",
          currentJob: null,
          modalOpen: false,
          overallError: null,
        }));
        job.entries.forEach(revokeEntryBlobUrls);
        return;
      }

      const uploaded = uploadedResults.filter((u): u is GalleryData => u != null);
      const firstErrorMessage = failedMessages[0];

      if (uploaded.length > 0) {
        const addResult = await addGalleryImagesToProperty(propertyId, uploaded, {
          propertyBrandMappingId: job.propertyBrandMappingId ?? undefined,
        });
        if (addResult.error) {
          toast.error(addResult.error);
          setState((s) => ({ ...s, phase: "error", overallError: addResult.error ?? null }));
        } else {
          toast.success(`${uploaded.length} image(s) added to gallery.`);
          job.entries.forEach(revokeEntryBlobUrls);
          setState((s) => ({ ...s, phase: "done" }));
        }
      } else if (entries.length > 0) {
        const errorDetail = firstErrorMessage ? ` First error: ${firstErrorMessage}` : "";
        toast.error(`No images were uploaded.${errorDetail} Check per-image errors in the list above.`);
        setState((s) => ({ ...s, phase: "error", overallError: firstErrorMessage ?? "All uploads failed" }));
      }
    } catch (err) {
      if (signal.aborted || cancelledRef.current) return;
      captureError(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setState((s) => ({ ...s, phase: "error", overallError: message }));
    } finally {
      jobRunningRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  const updateValidationResults = useCallback((results: Record<string, ImageValidationResult>) => {
    setState((s) => {
      if (!s.currentJob) return s;
      return {
        ...s,
        currentJob: { ...s.currentJob, validationResults: results },
      };
    });
  }, []);

  const prepareUpload = useCallback(
    (
      propertyId: string,
      propertyBrandMappingId: string | null | undefined,
      entries: UploadEntry[],
      validationResults?: Record<string, ImageValidationResult> | null,
      appType?: string
    ) => {
      setState((s) => {
        if (s.phase === "uploading") return s;
        // Deduplicate by item.id (prevents 2x from drop+input both firing)
        const seen = new Set<string>();
        const uniqueEntries = entries.filter((e) => {
          const id = e.item.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        const job: UploadJob = {
          id: typeof crypto !== "undefined" ? crypto.randomUUID() : `upload-${Date.now()}`,
          propertyId,
          propertyBrandMappingId,
          appType,
          entries: uniqueEntries,
          uploadStatuses: uniqueEntries.reduce<Record<string, UploadStatusState>>((acc, e) => {
            acc[e.item.id] = {
              status: "pending",
              rawStatus: "pending",
              photoStatus: "pending",
              listingStatus: "pending",
            };
            return acc;
          }, {}),
          validationResults: validationResults ?? null,
        };
        return {
          ...s,
          phase: "idle",
          currentJob: job,
          modalOpen: true,
          overallError: null,
        };
      });
    },
    []
  );

  const startUpload = useCallback(() => {
    setState((s) => {
      if (s.phase !== "idle" || !s.currentJob) return s;
      const job = s.currentJob;
      const entriesToUpload = job.entries;
      if (entriesToUpload.length === 0) {
        toast.error("No images to upload.");
        return s;
      }
      setTimeout(() => runUploadJob(job, entriesToUpload), 0);
      return { ...s, phase: "uploading" as const, overallError: null };
    });
  }, [runUploadJob]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState((s) => {
      if (s.currentJob) s.currentJob.entries.forEach(revokeEntryBlobUrls);
      return {
        ...s,
        phase: "idle",
        currentJob: null,
        modalOpen: false,
        overallError: null,
      };
    });
  }, []);

  const openModal = useCallback(() => setState((s) => ({ ...s, modalOpen: true })), []);

  const minimizeModal = useCallback(() => setState((s) => ({ ...s, modalOpen: false })), []);

  const closeModal = useCallback(() => {
    setState((s) => {
      if (s.phase === "uploading") {
        return { ...s, modalOpen: false };
      }
      if (s.currentJob) s.currentJob.entries.forEach(revokeEntryBlobUrls);
      return {
        ...s,
        modalOpen: false,
        phase: "idle",
        currentJob: null,
        overallError: null,
      };
    });
  }, []);

  const dismissSuccessPopup = useCallback(() => {
    setState((s) => {
      if (s.currentJob) s.currentJob.entries.forEach(revokeEntryBlobUrls);
      return {
        ...s,
        modalOpen: false,
        phase: "idle",
        currentJob: null,
        overallError: null,
      };
    });
  }, []);

  const value: GalleryUploadContextValue = {
    ...state,
    completedCount,
    totalCount,
    prepareUpload,
    updateValidationResults,
    startUpload,
    openModal,
    minimizeModal,
    closeModal,
    cancelUpload,
    dismissSuccessPopup,
  };

  return (
    <GalleryUploadContext.Provider value={value}>
      {children}

      {state.modalOpen && state.currentJob && (
        <Modal
          show
          onClose={() => (state.phase === "uploading" ? minimizeModal() : closeModal())}
          size="6xl"
          dismissible={state.phase !== "uploading"}
          className="[&>div]:max-w-6xl [&>div]:w-full [&>div]:rounded-2xl [&>div]:overflow-hidden [&>div]:shadow-2xl [&>div]:border-0"
        >
          <div className="min-h-0 flex flex-col">
            <GalleryUploadModalContent
              phase={state.phase}
              currentJob={state.currentJob}
              overallError={state.overallError}
              completedCount={completedCount}
              totalCount={totalCount}
              onStartUpload={startUpload}
              onCancel={cancelUpload}
              onClose={closeModal}
              onMinimize={minimizeModal}
              onValidationResults={updateValidationResults}
            />
          </div>
        </Modal>
      )}
    </GalleryUploadContext.Provider>
  );
}
