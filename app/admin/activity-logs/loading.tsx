function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export default function StaffActivityLoading() {
  return (
    <div
      className="w-full space-y-4"
      role="status"
      aria-label="Loading staff activity"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Block className="h-11 w-11" />
          <div className="space-y-2">
            <Block className="h-5 w-44" />
            <Block className="h-3 w-80 max-w-[65vw]" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Block className="mb-5 h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Block key={item} className="h-10" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Block key={item} className="h-10" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Block key={item} className="h-32" />
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Block className="mb-4 h-7 w-48" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <Block key={item} className="h-14" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading staff activity…</span>
    </div>
  );
}
