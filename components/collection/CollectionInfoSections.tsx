"use client";

import { Checkbox, Label, TextInput, Textarea } from "flowbite-react";
import { HiTrash } from "react-icons/hi";
import MyButton from "@/components/MyButton";

export interface Info {
  title: string;
  content: string;
  sectionType?: string;
  isPublished: boolean;
}

interface CollectionInfoSectionsProps {
  infos: Info[];
  onAdd: () => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, field: keyof Info, value: string | boolean) => void;
}

export default function CollectionInfoSections({
  infos, onAdd, onDelete, onUpdate,
}: CollectionInfoSectionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Information Sections
        </h3>
        <MyButton type="button" onClick={onAdd}>New</MyButton>
      </div>

      {infos.length === 0 && (
        <div className="w-full bg-slate-100 dark:bg-gray-900 p-8 rounded-xl text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No info sections yet. Click "New" to get started.
          </p>
        </div>
      )}

      {infos.map((info, i) => (
        <div key={i} className="w-full bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-5">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Section #{i + 1}
            </h4>
            <button type="button" onClick={() => onDelete(i)} className="rounded-md bg-red-600 p-1">
              <HiTrash size={20} className="text-white" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor={`info-t-${i}`}>
                Title <span className="text-red-500">*</span>
              </Label>
              <TextInput
                id={`info-t-${i}`} type="text" placeholder="Section title"
                value={info.title || ""}
                onChange={e => onUpdate(i, "title", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`info-c-${i}`}>
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id={`info-c-${i}`} rows={4} placeholder="Section content"
                value={info.content || ""}
                onChange={e => onUpdate(i, "content", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`info-pub-${i}`}
                checked={info.isPublished ?? true}
                onChange={e => onUpdate(i, "isPublished", e.target.checked)}
              />
              <Label htmlFor={`info-pub-${i}`}>Published</Label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}