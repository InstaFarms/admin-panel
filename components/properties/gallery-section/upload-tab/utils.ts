import JSZip from "jszip";
import { v4 } from "uuid";
import type { GalleryData } from "@/utils/types";
import type { UploadResult } from "@/actions/imageActions";
import { GALLERY_TAB_KEYS } from "@/hooks/properties/usePropertyGallery";
import { IMAGE_EXT, IMAGE_MIME, WEBP_MIME } from "./constants";
import type { ProcessedEntryResult, UploadEntry, UploadStatus, ImageValidationResult } from "./types";

export function isImageFileName(name: string): boolean {
  return IMAGE_EXT.test(name);
}

/** Map MIME type or extension to display format (JPG, PNG, WEBP, etc.). */
function rawFormatFromMimeOrExt(mimeOrExt: string): string {
  const s = mimeOrExt.toLowerCase().replace(/^\./, "");
  const fromMime: Record<string, string> = {
    "image/jpeg": "JPG",
    "image/jpg": "JPG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
    "image/bmp": "BMP",
    "image/avif": "AVIF",
    "image/tiff": "TIFF",
    "image/x-tiff": "TIFF",
    "image/heic": "HEIC",
    "image/heif": "HEIF",
    "image/svg+xml": "SVG",
    "image/svg": "SVG",
    "image/x-icon": "ICO",
    "image/ico": "ICO",
    "image/vnd.microsoft.icon": "ICO",
  };
  const fromExt: Record<string, string> = {
    jpg: "JPG", jpeg: "JPG", png: "PNG", webp: "WEBP", gif: "GIF", bmp: "BMP", avif: "AVIF",
    tiff: "TIFF", tif: "TIFF", heic: "HEIC", heif: "HEIF", svg: "SVG", ico: "ICO",
  };
  return fromMime[s] ?? fromExt[s] ?? s.toUpperCase();
}

export function createGalleryItemFromBlob(
  id: string,
  url: string,
  fileName: string,
  needsConversion: boolean,
  fileSize?: number,
  rawFormat?: string
): ProcessedEntryResult {
  const item: GalleryData = {
    id,
    photoUrl: url,
    rawUrl: url,
    listingUrl: "",
    altText: "",
    fileName,
    key: GALLERY_TAB_KEYS[0],
    hasWatermark: false,
    sortOrder: null,
  };
  return { item, url, needsConversion, fileSize, rawFormat };
}

export function fileToGalleryItem(file: File, id: string): ProcessedEntryResult {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/, "") || file.name;
  const needsConversion = file.type !== WEBP_MIME;
  const rawFormat = rawFormatFromMimeOrExt(file.type);
  return createGalleryItemFromBlob(id, url, name, needsConversion, file.size, rawFormat);
}

export async function zipToGalleryItems(zipFile: File): Promise<ProcessedEntryResult[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const imageEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir && isImageFileName(entry.name)
  );
  const out: ProcessedEntryResult[] = [];
  for (const [, entry] of imageEntries) {
    const blob = await entry.async("blob");
    const url = URL.createObjectURL(blob);
    const baseName = (entry.name.split("/").pop() ?? entry.name).replace(/\.[^.]+$/, "") || entry.name;
    const needsConversion = !/\.webp$/i.test(entry.name);
    const rawFormat = rawFormatFromMimeOrExt(blob.type || entry.name);
    out.push(createGalleryItemFromBlob(v4(), url, baseName, needsConversion, blob.size, rawFormat));
  }
  return out;
}

/** Load image from URL (object URL or http) with CORS where needed. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/* ========== Gallery upload validation ========== */
/** Preferred formats for best quality; others are accepted but shown as an issue. */
const PREFERRED_FORMATS = new Set(["JPG", "JPEG", "PNG", "WEBP", "AVIF"]);
const MIN_FILE_SIZE_BYTES = Math.round(900 * 1024); // 900 KB
const MAX_FILE_SIZE_BYTES = 7 * 1024 * 1024; // 7 MB
const MIN_WIDTH = 1600;
const MIN_HEIGHT = 1050;
const RECOMMENDED_LONG_EDGE_MIN = 2000;
const RECOMMENDED_LONG_EDGE_MAX = 2400;

/** Validate an upload entry against gallery image rules. Runs in browser.
 * All image types are allowed to upload. Issues (format, size, orientation, resolution, aspect ratio)
 * are shown to the user but do not block upload. Only "Could not load image" blocks upload.
 */
