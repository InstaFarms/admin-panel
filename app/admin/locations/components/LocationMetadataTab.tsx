"use client";

import React from "react";
import { Label, TextInput, Textarea } from "flowbite-react";
import LocationBrandTabWrapper from "./LocationBrandTabWrapper";

interface LocationMetadataTabProps {
  localIsEditMode: boolean;
  showBrandEditor: boolean;
  selectedBrandName: string;
  onAddBrand: () => void;
  addingBrand: boolean;
  locationName: string;
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaUrl: string;
  setMetaUrl: (value: string) => void;
  metaKeywords: string;
  setMetaKeywords: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  metaImageUrl: string;
  setMetaImageUrl: (value: string) => void;
}

export default function LocationMetadataTab(props: LocationMetadataTabProps) {
  return (
    <LocationBrandTabWrapper
      localIsEditMode={props.localIsEditMode}
      showBrandEditor={props.showBrandEditor}
      selectedBrandName={props.selectedBrandName}
      onAddBrand={props.onAddBrand}
      addingBrand={props.addingBrand}
      locationName={props.locationName}
      lockNoticeTitle="Brand Metadata Locked"
    >
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
        <div className="rounded-lg bg-blue-50 p-4 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          SEO fields for the brand-specific landing page.
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="metaTitle">Meta Title</Label>
          </div>
          <TextInput
            id="metaTitle"
            name="metaTitle"
            type="text"
            placeholder="SEO Title"
            value={props.metaTitle}
            onChange={(e) => props.setMetaTitle(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="metaUrl">Meta URL (Canonical)</Label>
          </div>
          <TextInput
            id="metaUrl"
            name="metaUrl"
            type="text"
            placeholder="https://instafarms.in/locations/slug"
            value={props.metaUrl}
            onChange={(e) => props.setMetaUrl(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="metaKeywords">Keywords (Comma separated)</Label>
          </div>
          <TextInput
            id="metaKeywords"
            name="metaKeywords"
            type="text"
            placeholder="keyword1, keyword2"
            value={props.metaKeywords}
            onChange={(e) => props.setMetaKeywords(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="metaDescription">Meta Description</Label>
          </div>
          <Textarea
            id="metaDescription"
            name="metaDescription"
            placeholder="Short description for search results..."
            rows={3}
            value={props.metaDescription}
            onChange={(e) => props.setMetaDescription(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="metaImageUrl">Meta Image URL (OG Image)</Label>
          </div>
          <TextInput
            id="metaImageUrl"
            name="metaImageUrl"
            type="text"
            placeholder="https://example.com/image.jpg"
            value={props.metaImageUrl}
            onChange={(e) => props.setMetaImageUrl(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
    </LocationBrandTabWrapper>
  );
}
