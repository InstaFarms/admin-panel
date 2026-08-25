function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

/**
 * Generic instant-fallback for admin list pages (table + search + pager),
 * shown while the page's server-side data fetch is in flight. Dropped in
 * via `export { default } from "@/components/ListPageSkeleton"` so every
 * list route gets one without hand-building a bespoke skeleton per page.
 */
export default function ListPageSkeleton() {
  return (
    <div className="w-full p-6" role="status" aria-label="Loading">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Block className="h-7 w-48" />
          <Block className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Block className="h-11 w-64" />
          <Block className="h-11 w-28" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          {[0, 1, 2, 3].map((i) => (
            <Block key={i} className="h-3 flex-1" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex gap-4 border-b border-gray-100 p-4 last:border-0 dark:border-gray-800"
          >
            {[0, 1, 2, 3].map((cell) => (
              <Block key={cell} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Block className="h-9 w-64" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