export async function validateImageForUpload(entry: UploadEntry): Promise<ImageValidationResult> {
  const format = (entry.rawFormat ?? "").toUpperCase().replace(/^\./, "");
  const fileSizeBytes = entry.fileSize ?? 0;
  const warnings: string[] = [];
  const checks = {
    format: { ok: false, message: "" },
    fileSize: { ok: false, message: "" },
    orientation: { ok: false, message: "" },
    resolution: { ok: false, message: "" },
    aspectRatio: { ok: false, message: "" },
  };

  // Format: preferred (JPG/PNG/WebP/AVIF) vs non-preferred; all are uploadable
  if (PREFERRED_FORMATS.has(format)) {
    checks.format = { ok: true, message: "Format OK" };
  } else {
    checks.format = { ok: false, message: format ? `Non-standard format — JPG/PNG/WebP recommended` : "Format unknown" };
  }

  // File size: 900 KB – 7 MB (recommended range; outside is an issue)
  if (fileSizeBytes >= MIN_FILE_SIZE_BYTES && fileSizeBytes <= MAX_FILE_SIZE_BYTES) {
    checks.fileSize = { ok: true, message: "File size OK" };
  } else if (fileSizeBytes < MIN_FILE_SIZE_BYTES) {
    checks.fileSize = { ok: false, message: "Below 900 KB recommended" };
  } else {
    checks.fileSize = { ok: false, message: "Above 7 MB may be slow" };
  }

  let width = 0;
  let height = 0;
  try {
    const img = await loadImage(entry.objectUrl);
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
  } catch {
    checks.orientation = { ok: false, message: "Could not load image" };
    checks.resolution = { ok: false, message: "Could not read dimensions" };
    checks.aspectRatio = { ok: false, message: "—" };
    return { uploadable: false, checks, warnings };
  }

  // Orientation: landscape preferred
  if (width > height) {
    checks.orientation = { ok: true, message: "Landscape OK" };
  } else if (width === height) {
    checks.orientation = { ok: false, message: "Square — landscape preferred" };
  } else {
    checks.orientation = { ok: false, message: "Portrait — landscape preferred" };
  }

  // Resolution: min 1600 × 1050 recommended
  if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
    checks.resolution = { ok: true, message: "Resolution OK" };
  } else {
    checks.resolution = { ok: false, message: `Below ${MIN_WIDTH}×${MIN_HEIGHT} recommended` };
    warnings.push("Image may be too small for listing quality");
  }

  // Aspect ratio: 4:3 preferred
  const ratio = width / height;
  const ratio4_3 = 4 / 3;
  const ratioTolerance = 0.05;
  const is43 = Math.abs(ratio - ratio4_3) < ratioTolerance;
  if (is43) {
    checks.aspectRatio = { ok: true, message: "4:3 OK" };
  } else {
    checks.aspectRatio = { ok: false, message: "4:3 aspect ratio preferred" };
  }

  // All images are uploadable; only load failure blocks
  const uploadable = true;
  return { width, height, uploadable, checks, warnings };
}

/** Validate all entries; returns map of entry id → validation result. */
export async function validateAllEntries(
  entries: UploadEntry[]
): Promise<Record<string, ImageValidationResult>> {
  const results: Record<string, ImageValidationResult> = {};
  await Promise.all(
    entries.map(async (e) => {
      try {
        results[e.item.id] = await validateImageForUpload(e);
      } catch (err) {
        results[e.item.id] = {
          uploadable: false,
          checks: {
            format: { ok: false, message: "Validation failed" },
            fileSize: { ok: false, message: "" },
            orientation: { ok: false, message: "" },
            resolution: { ok: false, message: "" },
            aspectRatio: { ok: false, message: "" },
          },
          warnings: [err instanceof Error ? err.message : "Unknown error"],
        };
      }
    })
  );
  return results;
}

/** Result of watermark layout: all values needed to draw logo + optional number. */
interface WatermarkLayout {
  boxWidth: number;
  radius: number;
  boxLeftClamp: number;
  boxTopClamp: number;
  numberFontSize: number;
  paddingBottom: number;
}

