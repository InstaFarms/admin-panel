"use client";

import type { GalleryData } from "@/utils/types";
import type { DisplayUrlFn, SimulatedViewport } from "./constants";
import CoverWebsiteHeroGrid from "./CoverWebsiteHeroGrid";
import CoverExtraCoversGrid from "./CoverExtraCoversGrid";

interface CoverWebsitePreviewViewProps {
  mainImage: GalleryData | undefined;
  sideImagesPadded: (GalleryData | null)[];
  extraCovers: GalleryData[];
  displayUrl: DisplayUrlFn;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
  className?: string;
  simulatedViewport: SimulatedViewport;
}

export default function CoverWebsitePreviewView({
  mainImage,
  sideImagesPadded,
  extraCovers,
  displayUrl,
  onEdit,
  onFullscreen,
  className,
  simulatedViewport,
}: CoverWebsitePreviewViewProps) {
  const isLaptopOnly = simulatedViewport === "laptop";
  const heroWrapperClass = isLaptopOnly ? "w-full max-w-[1250px] mx-auto" : "w-full";

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className={heroWrapperClass}>
        <CoverWebsiteHeroGrid
          mainImage={mainImage}
          sideImagesPadded={sideImagesPadded}
          displayUrl={displayUrl}
          onEdit={onEdit}
          onFullscreen={onFullscreen}
          simulatedViewport={simulatedViewport}
        />
      </div>
      {extraCovers.length > 0 && (
        <div className="w-full">
          <CoverExtraCoversGrid extraCovers={extraCovers} displayUrl={displayUrl} onEdit={onEdit} onFullscreen={onFullscreen} />
        </div>
      )}
    </div>
  );
}
