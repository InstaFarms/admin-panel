"use client";

import { Button, Select } from "flowbite-react";

import { useRouter, useSearchParams } from "next/navigation";

import { ChangeEvent } from "react";

interface PaginationProps {
  totalItems?: number;
  pageParam?: string;
  itemsPerPageParam?: string;
  defaultItemsPerPage?: number;
  itemsPerPageOptions?: readonly number[];
}

export default function Pagination({
  totalItems,
  pageParam = "page",
  itemsPerPageParam = "itemsPerPage",
  defaultItemsPerPage = 10,
  itemsPerPageOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // NOTE: `searchParams.get()` returns `null` when missing; `Number(null)` becomes `0`
  // (not NaN), which breaks defaults and causes pagination mismatch.
  const rawItemsPerPage = searchParams.get(itemsPerPageParam);
  const rawPage = searchParams.get(pageParam);

  let itemsPerPage = rawItemsPerPage
    ? Number(rawItemsPerPage)
    : defaultItemsPerPage;
  let page = rawPage ? Number(rawPage) : 1;

  itemsPerPage = Number.isNaN(itemsPerPage)
    ? defaultItemsPerPage
    : itemsPerPage;
  page = Number.isNaN(page) ? 1 : page;

  itemsPerPage = Math.max(1, itemsPerPage);
  page = Math.max(1, page);

  const totalPages = totalItems
    ? Math.ceil(totalItems / itemsPerPage)
    : undefined;
  // Keep the historical open-ended behavior when callers do not provide a total.

  const updateItemsPerPage = (event: ChangeEvent<HTMLSelectElement>) => {
    const newVal = Number(event.target.value);
    if (!Number.isNaN(newVal)) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set(itemsPerPageParam, newVal.toString());
      newSearchParams.set(pageParam, "1");

      const newPathname = window.location.pathname;
      const newQuery = newSearchParams.toString();
      const newUrl = `${newPathname}${newQuery ? `?${newQuery}` : ""}`;

      router.push(newUrl, { scroll: false });
    }
  };

  const updatePageNo = (pageNo: number) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set(pageParam, pageNo.toString());

    const newPathname = window.location.pathname;
    const newQuery = newSearchParams.toString();
    const newUrl = `${newPathname}${newQuery ? `?${newQuery}` : ""}`;

    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      className="flex flex-row items-center justify-center gap-3 py-4"
      suppressHydrationWarning
    >
      <Select
        id={`pagination-${itemsPerPageParam}`}
        aria-label="Items per page"
        onChange={updateItemsPerPage}
        value={itemsPerPage}
      >
        {itemsPerPageOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Button
        disabled={page <= 1}
        onClick={() => updatePageNo(page - 1)}
        size="sm"
        color="gray"
      >
        Prev
      </Button>

      <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
        Page {page} {totalPages ? `of ${totalPages}` : ""}
      </span>

      <Button
        disabled={totalPages ? page >= totalPages : false}
        size="sm"
        color="gray"
        onClick={() => updatePageNo(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
