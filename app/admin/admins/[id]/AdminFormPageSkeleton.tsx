import { Card } from "flowbite-react";
import { Skeleton } from "@/components/ui/Skeleton";
import AdminEditorSkeleton from "./AdminEditorSkeleton";

/**
 * Route-level fallback for the create / edit-or-detail admin pages. Matches the
 * real page shape (header + gradient hero band + two-column editor) so the swap
 * to the loaded page doesn't jump.
 */
export default function AdminFormPageSkeleton() {
  return (
    <div className="flex w-full flex-col" role="status" aria-label="Loading">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-4 w-72" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <Skeleton className="h-12 w-64" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-[32px]" />
          <AdminEditorSkeleton />
        </div>
      </Card>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
