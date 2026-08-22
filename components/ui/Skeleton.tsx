import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} style={style} />;
}

interface SkeletonTextProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonText({ width = "w-full", height = "h-4", className = "" }: SkeletonTextProps) {
  return <Skeleton className={`${width} ${height} ${className}`} />;
}

interface SkeletonChartProps {
  height?: string;
}

// Simple "content is loading" placeholder: a title bar over a single pulsing block.
export function SkeletonChart({ height = "h-[400px]" }: SkeletonChartProps) {
  return (
    <div className={`${height} w-full bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col`}>
      <SkeletonText width="w-40" height="h-5" className="mb-4" />
      <Skeleton className="flex-1" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 8, cols = 6 }: SkeletonTableProps) {
  return (
    <div className="w-full">
      <div className="flex gap-4 pb-3 mb-2 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonText key={i} width="flex-1" height="h-3" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonText key={c} width="flex-1" height="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
