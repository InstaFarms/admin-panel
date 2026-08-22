"use client";

import dynamic from "next/dynamic";
import { TabItem, Tabs } from "flowbite-react";

import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";

import type { JoditConfig } from "./types";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

type RichTextPanelProps = {
  title: string;
  description: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hiddenName: string;
  hiddenValue: string;
  joditConfig: JoditConfig;
};

export default function RichTextPanel({
  title,
  description,
  label,
  value,
  onChange,
  hiddenName,
  hiddenValue,
  joditConfig,
}: RichTextPanelProps) {
  return (
    <div className="space-y-4">
      <SectionHeading title={title} description={description} />
      <LabelWrapper label={label}>
        <Tabs variant="underline">
          <TabItem title="Editor">
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <JoditEditor
                value={value}
                onBlur={(content: string) => onChange(content)}
                config={joditConfig}
              />
            </div>
          </TabItem>
          <TabItem title="Preview">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              {value.trim() ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nothing to preview yet.</p>
              )}
            </div>
          </TabItem>
        </Tabs>
        <input type="hidden" name={hiddenName} value={hiddenValue} />
      </LabelWrapper>
    </div>
  );
}
