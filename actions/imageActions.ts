"use server";

import { cookies } from "next/headers";
import { isAdmin } from "@/utils/admin-only";
import { adminStorage } from "@/utils/firebase-admin";
import { apiGet } from "@/utils/api-utils";
import { captureError } from "@/lib/sentry";
import { v4 as uuidv4 } from "uuid";
import { r2S3, R2_BUCKET, deleteR2Object, listAllR2ObjectKeys } from "@/lib/r2-s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  updatePropertyGalleryUrls,
  type GalleryUrlUpdate,
  updatePropertyCoverPhotos,
} from "@/actions/propertyActions";
import type { CoverPhotoNeedsConversion } from "@/actions/propertyActions";
import type { GalleryData } from "@/utils/types";
import { recordWatermarkBatchResults, resetWatermarkRegenLog, type WatermarkBatchResultEntry } from "@/utils/watermarkRegenLog";
import { resolveImageSrc } from "@/utils/image";

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;

  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

export interface UploadResult {
  url: string;
  path: string;
  rawUrl?: string;
  rawPath?: string;
  /** Maps to DB originalUrl - always the original file URL */
  originalUrl?: string;
  /** Maps to DB thumbnailUrl - resized thumbnail URL */
  thumbnailUrl?: string;
  /** Maps to DB watermarkedUrlByInstafarms - display/photo URL (instafarm watermarked or original) */
  watermarkedUrlByInstafarms?: string;
  /** Not stored in DB listingUrl - nothing goes to listingUrl key per requirement */
  listingUrl?: string;
  listingPath?: string;
}

function slugifyBrandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "") || "brand";
}

/**
 * Uploads a location icon (state/city/area/region/locality/destination) to R2,
 * converted to webp, keyed by locationType/brandSlug/locationId so each brand can have
 * its own icon per location. Returns the relative key (not a resolved URL) —
 * if-api resolves it to an absolute URL on read via resolveLocationIcon.
 */
