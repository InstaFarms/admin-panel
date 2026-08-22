"use client";

import { useState } from "react";
import { type BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { resolveBrandSlugFromName } from "@/lib/properties/brandSlug";
import { FileText, RotateCcw } from "lucide-react";

interface Source {
  id: string;
  name: string;
  description: string;
}

interface BrandSelectScreenProps {
  sources: Source[];
  onSelect: (source: { id: string; name: string }) => void;
  resumableDraft?: { id: string; name: string; slug: BrandSlug };
  onResumeDraft?: () => void;
  onDiscardDraft?: () => void;
}

const BRAND_GRADIENTS: Record<string, string> = {
  instafarms: "from-emerald-500 to-teal-600",
  mago: "from-blue-500 to-indigo-600",
  listing: "from-purple-500 to-violet-600",
};

export default function BrandSelectScreen({
  sources,
  onSelect,
  resumableDraft,
  onResumeDraft,
  onDiscardDraft,
}: BrandSelectScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedSource = sources.find((b) => b.id === selectedId);

  const handleContinue = () => {
    if (!selectedSource) return;
    onSelect({ id: selectedSource.id, name: selectedSource.name });
  };

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center gap-8 py-12">
      {/* Draft resume card */}
      {resumableDraft && (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-1 w-full bg-linear-to-r from-amber-400 to-orange-400" />
          <div className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-400/10">
                <FileText size={16} className="text-amber-500 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Unfinished draft found
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  You have a saved draft for{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {resumableDraft.name}
                  </span>
                  . Resume it or start fresh.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResumeDraft}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Resume Draft →
              </button>
              <button
                type="button"
                onClick={onDiscardDraft}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
              >
                <RotateCcw size={13} />
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create a New Property
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose the source platform for this property. All properties will automatically appear on InstaFarms.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {sources.map((source) => {
          const isSelected = selectedId === source.id;
          const bgGradient =
            source.id === "INSTAFARMS_EXCLUSIVE"
              ? BRAND_GRADIENTS.instafarms
              : source.id === "MAGO"
                ? BRAND_GRADIENTS.mago
                : BRAND_GRADIENTS.listing;

          return (
            <div
              key={source.id}
              onClick={() => setSelectedId(source.id)}
              className={`
                group relative flex w-[280px] cursor-pointer flex-col overflow-hidden rounded-2xl border-2 p-1 text-left
                transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]
                ${isSelected
                  ? "border-blue-600 bg-blue-50/30 shadow-md dark:border-blue-500 dark:bg-blue-900/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                }
              `}
            >
              <div
                className={`
                  flex h-28 items-center justify-center rounded-xl bg-gradient-to-br transition-opacity
                  ${bgGradient}
                  ${isSelected ? "opacity-100" : "opacity-90 group-hover:opacity-100"}
                `}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white shadow-sm backdrop-blur-md">
                  {source.name.charAt(0)}
                </div>
              </div>

              <div className="flex flex-col p-4 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">
                    {source.name}
                  </h3>
                  <div
                    className={`
                      flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200
                      ${isSelected
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "border-2 border-slate-300 dark:border-slate-600"
                      }
                    `}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                  {source.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedSource}
        onClick={handleContinue}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Continue →
      </button>
    </div>
  );
}
