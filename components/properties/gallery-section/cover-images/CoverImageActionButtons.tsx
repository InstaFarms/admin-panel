"use client";

import { Button } from "flowbite-react";
import { HiPencil, HiArrowsExpand } from "react-icons/hi";
import type { GalleryData } from "@/utils/types";

interface CoverImageActionButtonsProps {
  item: GalleryData;
  onEdit?: (item: GalleryData) => void;
  onFullscreen: (item: GalleryData) => void;
  size?: "default" | "compact";
}

export default function CoverImageActionButtons({
  item,
  onEdit,
  onFullscreen,
  size = "default",
}: CoverImageActionButtonsProps) {
  const label = size === "compact" ? "Full screen" : "View full screen";
  return (
    <>
      {onEdit && (
        <Button size="xs" color="light" onClick={() => onEdit(item)} className="shadow-md">
          <HiPencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      )}
      <Button size="xs" color="light" onClick={() => onFullscreen(item)} className="shadow-md">
        <HiArrowsExpand className="w-4 h-4 mr-1" /> {label}
      </Button>
    </>
  );
}
