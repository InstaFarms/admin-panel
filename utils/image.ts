/**
 * Converts a stored image value to a fully-qualified URL.
 * Handles both legacy absolute Firebase URLs and relative storage paths — the R2 bucket
 * holds a full copy of what used to live in Hetzner (same keys), so this one base
 * correctly resolves both pre- and post-migration relative paths.
 * Returns null for empty/null input.
 */
export function resolveImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (base) return `${base}/${src}`;
  return null;
}
