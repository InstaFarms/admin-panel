"use client";

import { uploadSpacePhotoAction } from "@/actions/imageActions";
import { Button } from "flowbite-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

interface SpaceImageUploadProps {
  spaceId: string;
  propertyId: string | null | undefined;
  currentPhoto: string | null;
  onPhotoChange: (photoId: string) => void;
}

export default function SpaceImageUpload({
  spaceId,
  propertyId,
  currentPhoto,
  onPhotoChange
}: SpaceImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!propertyId) {
      toast.error("Save the property details first before uploading space photos.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('propertyId', propertyId);
      formData.append('spaceId', spaceId);
      const result = await uploadSpacePhotoAction(formData);
      if (result.success && result.success.url) {
        onPhotoChange(result.success.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {currentPhoto ? (
        <div className="space-y-2">
          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={currentPhoto}
              alt="Space preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              color="blue"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Replace Image'}
            </Button>
            <Button
              size="sm"
              color="red"
              onClick={() => onPhotoChange('')}
              disabled={uploading}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-3">No image uploaded</p>
          <Button
            size="sm"
            color="blue"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      )}
    </div>
  );
}

