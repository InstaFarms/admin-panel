"use client";

import Spinner from "./Spinner";

interface LoadMoreSentinelProps {
  sentinelRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export default function LoadMoreSentinel({ sentinelRef, className }: LoadMoreSentinelProps) {
  return (
    <div ref={sentinelRef} className={className}>
      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
        <Spinner className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading more images…</span>
      </div>
      <div className="flex justify-center">
        <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
      </div>
    </div>
  );
}
