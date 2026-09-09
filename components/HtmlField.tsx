"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { Label } from "flowbite-react";

import { useHtmlFieldConfig, type HtmlFieldSize } from "@/components/htmlFieldConfig";
import { isHtmlBlank } from "@/utils/html-content";

const JoditEditor = dynamic(() => import("jodit-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      Loading editor...
    </div>
  ),
});

type HtmlFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Label above the field. Omit when the caller already renders its own. */
  label?: string;
  required?: boolean;
  /** Small helper line under the label. */
  hint?: string;
  placeholder?: string;
  /** "compact" for FAQ answers and cards, "full" for page-length bodies. */
  size?: HtmlFieldSize;
  /** Renders a hidden input so plain <form action={...}> submissions pick the value up. */
  hiddenName?: string;
  hiddenValue?: string;
  className?: string;
};

export default function HtmlField({
  value,
  onChange,
  label,
  required,
  hint,
  placeholder,
  size = "compact",
  hiddenName,
  hiddenValue,
  className = "",
}: HtmlFieldProps) {
  const [view, setView] = useState<"edit" | "preview">("edit");
  const config = useHtmlFieldConfig(size, placeholder);
  const labelId = useId();

  const hasContent = !isHtmlBlank(value);

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {label ? (
          <Label htmlFor={labelId}>
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500" aria-hidden>
                *
              </span>
            ) : null}
          </Label>
        ) : (
          <span />
        )}

        <div
          role="group"
          aria-label="Editor view"
          className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-gray-800"
        >
          {(["edit", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                view === mode
                  ? "bg-white text-slate-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {mode === "edit" ? "Editor" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {hint ? <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}

      {view === "edit" ? (
        <div
          id={labelId}
          className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
        >
          <JoditEditor
            value={value}
            config={config}
            onChange={onChange}
            onBlur={onChange}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-900">
          {hasContent ? (
            <div
              className="cms-content-preview jodit-wysiwyg max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {hiddenName ? <input type="hidden" name={hiddenName} value={hiddenValue ?? value} /> : null}
    </div>
  );
}
