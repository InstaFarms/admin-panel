"use client";

import type { UploadEntry } from "./types";
import { formatBytes } from "./utils";

interface ConversionListProps {
  title: string;
  subtitle?: string;
  entries: UploadEntry[];
  emptyLabel: string;
  themeClass: string;
}

export default function ConversionList({
  title,
  subtitle,
  entries,
  emptyLabel,
  themeClass,
}: ConversionListProps) {
  const totalSize = entries.reduce((sum, e) => sum + (e.fileSize ?? 0), 0);
  const sizeStr = totalSize > 0 ? formatBytes(totalSize) : null;
  return (
    <div className={"rounded-xl border p-4 " + themeClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
        <h4 className="text-sm font-semibold">{title}</h4>
        {(subtitle != null || sizeStr != null) && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {[subtitle, sizeStr].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 max-h-32 overflow-y-auto">
        {entries.length === 0 ? (
          <li className="italic text-gray-500 dark:text-gray-400">{emptyLabel}</li>
        ) : (
          entries.map((e) => (
            <li
              key={e.item.id}
              className="truncate py-1 px-2 rounded-lg bg-white/60 dark:bg-black/20"
              title={e.item.fileName || e.item.id}
            >
              {e.item.fileName || e.item.id}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
