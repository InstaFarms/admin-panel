"use client";

import { Button } from "flowbite-react";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PropertiesListItem } from "@/lib/propertiesListUtils";
import {
  formatPropertyLocation,
  getPropertyDisplayName,
} from "@/lib/propertiesListUtils";
import PropertiesTable from "@/components/properties/PropertiesTable";

interface DeletedPropertiesDrawerProps {
  open: boolean;
  onClose: () => void;
  data: PropertiesListItem[];
  emptyMessage: string;
}

const PAGE_SIZE = 10;
const TRANSITION_MS = 320;

export default function DeletedPropertiesDrawer({
  open,
  onClose,
  data,
  emptyMessage,
}: DeletedPropertiesDrawerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Trigger slide-in: render at translateX(100%), then flip isVisible on next paint
  useEffect(() => {
    if (!open) return;
    setIsVisible(false);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setIsVisible(true));
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [open]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsVisible(false);
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, TRANSITION_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedSearch("");
      setVisibleCount(PAGE_SIZE);
      return;
    }
    setVisibleCount(PAGE_SIZE);
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data;
    return data.filter((property) => {
      const haystack = [
        getPropertyDisplayName(property),
        property.propertyCode ?? "",
        property.propertyCodeName ?? "",
        formatPropertyLocation(property),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [data, debouncedSearch]);

  const visibleData = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount],
  );

  const hasMore = visibleCount < filteredData.length;

  useEffect(() => {
    if (!open || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredData.length));
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredData.length, hasMore, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        aria-label="Close deleted properties"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${TRANSITION_MS}ms ease`,
        }}
        onClick={handleClose}
      />

      {/* Drawer panel — starts off-screen right, slides in */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[92vw] bg-white shadow-2xl dark:bg-gray-900 lg:max-w-300"
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: isVisible
            ? `transform ${TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.6, 1)`,
        }}
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500 dark:text-red-300">
                Deleted Properties
              </div>
              <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                Recover deleted properties
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review disabled properties and recover them whenever needed.
              </p>
            </div>
            <Button color="light" size="xs" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-[calc(100%-97px)] overflow-y-auto p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {visibleData.length} of {filteredData.length} deleted
              properties
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search deleted properties..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
          <PropertiesTable
            data={visibleData}
            offset={0}
            emptyMessage={
              debouncedSearch
                ? "No matching deleted properties found."
                : emptyMessage
            }
            mode="deleted"
          />
          {hasMore ? (
            <div
              ref={sentinelRef}
              className="mt-4 flex h-12 items-center justify-center text-sm text-gray-500 dark:text-gray-400"
            >
              Scroll to load more
            </div>
          ) : filteredData.length > PAGE_SIZE ? (
            <div className="mt-4 flex h-12 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              All deleted properties loaded
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