/** Set all % and px values here. Landscape: right/bottom as % of width/height; refSize = width. */
function calculateLandscapeVariables(
  width: number,
  height: number,
  hasNumber: boolean
): WatermarkLayout {
  const paddingRightPercent = 0.1;   // distance from right (e.g. 0.1 = 10% of width)
  const paddingBottomPercent = 0.075; // distance from bottom (e.g. 0.075 = 7.5% of height)
  const paddingRight = Math.floor(width * paddingRightPercent);
  const paddingBottom = Math.floor(height * paddingBottomPercent);
  const refSize = width;

  const sizePercent = 0.05;
  const boxMinPx = 40;
  const gapBetweenLogoAndNumber = 4;
  const radius = 6;
  const numberFontScale = 0.22;
  const numberFontMinPx = 11;

  const boxWidth = Math.max(boxMinPx, Math.floor(refSize * sizePercent));
  const numberFontSize = hasNumber ? Math.max(numberFontMinPx, Math.floor(boxWidth * numberFontScale)) : 0;
  const numberHeight = numberFontSize;

  const boxBottom = hasNumber
    ? height - paddingBottom - numberHeight - gapBetweenLogoAndNumber
    : height - paddingBottom;
  const boxTop = boxBottom - boxWidth;
  const boxLeft = width - paddingRight - boxWidth;
  const boxLeftClamp = Math.max(0, boxLeft);
  const boxTopClamp = Math.max(0, boxTop);

  return {
    boxWidth,
    radius,
    boxLeftClamp,
    boxTopClamp,
    numberFontSize,
    paddingBottom,
  };
}

/** Set all % and px values here. Portrait: right/bottom as % of height/width; refSize = height. */
function calculatePortraitVariables(
  width: number,
  height: number,
  hasNumber: boolean
): WatermarkLayout {
  const paddingRightPercent = 0.075;   // distance from right (e.g. 0.1 = 10% of height)
  const paddingBottomPercent = 0.1; // distance from bottom (e.g. 0.075 = 7.5% of width)
  const paddingRight = Math.floor(height * paddingRightPercent);
  const paddingBottom = Math.floor(width * paddingBottomPercent);
  const refSize = height;

  const sizePercent = 0.05;
  const boxMinPx = 40;
  const gapBetweenLogoAndNumber = 4;
  const radius = 6;
  const numberFontScale = 0.22;
  const numberFontMinPx = 11;

  const boxWidth = Math.max(boxMinPx, Math.floor(refSize * sizePercent));
  const numberFontSize = hasNumber ? Math.max(numberFontMinPx, Math.floor(boxWidth * numberFontScale)) : 0;
  const numberHeight = numberFontSize;

  const boxBottom = hasNumber
    ? height - paddingBottom - numberHeight - gapBetweenLogoAndNumber
    : height - paddingBottom;
  const boxTop = boxBottom - boxWidth;
  const boxLeft = width - paddingRight - boxWidth;
  const boxLeftClamp = Math.max(0, boxLeft);
  const boxTopClamp = Math.max(0, boxTop);

  return {
    boxWidth,
    radius,
    boxLeftClamp,
    boxTopClamp,
    numberFontSize,
    paddingBottom,
  };
}

