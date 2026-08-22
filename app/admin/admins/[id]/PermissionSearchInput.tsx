"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HiSearch } from "react-icons/hi";
import { useDebouncedCallback } from "@/utils/debounce";

interface PermissionSearchInputProps {
  initialValue: string;
  isEditMode: boolean;
}

export default function PermissionSearchInput({
  initialValue,
  isEditMode,
}: PermissionSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const applySearch = useDebouncedCallback((nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "permissions");

    if (isEditMode) {
      params.set("mode", "edit");
    } else {
      params.delete("mode");
    }

    const trimmed = nextValue.trim();
    if (trimmed) {
      params.set("permissionSearch", trimmed);
    } else {
      params.delete("permissionSearch");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, 350);

  return (
    <div className="relative min-w-0 sm:w-[320px]">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 dark:text-slate-500">
        <HiSearch className="h-4 w-4" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          applySearch(next);
        }}
        placeholder="Search permissions"
        className="h-11 w-full rounded-xl border border-slate-300 bg-white/90 py-2 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
      />
    </div>
  );
}
