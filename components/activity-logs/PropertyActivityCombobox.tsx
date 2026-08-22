"use client";

import { searchStaffActivityProperties } from "@/actions/staffActivityActions";
import type { StaffActivityPropertyOption } from "@/types/staffActivity";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

interface PropertyActivityComboboxProps {
  options: StaffActivityPropertyOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

function mergeOptions(
  current: StaffActivityPropertyOption[],
  incoming: StaffActivityPropertyOption[],
) {
  const merged = new Map(current.map((option) => [option.id, option]));
  for (const option of incoming) merged.set(option.id, option);
  return [...merged.values()];
}

export default function PropertyActivityCombobox({
  options,
  value,
  onChange,
  disabled,
}: PropertyActivityComboboxProps) {
  const reactId = useId();
  const listboxId = `${reactId.replace(/:/g, "")}-property-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [knownOptions, setKnownOptions] = useState(options);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setKnownOptions((current) => mergeOptions(current, options));
  }, [options]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestRef.current;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setSearchError(undefined);
        const result = await searchStaffActivityProperties({
          search: query.trim() || undefined,
          limit: 50,
        });
        if (requestId !== requestRef.current) return;
        setLoading(false);
        if (!result.success) {
          setSearchError(
            result.error || "Property search is temporarily unavailable.",
          );
          return;
        }
        setKnownOptions((current) => mergeOptions(current, result.data));
      },
      query ? 350 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return knownOptions.filter((option) => {
      if (!needle) return true;
      return [option.name, option.code ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [knownOptions, query]);

  useEffect(() => {
    setActiveIndex((current) =>
      Math.min(current, Math.max(filteredOptions.length - 1, 0)),
    );
  }, [filteredOptions.length]);

  const selected = knownOptions.find((option) => option.id === value);
  const choose = useCallback(
    (option: StaffActivityPropertyOption) => {
      onChange(option.id);
      setQuery("");
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, filteredOptions.length - 1),
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label
        htmlFor={`${reactId}-property-search`}
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300"
      >
        Property
      </label>
      {open ? (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            id={`${reactId}-property-search`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              filteredOptions[activeIndex]
                ? `${listboxId}-${activeIndex}`
                : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search name or code…"
            className="h-10 w-full rounded-lg border border-blue-500 bg-white py-2 pr-9 pl-9 text-sm text-gray-900 ring-2 ring-blue-500/15 outline-none dark:border-blue-400 dark:bg-gray-800 dark:text-white"
          />
          {loading ? (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
          ) : (
            <button
              type="button"
              aria-label="Close property picker"
              onClick={() => setOpen(false)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <button
            id={`${reactId}-property-search`}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded="false"
            onClick={() => setOpen(true)}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 pr-14 text-left text-sm text-gray-900 transition hover:border-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">
                {selected?.name ||
                  (value ? "Selected property" : "All properties")}
              </span>
            </span>
          </button>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </span>
          {value ? (
            <button
              type="button"
              aria-label="Clear selected property"
              onClick={() => onChange(undefined)}
              className="absolute top-1/2 right-8 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[18rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Property search results"
            className="max-h-80 overflow-y-auto py-1"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <li
                  id={`${listboxId}-${index}`}
                  key={option.id}
                  role="option"
                  aria-selected={option.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={`cursor-pointer px-3 py-2.5 ${
                    index === activeIndex
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {option.name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {option.code || "No property code"}
                      </div>
                    </div>
                    {option.id === value ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                    ) : null}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {loading
                  ? "Searching properties…"
                  : "No matching property found."}
              </li>
            )}
          </ul>
          {searchError ? (
            <div
              role="alert"
              className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            >
              {searchError}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
