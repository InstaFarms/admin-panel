"use client";

import MyButton from "@/components/MyButton";
import DeleteActivityButton from "../DeleteActivityButton";
import { Activity } from "@/utils/types";
import { ICON_CONFIG } from "@/constants/activities";
import { Label, TextInput } from "flowbite-react";
import { useActivityEditorForm } from "@/hooks/useActivityEditorForm";

interface ActivityEditorProps {
  data?: Activity;
}

export default function ActivityEditor({ data }: ActivityEditorProps) {
  const {
    activityName, setActivityName,
    iconUrl, iconUploading,
    nameError,
    fileInputRef,
    handleNameBlur,
    handleIconFileChange, handleSubmit,
    loading,
  } = useActivityEditorForm(data);

  return (
    <form action={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="activity" className="text-sm font-medium">
            Activity Name <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="activity"
          name="activity"
          type="text"
          placeholder="Enter activity name"
          required
          className="w-full"
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          onBlur={handleNameBlur}
          color={nameError ? "failure" : undefined}
        />
        {nameError && <p className="mt-1 text-sm text-red-500">{nameError}</p>}
      </div>

      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="activity-icon" className="text-sm font-medium">
            Icon (upload image)
          </Label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ICON_CONFIG.acceptedTypes}
          onChange={handleIconFileChange}
          className="hidden"
          id="activity-icon-file"
        />
        <input type="hidden" name="icon" value={iconUrl} />

        <div className="flex items-center gap-4">
          {iconUrl ? (
            <img src={iconUrl} alt="Activity icon"
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
            <DeleteActivityButton id={data.id} />
          </div>
        )}
      </div>
    </form>
  );
}