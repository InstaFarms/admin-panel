"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function StaffActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Staff activity route failed", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-80 w-full flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/60 dark:bg-red-950/30"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-bold text-red-900 dark:text-red-100">
        Staff Activity could not open
      </h2>
      <p className="mt-1 max-w-md text-sm text-red-700 dark:text-red-200">
        The page hit an unexpected error. Retry without losing your current
        filters.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus:ring-2 focus:ring-red-500/40 focus:outline-none"
      >
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
