"use client";

import { Checkbox, Label, TextInput, Textarea } from "flowbite-react";
import { HiTrash } from "react-icons/hi";
import MyButton from "@/components/MyButton";

export interface FAQ {
  question: string;
  answer: string;
  isActive: boolean;
  weight: number;
}

interface CollectionFAQsProps {
  faqs: FAQ[];
  onAdd: () => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, field: keyof FAQ, value: string | boolean | number) => void;
}

export default function CollectionFAQs({
  faqs, onAdd, onDelete, onUpdate,
}: CollectionFAQsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h3>
        <MyButton type="button" onClick={onAdd}>New</MyButton>
      </div>

      {faqs.length === 0 && (
        <div className="w-full bg-slate-100 dark:bg-gray-900 p-8 rounded-xl text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No FAQs yet. Click "New" to get started.
          </p>
        </div>
      )}

      {faqs.map((faq, i) => (
        <div key={i} className="w-full bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-5">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">FAQ #{i + 1}</h4>
            <button type="button" onClick={() => onDelete(i)} className="rounded-md bg-red-600 p-1">
              <HiTrash size={20} className="text-white" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor={`faq-q-${i}`}>
                Question <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id={`faq-q-${i}`} type="text" placeholder="Enter question"
                value={faq.question}
                onChange={e => onUpdate(i, "question", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`faq-a-${i}`}>
                Answer <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id={`faq-a-${i}`} rows={3} placeholder="Enter answer"
                value={faq.answer}
                onChange={e => onUpdate(i, "answer", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`faq-w-${i}`}>Weight</Label>
                <TextInput
                  id={`faq-w-${i}`} type="number" placeholder="0"
                  value={faq.weight}
                  onChange={e => onUpdate(i, "weight", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox
                  id={`faq-active-${i}`}
                  checked={faq.isActive}
                  onChange={e => onUpdate(i, "isActive", e.target.checked)}
                />
                <Label htmlFor={`faq-active-${i}`}>Active</Label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}