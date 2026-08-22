"use client";

import { Search, X, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { togglePropertyStatus } from "@/actions/propertyActions";

type SplitChild = {
  childPropertyId: string;
  childProperty: any | null;
};

type SplitGroup = {
  parentPropertyId: string;
  parentProperty: any | null;
  children: SplitChild[];
};

interface DeletedSplitPropertiesDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: SplitGroup[];
  loading?: boolean;
  error?: string | null;
  onRestored?: () => void;
}

const PAGE_SIZE = 10;
const TRANSITION_MS = 320;

function showLocation(p: any) {
  return [p?.area, p?.city, p?.state].filter(Boolean).join(", ") || null;
}

export default function DeletedSplitPropertiesDrawer({
  open,
  onClose,
  groups,
  loading = false,
  error = null,
  onRestored,
}: DeletedSplitPropertiesDrawerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedSearch("");
      setVisibleCount(PAGE_SIZE);
      setRestoringIds(new Set());
      setRestoreErrors({});
      return;
    }
    setVisibleCount(PAGE_SIZE);
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleRestore = useCallback(async (propertyId: string) => {
    setRestoringIds((prev) => new Set(prev).add(propertyId));
    setRestoreErrors((prev) => { const next = { ...prev }; delete next[propertyId]; return next; });
    const result = await togglePropertyStatus(propertyId, true);
    setRestoringIds((prev) => { const next = new Set(prev); next.delete(propertyId); return next; });
    if (result?.error) {
      setRestoreErrors((prev) => ({ ...prev, [propertyId]: result.error as string }));
    } else {
      onRestored?.();
    }
  }, [onRestored]);

  // Flatten groups → list of disabled child rows
  const allRows = useMemo(() => {
    const rows: { group: SplitGroup; child: SplitChild }[] = [];
    for (const group of groups) {
      for (const child of group.children) {
        rows.push({ group, child });
      }
    }
    return rows;
  }, [groups]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return allRows;
    return allRows.filter(({ group, child }) => {
      const cp = child.childProperty;
      const parent = group.parentProperty;
      const haystack = [
        cp?.propertyName, cp?.propertyCode, cp?.propertyCodeName,
        parent?.propertyName, parent?.propertyCode,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [allRows, debouncedSearch]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hasMore = visibleCount < filteredRows.length;

  useEffect(() => {
    if (!open || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredRows.length));
      },
      { rootMargin: "120px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredRows.length, hasMore, open]);

  if (!open && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        aria-label="Close archived split properties"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        style={{ opacity: isVisible ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease` }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-[680px] flex-col bg-[#0d1420] shadow-2xl"
        style={{
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          transition: isVisible
            ? `transform ${TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : `transform ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.6, 1)`,
        }}
      >
        {/* Header */}
        <div className="border-b border-[#1b2433] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7d9ab5]">
                Archived Split Properties
              </div>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Archived Properties
              </h3>
              <p className="mt-1 text-sm text-[#7d8a99]">
                All archived child properties from split mappings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7d8a99] transition hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search + count */}
        <div className="flex flex-col gap-3 border-b border-[#1b2433] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[#7d8a99]">
            Showing {visibleRows.length} of {filteredRows.length} archived properties
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8a99]" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full rounded-lg border border-[#1b2433] bg-[#070b12] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-[#4a5568] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center gap-3 text-sm text-[#6f7c8c]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f6fed] border-t-transparent" />
              Loading archived properties…
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-red-400">
              Error: {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-[#6f7c8c]">
              {debouncedSearch ? "No matching archived properties found." : "No archived split properties."}
            </div>
          ) : (
            <div>
              {visibleRows.map(({ group, child }) => {
                const cp = child.childProperty;
                const parent = group.parentProperty;
                const loc = showLocation(cp);
                const propertyId = cp?.id as string | undefined;
                const isRestoring = propertyId ? restoringIds.has(propertyId) : false;
                const restoreError = propertyId ? restoreErrors[propertyId] : undefined;
                return (
                  <div
                    key={child.childPropertyId}
                    className="flex items-start justify-between gap-4 border-b border-[#141c28] px-5 py-4 transition hover:bg-[#0f1825]"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Child */}
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm bg-red-500" />
                        <span className="truncate text-[14px] font-semibold text-[#cdd6e0]">
                          {cp?.propertyName || cp?.name || "N/A"}
                        </span>
                        {cp?.propertyCode && (
                          <span className="shrink-0 rounded-md border border-[#243044] bg-[#101826] px-2 py-0.5 text-[11px] text-[#6f7c8c]">
                            {cp.propertyCode}
                          </span>
                        )}
                        {cp?.propertyCodeName && (
                          <span className="shrink-0 text-[12px] text-[#6f7c8c]">{cp.propertyCodeName}</span>
                        )}
                      </div>
                      {loc && (
                        <div className="mt-1 pl-4 text-[12px] text-[#6f7c8c]">{loc}</div>
                      )}
                      {/* Parent context */}
                      {parent && (
                        <div className="mt-2 pl-4 text-[12px] text-[#4a5568]">
                          Split from{" "}
                          <Link
                            href={`/admin/properties/${parent.id}`}
                            className="text-[#5a7fa8] hover:underline"
                            target="_blank"
                          >
                            {parent.propertyName || parent.name || "parent"}
                          </Link>
                          {parent.propertyCode ? ` (${parent.propertyCode})` : ""}
                        </div>
                      )}
                      {restoreError && (
                        <div className="mt-1.5 pl-4 text-[11px] text-red-400">{restoreError}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {propertyId && (
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => handleRestore(propertyId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRestoring ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Restore
                        </button>
                      )}
                      <Link
                        href={`/admin/properties/${cp?.id}`}
                        className="rounded-lg border border-[#1b2433] bg-[#101826] px-3 py-1.5 text-[12px] font-medium text-[#cdd6e0] transition hover:border-blue-500/40 hover:text-blue-400"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex h-12 items-center justify-center text-sm text-[#6f7c8c]"
                >
                  Scroll to load more
                </div>
              )}
              {!hasMore && filteredRows.length > PAGE_SIZE && (
                <div className="flex h-12 items-center justify-center text-sm text-[#6f7c8c]">
                  All archived properties loaded
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
