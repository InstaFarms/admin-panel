"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "./StateListPage.module.css";

export default function StateListControls({
  pageSize,
  currentPage,
  hasNextPage,
}: {
  pageSize: number;
  currentPage: number;
  hasNextPage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushWithParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const query = next.toString();
    router.push(`${window.location.pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className={styles.pager}>
      <select
        className={styles.pageSizeSelect}
        value={pageSize}
        onChange={(event) => {
          const nextValue = event.target.value;
          pushWithParams((params) => {
            params.set("itemsPerPage", nextValue);
            params.set("page", "1");
          });
        }}
        aria-label="Items per page"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>

      <button
        type="button"
        className={styles.pagerButton}
        disabled={currentPage <= 1}
        onClick={() =>
          pushWithParams((params) => {
            params.set("page", String(Math.max(1, currentPage - 1)));
          })
        }
      >
        Prev
      </button>

      <span className={styles.pageLabel}>Page {currentPage}</span>

      <button
        type="button"
        className={styles.pagerButton}
        disabled={!hasNextPage}
        onClick={() =>
          pushWithParams((params) => {
            params.set("page", String(currentPage + 1));
          })
        }
      >
        Next
      </button>
    </div>
  );
}
