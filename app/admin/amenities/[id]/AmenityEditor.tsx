"use client";

import MyButton from "@/components/MyButton";
import DeleteAmenityButton from "../DeleteAmenityButton";
import { Amenity } from "@/utils/types";
import { ICON_CONFIG } from "@/constants/amenities";
import { Label, TextInput } from "flowbite-react";
import { useAmenityEditorForm } from "@/hooks/useAmenityEditorForm";

interface AmenityEditorProps {
  data?: Amenity;
}

export default function AmenityEditor({ data }: AmenityEditorProps) {
  const {
    amenityName, setAmenityName,
    iconUrl, iconUploading,
    nameError,
    fileInputRef,
    handleNameBlur,
    handleIconFileChange, handleSubmit,
    loading,
  } = useAmenityEditorForm(data);

  return (
    <form action={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="amenity" className="text-sm font-medium">
            Amenity Name <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="amenity"
          name="amenity"
          type="text"
          placeholder="Enter amenity name"
          required
          className="w-full"
          value={amenityName}
          onChange={(e) => setAmenityName(e.target.value)}
          onBlur={handleNameBlur}
          color={nameError ? "failure" : undefined}
        />
        {nameError && <p className="mt-1 text-sm text-red-500">{nameError}</p>}
      </div>

      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="amenity-icon" className="text-sm font-medium">
            Icon (upload image)
          </Label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ICON_CONFIG.acceptedTypes}
          onChange={handleIconFileChange}
          className="hidden"
          id="amenity-icon-file"
        />
        <input type="hidden" name="icon" value={iconUrl} />

        <div className="flex items-center gap-4">
          {iconUrl ? (
            <img src={iconUrl} alt="Amenity icon"
              className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
          ) : (
            <div className="h-16 w-16 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 text-xs text-center px-1">
              No icon
            </div>
          )}
          <div className="flex flex-col gap-1">
            <MyButton type="button" onClick={() => fileInputRef.current?.click()}
              disabled={iconUploading} className="w-fit">
              {iconUploading ? "Uploading…" : iconUrl ? "Replace icon" : "Upload icon"}
            </MyButton>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Max {ICON_CONFIG.maxSizeMB}MB, image only
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-3">
        <MyButton type="submit" loading={loading}>
          {loading ? (data ? "Updating..." : "Creating...") : "Submit"}
        </MyButton>
        {data?.id && (
          <div onClick={(e) => e.preventDefault()}>
            <DeleteAmenityButton id={data.id} />
          </div>
        )}
      </div>
    </form>
  );
}