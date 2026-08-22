"use client";

export default function CoverImagesLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
      <div className="w-14 h-14 rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 dark:border-t-emerald-400 animate-spin mb-4" />
      <p className="text-sm font-medium">Loading cover images…</p>
    </div>
  );
}
