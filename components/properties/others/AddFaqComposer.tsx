"use client";

import { Button, Select, TextInput, Textarea } from "flowbite-react";

import type { FaqDraft } from "./types";

type AddFaqComposerProps = {
  isOpen: boolean;
  draft: FaqDraft;
  faqCategories: string[];
  onChange: (draft: FaqDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function AddFaqComposer({
  isOpen,
  draft,
  faqCategories,
  onChange,
  onClose,
  onSubmit,
}: AddFaqComposerProps) {
  if (!isOpen) return null;

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Add New FAQ</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Select
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value })}
          className="md:col-span-1"
        >
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
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
        />

        <Textarea
          className="md:col-span-5"
          placeholder="Answer"
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
          rows={3}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" color="gray" onClick={onClose}>
          Close
        </Button>
        <Button type="button" color="blue" onClick={onSubmit} disabled={!draft.question.trim() || !draft.answer.trim()}>
          Save FAQ
        </Button>
      </div>
    </div>
  );
}
