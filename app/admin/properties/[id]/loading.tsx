import { Card, Breadcrumb, BreadcrumbItem } from "flowbite-react";

function SkeletonLine({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return (
    <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} />
  );
}

function SkeletonInput() {
  return (
    <div className="space-y-2">
      <SkeletonLine width="w-24" height="h-3" />
      <SkeletonLine height="h-10" />
    </div>
  );
}

function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonInput key={i} />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Properties
          </h5>

          <Breadcrumb className="bg-white pb-3 dark:bg-gray-800">
            <BreadcrumbItem href="/">Home</BreadcrumbItem>
            <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
            <BreadcrumbItem href="/admin/properties">Properties</BreadcrumbItem>
            <BreadcrumbItem href="#">Edit</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className="mx-auto flex w-full flex-col gap-5 overflow-visible rounded-xl bg-slate-50 p-5 dark:bg-gray-900">
          {/* Header skeleton */}
          <div className="flex gap-4 items-center">
            <SkeletonLine width="w-48" height="h-6" />
            <SkeletonLine width="w-6" height="h-6" />
          </div>

          {/* Loading indicator */}
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">
              Loading property details...
            </p>
          </div>

          {/* Form skeleton structure */}
          <div className="space-y-6 opacity-50">
            {/* Button skeleton */}
            <div className="flex justify-end">
              <SkeletonLine width="w-24" height="h-10" />
            </div>

            {/* Tabs skeleton */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
              <SkeletonLine width="w-24" height="h-8" />
              <SkeletonLine width="w-24" height="h-8" />
              <SkeletonLine width="w-24" height="h-8" />
              <SkeletonLine width="w-24" height="h-8" />
            </div>

            {/* Form fields skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonInput />
              <SkeletonInput />
              <SkeletonInput />
              <SkeletonInput />
              <SkeletonInput />
              <SkeletonInput />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonInput />
              <SkeletonInput />
            </div>

            {/* Larger content area skeleton */}
            <div className="space-y-2">
              <SkeletonLine width="w-32" height="h-3" />
              <SkeletonLine height="h-32" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
