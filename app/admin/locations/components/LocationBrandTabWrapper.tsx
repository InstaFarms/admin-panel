"use client";

import React from "react";

interface LocationBrandTabWrapperProps {
  localIsEditMode: boolean;
  showBrandEditor: boolean;
  selectedBrandName: string;
  onAddBrand: () => void;
  addingBrand: boolean;
  locationName: string;
  children: React.ReactNode;
  createNoticeTitle?: string;
  lockNoticeTitle?: string;
}

export default function LocationBrandTabWrapper({
  localIsEditMode,
  showBrandEditor,
  selectedBrandName,
  onAddBrand,
  addingBrand,
  locationName,
  children,
  createNoticeTitle = "Create Location First",
  lockNoticeTitle = "Brand Content Locked",
}: LocationBrandTabWrapperProps) {
  if (!localIsEditMode) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {createNoticeTitle}
        </h3>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Create the base location first. After that, you can configure brand-specific content.
        </p>
      </div>
    );
  }

  if (!showBrandEditor) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-2xl text-blue-600 dark:text-blue-300">
              +
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {lockNoticeTitle}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              This section is reserved for <span className="font-semibold text-gray-900 dark:text-white">{selectedBrandName}</span>
              {" "}brand content. Initialize the override once to unlock content management for
              {" "}<span className="font-semibold text-gray-900 dark:text-white">{locationName || "this location"}</span>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={addingBrand}
                onClick={onAddBrand}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingBrand
                  ? "Adding Override..."
                  : `Initialize ${selectedBrandName} Override`}
              </button>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                You can also start this from the <span className="font-semibold">Detail</span> tab.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              What unlocks next
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-white p-3 dark:bg-slate-900/60">
                <p className="font-medium text-slate-900 dark:text-white">Page Content</p>
                <p className="mt-1 text-xs leading-5">
                  Brand-specific heading, rich content, map hints, and nearby attraction blocks.
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-slate-900/60">
                <p className="font-medium text-slate-900 dark:text-white">FAQs</p>
                <p className="mt-1 text-xs leading-5">
                  A separate question and answer set for this brand landing page.
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-slate-900/60">
                <p className="font-medium text-slate-900 dark:text-white">Metadata</p>
                <p className="mt-1 text-xs leading-5">
                  SEO fields like title, description, canonical URL, and OG image.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {selectedBrandName} override is active
            </h3>
            <p className="mt-1 text-sm leading-6 text-emerald-800/80 dark:text-emerald-100/80">
              You are editing brand-specific content for {locationName || "this location"}. Changes
              here affect the selected brand page, not the base location record.
            </p>
          </div>
          <div className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Override Enabled
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
