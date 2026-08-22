"use client";

import { Button, Select, TextInput } from "flowbite-react";
import type { ChangeEvent } from "react";

import FaqCsvUpload from "@/components/common/FaqCsvUpload";

import type { FaqItem } from "./types";

type FaqControlBarProps = {
  faqs: FaqItem[];
  filteredFaqCount: number;
  selectedFaqCategory: string;
  setSelectedFaqCategory: (category: string) => void;
  faqSearchQuery: string;
  setFaqSearchQuery: (value: string) => void;
  faqCategories: string[];
  onAddFaqClick: () => void;
  onClearFilters: () => void;
  handleFaqCsvUpload: (e: ChangeEvent<HTMLInputElement>, replaceExisting: boolean) => void;
  handleFaqCsvExport: () => void;
};

export default function FaqControlBar({
  faqs,
  filteredFaqCount,
  selectedFaqCategory,
  setSelectedFaqCategory,
  faqSearchQuery,
  setFaqSearchQuery,
  faqCategories,
  onAddFaqClick,
  onClearFilters,
  handleFaqCsvUpload,
  handleFaqCsvExport,
}: FaqControlBarProps) {
  const hasFilters = Boolean(selectedFaqCategory || faqSearchQuery);

  return (
    <div className="sticky top-2 z-20 space-y-3 rounded-lg border border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" color="blue" onClick={onAddFaqClick}>
          + Add FAQ
        </Button>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          Total: {faqs.length}
        </span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Showing: {filteredFaqCount}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Drag to reorder
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
        <TextInput
          placeholder="Search FAQs by question or answer..."
          value={faqSearchQuery}
          onChange={(e) => setFaqSearchQuery(e.target.value)}
        />

        <Select value={selectedFaqCategory} onChange={(e) => setSelectedFaqCategory(e.target.value)}>
          <option value="">All Categories</option>
          {faqCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-2 lg:justify-end">
          {hasFilters ? (
            <Button type="button" color="gray" onClick={onClearFilters}>
              Clear Filters
            </Button>
          ) : null}
          <FaqCsvUpload onUpload={handleFaqCsvUpload} faqs={faqs} />
          <Button type="button" color="success" onClick={handleFaqCsvExport}>
            Export FAQs
          </Button>
        </div>
      </div>
    </div>
  );
}
