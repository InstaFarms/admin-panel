"use client";

import {
  STAFF_ACTIVITY_CATEGORY_LABELS,
  STAFF_ACTIVITY_OUTCOME_LABELS,
} from "@/constants/staffActivity";
import {
  dateInputValue,
  hasStaffActivityFilters,
  toDateBoundary,
  updateStaffActivityQuery,
} from "@/lib/staffActivityUtils";
import {
  STAFF_ACTIVITY_CATEGORIES,
  STAFF_ACTIVITY_OUTCOMES,
  type StaffActivityFilters,
  type StaffActivityPropertyOption,
  type StaffActivityRole,
  type StaffActivityStaffOption,
} from "@/types/staffActivity";
import { Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import PropertyActivityCombobox from "./PropertyActivityCombobox";
import StaffActorCombobox from "./StaffActorCombobox";

interface ActivityLogFiltersProps {
  filters: StaffActivityFilters;
  staffOptions: StaffActivityStaffOption[];
  propertyOptions: StaffActivityPropertyOption[];
}

const selectClassName =
  "h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

const labelClassName =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300";

export default function ActivityLogFilters({
  filters,
  staffOptions,
  propertyOptions,
}: ActivityLogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.q ?? "");

  useEffect(() => setSearchValue(filters.q ?? ""), [filters.q]);

  const navigate = (
    patch: Parameters<typeof updateStaffActivityQuery>[1],
    replace = false,
  ) => {
    const next = updateStaffActivityQuery(searchParams.toString(), patch);
    const href = `${pathname}${next.size ? `?${next.toString()}` : ""}`;
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  useEffect(() => {
    const normalized = searchValue.trim();
    if (normalized === (filters.q ?? "")) return;
    const timer = window.setTimeout(
      () => navigate({ q: normalized || undefined }, true),
      500,
    );
    return () => window.clearTimeout(timer);
    // `searchParams` intentionally updates after each navigation. Re-running
    // keeps the debounce aligned to the canonical URL without losing typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, filters.q]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate({ q: searchValue.trim() || undefined });
  };

  const setRole = (role: StaffActivityRole | undefined) => {
    if (filters.role === role) return;
    navigate({ role, staff: undefined });
  };

  const clearAll = () => {
    setSearchValue("");
    const next = new URLSearchParams();
    if (filters.limit !== 50) next.set("limit", String(filters.limit));
    startTransition(() =>
      router.push(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
        scroll: false,
      }),
    );
  };

  const activeCount = [
    filters.staff,
    filters.role,
    filters.category,
    filters.outcome,
    filters.property,
    filters.from,
    filters.to,
    filters.q,
  ].filter(Boolean).length;

  return (
    <section
      aria-labelledby="staff-activity-filters-title"
      aria-busy={isPending}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h2
              id="staff-activity-filters-title"
              className="text-sm font-bold text-gray-900 dark:text-white"
            >
              Find staff activity
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Filters update the URL so this view can be shared and revisited.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating
            </span>
          ) : null}
          {hasStaffActivityFilters(filters) ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <span className={labelClassName}>Staff role</span>
          <div
            className="inline-flex w-full rounded-lg bg-gray-100 p-1 sm:w-auto dark:bg-gray-900/70"
            role="group"
            aria-label="Filter by staff role"
          >
            {[
              { value: undefined, label: "All staff" },
              { value: "CARETAKER" as const, label: "Caretakers" },
              { value: "SUPERVISOR" as const, label: "Supervisors" },
            ].map((item) => {
              const active = filters.role === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRole(item.value)}
                  className={`min-w-0 flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:flex-none ${
                    active
                      ? "bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-200"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaffActorCombobox
            options={staffOptions}
            value={filters.staff}
            role={filters.role}
            onChange={(staff) => navigate({ staff })}
            disabled={isPending}
          />
          <PropertyActivityCombobox
            options={propertyOptions}
            value={filters.property}
            onChange={(property) => navigate({ property })}
            disabled={isPending}
          />
          <div>
            <label htmlFor="activity-category" className={labelClassName}>
              Category
            </label>
            <select
              id="activity-category"
              className={selectClassName}
              value={filters.category ?? ""}
              onChange={(event) =>
                navigate({ category: event.target.value || undefined })
              }
            >
              <option value="">All categories</option>
              {STAFF_ACTIVITY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {STAFF_ACTIVITY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="activity-outcome" className={labelClassName}>
              Outcome
            </label>
            <select
              id="activity-outcome"
              className={selectClassName}
              value={filters.outcome ?? ""}
              onChange={(event) =>
                navigate({ outcome: event.target.value || undefined })
              }
            >
              <option value="">All outcomes</option>
              {STAFF_ACTIVITY_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {STAFF_ACTIVITY_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,2fr)]">
          <div>
            <label htmlFor="activity-from" className={labelClassName}>
              From date <span className="text-gray-400 normal-case">(IST)</span>
            </label>
            <input
              id="activity-from"
              type="date"
              className={selectClassName}
              value={dateInputValue(filters.from)}
              max={dateInputValue(filters.to) || undefined}
              onChange={(event) =>
                navigate({
                  from: toDateBoundary(event.target.value, "start"),
                })
              }
            />
          </div>
          <div>
            <label htmlFor="activity-to" className={labelClassName}>
              To date <span className="text-gray-400 normal-case">(IST)</span>
            </label>
            <input
              id="activity-to"
              type="date"
              className={selectClassName}
              value={dateInputValue(filters.to)}
              min={dateInputValue(filters.from) || undefined}
              onChange={(event) =>
                navigate({ to: toDateBoundary(event.target.value, "end") })
              }
            />
          </div>
          <form onSubmit={submitSearch}>
            <label htmlFor="activity-search" className={labelClassName}>
              Search activity
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="activity-search"
                type="search"
                maxLength={120}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Action, request, entity or summary…"
                className={`${selectClassName} pr-20 pl-9`}
              />
              <button
                type="submit"
                className="absolute top-1/2 right-1 h-8 -translate-y-1/2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
