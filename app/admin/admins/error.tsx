"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "flowbite-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
            Something went wrong loading this page.
          </h2>
          <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/80">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button color="gray" onClick={() => reset()}>
              Try again
            </Button>
            <Link href="/admin/admins">
              <Button color="light">Back to admins</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
