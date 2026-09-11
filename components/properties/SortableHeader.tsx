"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { PropertiesSort } from "@/lib/propertiesListUtils";
import styles from "./PropertiesListPage.module.css";

interface SortableHeaderProps {
  field: PropertiesSort["orderBy"];
  label: string;
  sort: PropertiesSort;
  /** Direction applied on the first click of an inactive column. */
  initialDirection?: PropertiesSort["sortorder"];
}

export default function SortableHeader({
  field,
  label,
  sort,
  initialDirection = "asc",
}: SortableHeaderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isActive = sort.orderBy === field;
  const nextDirection = isActive
    ? sort.sortorder === "asc"
      ? "desc"
      : "asc"
    : initialDirection;

  const applySort = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("dir", nextDirection);
    // Row order changed, so the current page number no longer means anything.
    params.set("page", "1");
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={applySort}
      className={styles.sortButton}
      aria-label={`Sort by ${label}, ${nextDirection === "asc" ? "ascending" : "descending"}`}
    >
      {label}
      <span aria-hidden="true" className={isActive ? undefined : styles.sortArrowIdle}>
        {isActive ? (sort.sortorder === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}
