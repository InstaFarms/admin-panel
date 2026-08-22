"use client";

import { HiPhotograph } from "react-icons/hi";
import { LuCirclePlus } from "react-icons/lu";
import { Button } from "flowbite-react";

interface CoverImagesEmptyStateProps {
  onGoToUpload?: () => void;
}

export default function CoverImagesEmptyState({ onGoToUpload }: CoverImagesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-900/10">
      <div className="w-24 h-24 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5 ring-4 ring-amber-200/50 dark:ring-amber-800/30">
        <HiPhotograph className="w-12 h-12 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">No cover images yet</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm mb-6">
        Mark images as &quot;Use as cover image&quot; in Outdoor, Indoor, or Other tabs to see them here — or add new images first.
      </p>
      {onGoToUpload && (
        <Button
          color="success"
          onClick={onGoToUpload}
          className="rounded-xl px-5 py-2.5 font-semibold shadow-md bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          <LuCirclePlus className="w-5 h-5 mr-2" />
          Go to Upload
        </Button>
      )}
    </div>
  );
}
