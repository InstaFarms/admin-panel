import type { GalleryData } from "@/utils/types";

// Screen size breakpoints (layout and active viewport derived from preview width)
// Mobile: 400–750  |  Tablet: 750–900  |  Laptop: 900–1250  |  Bigger Desktop: 1250–1524
export const PREVIEW_WIDTH_MIN = 400;
export const PREVIEW_WIDTH_MAX = 1524;

export const PRESET_WIDTHS = {
  mobile: 749,
  tablet: 899,
  laptop: 1249,
  biggerDesktop: 1524,
} as const;

export type SimulatedViewport = "mobile" | "tablet" | "laptop" | "biggerDesktop";

export function getSimulatedViewport(widthPx: number): SimulatedViewport {
  if (widthPx < 750) return "mobile";
  if (widthPx < 900) return "tablet";
  if (widthPx < 1250) return "laptop";
  return "biggerDesktop";
}

export const COVER_SLOT_LABELS: Record<number, string> = {
  1: "Cover 1",
  2: "Cover 2",
  3: "Cover 3",
  4: "Cover 4",
  5: "Cover 5",
};

export function getCoverSlotLabel(sortOrder: number | null | undefined): string {
  if (sortOrder != null && sortOrder >= 1 && sortOrder <= 5) {
    return COVER_SLOT_LABELS[sortOrder] ?? `Cover ${sortOrder}`;
  }
  return "Cover";
}

export function getSortedCoverItems(items: GalleryData[]): GalleryData[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export type DisplayUrlFn = (item: GalleryData) => string;
