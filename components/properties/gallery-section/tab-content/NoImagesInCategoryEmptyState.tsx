"use client";

import { HiPhotograph } from "react-icons/hi";
import { LuCirclePlus } from "react-icons/lu";
import { Button } from "flowbite-react";

interface NoImagesInCategoryEmptyStateProps {
  onGoToUpload?: () => void;
}

export default function NoImagesInCategoryEmptyState({ onGoToUpload }: NoImagesInCategoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-900/10 py-16 px-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 mb-5 ring-4 ring-sky-200/50 dark:ring-sky-800/30">
        <HiPhotograph className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
        No images in this category
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mb-6">
        Upload images from the Upload tab and assign them to this category, or switch to another category.
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
