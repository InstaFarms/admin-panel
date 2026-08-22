/**
 * Shared helpers for gallery card UI (GalleryImageCard and UploadPreviewSection EntryPreviewCard).
 * Keeps format/size/ratio logic in one place.
 */

export function splitFileName(full: string): { base: string; extension: string } {
  const s = full.trim();
  const i = s.lastIndexOf(".");
  if (i <= 0) return { base: s, extension: "" };
  return { base: s.slice(0, i), extension: s.slice(i) };
}

/** Normalize extension to display label: JPG, PNG, WEBP, GIF, etc. */
export function formatImageFormat(extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase();
  if (!ext) return "—";
  const labels: Record<string, string> = {
    jpg: "JPG",
    jpeg: "JPG",
    png: "PNG",
    webp: "WEBP",
    gif: "GIF",
    bmp: "BMP",
    avif: "AVIF",
  };
  return labels[ext] ?? ext.toUpperCase();
}

/** Get file extension from URL path (e.g. "https://x.com/img.jpg" -> ".jpg"). */
export function extensionFromUrl(url: string): string {
  try {
    const pathname = url.includes("?") ? url.slice(0, url.indexOf("?")) : url;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot <= 0) return "";
    return pathname.slice(lastDot);
  } catch {
    return "";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gcd(a: number, b: number): number {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

const RATIO_4_3 = 4 / 3;
const RATIO_TOLERANCE = 0.05;

/** Returns true if dimensions are within tolerance of 4:3 aspect ratio. */
export function is4x3AspectRatio(width: number, height: number): boolean {
  if (!width || !height) return false;
  const ratio = width / height;
  return Math.abs(ratio - RATIO_4_3) < RATIO_TOLERANCE;
}

/** Human-readable aspect ratio from dimensions (e.g. 1920×1080 → "16:9", 1200×1600 → "3:4"). */
export function aspectRatioLabel(width: number, height: number): string {
  const d = gcd(width, height);
  const w = width / d;
  const h = height / d;
  if (w > 100 || h > 100) {
    const r = width / height;
    return r.toFixed(2) + ":1";
  }
  return `${w}:${h}`;
}