/** Fill a rounded rectangle; uses roundRect when available, else manual path. */
function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  } else {
    const r = radius;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Create a watermarked version of the image using canvas.
 * Watermark: smaller white rounded box a bit above bottom-right; logo on top, optional number below.
 * Returns { url, size } so the UI can show file size in MB/KB.
 */
export function createWatermarkClient(
  imageObjectUrl: string,
  watermarkImageUrl: string,
  displayNumber?: string | null
): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    Promise.all([loadImage(imageObjectUrl), loadImage(watermarkImageUrl)])
      .then(([img, watermarkImg]) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // ———————— WATERMARK: all layout in calculateLandscapeVariables / calculatePortraitVariables ————————
        const hasNumber = Boolean(displayNumber?.trim());
        const isPortrait = w < h; // square (w === h) → landscape
        const layout = isPortrait
          ? calculatePortraitVariables(w, h, hasNumber)
          : calculateLandscapeVariables(w, h, hasNumber);
        const { boxWidth, radius, boxLeftClamp, boxTopClamp, numberFontSize, paddingBottom } = layout;

        // White rounded rectangle only behind the logo (no box behind number)
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
        fillRoundRect(ctx, boxLeftClamp, boxTopClamp, boxWidth, boxWidth, radius);

        // Logo inside the white box
        ctx.drawImage(
          watermarkImg,
          0,
          0,
          watermarkImg.naturalWidth,
          watermarkImg.naturalHeight,
          boxLeftClamp,
          boxTopClamp,
          boxWidth,
          boxWidth
        );

        // Mobile number directly below logo, on the image (no background box), white sans-serif, snug
        if (hasNumber && displayNumber) {
          ctx.fillStyle = "#ffffff";
          ctx.font = `${numberFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const textX = boxLeftClamp + boxWidth / 2;
          const textY = h - paddingBottom;
          ctx.fillText(displayNumber.trim(), textX, textY);
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("toBlob failed"));
              return;
            }
            resolve({ url: URL.createObjectURL(blob), size: blob.size });
          },
          "image/jpeg",
          0.9
        );
      })
      .catch(reject);
  });
}

/** Thumbnail max dimension: landscape = max width, portrait = max height (300–500px). */
const THUMB_LANDSCAPE_MAX_WIDTH = 500;
const THUMB_PORTRAIT_MAX_HEIGHT = 500;

/** Thumbnail dimensions: landscape caps width, portrait caps height (no upscale). */
function getThumbnailDimensions(
  w: number,
  h: number
): { tw: number; th: number } {
  const isLandscape = w >= h; // square (w === h) → landscape
  if (isLandscape) {
    const scale = THUMB_LANDSCAPE_MAX_WIDTH / w;
    return {
      tw: scale >= 1 ? w : THUMB_LANDSCAPE_MAX_WIDTH,
      th: scale >= 1 ? h : Math.round(h * scale),
    };
  }
  const scale = THUMB_PORTRAIT_MAX_HEIGHT / h;
  return {
    tw: scale >= 1 ? w : Math.round(w * scale),
    th: scale >= 1 ? h : THUMB_PORTRAIT_MAX_HEIGHT,
  };
}

/** Create a thumbnail blob URL. Landscape: max width 500px; portrait: max height 500px (no upscale). Returns { url, size } for display. */
export function createThumbnailClient(imageObjectUrl: string): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    loadImage(imageObjectUrl)
      .then((img) => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const { tw, th } = getThumbnailDimensions(w, h);
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h, 0, 0, tw, th);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("toBlob failed"));
              return;
            }
            resolve({ url: URL.createObjectURL(blob), size: blob.size });
          },
          "image/jpeg",
          0.85
        );
      })
      .catch(reject);
  });
}

export function convertToWebP(objectUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        WEBP_MIME,
        0.9
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = objectUrl;
  });
}

/** Fetch a blob URL and return a File (e.g. for client-side watermarked preview). */
export async function blobUrlToFile(
  blobUrl: string,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<File> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  const ext = fileName.includes(".") ? fileName.split(".").pop()! : "jpg";
  return new File([blob], fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`, {
    type: blob.type || mimeType,
  });
}

export async function entryToFile(entry: UploadEntry): Promise<File> {
  if (entry.needsConversion) {
    const webpBlob = await convertToWebP(entry.objectUrl);
    return new File([webpBlob], `${entry.item.fileName || "image"}.webp`, { type: WEBP_MIME });
  }
  const res = await fetch(entry.objectUrl);
  const blob = await res.blob();
  const name = entry.item.fileName || "image";
  const ext = /\.([^.]+)$/.exec(entry.item.photoUrl ?? "")?.[1] || "webp";
  return new File([blob], `${name}.${ext}`, { type: blob.type || WEBP_MIME });
}

/**
 * Get the file to upload for this entry. When the client has a watermarked preview (processedPhotoUrl),
 * use that so the exact same watermarked image gets uploaded; otherwise use the original via entryToFile.
 */
export async function entryToUploadFile(entry: UploadEntry): Promise<{ file: File; usedWatermarkedPreview: boolean }> {
  const blobPreview = entry.processedPhotoUrl?.startsWith("blob:") ? entry.processedPhotoUrl : null;
  if (blobPreview) {
    const name = entry.item.fileName || "image";
    const file = await blobUrlToFile(blobPreview, `${name}.jpg`, "image/jpeg");
    return { file, usedWatermarkedPreview: true };
  }
  const file = await entryToFile(entry);
  return { file, usedWatermarkedPreview: false };
}

export function buildGalleryDataFromResult(result: UploadResult, entry: UploadEntry): GalleryData {
  const hasWatermark = Boolean(
    result.watermarkedUrlByInstafarms &&
      result.originalUrl &&
      (result.url !== result.rawUrl || result.originalUrl === result.watermarkedUrlByInstafarms)
  );
  return {
    id: entry.item.id,
    photoUrl: result.url,
    rawUrl: result.rawUrl ?? result.url,
    listingUrl: "", // Nothing goes to listingUrl key per requirement
    originalUrl: result.originalUrl ?? result.rawUrl ?? result.url,
    thumbnailUrl: result.thumbnailUrl ?? "",
    watermarkedUrlByInstafarms: result.watermarkedUrlByInstafarms ?? result.url,
    altText: entry.item.altText ?? "",
    fileName: entry.item.fileName ?? "",
    fileSize: entry.fileSize ?? undefined,
    format: entry.rawFormat ?? undefined,
    key: entry.item.key,
    hasWatermark,
    sortOrder: entry.item.sortOrder,
  };
}

/** Format (JPG, PNG, etc.) to MIME type for DB. */
function formatToMimeType(format: string | null | undefined): string | null {
  const f = (format ?? "").toUpperCase();
  if (f === "JPG" || f === "JPEG") return "image/jpeg";
  if (f === "PNG") return "image/png";
  if (f === "WEBP") return "image/webp";
  if (f === "AVIF") return "image/avif";
  return null;
}

/** Load image for blob URLs (no crossOrigin to avoid tainting); use loadImage for http(s). */
function loadImageForProcessing(url: string): Promise<HTMLImageElement> {
  const isBlob = url.startsWith("blob:");
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!isBlob) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/** Generate blurHash from image URL (client-side). Uses watermarked blob when available for display consistency. */
export async function createBlurHashClient(imageUrl: string): Promise<string> {
  const img = await loadImageForProcessing(imageUrl);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return "";
  // Resize for performance (match server-side 32px approach)
  const maxDim = 32;
  const scale = Math.min(maxDim / w, maxDim / h, 1);
  const cw = scale < 1 ? Math.round(w * scale) : w;
  const ch = scale < 1 ? Math.round(h * scale) : h;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, cw, ch);
  const imageData = ctx.getImageData(0, 0, cw, ch);
  const { encode } = await import("blurhash");
  return encode(imageData.data, cw, ch, 4, 4);
}

