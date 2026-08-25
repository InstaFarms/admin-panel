"use client";

import { ToggleSwitch } from "flowbite-react";

export default function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {label}
          </p>
          {description ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
      <div className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            checked
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {checked ? "Enabled" : "Off"}
        </span>
      </div>
    </div>
  );
}
