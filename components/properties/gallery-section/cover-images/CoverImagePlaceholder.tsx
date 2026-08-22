"use client";

import { HiPhotograph } from "react-icons/hi";

interface CoverImagePlaceholderProps {
  iconSize?: string;
}

export default function CoverImagePlaceholder({ iconSize = "w-10 h-10" }: CoverImagePlaceholderProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
      <HiPhotograph className={iconSize} />
    </div>
  );
}
