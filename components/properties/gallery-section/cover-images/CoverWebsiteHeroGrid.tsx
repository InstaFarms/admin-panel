"use client";

import type { GalleryData } from "@/utils/types";
import type { DisplayUrlFn, SimulatedViewport } from "./constants";
import CoverImageActionButtons from "./CoverImageActionButtons";
import CoverImagePlaceholder from "./CoverImagePlaceholder";
import CoverBlurhashPlaceholder from "./CoverBlurhashPlaceholder";

export interface CoverWebsiteHeroGridProps {
  mainImage: GalleryData | undefined;
  sideImagesPadded: (GalleryData | null)[];
  displayUrl: DisplayUrlFn;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
  simulatedViewport: SimulatedViewport;
}

export default function CoverWebsiteHeroGrid(props: CoverWebsiteHeroGridProps) {
  const {
    mainImage,
    sideImagesPadded,
    displayUrl,
    onEdit,
    onFullscreen,
    simulatedViewport,
  } = props;
  const mainSrc = mainImage ? displayUrl(mainImage) || "/placeholder.jpg" : null;
  const mainAlt = mainImage?.altText || mainImage?.fileName || "Property image";
  const isMobile = simulatedViewport === "mobile";

  return (
    <div className={isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-4 gap-2 h-[500px]"}>
      <div
        className={
          isMobile
            ? "col-span-1 relative overflow-hidden rounded-none w-full min-h-0 bg-gray-200 dark:bg-gray-700 group/main"
            : "col-span-2 row-span-2 relative overflow-hidden rounded-2xl w-full min-h-0 bg-gray-200 dark:bg-gray-700 group/main"
        }
      >
        <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
          Cover 1
        </span>
        {mainImage?.blurHash && <CoverBlurhashPlaceholder blurHash={mainImage.blurHash} />}
        {mainSrc ? (
          <>
            {isMobile ? (
              <img src={mainSrc} alt={mainAlt} className="block w-full h-auto relative z-[1]" fetchPriority="high" />
            ) : (
              <img src={mainSrc} alt={mainAlt} className="absolute inset-0 w-full h-full object-cover z-[1]" />
            )}
          </>
        ) : !mainImage?.blurHash ? (
          <CoverImagePlaceholder iconSize="w-16 h-16" />
        ) : null}
        {mainImage && (
          <div
            className={
              isMobile
                ? "absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover/main:opacity-100 transition-opacity"
                : "absolute bottom-3 right-3 flex items-center gap-3 opacity-0 group-hover/main:opacity-100 transition-opacity"
            }
          >
            <CoverImageActionButtons item={mainImage} onEdit={onEdit} onFullscreen={onFullscreen} size="default" />
          </div>
        )}
      </div>
      {!isMobile &&
        sideImagesPadded.map((image, index) => (
          <div
            key={image?.id ?? `side-${index}`}
            className="relative overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-700 group/side"
          >
            <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              Cover {index + 2}
            </span>
            {image?.blurHash && <CoverBlurhashPlaceholder blurHash={image.blurHash} />}
            {image && displayUrl(image) ? (
              <img
                src={displayUrl(image)}
                alt={image.altText || image.fileName || `Cover ${index + 2}`}
                className="absolute inset-0 w-full h-full object-cover z-[1]"
              />
            ) : !image?.blurHash ? (
              <CoverImagePlaceholder />
            ) : null}
            {image && (
              <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover/side:opacity-100 transition-opacity rounded-2xl">
                <CoverImageActionButtons item={image} onEdit={onEdit} onFullscreen={onFullscreen} size="compact" />
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
