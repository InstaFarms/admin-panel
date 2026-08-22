"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const ROLES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owners", label: "Owners" },
  { value: "managers", label: "Managers" },
  { value: "caretakers", label: "Caretakers" },
];

interface RoleFilterProps {
  currentRole: string;
}

export default function RoleFilter({ currentRole }: RoleFilterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = useCallback(
    (role: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (role === "all") {
        params.delete("role");
      } else {
        params.set("role", role);
      }
      const q = params.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-600 dark:bg-gray-700">
      {ROLES.map(({ value, label }) => {
        const isActive = currentRole === value;
        return (
          <Link
            key={value}
            href={buildHref(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
