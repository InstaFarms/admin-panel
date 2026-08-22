"use client";

import LabelWrapper from "@/components/LabelWrapper";
import { TabItem, Textarea, TextInput } from "flowbite-react";

interface OthersMetaDataSectionProps {
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaUrl: string;
  setMetaUrl: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  metaKeyword: string;
  setMetaKeyword: (value: string) => void;
}

export default function OthersMetaDataSection({
  metaTitle,
  setMetaTitle,
  metaUrl,
  setMetaUrl,
  metaDescription,
  setMetaDescription,
  metaKeyword,
  setMetaKeyword,
}: OthersMetaDataSectionProps) {
  return (
    <TabItem title="MetaData">
      <div className="mx-auto max-w-[1000px] p-5">
        <div className="space-y-4">
          <LabelWrapper label="Meta Title">
            <TextInput
              id="metaTitleInput"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              type="text"
              placeholder="Enter meta title..."
            />
          </LabelWrapper>

          <LabelWrapper label="Meta URL">
            <TextInput
              id="metaUrlInput"
              value={metaUrl}
              onChange={(e) => setMetaUrl(e.target.value)}
              type="text"
              placeholder="Enter meta URL..."
            />
          </LabelWrapper>

          <LabelWrapper label="Meta Description">
            <Textarea
              id="metaDescriptionInput"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={6}
              placeholder="Enter meta description..."
            />
          </LabelWrapper>

          <LabelWrapper label="Meta Keyword">
            <TextInput
              id="metaKeyword"
              value={metaKeyword}
              onChange={(e) => setMetaKeyword(e.target.value)}
              type="text"
              placeholder="Enter meta keywords (comma separated)..."
            />
          </LabelWrapper>

          {/* Hidden input for meta JSONB storage */}
          <input
            type="hidden"
            name="meta"
            value={JSON.stringify({
              metaTitle: metaTitle || undefined,
              metaUrl: metaUrl || undefined,
              metaDescription: metaDescription || undefined,
              metaKeyword: metaKeyword || undefined
            })}
          />
        </div>
      </div>
    </TabItem>
  );
}

