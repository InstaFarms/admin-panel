"use client";

import LabelWrapper from "@/components/LabelWrapper";
import SectionHeading from "@/components/properties/SectionHeading";
import { Textarea, TextInput } from "flowbite-react";
import SpaceImageUpload from "@/components/common/SpaceImageUpload";

interface SpaceData {
  spaceId: string;
  spaceName: string;
  photo: string | null;
  title: string;
  description: string;
}

interface SpacesSectionProps {
  spaces: SpaceData[];
  propertyId: string | null | undefined;
  updateSpace: (spaceId: string, field: 'title' | 'description' | 'photo', value: string) => void;
}

export default function SpacesSection({
  spaces,
  propertyId,
  updateSpace,
}: SpacesSectionProps) {
  if (spaces.length === 0) {
    return (
      <div className="mx-auto max-w-[1000px] p-5">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No spaces added yet
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Space details will show up here once spaces are configured for this property.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] p-5 space-y-6">
      {spaces.map((space) => (
        <div key={space.spaceId} className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
          <SectionHeading
            title={space.spaceName}
            className="mb-4"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload Section */}
            <div>
              <LabelWrapper label="Space Image">
                <SpaceImageUpload
                  spaceId={space.spaceId}
                  propertyId={propertyId}
                  currentPhoto={space.photo}
                  onPhotoChange={(photoId) => updateSpace(space.spaceId, 'photo', photoId)}
                />
              </LabelWrapper>
            </div>

            {/* Title and Description */}
            <div className="space-y-4">
              <LabelWrapper label="Title">
                <TextInput
                  value={space.title}
                  onChange={(e) => updateSpace(space.spaceId, 'title', e.target.value)}
                  placeholder={`Enter ${space.spaceName.toLowerCase()} title...`}
                />
              </LabelWrapper>

              <LabelWrapper label="Description">
                <Textarea
                  value={space.description}
                  onChange={(e) => updateSpace(space.spaceId, 'description', e.target.value)}
                  rows={4}
                  placeholder={`Enter ${space.spaceName.toLowerCase()} description...`}
                />
              </LabelWrapper>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}