/** Load image and return dimensions + element (for blurHash). Use when validation width/height may be missing. */
export async function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  const img = await loadImageForProcessing(url);
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  return { width: w, height: h, img };
}

/**
 * Load image once and compute dimensions + blurHash. Single load ensures both are in sync.
 * Returns null if any step fails.
 */
export async function loadImageMetadata(
  url: string
): Promise<{ width: number; height: number; aspectRatio: number; blurHash: string } | null> {
  try {
    const { width, height, img } = await loadImageDimensions(url);
    if (!width || !height) return null;
    const aspectRatio = width / height;
    const maxDim = 32;
    const scale = Math.min(maxDim / width, maxDim / height, 1);
    const cw = scale < 1 ? Math.round(width * scale) : width;
    const ch = scale < 1 ? Math.round(height * scale) : height;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const { encode } = await import("blurhash");
    const blurHash = encode(imageData.data, cw, ch, 4, 4);
    return { width, height, aspectRatio, blurHash };
  } catch {
    return null;
  }
}

export interface GalleryMetadata {
  fileSize?: number;
  mimeType?: string | null;
  width?: number;
  height?: number;
  aspectRatio?: number;
  blurHash?: string | null;
}

/** Build GalleryData from client-side upload public URLs (no server processing). */
export function buildGalleryDataFromClientUrls(
  entry: UploadEntry,
  urls: { originalUrl: string; watermarkedUrl: string; thumbnailUrl: string },
  metadata?: GalleryMetadata
): GalleryData {
  const hasWatermark = Boolean(urls.watermarkedUrl);
  const mimeType = metadata?.mimeType ?? formatToMimeType(entry.rawFormat);
  const fileSize = metadata?.fileSize ?? entry.fileSize ?? undefined;
  return {
    id: entry.item.id,
    photoUrl: urls.watermarkedUrl || urls.originalUrl,
    rawUrl: urls.originalUrl,
    listingUrl: "",
    originalUrl: urls.originalUrl,
    thumbnailUrl: urls.thumbnailUrl,
    watermarkedUrlByInstafarms: urls.watermarkedUrl || "",
    altText: entry.item.altText ?? "",
    instafarmsAltText: entry.item.altText ?? "",
    fileName: entry.item.fileName ?? "",
    name: entry.item.fileName ?? "",
    fileSize,
    format: entry.rawFormat ?? undefined,
    mimeType: mimeType ?? undefined,
    width: metadata?.width ?? undefined,
    height: metadata?.height ?? undefined,
    aspectRatio: metadata?.aspectRatio ?? undefined,
    blurHash: metadata?.blurHash ?? undefined,
    key: entry.item.key,
    hasWatermark,
    sortOrder: entry.item.sortOrder,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const unit = ["B", "KB", "MB", "GB"][i] ?? "B";
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${unit}`;
}

export function getStatusDisplay(status: UploadStatus, message?: string): { label: string; color: string } {
  const labels: Record<UploadStatus, string> = {
    pending: "Pending",
    converting: "Converting to WebP…",
    uploading: "Uploading…",
    success: "Uploaded",
    error: "Error",
  };
  const colors: Record<UploadStatus, string> = {
    pending: "text-gray-500 dark:text-gray-400",
    converting: "text-amber-600 dark:text-amber-400",
    uploading: "text-amber-600 dark:text-amber-400",
    success: "text-emerald-600 dark:text-emerald-400",
    error: "text-red-600 dark:text-red-400",
  };
  const label = status === "error" && message ? `${labels[status]}: ${message}` : labels[status];
  return { label, color: colors[status] };
}

export type ProcessEntryPreviewUpdate = {
  processedPhotoUrl?: string | null;
  processedThumbnailUrl?: string | null;
  processedPhotoSize?: number | null;
  processedThumbnailSize?: number | null;
  processingPhoto?: boolean;
  processingThumbnail?: boolean;
  processingPhotoError?: string | null;
  processingThumbnailError?: string | null;
};

export type WatermarkDataResult = { dataUrl: string | null; displayNumber?: string | null };

/**
 * For each entry, generate watermarked and thumbnail preview URLs and call onEntryUpdate.
 * getWatermarkData should return { dataUrl, displayNumber } from site settings; if dataUrl is null, raw image is used for photo.
 */
export async function processEntriesPreview(
  entries: UploadEntry[],
  getWatermarkData: () => Promise<WatermarkDataResult>,
  onEntryUpdate: (id: string, updates: ProcessEntryPreviewUpdate) => void
): Promise<void> {
  let watermarkUrl: string | null = null;
  let displayNumber: string | null = null;
  try {
    const data = await getWatermarkData();
    const raw = data.dataUrl ?? null;
    displayNumber = data.displayNumber ?? null;
    watermarkUrl =
      typeof raw === "string" && raw.length > 0 && (raw.startsWith("data:") || raw.startsWith("http"))
        ? raw
        : null;
  } catch {
    watermarkUrl = null;
  }
  const run = async (entry: UploadEntry) => {
    const id = entry.item.id;
    // Watermark: when not configured or generation fails, show nothing and set error (entry excluded from upload).
    try {
      if (watermarkUrl) {
        const { url: processedPhotoUrl, size: processedPhotoSize } = await createWatermarkClient(
          entry.objectUrl,
          watermarkUrl,
          displayNumber
        );
        onEntryUpdate(id, {
          processedPhotoUrl,
          processedPhotoSize,
          processingPhoto: false,
          processingPhotoError: null,
        });
      } else {
        onEntryUpdate(id, {
          processedPhotoUrl: null,
          processingPhoto: false,
          processingPhotoError: "Watermark not configured. Configure Instafarm watermark in Settings.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Watermark generation failed";
      console.warn("Watermark preview failed for entry", id, err);
      onEntryUpdate(id, {
        processedPhotoUrl: null,
        processingPhoto: false,
        processingPhotoError: msg,
      });
    }
    // Thumbnail: when generation fails, show nothing and set error (entry excluded from upload).
    try {
      const { url: processedThumbnailUrl, size: processedThumbnailSize } = await createThumbnailClient(entry.objectUrl);
      onEntryUpdate(id, {
        processedThumbnailUrl,
        processedThumbnailSize,
        processingThumbnail: false,
        processingThumbnailError: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Thumbnail generation failed";
      onEntryUpdate(id, {
        processedThumbnailUrl: null,
        processedThumbnailSize: null,
        processingThumbnail: false,
        processingThumbnailError: msg,
      });
    }
  };
  await Promise.all(entries.map(run));
}
