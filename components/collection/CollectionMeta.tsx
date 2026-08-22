"use client";

import { Label, TextInput, Textarea } from "flowbite-react";

export interface MetaState {
  metaTitle: string;
  metaDescription: string;
  metaUrl: string;
  metaImage: string;
}

interface CollectionMetaProps {
  state: MetaState;
  onChange: (field: keyof MetaState, value: string) => void;
}

export default function CollectionMeta({ state, onChange }: CollectionMetaProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        SEO &amp; Meta
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 block"><Label htmlFor="metaTitle">Meta Title</Label></div>
          <TextInput
            id="metaTitle" name="metaTitle" type="text" placeholder="SEO title"
            value={state.metaTitle}
            onChange={e => onChange("metaTitle", e.target.value)}
          />
        </div>
        <div>
          <div className="mb-2 block"><Label htmlFor="metaUrl">Meta URL</Label></div>
          <TextInput
            id="metaUrl" name="metaUrl" type="text"
            placeholder="https://example.com/collection"
            value={state.metaUrl}
            onChange={e => onChange("metaUrl", e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 block"><Label htmlFor="metaDescription">Meta Description</Label></div>
        <Textarea
          id="metaDescription" name="metaDescription" rows={3}
          placeholder="SEO description"
          value={state.metaDescription}
          onChange={e => onChange("metaDescription", e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 block"><Label htmlFor="metaImage">Meta Image URL</Label></div>
        <TextInput
          id="metaImage" name="metaImage" type="text"
          placeholder="https://example.com/meta-image.jpg"
          value={state.metaImage}
          onChange={e => onChange("metaImage", e.target.value)}
        />
      </div>
    </div>
  );
}