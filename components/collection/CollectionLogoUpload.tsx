"use client";

import { LOGO_CONFIG, COLLECTIONS_VALIDATION } from "@/constants/collections";
import toast from "react-hot-toast";

interface CollectionLogoUploadProps {
  logoPreview: string;
  logoUrl: string;
  uploading: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export default function CollectionLogoUpload({
  logoPreview,
  logoUrl,
  uploading,
  onFileSelect,
  onRemove,
}: CollectionLogoUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(COLLECTIONS_VALIDATION.logoInvalidType);
      return;
    }
    if (file.size > LOGO_CONFIG.maxSizeBytes) {
      toast.error(COLLECTIONS_VALIDATION.logoMaxSize);
      return;
    }
    onFileSelect(file);
  };

  const preview = logoPreview || logoUrl;

  return (
    <div>
      {preview && (
        <div className="mb-4 relative inline-block">
          <img
            src={preview}
            alt="Logo preview"
            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>
      )}
      <input
        type="file"
        id="logo"
        accept={LOGO_CONFIG.acceptedTypes}
        onChange={handleChange}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />
      <p className="text-xs text-gray-500 mt-1">
        Max {LOGO_CONFIG.maxSizeMB}MB · JPG, PNG, GIF, WebP
        {uploading && " — Uploading…"}
      </p>
    </div>
  );
}