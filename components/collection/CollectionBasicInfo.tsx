"use client";

import { Checkbox, Label, TextInput, Textarea } from "flowbite-react";
import CollectionLogoUpload from "./CollectionLogoUpload";
import type { CollectionFormErrors } from "@/hooks/useCollectionForm";

export interface BasicInfoState {
  name: string;
  description: string;
  heading: string;
  slug: string;
  weight: string;
  hpc: string;
  logo: string;
  altText: string;
  isActive: boolean;
}

interface CollectionBasicInfoProps {
  state: BasicInfoState;
  errors: CollectionFormErrors;
  logoPreview: string;
  uploading: boolean;
  onChange: (field: keyof BasicInfoState, value: string | boolean) => void;
  onLogoFileSelect: (file: File) => void;
  onLogoRemove: () => void;
}

export default function CollectionBasicInfo({
  state,
  errors,
  logoPreview,
  uploading,
  onChange,
  onLogoFileSelect,
  onLogoRemove,
}: CollectionBasicInfoProps) {
  return (
    <div className="space-y-6">
      {/* Name + Slug */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-2 block">
            <Label htmlFor="name">
              Collection Name <span className="text-red-500">*</span>
            </Label>
          </div>
          <TextInput
            id="name" name="name" type="text"
            placeholder="Enter collection name"
            value={state.name}
            onChange={e => onChange("name", e.target.value)}
            color={errors.name ? "failure" : undefined}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="slug">
              Slug <span className="text-xs text-gray-400 font-normal">(auto-generated)</span>
            </Label>
          </div>
          <TextInput
            id="slug" name="slug" type="text"
            placeholder="auto-generated-slug"
            value={state.slug}
            readOnly disabled
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="mb-2 block"><Label htmlFor="description">Description</Label></div>
        <Textarea
          id="description" name="description" rows={3}
          placeholder="Enter collection description"
          value={state.description}
          onChange={e => onChange("description", e.target.value)}
        />
      </div>

      {/* Heading */}
      <div>
        <div className="mb-2 block"><Label htmlFor="heading">Heading</Label></div>
        <TextInput
          id="heading" name="heading" type="text"
          placeholder="Collection heading"
          value={state.heading}
          onChange={e => onChange("heading", e.target.value)}
        />
      </div>

      {/* Weight / HPC / Active */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="mb-2 block"><Label htmlFor="weight">Weight</Label></div>
          <TextInput
            id="weight" name="weight" type="number" placeholder="0"
            value={state.weight}
            onChange={e => onChange("weight", e.target.value)}
            color={errors.weight ? "failure" : undefined}
          />
          {errors.weight && <p className="mt-1 text-sm text-red-500">{errors.weight}</p>}
        </div>
        <div>
          <div className="mb-2 block"><Label htmlFor="hpc">HPC</Label></div>
          <TextInput
            id="hpc" name="hpc" type="number" placeholder="Enter HPC value"
            value={state.hpc}
            onChange={e => onChange("hpc", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 mt-8">
          <Checkbox
            id="isActive" name="isActive"
            checked={state.isActive}
            onChange={e => onChange("isActive", e.target.checked)}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-4">
        <div>
          <div className="mb-2 block"><Label htmlFor="logo">Logo</Label></div>
          <CollectionLogoUpload
            logoPreview={logoPreview}
            logoUrl={state.logo}
            uploading={uploading}
            onFileSelect={onLogoFileSelect}
            onRemove={onLogoRemove}
          />
        </div>
        <div>
          <div className="mb-2 block"><Label htmlFor="altText">Alt Text</Label></div>
          <TextInput
            id="altText" name="altText" type="text"
            placeholder="Image alt text"
            value={state.altText}
            onChange={e => onChange("altText", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}