export const uploadLocationIconAction = async (
  formData: FormData
): Promise<{ success?: { path: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const locationType = (formData.get("locationType") as string || "").trim();
    const brandName = (formData.get("brandName") as string || "").trim();
    const locationId = (formData.get("locationId") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (!locationType || !brandName || !locationId) {
      return { error: "Missing locationType, brandName, or locationId" };
    }

    const brandSlug = slugifyBrandName(brandName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let sharp: any;
    try {
      sharp = require("sharp");
    } catch {
      const m = await import("sharp");
      sharp = m.default || m;
    }

    // Explicit resize dimensions — SVG inputs have no intrinsic pixel size and would
    // otherwise rasterize at a tiny/undefined default. This also caps output file size.
    const webpBuffer: Buffer = await sharp(buffer, { density: 300 })
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();

    const key = `locations/${locationType}/${brandSlug}/${locationId}.webp`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    return { success: { path: key } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload icon" };
  }
};

/**
 * Uploads an activity/amenity icon to R2, converted to webp, keyed by
 * {type}/{id}.webp (matches the bulk Icon Uploads tool's convention). Returns the
 * relative key — if-api resolves it to an absolute URL on read via
 * resolveIcon (apps/if-api/src/routes/amenities.ts).
 */
export const uploadActivityAmenityIconAction = async (
  formData: FormData
): Promise<{ success?: { path: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const type = (formData.get("type") as string || "").trim();
    const id = (formData.get("id") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (type !== "activities" && type !== "amenities") return { error: "Invalid type" };
    if (!id) return { error: "Missing id" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let sharp: any;
    try {
      sharp = require("sharp");
    } catch {
      const m = await import("sharp");
      sharp = m.default || m;
    }

    const webpBuffer: Buffer = await sharp(buffer, { density: 300 })
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();

    const key = `${type}/${id}.webp`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    return { success: { path: key } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload icon" };
  }
};

/**
 * Uploads the site settings "Instafarms Watermark" asset to R2, converted to
 * webp, at a fixed key per brand scope — setting/{scope}/hero.webp — so re-uploading
 * always overwrites the same object rather than accumulating random-uuid files.
 * Returns the relative key; resolved to an absolute URL by
 * resolveImageSrc() wherever it's displayed.
 */
export const uploadSiteWatermarkAction = async (
  formData: FormData
): Promise<{ success?: { path: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const scope = (formData.get("scope") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (scope !== "instafarms" && scope !== "mago") return { error: "Invalid scope" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let sharp: any;
    try {
      sharp = require("sharp");
    } catch {
      const m = await import("sharp");
      sharp = m.default || m;
    }

    const webpBuffer: Buffer = await sharp(buffer, { density: 300 })
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 100 })
      .toBuffer();

    const key = `setting/${scope}/hero.webp`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    return { success: { path: key } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload watermark" };
  }
};

/**
 * Uploads a collection logo to R2, keyed by collections/{scope}/{collectionId}.{ext}.
 * Unlike the icon/watermark uploads above, this preserves the original file extension
 * as-is (no format conversion) — matches the bulk Icon Uploads tool's raw-bytes approach.
 * Returns the relative key — if-api resolves it to an absolute URL on read via
 * resolveCollectionLogo (apps/if-api/src/routes/collections.ts).
 */
export const uploadCollectionLogoAction = async (
  formData: FormData
): Promise<{ success?: { path: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const scope = (formData.get("scope") as string || "").trim();
    const collectionId = (formData.get("collectionId") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (scope !== "instafarms" && scope !== "mago") return { error: "Invalid scope" };
    if (!collectionId) return { error: "Missing collectionId" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `collections/${scope}/${collectionId}.${ext}`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return { success: { path: key } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload logo" };
  }
};

/**
 * Uploads a brand-scoped "setting" asset (static site image or carousel banner) to R2,
 * keyed by setting/{brandName}/{category}/{slot}.{ext}. Preserves the original file extension
 * as-is (no format conversion), matching uploadCollectionLogoAction's approach. Unlike the other
 * upload actions in this file, static images and carousel banners have no relative-key resolver
 * wired into if-api (they're stored/consumed as plain absolute URLs, likely rendered directly on
 * the public website), so this returns BOTH the relative key (for delete-cleanup) and a fully
 * resolved absolute URL (for storing/displaying), rather than just the key.
 */
export const uploadSettingAssetAction = async (
  formData: FormData
): Promise<{ success?: { path: string; url: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const brandName = (formData.get("brandName") as string || "").trim();
    const category = (formData.get("category") as string || "").trim();
    const slot = (formData.get("slot") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (brandName !== "instafarms" && brandName !== "mago") return { error: "Invalid brandName" };
    if (category !== "static" && category !== "carousel") return { error: "Invalid category" };
    if (!slot) return { error: "Missing slot" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `setting/${brandName}/${category}/${slot}.${ext}`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return { success: { path: key, url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload asset" };
  }
};

/**
 * Uploads a wallet manual-transaction attachment (receipt/proof, image or PDF) to R2,
 * keyed by wallet-attachments/{uuid}.{ext} — same flat folder layout as the legacy Firebase
 * path it replaces. Raw bytes, no format conversion. Returns a fully resolved absolute URL
 * (no relative-key resolver exists for this field, same reasoning as uploadSettingAssetAction).
 */
export const uploadWalletAttachmentAction = async (
  formData: FormData
): Promise<{ success?: { path: string; url: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    if (!file) return { error: "No file provided" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `wallet-attachments/${uuidv4()}.${ext}`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return { success: { path: key, url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload attachment" };
  }
};

/**
 * Uploads a property GST registration certificate (image or PDF) to R2,
 * keyed by property/{propertyId}/gst-certificates/{uuid}.{ext}.
 */
export const uploadPropertyGstCertificateAction = async (
  formData: FormData
): Promise<{ success?: { path: string; url: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const propertyId = (formData.get("propertyId") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (!propertyId) return { error: "Missing propertyId" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const key = `property/${propertyId}/gst-certificates/${uuidv4()}.${ext}`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return { success: { path: key, url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload GST certificate" };
  }
};

/**
 * Deletes a previously-uploaded image regardless of which backend it lives on — dispatches to
 * the legacy Firebase deleter for old absolute Firebase URLs; everything else goes through the
 * R2 object deleter (apps/admin/lib/r2-s3.ts), since the R2 bucket holds a full copy of the old
 * Hetzner bucket's contents under the same keys. A pre-migration row may still hold a bare
 * relative key, an absolute URL built from the old NEXT_PUBLIC_HETZNER_BASE_URL, or (post-
 * migration) one built from NEXT_PUBLIC_R2_PUBLIC_URL — all three resolve to the same object
 * in R2 once the matching base prefix (if any) is stripped off.
 */
export const deleteStorageImageAction = async (
  pathOrUrl: string
): Promise<{ success?: boolean; error?: string }> => {
  if (!pathOrUrl) return { success: true };

  const isFirebase = pathOrUrl.includes("firebasestorage.app") || pathOrUrl.includes("storage.googleapis.com");
  if (isFirebase) return deleteImageAction(pathOrUrl);

  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const legacyHetznerBase = process.env.NEXT_PUBLIC_HETZNER_BASE_URL;
  let key = pathOrUrl;
  if (r2Base && pathOrUrl.startsWith(`${r2Base}/`)) {
    key = pathOrUrl.slice(r2Base.length + 1);
  } else if (legacyHetznerBase && pathOrUrl.startsWith(`${legacyHetznerBase}/`)) {
    key = pathOrUrl.slice(legacyHetznerBase.length + 1);
  }
  return deleteR2Object(key);
};

/**
 * Uploads a property "space" (room) photo to R2, keyed by
 * propertyPhotos/{propertyId}/spaces/{spaceId}.{ext}. Raw bytes, preserves the original file
 * extension (no format conversion, no watermarking — matches the single-photo-per-space
 * behavior of the legacy uploadImageAction call this replaces). Returns a fully resolved
 * absolute URL (no relative-key resolver exists for this field, same reasoning as
 * uploadSettingAssetAction) so the value can be stored/displayed exactly as before.
 */
export const uploadSpacePhotoAction = async (
  formData: FormData
): Promise<{ success?: { path: string; url: string }; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const file = formData.get("file") as File;
    const propertyId = (formData.get("propertyId") as string || "").trim();
    const spaceId = (formData.get("spaceId") as string || "").trim();

    if (!file) return { error: "No file provided" };
    if (!propertyId) return { error: "Missing propertyId" };
    if (!spaceId) return { error: "Missing spaceId" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `propertyPhotos/${propertyId}/spaces/${spaceId}.${ext}`;

    await r2S3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return { success: { path: key, url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` } };
  } catch (error) {
    captureError(error);
    return { error: error instanceof Error ? error.message : "Failed to upload photo" };
  }
};

/** One slot = one image's original + watermarked (client PUTs directly to /api/r2-upload/image?key=...). */
export type GalleryUploadSlot = {
  original: { key: string };
  watermarked: { key: string };
};

/**
 * Generate R2 keys for client-side gallery upload. Pure key generation, no I/O — the client
 * PUTs each file straight to /api/r2-upload/image?key=<key>, then calls addGalleryImagesToProperty.
 */
export const getGalleryUploadKeys = async (
  propertyId: string,
  count: number,
  appType?: string
): Promise<{ slots?: GalleryUploadSlot[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const brand = brandSlugFromAppType(appType);
    const slots: GalleryUploadSlot[] = Array.from({ length: count }, () => {
      const baseFileName = uuidv4();
      return {
        original: { key: `propertyPhotos/${propertyId}/original/${baseFileName}.webp` },
        // Client-produced watermark preview is always a JPEG blob (see blobUrlToFile in
        // GalleryUploadContext) — key extension matches actual bytes, unlike the server-side
        // regeneration path (processOneItem) which always outputs real .webp bytes.
        watermarked: { key: `propertyPhotos/${propertyId}/watermarked/${brand}/${baseFileName}.jpg` },
      };
    });

    return { slots };
  } catch (err) {
    console.error("getGalleryUploadKeys error:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to get upload keys" };
  }
};

export interface ConvertGalleryItemInput {
  id: string;
  sourceUrl: string;
  fileName?: string;
  propertyName?: string;
  /** When true, apply watermark. When false, only create thumbnail (avoid double watermark). */
  hasUnwatermarkedOriginal: boolean;
}

const CONCURRENCY = 5;

function brandSlugFromAppType(appType?: string): string {
  if (appType?.toUpperCase().includes("MAGO")) return "mago";
  return "instafarms";
}

async function processOneItem(
  item: ConvertGalleryItemInput,
  propertyId: string,
  instafarmWatermarkUrl: string,
  watermarkSettings: Awaited<ReturnType<typeof getWatermarkUrls>>,
  watermarkBuffer: Buffer,
  appType?: string,
): Promise<GalleryUrlUpdate | null> {
  const rawSourceUrl = item.sourceUrl?.trim();
  if (!rawSourceUrl) {
    console.warn(`[watermark] ${item.id}: skipped — no sourceUrl`);
    return null;
  }

  const isRelativePath = !rawSourceUrl.startsWith("http://") && !rawSourceUrl.startsWith("https://");

  // Download original image
  let buffer: Buffer;
  try {
    if (isRelativePath) {
      // Use S3 client with credentials — works regardless of object ACL
      const s3Res = await r2S3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: rawSourceUrl }));
      const chunks: Buffer[] = [];
      for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    } else {
      const res = await fetch(rawSourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      buffer = Buffer.from(await res.arrayBuffer());
    }
  } catch (err) {
    console.error(`[watermark] ${item.id}: download failed — ${rawSourceUrl} — ${err instanceof Error ? err.message : err}`);
    throw err;
  }

  const contentType = /\.webp$/i.test(rawSourceUrl) ? "image/webp" : "image/jpeg";

  let watermarkedKey: string | null = null;
  let watermarkedFileSize: number | null = null;
  let blurHash = "";

  if (item.hasUnwatermarkedOriginal) {
    // Apply watermark
    let watermarkedBuffer: Buffer;
    try {
      watermarkedBuffer = await addWatermarkOnServer(buffer, contentType, "instafarm", instafarmWatermarkUrl, watermarkSettings.displayNumber, watermarkBuffer);
      watermarkedFileSize = watermarkedBuffer.length;
    } catch (err) {
      console.error(`[watermark] ${item.id}: watermark apply failed — ${err instanceof Error ? err.message : err}`);
      throw err;
    }

    // Regenerated watermark always goes to R2, regardless of whether the source original
    // is a relative key or a legacy absolute Firebase URL — derive the watermarked key,
    // handling /original/, /watermarked/*/, and unrecognized (e.g. legacy Firebase) sources.
    const brand = brandSlugFromAppType(appType);
    let base: string;
    if (rawSourceUrl.includes("/original/")) {
      base = rawSourceUrl.replace("/original/", `/watermarked/${brand}/`);
    } else if (/\/watermarked\/[^/]+\//.test(rawSourceUrl)) {
      // Source is already in a watermarked/ subfolder (migration artifact) — reroute to correct brand
      base = rawSourceUrl.replace(/\/watermarked\/[^/]+\//, `/watermarked/${brand}/`);
    } else {
      // Unknown structure (including legacy Firebase URLs) — place under watermarked/[brand]/ for this property
      const filename = rawSourceUrl.split("/").pop() ?? `${uuidv4()}.webp`;
      base = `propertyPhotos/${propertyId}/watermarked/${brand}/${filename}`;
    }
    // Ensure .webp extension on the watermarked key
    watermarkedKey = /\.[^./]+$/.test(base) ? base.replace(/\.[^./]+$/, ".webp") : `${base}.webp`;
    try {
      await r2S3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: watermarkedKey,
        Body: watermarkedBuffer,
        ContentType: "image/webp",
      }));
    } catch (err) {
      console.error(`[watermark] ${item.id}: R2 upload failed — key=${watermarkedKey} — ${err instanceof Error ? err.message : err}`);
      throw err;
    }

    try {
      blurHash = await encodeBlurHash(watermarkedBuffer);
    } catch (err) {
      console.warn(`[watermark] ${item.id}: blurHash generation failed — ${err instanceof Error ? err.message : err}`);
    }
  } else {
    try {
      blurHash = await encodeBlurHash(buffer);
    } catch (err) {
      console.warn(`[watermark] ${item.id}: blurHash generation failed — ${err instanceof Error ? err.message : err}`);
    }
  }

  const update: GalleryUrlUpdate = {
    photoId: item.id,
    fileSize: watermarkedFileSize ?? buffer.length,
  };
  if (blurHash) update.blurHash = blurHash;
  if (watermarkedKey) update.watermarkedUrlByInstafarms = watermarkedKey;
  return update;
}

async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R | null>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    for (const r of chunkResults) if (r != null) results.push(r);
  }
  return results;
}

/**
 * Server-side: fetch images, apply watermark, upload to storage, update DB.
 * Only creates watermarked images (no thumbnails; photos table no longer has thumbnailUrl).
 * Fetches settings and watermark image ONCE. Processes items with limited concurrency for speed.
 */
export const convertGalleryToWatermarkServer = async (
  propertyId: string,
  items: ConvertGalleryItemInput[],
  options?: { propertyBrandMappingId?: string; appType?: string },
): Promise<{ success?: boolean; convertedCount?: number; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const watermarkSettings = await getWatermarkUrls(options?.appType);
    const instafarmWatermarkUrl = watermarkSettings.instafarmWatermarkUrl;
    const watermarkBuffer = instafarmWatermarkUrl ? await downloadImageBuffer(instafarmWatermarkUrl) : null;
    if (!instafarmWatermarkUrl || !watermarkBuffer) {
      return { error: "Watermark not configured. Configure it in Settings first." };
    }

    const updates = await processWithConcurrency(items, CONCURRENCY, async (item) => {
      try {
        return await processOneItem(item, propertyId, instafarmWatermarkUrl, watermarkSettings, watermarkBuffer, options?.appType);
      } catch (err) {
        console.error(`[watermark] processOneItem failed for ${item.id}:`, err instanceof Error ? err.message : err);
        captureError(err);
        return null;
      }
    });

    if (updates.length === 0) return { error: "No images could be converted." };

    const res = await updatePropertyGalleryUrls(propertyId, updates, {
      propertyBrandMappingId: options?.propertyBrandMappingId,
      appType: options?.appType,
    });
    if (res.error) return { error: res.error };

    return { success: true, convertedCount: updates.length };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Conversion failed" };
  }
};

export interface ConvertBatchGroup {
  propertyId: string;
  propertyBrandMappingId?: string | null;
  items: ConvertGalleryItemInput[];
}

/**
 * Batch conversion: processes multiple property groups in ONE server call.
 * Fetches settings and watermark image ONCE. Uses parallel processing for speed.
 * Returns succeeded photo IDs for accurate modal status.
 */
export const convertGalleryToWatermarkBatch = async (
  groups: ConvertBatchGroup[],
  options?: { appType?: string; force?: boolean }
): Promise<{ success?: boolean; convertedCount?: number; succeededIds?: string[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const watermarkSettings = await getWatermarkUrls(options?.appType);
    const instafarmWatermarkUrl = watermarkSettings.instafarmWatermarkUrl;
    if (!instafarmWatermarkUrl) {
      return { error: "Watermark not configured. Configure it in Settings first." };
    }

    const watermarkBuffer = await downloadImageBuffer(instafarmWatermarkUrl);

    const allTasks: { item: ConvertGalleryItemInput; propertyId: string }[] = [];
    for (const g of groups) {
      for (const item of g.items) {
        allTasks.push({ item, propertyId: g.propertyId });
      }
    }

    // Per-photo failures, with their real error message, so they can be written to the
    // watermark-regen log below instead of being discarded (only succeededIds survived before).
    const failures: WatermarkBatchResultEntry[] = [];

    const updates = await processWithConcurrency(allTasks, CONCURRENCY, async ({ item, propertyId }) => {
      try {
        return await processOneItem(item, propertyId, instafarmWatermarkUrl, watermarkSettings, watermarkBuffer, options?.appType);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[watermark] processOneItem failed for ${item.id}:`, message);
        captureError(err);
        failures.push({
          id: item.id,
          propertyName: item.propertyName ?? null,
          fileName: item.fileName ?? null,
          status: "failed",
          error: message,
        });
        return null;
      }
    });

    const succeededIds = updates.map((u) => u.photoId);
    const byProperty = new Map<string, GalleryUrlUpdate[]>();
    const propertyBrandMappingIds = new Map<string, string | undefined>();
    for (const u of updates) {
      const g = groups.find((gr) => gr.items.some((i) => i.id === u.photoId));
      if (g) {
        if (!byProperty.has(g.propertyId)) byProperty.set(g.propertyId, []);
        byProperty.get(g.propertyId)!.push(u);
        if (!propertyBrandMappingIds.has(g.propertyId)) {
          propertyBrandMappingIds.set(g.propertyId, g.propertyBrandMappingId ?? undefined);
        }
      }
    }

    for (const [propId, propUpdates] of byProperty) {
      const res = await updatePropertyGalleryUrls(propId, propUpdates, {
        propertyBrandMappingId: propertyBrandMappingIds.get(propId),
        appType: options?.appType,
      });
      if (res.error) return { error: res.error };
    }

    if (options?.appType) {
      const itemById = new Map(allTasks.map(({ item }) => [item.id, item]));
      const succeeded: WatermarkBatchResultEntry[] = succeededIds.map((id) => {
        const item = itemById.get(id);
        return { id, propertyName: item?.propertyName ?? null, fileName: item?.fileName ?? null, status: "done" };
      });
      try {
        await recordWatermarkBatchResults(options.appType, options?.force ?? false, [...succeeded, ...failures]);
      } catch (err) {
        // Best-effort — a log-write failure must never break the actual watermark conversion.
        console.error("[watermark] failed to write watermark-regen log:", err instanceof Error ? err.message : err);
        captureError(err);
      }
    }

    return { success: true, convertedCount: updates.length, succeededIds };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Conversion failed" };
  }
};

/** Deletes the on-disk watermark-regen log for (appType, force) — call when the user clicks "Start Over". */
export const resetWatermarkRegenLogAction = async (appType: string, force: boolean): Promise<{ success?: boolean; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };
    await resetWatermarkRegenLog(appType, force);
    return { success: true };
  } catch (err) {
    captureError(err);
    return { error: err instanceof Error ? err.message : "Failed to reset log" };
  }
};

async function getWatermarkUrls(appType?: string): Promise<{
  instafarmWatermarkUrl: string | null;
  listingWatermarkUrl: string | null;
  displayNumber: string | null;
}> {
  try {
    const token = await getAuthToken();
    const response = await apiGet("/api/settings/site_settings", { token, appType });
    const data = response.data?.value ?? response.data;
    const displayNumber =
      (data?.centralBookingNumber || data?.whatsappNumber || data?.supportNumber || "")?.trim() || null;
    const rawInstafarmUrl = data?.instafarmWatermarkUrl || response.data?.instafarmWatermarkUrl || null;
    const rawListingUrl = data?.listingWatermarkUrl || response.data?.listingWatermarkUrl || null;
    // if-api's /site_settings returns the raw stored value (a relative storage key, e.g.
    // "setting/instafarms/hero.webp") with no resolution step — must resolve to an absolute
    // URL here since this is fetched directly via a plain HTTP GET (downloadImageBuffer), not
    // rendered through an <img> tag that could tolerate a relative path.
    return {
      instafarmWatermarkUrl: resolveImageSrc(rawInstafarmUrl),
      listingWatermarkUrl: resolveImageSrc(rawListingUrl),
      displayNumber: displayNumber || null,
    };
  } catch (error) {
    console.error('Failed to get watermark URLs:', error);
    captureError(error);
    return {
      instafarmWatermarkUrl: null,
      listingWatermarkUrl: null,
      displayNumber: null,
    };
  }
}

const THUMB_MAX_SIZE = 500;

async function createThumbnailBuffer(imageBuffer: Buffer, contentType: string): Promise<Buffer> {
  let sharp: any;
  try {
    sharp = require("sharp");
  } catch {
    try {
      const m = await import("sharp");
      sharp = m.default || m;
    } catch {
      throw new Error("Sharp is not available for thumbnail generation");
    }
  }
  const pipeline = sharp(imageBuffer);
  const meta = await pipeline.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Could not get image dimensions");
  const scale = w >= h ? THUMB_MAX_SIZE / w : THUMB_MAX_SIZE / h;
  const tw = scale >= 1 ? w : Math.round(w * scale);
  const th = scale >= 1 ? h : Math.round(h * scale);
  return pipeline.resize(tw, th).webp({ quality: 85 }).toBuffer();
}

async function addWatermarkOnServer(
  imageBuffer: Buffer,
  contentType: string,
  watermarkType: 'instafarm' | 'listing',
  watermarkUrl: string | null,
  displayNumber?: string | null,
  /** Pre-downloaded watermark buffer to skip fetching (optimization for batch processing). */
  watermarkBufferOpt?: Buffer
): Promise<Buffer> {
  try {
    let sharp;
    try {
      sharp = require('sharp');
    } catch {
      try {
        const sharpModule = await import('sharp');
        sharp = sharpModule.default || sharpModule;
      } catch {
        throw new Error('Sharp image processing library is not available.');
      }
    }

    if (!watermarkUrl && !watermarkBufferOpt) {
      throw new Error(`${watermarkType} watermark not configured`);
    }

    const watermarkBuffer = watermarkBufferOpt ?? (watermarkUrl ? await downloadImageBuffer(watermarkUrl) : null);
    if (!watermarkBuffer) throw new Error(`${watermarkType} watermark not configured`);

    const { width, height } = await sharp(imageBuffer).metadata();
    if (!width || !height) throw new Error('Could not determine image dimensions');

    // Layout - must match client-side createWatermarkClient (upload-tab/utils.ts)
    const hasNumber = Boolean(displayNumber?.trim());
    const sizePercent = 0.05;
    const boxMinPx = 40;
    const gapBetweenLogoAndNumber = 4;
    const radius = 6;
    const isPortrait = width < height;
    const paddingRight = isPortrait ? Math.floor(height * 0.075) : Math.floor(width * 0.1);
    const paddingBottom = isPortrait ? Math.floor(width * 0.1) : Math.floor(height * 0.075);
    const refSize = isPortrait ? height : width;
    const boxWidth = Math.max(boxMinPx, Math.floor(refSize * sizePercent));
    const numberFontSize = hasNumber ? Math.max(11, Math.floor(boxWidth * 0.22)) : 0;
    const boxBottom = hasNumber ? height - paddingBottom - numberFontSize - gapBetweenLogoAndNumber : height - paddingBottom;
    const boxTop = Math.max(0, boxBottom - boxWidth);
    const boxLeft = Math.max(0, width - paddingRight - boxWidth);

    // White rounded rect (matches client rgba(255,255,255,0.98))
    const roundedRectSvg = Buffer.from(
      `<svg width="${boxWidth}" height="${boxWidth}"><rect x="0" y="0" width="${boxWidth}" height="${boxWidth}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.98)"/></svg>`
    );
    const resizedLogo = await sharp(watermarkBuffer)
      .resize(boxWidth, boxWidth, { fit: 'contain' })
      .png()
      .toBuffer();

    const composites: { input: Buffer; left: number; top: number; blend?: string }[] = [
      { input: roundedRectSvg, left: boxLeft, top: boxTop },
      { input: resizedLogo, left: boxLeft, top: boxTop, blend: 'over' },
    ];

    if (hasNumber && displayNumber) {
      const text = displayNumber.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const textX = boxLeft + boxWidth / 2;
      const textY = height - paddingBottom;
      const textSvg = Buffer.from(
        `<svg width="${width}" height="${height}"><text x="${textX}" y="${textY}" font-family="system-ui,sans-serif" font-size="${numberFontSize}" fill="white" text-anchor="middle" dominant-baseline="bottom">${text}</text></svg>`
      );
      composites.push({ input: textSvg, left: 0, top: 0, blend: 'over' });
    }

    const watermarkedImage = await sharp(imageBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .composite(composites)
      .webp({ quality: 100 })
      .toBuffer();
    return watermarkedImage;

  } catch (error) {
    captureError(error);
    throw error;
  }
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http = require('http');

    const client = url.startsWith('https:') ? https : http;

    client.get(url, (response: any) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/** Resize/crop image to target aspect ratio (e.g. 4:3 or 16:9). */
async function createImageWithAspectRatio(
  imageBuffer: Buffer,
  contentType: string,
  aspectW: number,
  aspectH: number,
  maxSize = 1200
): Promise<Buffer> {
  let sharp: any;
  try {
    sharp = require("sharp");
  } catch {
    const m = await import("sharp");
    sharp = m.default || m;
  }
  const pipeline = sharp(imageBuffer);
  const meta = await pipeline.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Could not get image dimensions");
  const targetRatio = aspectW / aspectH;
  const currentRatio = w / h;
  let outW: number;
  let outH: number;
  if (currentRatio > targetRatio) {
    outH = h;
    outW = Math.round(h * targetRatio);
  } else {
    outW = w;
    outH = Math.round(w / targetRatio);
  }
  const scale = Math.min(1, maxSize / Math.max(outW, outH));
  outW = scale < 1 ? Math.round(outW * scale) : outW;
  outH = scale < 1 ? Math.round(outH * scale) : outH;
  return pipeline.resize(outW, outH, { fit: "cover", position: "center" }).webp({ quality: 85 }).toBuffer();
}

/** Generate blurHash string from image buffer. */
async function encodeBlurHash(imageBuffer: Buffer): Promise<string> {
  let sharp: any;
  let encode: (pixels: Uint8ClampedArray, w: number, h: number, cX: number, cY: number) => string;
  try {
    sharp = require("sharp");
    const blurhash = require("blurhash");
    encode = blurhash.encode;
  } catch {
    sharp = (await import("sharp")).default;
    const blurhash = await import("blurhash");
    encode = blurhash.encode;
  }
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
}

const COVER_CONVERSION_CONCURRENCY = 4;

/**
 * Convert a single image to cover format (grid + thumbnail 4:3, blurHash).
 * Uploads to R2 but does NOT save to DB. Use when assigning an image to a cover slot.
 */
export async function convertSingleCoverImage(
  propertyId: string,
  sourceUrl: string,
  photoId: string,
  appType?: string,
  slotNumber?: number
): Promise<
  | { gridUrl: string; thumbnailUrl: string; blurHash: string }
  | { error: string }
> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const item: CoverPhotoNeedsConversion = {
      id: photoId,
      propertyId,
      sourceUrl: sourceUrl?.trim(),
    };
    const result = await processOneCoverItem(item, appType, slotNumber);
    if (!result) return { error: "Conversion failed" };
    return {
      gridUrl: result.gridUrl,
      thumbnailUrl: result.thumbnailUrl,
      blurHash: result.blurHash,
    };
  } catch (err: any) {
    console.error("convertSingleCoverImage failed:", err);
    captureError(err);
    return { error: err?.message ?? "Conversion failed" };
  }
}

export interface CoverPhotoConversionResult {
  id: string;
  propertyId: string;
  gridUrl: string;
  thumbnailUrl: string;
  blurHash: string;
}

async function processOneCoverItem(
  item: CoverPhotoNeedsConversion,
  appType?: string,
  slotNumber?: number
): Promise<CoverPhotoConversionResult | null> {
  const sourceUrl = item.sourceUrl?.trim();
  if (!sourceUrl) return null;

  const isRelativePath = !sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://");

  let buffer: Buffer;
  if (isRelativePath) {
    const s3Res = await r2S3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: sourceUrl }));
    const chunks: Buffer[] = [];
    for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    buffer = Buffer.concat(chunks);
  } else {
    buffer = await downloadImageBuffer(sourceUrl);
  }

  const contentType = /\.webp$/i.test(sourceUrl) ? "image/webp" : "image/jpeg";
  const brand = brandSlugFromAppType(appType);
  const folder = `propertyPhotos/${item.propertyId}/cover/${brand}`;
  // Cover slots are fixed 1-5 — name by slot, not by photo id, so re-saving a
  // slot always replaces that slot's files instead of leaving old versions behind.
  const slot = slotNumber && slotNumber >= 1 && slotNumber <= 5 ? slotNumber : 1;
  const slotPrefix = `${folder}/image_${slot}_`;

  const [gridBuffer, thumbBuffer, blurHash] = await Promise.all([
    createImageWithAspectRatio(buffer, contentType, 4, 3, 1200), // grid: 1200×900 (4:3)
    createImageWithAspectRatio(buffer, contentType, 4, 3, 500), // thumbnail: 500×375 (4:3)
    encodeBlurHash(buffer),
  ]);

  const gridKey = `${slotPrefix}grid.webp`;
  const thumbKey = `${slotPrefix}thumb.webp`;

  // Delete any pre-existing file(s) for this slot (e.g. a stale different-extension
  // version) before writing the new pair, so the cover/ folder never holds more
  // than 2 files per slot (image_N_grid / image_N_thumb).
  const { data: existingSlotKeys } = await listAllR2ObjectKeys(slotPrefix);
  const staleKeys = (existingSlotKeys ?? []).filter((k) => k !== gridKey && k !== thumbKey);
  if (staleKeys.length > 0) {
    await Promise.all(staleKeys.map((k) => deleteR2Object(k)));
  }

  await Promise.all([
    r2S3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: gridKey, Body: gridBuffer, ContentType: "image/webp" })),
    r2S3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: "image/webp" })),
  ]);

  return {
    id: item.id,
    propertyId: item.propertyId,
    gridUrl: gridKey,
    thumbnailUrl: thumbKey,
    blurHash,
  };
}

/**
 * Convert cover photos to grid and thumbnail (both 4:3) images, generate blurHash, and save to DB.
 * Processes items in batches. For each property, fetches current coverPhotos, merges updates, PATCHes.
 */
export const convertCoverPhotosBatch = async (
  items: CoverPhotoNeedsConversion[],
  options?: { appType?: string },
): Promise<{ success?: boolean; convertedCount?: number; succeededIds?: string[]; error?: string }> => {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    // Resolve each item's cover slot number (1-5) up front from its property's current
    // slot order, so processOneCoverItem can name files by slot (image_N_grid/thumb).
    const itemsByProperty = new Map<string, CoverPhotoNeedsConversion[]>();
    for (const item of items) {
      if (!itemsByProperty.has(item.propertyId)) itemsByProperty.set(item.propertyId, []);
      itemsByProperty.get(item.propertyId)!.push(item);
    }

    const token = await getAuthToken();
    const slotByItemId = new Map<string, number>();
    const currentCoversByProperty = new Map<string, (GalleryData | null)[]>();
    for (const propertyId of itemsByProperty.keys()) {
      const res = await apiGet<{ success?: boolean; coverPhotos?: unknown[] }>(
        `/api/properties/${propertyId}/cover-photos`,
        { token, appType: options?.appType }
      );
      const currentCovers = (Array.isArray(res?.coverPhotos) ? res.coverPhotos : []) as (GalleryData | null)[];
      currentCoversByProperty.set(propertyId, currentCovers);
      currentCovers.forEach((c, idx) => {
        if (c?.id) slotByItemId.set(c.id, idx + 1);
      });
    }

    const updates = await processWithConcurrency(items, COVER_CONVERSION_CONCURRENCY, async (item) => {
      try {
        return await processOneCoverItem(item, options?.appType, slotByItemId.get(item.id));
      } catch (err) {
        console.error("Cover conversion failed for", item.id, err);
        captureError(err);
        return null;
      }
    });

    const succeeded = updates.filter((u): u is CoverPhotoConversionResult => u != null);
    const succeededIds = succeeded.map((u) => u.id);

    const byProperty = new Map<string, CoverPhotoConversionResult[]>();
    for (const u of succeeded) {
      if (!byProperty.has(u.propertyId)) byProperty.set(u.propertyId, []);
      byProperty.get(u.propertyId)!.push(u);
    }

    for (const [propertyId, propUpdates] of byProperty) {
      const currentCovers = currentCoversByProperty.get(propertyId) ?? [];
      const updateMap = new Map(propUpdates.map((u) => [u.id, u]));
      const merged: (GalleryData | null)[] = currentCovers.map((c: any) => {
        if (c == null) return null;
        const u = updateMap.get(c.id);
        if (!u) return c as GalleryData;
        return {
          ...c,
          gridUrl: u.gridUrl,
          thumbnailUrl: u.thumbnailUrl,
          blurHash: u.blurHash,
        } as GalleryData;
      });
      const patchRes = await updatePropertyCoverPhotos(propertyId, merged, {
        appType: options?.appType,
      });
      if (patchRes.error) return { error: patchRes.error };
    }

    return { success: true, convertedCount: succeeded.length, succeededIds };
  } catch (err) {
    console.error("convertCoverPhotosBatch error:", err);
    captureError(err);
    return { error: err instanceof Error ? err.message : "Conversion failed" };
  }
};

export interface WatermarkData {
  dataUrl: string | null;
  displayNumber: string | null;
}

/** Returns watermark URL and display number for client-side loading (CORS must be configured). */
export async function getWatermarkConfig(): Promise<{
  instafarmWatermarkUrl: string | null;
  displayNumber: string | null;
}> {
  const { instafarmWatermarkUrl, displayNumber } = await getWatermarkUrls();
  return { instafarmWatermarkUrl, displayNumber: displayNumber || null };
}

/**
 * Fetch the Instafarm watermark image server-side and return as a data URL plus display number.
 * Use this for client-side canvas watermarking to avoid CORS (canvas taint).
 */
export async function getWatermarkImageDataUrl(): Promise<WatermarkData> {
  try {
    const { instafarmWatermarkUrl, displayNumber } = await getWatermarkUrls();
    if (!instafarmWatermarkUrl) {
      return { dataUrl: null, displayNumber: displayNumber || null };
    }
    const buffer = await downloadImageBuffer(instafarmWatermarkUrl);
    const base64 = buffer.toString("base64");
    const isPng = /\.png$/i.test(instafarmWatermarkUrl);
    const mime = isPng ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;
    return { dataUrl, displayNumber: displayNumber || null };
  } catch {
    return { dataUrl: null, displayNumber: null };
  }
}

const extractPathFromUrl = (url: string): string => {
  if (!url) return '';

  // If it's already a path (doesn't start with http), return as is
  if (!url.startsWith('http')) {
    return url;
  }

  // Extract path from Firebase Storage URL
  // Format: https://storage.googleapis.com/bucket-name/path/to/file
  const urlParts = url.split('/');
  const bucketIndex = urlParts.findIndex(part => part.includes('.firebasestorage.app') || part.includes('.googleapis.com'));

  if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
    // Skip the bucket name and return the rest as path
    return urlParts.slice(bucketIndex + 2).join('/');
  }

  return url;
};

export const deleteImageAction = async (
  imagePath: string,
  rawImagePath?: string,
  listingImagePath?: string
): Promise<{ success?: boolean; error?: string }> => {
  try {
    console.log('Starting image deletion process...');
    console.log('Original paths:', { imagePath, rawImagePath, listingImagePath });

    const admin = await isAdmin();
    if (!admin) {
      console.log('Unauthorized delete attempt');
      return { error: "Unauthorized" };
    }

    if (!adminStorage) {
      console.warn('Firebase Storage is not initialized. Cannot delete images.');
      return { success: true };
    }

    const bucket = adminStorage.bucket();
    const deletePromises = [];

    // Extract proper paths from URLs if needed
    const mainPath = extractPathFromUrl(imagePath);
    const rawPath = rawImagePath ? extractPathFromUrl(rawImagePath) : null;
    const listingPath = listingImagePath ? extractPathFromUrl(listingImagePath) : null;

    console.log('Extracted paths:', { mainPath, rawPath, listingPath });

    // Delete main image (instafarm watermarked)
    if (mainPath) {
      const deleteMainImage = async () => {
        try {
          const imageFile = bucket.file(mainPath);
          const [exists] = await imageFile.exists();
          if (exists) {
            await imageFile.delete();
            console.log('Main image deleted:', mainPath);
          } else {
            console.log('Main image does not exist:', mainPath);
          }
        } catch (error) {
          console.log('Failed to delete main image:', error);
          captureError(error);
        }
      };
      deletePromises.push(deleteMainImage());
    }

    // Delete raw image if different from main image
    if (rawPath && rawPath !== mainPath) {
      const deleteRawImage = async () => {
        try {
          const rawImageFile = bucket.file(rawPath);
          const [exists] = await rawImageFile.exists();
          if (exists) {
            await rawImageFile.delete();
            console.log('Raw image deleted:', rawPath);
          } else {
            console.log('Raw image does not exist:', rawPath);
          }
        } catch (error) {
          console.log('Failed to delete raw image:', error);
          captureError(error);
        }
      };
      deletePromises.push(deleteRawImage());
    }

    // Delete listing image if different from main and raw images
    if (listingPath && listingPath !== mainPath && listingPath !== rawPath) {
      const deleteListingImage = async () => {
        try {
          const listingImageFile = bucket.file(listingPath);
          const [exists] = await listingImageFile.exists();
          if (exists) {
            await listingImageFile.delete();
            console.log('Listing image deleted:', listingPath);
          } else {
            console.log('Listing image does not exist:', listingPath);
          }
        } catch (error) {
          console.log('Failed to delete listing image:', error);
          captureError(error);
        }
      };
      deletePromises.push(deleteListingImage());
    }

    // Wait for all deletions to complete
    await Promise.allSettled(deletePromises);

    console.log('Image deletion process completed');
    return { success: true };

  } catch (error) {
    console.error('Error deleting image:', error);
    captureError(error);
    return { success: true };
  }
};

/**
 * Get file size in bytes for an image URL (server-side fetch, avoids CORS).
 * Use for gallery cards when item.fileSize is not set.
 */
export async function getImageFileSizeAction(
  imageUrl: string
): Promise<{ size?: number; error?: string }> {
  try {
    const admin = await isAdmin();
    if (!admin) return { error: "Unauthorized" };

    const url = imageUrl?.trim();
    if (!url || !url.startsWith("https://")) return { error: "Invalid URL" };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const headRes = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "Instafarms-Admin/1.0" },
      });
      clearTimeout(timeout);
      const contentLength = headRes.headers.get("Content-Length");
      if (contentLength != null) {
        const n = parseInt(contentLength, 10);
        if (!Number.isNaN(n) && n >= 0) return { size: n };
      }

      const getRes = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "Instafarms-Admin/1.0" },
      });
      if (!getRes.ok) return { error: "Failed to fetch" };
      const buf = await getRes.arrayBuffer();
      return { size: buf.byteLength };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    captureError(e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
