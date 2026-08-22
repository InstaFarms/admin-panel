"use client";

import { useMemo, useState } from "react";
import { Button, TabItem, Tabs } from "flowbite-react";
import { HiUpload, HiTrash, HiOutlineFolder } from "react-icons/hi";
import { Label, Select } from "flowbite-react";
import type { GalleryData } from "@/utils/types";
import { GALLERY_TAB_KEYS } from "@/hooks/properties/usePropertyGallery";
import type { UploadEntry, ImageValidationResult } from "./types";
import { CATEGORY_OPTIONS } from "../constants";
import EntryPreviewCard, { type PreviewTabIndex } from "./EntryPreviewCard";

function PreviewCardsList({
  entries,
  activeTab,
  validationResults,
  onUpdate,
  onRemove,
}: {
  entries: UploadEntry[];
  activeTab: PreviewTabIndex;
  validationResults: Record<string, ImageValidationResult> | null;
  onUpdate: (id: string, updates: Partial<GalleryData>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2 pt-4">
      {entries.map((entry) => (
        <EntryPreviewCard
          key={entry.item.id}
          entry={entry}
          activeTab={activeTab}
          validationResult={validationResults?.[entry.item.id]}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

interface UploadPreviewSectionProps {
  entries: UploadEntry[];
  propertyId: string | null | undefined;
  uploading: boolean;
  validationResults: Record<string, ImageValidationResult> | null;
  isValidating: boolean;
  onUpdate: (id: string, updates: Partial<GalleryData>) => void;
  onRemove: (id: string) => void;
  onRemoveAll: () => void;
  onOpenUploadModal: () => void;
}

export default function UploadPreviewSection({
  entries,
  propertyId,
  uploading,
  validationResults,
  isValidating,
  onUpdate,
  onRemove,
  onRemoveAll,
  onOpenUploadModal,
}: UploadPreviewSectionProps) {
  const [activeTab, setActiveTab] = useState<PreviewTabIndex>(0);
  const [categoryForAll, setCategoryForAll] = useState<string>(GALLERY_TAB_KEYS[0] ?? "general");

  const isProcessing = entries.some((e) => e.processingPhoto === true);
  const actionsDisabled = uploading || isProcessing || isValidating;
  const canUpload = !actionsDisabled;

  const hasProcessingErrors = entries.some((e) => Boolean(e.processingPhotoError));
  const processingErrorReasons = useMemo(() => {
    const reasons: string[] = [];
    entries.forEach((e) => {
      if (e.processingPhotoError && !reasons.includes(e.processingPhotoError)) {
        reasons.push(e.processingPhotoError);
      }
    });
    return reasons;
  }, [entries]);

  const handleApplyCategoryToAll = () => {
    entries.forEach((entry) => onUpdate(entry.item.id, { key: categoryForAll }));
  };

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {hasProcessingErrors && (
        <div
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          role="alert"
        >
          <p className="font-medium mb-1">
            Some images could not be processed — this is why watermarked previews are missing.
          </p>
          <p className="text-amber-700 dark:text-amber-300 mb-1">
            Those images will not be included in the upload; other images can still be uploaded. No URLs are updated in the database for failed images.
          </p>
          {processingErrorReasons.length > 0 && (
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
              {processingErrorReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 tracking-wider min-w-0 gap-4 flex items-baseline">
          <div className="hidden sm:inline text-3xl">Gallery Preview</div>
          <div className="inline text-sm">({entries.length} Original + {entries.length} Watermarked) = {entries.length * 2} images</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 py-2 px-3">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="category-for-all" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
            Set category for all:
          </Label>
          <Select
            id="category-for-all"
            value={categoryForAll}
            onChange={(e) => setCategoryForAll(e.target.value)}
            disabled={actionsDisabled}
            className="w-40 [&]:dark:!bg-gray-600 [&]:dark:!text-white [&]:dark:!border-gray-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button
            color="light"
            onClick={handleApplyCategoryToAll}
            disabled={actionsDisabled}
            className="rounded-lg px-4 py-2 font-medium border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            <HiOutlineFolder className="w-4 h-4 mr-2" />
            Apply to all
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0 ml-auto">
          {isValidating && (
            <span className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              Validating images…
            </span>
          )}
          {actionsDisabled && !isValidating && (
            <span className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75 dark:bg-amber-500" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500 dark:bg-amber-400" />
              </span>
              {uploading && isProcessing
                ? "Uploading… · Processing watermarks…"
                : uploading
                  ? "Uploading…"
                  : "Processing watermarks…"}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              color="failure"
              onClick={onRemoveAll}
              disabled={actionsDisabled}
              className="rounded-xl px-4 py-2.5 font-semibold bg-red-500 hover:bg-red-600 focus:ring-red-400 dark:bg-red-600 dark:hover:bg-red-700 border-0 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60 text-white whitespace-nowrap"
            >
              <HiTrash className="w-5 h-5 mr-2" />
              Remove all
            </Button>
            {propertyId && (
              <Button
                color="success"
                onClick={onOpenUploadModal}
                disabled={!canUpload}
                className="rounded-xl px-6 py-2.5 font-semibold shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 border-0 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:hover:shadow-md disabled:cursor-not-allowed whitespace-nowrap"
              >
                <HiUpload className="w-5 h-5 mr-2" />
                Upload to property gallery
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs
        className="border-b border-gray-200 dark:border-gray-600"
        onActiveTabChange={(tab) => setActiveTab((typeof tab === "number" ? tab : 0) as PreviewTabIndex)}
      >
        <TabItem active={activeTab === 0} title="Original Photo">
          <PreviewCardsList
            entries={entries}
            activeTab={0}
            validationResults={validationResults}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        </TabItem>
        <TabItem active={activeTab === 1} title="Watermarked Photo">
          <PreviewCardsList
            entries={entries}
            activeTab={1}
            validationResults={validationResults}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        </TabItem>
      </Tabs>
    </div>
  );
}
