import type { GalleryData } from "@/utils/types";

export type UploadStatus = "pending" | "converting" | "uploading" | "success" | "error";

export interface ProcessedEntryResult {
  item: GalleryData;
  url: string;
  needsConversion: boolean;
  /** Original file size in bytes (for display). */
  fileSize?: number;
  /** Raw image format for display (e.g. JPG, PNG, WEBP). */
  rawFormat?: string;
}

export interface UploadEntry {
  item: GalleryData;
  objectUrl: string;
  needsConversion: boolean;
  /** Original file size in bytes (for display). */
  fileSize?: number;
  /** Raw image format for display (e.g. JPG, PNG, WEBP). */
  rawFormat?: string | null;
  /** Processed watermarked image URL (blob) for preview. */
  processedPhotoUrl?: string | null;
  /** Processed thumbnail URL (blob) for preview. */
  processedThumbnailUrl?: string | null;
  /** Watermarked image file size in bytes (for display in MB/KB). */
  processedPhotoSize?: number | null;
  /** Thumbnail image file size in bytes (for display in MB/KB). */
  processedThumbnailSize?: number | null;
  /** True while watermark is being generated for this entry. */
  processingPhoto?: boolean;
  /** True while thumbnail is being generated for this entry. */
  processingThumbnail?: boolean;
  /** Set when watermarked image could not be generated (preview shows nothing; entry is excluded from upload). */
  processingPhotoError?: string | null;
  /** Set when thumbnail could not be generated (preview shows nothing; entry is excluded from upload). */
  processingThumbnailError?: string | null;
}

export type UploadSubStatus = "pending" | "uploading" | "success" | "error";

/** Tab for upload modal image preview: raw URL or watermarked (thumbnail tab removed). */
export type UploadModalImageTab = "raw" | "photo";

export interface UploadStatusState {
  status: UploadStatus;
  message?: string;
  /** Size of the file being/been uploaded (bytes), for "Uploaded 1.2 MB" etc. */
  uploadedSize?: number;
  /** Status for each of the 3 types uploaded to Firebase (raw, photo/instafarm, listing). */
  rawStatus?: UploadSubStatus;
  photoStatus?: UploadSubStatus;
  listingStatus?: UploadSubStatus;
}

/** Validation result for a single image before upload. */
export interface ImageValidationResult {
  /** Image passes all critical checks and can be uploaded. */
  uploadable: boolean;
  /** Width and height in pixels. */
  width?: number;
  height?: number;
  /** Individual check results for display. */
  checks: {
    format: { ok: boolean; message?: string };
    fileSize: { ok: boolean; message?: string };
    orientation: { ok: boolean; message?: string };
    resolution: { ok: boolean; message?: string };
    aspectRatio: { ok: boolean; message?: string };
  };
  /** Non-blocking warnings (image may still be uploadable). */
  warnings: string[];
}
