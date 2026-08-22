"use client";

import { Select, TextInput, Textarea } from "flowbite-react";
import { HiDotsVertical } from "react-icons/hi";

import type { FaqItem, FaqUpdate } from "./types";

type FaqCardProps = {
  faq: FaqItem;
  faqIndexLabel: number;
  faqCategories: string[];
  isExpanded: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdate: (updates: FaqUpdate) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

export default function FaqCard({
  faq,
  faqIndexLabel,
  faqCategories,
  isExpanded,
  isDragged,
  isDragOver,
  onToggleExpand,
  onRemove,
  onUpdate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: FaqCardProps) {
  const questionPreview = String(faq.question || "").trim() || "Untitled question";

  return (
    <div className="relative">
      {isDragOver && !isDragged ? (
        <div className="pointer-events-none absolute -top-1 left-10 right-0 h-1 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex items-stretch overflow-hidden rounded-lg border bg-white/80 transition-[box-shadow,transform,opacity,border-color] duration-200 dark:bg-gray-900/70 ${
          isDragged
            ? "z-40 scale-[1.01] border-emerald-500/80 opacity-95 shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-500/40"
            : isDragOver
              ? "border-blue-500 shadow-md shadow-blue-500/15"
              : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className={`flex w-10 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center text-gray-500 transition-colors duration-150 touch-none ${
            isDragged
              ? "bg-emerald-100/90 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300"
              : "bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-blue-700/50"
          }`}
          title="Drag to reorder"
        >
          <HiDotsVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                FAQ #{faqIndexLabel}
              </span>
            {faq.category ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {faq.category}
              </span>
            ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                title={isExpanded ? "Collapse FAQ" : "Expand FAQ"}
                aria-label={isExpanded ? "Collapse FAQ" : "Expand FAQ"}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.937a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100/70 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/30 dark:hover:text-rose-300"
                onClick={onRemove}
              >
                Remove
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="mb-2 w-full rounded-md px-3 py-2 text-left text-sm text-gray-800 transition-colors dark:text-gray-200"
          >
            <p className="truncate font-medium">{questionPreview}</p>
          </button>

          {isExpanded ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Select value={faq.category || ""} onChange={(e) => onUpdate({ category: e.target.value })} className="md:col-span-1">
                  <option value="">Select Category</option>
                  {faqCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>

                <TextInput
                  className="md:col-span-4"
                  placeholder="Question"
                  value={faq.question || ""}
                  onChange={(e) => onUpdate({ question: e.target.value })}
                />

                <Textarea
                  className="md:col-span-5"
                  placeholder="Answer"
                  value={faq.answer || ""}
                  onChange={(e) => onUpdate({ answer: e.target.value })}
                  rows={3}
                />
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tip: drag this card using the left strip to change display order.</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
