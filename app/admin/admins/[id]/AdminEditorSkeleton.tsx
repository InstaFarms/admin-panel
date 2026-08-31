import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Form-shaped loading fallback for the admin editor - matches the two-column
 * `SectionCard` layout of `AdminProfileInlineEditor` so the transition into the
 * real form doesn't jump. Only shown when the editor has to fetch an admin on
 * its own (the pages normally hand it `initialAdmin`, so this rarely appears).
 */
function CardSkeleton({ rows }: { rows: number }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-100/90 shadow-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-gray-700 dark:bg-white/[0.03]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminEditorSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]"
      role="status"
      aria-label="Loading admin editor"
    >
      <CardSkeleton rows={6} />
      <div className="space-y-4">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={4} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
