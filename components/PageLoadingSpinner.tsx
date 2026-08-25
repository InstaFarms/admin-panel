import { Spinner } from "flowbite-react";

/**
 * Content-neutral loading fallback for non-list pages (forms, detail views,
 * dashboards, wizards) -- use this instead of ListPageSkeleton wherever the
 * page isn't a table, so the loading state doesn't imply the wrong content.
 */
export default function PageLoadingSpinner() {
  return (
    <div
      className="flex w-full items-center justify-center p-16"
      role="status"
      aria-label="Loading"
    >
      <Spinner size="xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
