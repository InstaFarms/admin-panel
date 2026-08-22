"use client";

import { SEARCH_KEY_PARAM, SEARCH_VALUE_PARAM } from "@/constants/list";
import { useDebouncedCallback } from "@/utils/debounce";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

const DROPDOWN_OFFSET_PX = 4;
const DROPDOWN_Z_INDEX = 9999;
const SEARCH_DEBOUNCE_MS = 1000;

export interface SearchbarProps {
  searchKeys: string[];
  defaultSearchKey: string;
}

export default function Searchbar({ searchKeys, defaultSearchKey }: SearchbarProps) {
  const [searchKey, setSearchKey] = useState<string>(defaultSearchKey);
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const openDropdown = () => {
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + DROPDOWN_OFFSET_PX,
        left: rect.left,
        width: rect.width,
      });
    }
    setDropdownOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownOpen &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    const sk = searchParams.get(SEARCH_KEY_PARAM);
    const sv = searchParams.get(SEARCH_VALUE_PARAM);

    if (sv?.length && sk?.length) {
      setSearchKey(sk);
      setInputValue(sv);
      return;
    }

    setInputValue("");
  }, [searchParams, router]);

  const navigateSearch = (newUrl: string) => {
    router.replace(newUrl, { scroll: false });
  };

  const applySearchToUrl = useDebouncedCallback((key: string, value: string) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.delete("page");
    newSearchParams.delete(SEARCH_KEY_PARAM);
    newSearchParams.delete(SEARCH_VALUE_PARAM);

    const trimmed = value.trim();
    if (trimmed) {
      newSearchParams.set(SEARCH_KEY_PARAM, key);
      newSearchParams.set(SEARCH_VALUE_PARAM, trimmed);
    }

    const query = newSearchParams.toString();
    navigateSearch(`${window.location.pathname}${query ? `?${query}` : ""}`);
  }, SEARCH_DEBOUNCE_MS);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    applySearchToUrl.cancel();

    const searchValue = inputValue.trim();
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.delete("page");
    newSearchParams.delete(SEARCH_KEY_PARAM);
    newSearchParams.delete(SEARCH_VALUE_PARAM);

    if (searchValue) {
      newSearchParams.set(SEARCH_KEY_PARAM, searchKey);
      newSearchParams.set(SEARCH_VALUE_PARAM, searchValue);
    }

    const query = newSearchParams.toString();
    navigateSearch(`${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <input
        type="search"
        id={SEARCH_KEY_PARAM}
        name={SEARCH_KEY_PARAM}
        value={searchKey}
        className="hidden"
        readOnly
      />

      <div className="flex h-11 w-full min-w-0 overflow-hidden rounded-[10px] border border-slate-200 bg-white transition-shadow focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-0 dark:border-white/8 dark:bg-[#374151]">
        {searchKeys.length > 1 ? (
          <div className="relative flex shrink-0" ref={triggerRef}>
            <button
              type="button"
              onClick={() => (dropdownOpen ? setDropdownOpen(false) : openDropdown())}
              className="flex min-w-0 items-center gap-2 rounded-none border-0 border-r border-slate-200 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-200 dark:border-white/8 dark:text-slate-100 dark:hover:bg-white/5 dark:focus:ring-white/20"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              aria-label="Search by"
            >
              <span className="truncate">{searchKey}</span>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-300 ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        ) : null}

        {dropdownOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                role="listbox"
                className="rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg dark:border-[#3a4658] dark:bg-[#1f2937]"
                style={{
                  position: "fixed",
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  zIndex: DROPDOWN_Z_INDEX,
                }}
              >
                {searchKeys.map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    role="option"
                    aria-selected={searchKey === sk}
                    onClick={() => {
                      setSearchKey(sk);
                      setDropdownOpen(false);
                      if (inputValue.trim()) {
                        applySearchToUrl.cancel();
                        applySearchToUrl(sk, inputValue);
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                      searchKey === sk
                        ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-600/15 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                    }`}
                  >
                    {sk}
                    {searchKey === sk ? (
                      <svg
                        className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </button>
                ))}
              </div>,
              document.body,
            )
          : null}

        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            id={SEARCH_VALUE_PARAM}
            name={SEARCH_VALUE_PARAM}
            className="h-full w-full border-0 bg-transparent px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Search..."
            autoComplete="off"
            value={inputValue}
            onChange={(e) => {
              const nextValue = e.target.value;
              setInputValue(nextValue);
              applySearchToUrl(searchKey, nextValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const form = e.currentTarget.form;
                if (form) {
                  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
              }
            }}
          />
        </div>

        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-1.5 border-0 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-70"
        >
          <svg
            className="h-4 w-4"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
          <span className="sr-only">Search</span>
        </button>
      </div>
    </form>
  );
}
