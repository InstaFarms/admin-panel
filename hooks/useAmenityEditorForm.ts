import { createAmenity, editAmenity, updateAmenityActivityIcon } from "@/actions/amenityActions";
import { uploadActivityAmenityIconAction } from "@/actions/imageActions";
import { AMENITIES_VALIDATION, AMENITIES_SUCCESS, ICON_CONFIG } from "@/constants/amenities";
import { Amenity } from "@/utils/types";
import { resolveImageSrc } from "@/utils/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

const validateAmenityName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return AMENITIES_VALIDATION.nameRequired;
  if (name.trim().length < 2) return AMENITIES_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return AMENITIES_VALIDATION.nameMaxLength;
  return null;
};

export function useAmenityEditorForm(data?: Amenity) {
  const [loading, startTransition] = useTransition();
  const [amenityName, setAmenityName] = useState(data?.name ?? "");
  // Value that gets submitted/stored — a relative Hetzner key for anything uploaded
  // through this form, or whatever was already on the row (if-api already resolves
  // that to an absolute URL before it reaches us).
  const [iconPath, setIconPath] = useState(data?.icon ?? "");
  const [iconPreview, setIconPreview] = useState(data?.icon ?? "");
  const [iconUploading, setIconUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Create flow: no amenity id exists yet, so the file is staged here and only
  // actually uploaded (keyed by the real id) once createAmenity resolves.
  const pendingIconFileRef = useRef<File | null>(null);
  const router = useRouter();

  const handleNameBlur = () => setNameError(validateAmenityName(amenityName));

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > ICON_CONFIG.maxSizeMB * 1024 * 1024) {
      toast.error(AMENITIES_VALIDATION.iconMaxSize);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!data) {
      pendingIconFileRef.current = file;
      setIconPreview(URL.createObjectURL(file));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIconUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "amenities");
      uploadFormData.append("id", data.id);

      const result = await uploadActivityAmenityIconAction(uploadFormData);
      if (result.error || !result.success) {
        toast.error(result.error || "Failed to upload icon.");
        return;
      }

      setIconPath(result.success.path);
      setIconPreview(resolveImageSrc(result.success.path) ?? result.success.path);
      toast.success(AMENITIES_SUCCESS.iconUploaded);
    } catch (err) {
      console.error("Icon upload error:", err);
      toast.error("Failed to upload icon. Please try again.");
    } finally {
      setIconUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (formData: FormData) => {
    const nameErr = validateAmenityName(amenityName);
    if (nameErr) { setNameError(nameErr); toast.error(nameErr); return; }
    setNameError(null);

    startTransition(() => {
      const run = async (): Promise<string> => {
        if (data) {
          formData.set("icon", iconPath);
          const res = await editAmenity(data.id, formData);
          if (res.error) throw new Error(res.error);
          return res.success ?? "Updated.";
        }

        formData.set("icon", "");
        const created = await createAmenity(formData);
        if (created.error) throw new Error(created.error);

        const newId = created.data?.id;
        if (pendingIconFileRef.current && newId) {
          const iconFormData = new FormData();
          iconFormData.append("file", pendingIconFileRef.current);
          iconFormData.append("type", "amenities");
          iconFormData.append("id", newId);
          const uploadResult = await uploadActivityAmenityIconAction(iconFormData);
          if (uploadResult.error || !uploadResult.success) {
            throw new Error(uploadResult.error || "Failed to upload icon.");
          }
          const patchResult = await updateAmenityActivityIcon("amenities", newId, uploadResult.success.path);
          if (patchResult.error) throw new Error(patchResult.error);
        }

        return created.success ?? "Created.";
      };

      const promise = run();
      toast.promise(promise, {
        loading: data ? "Updating Amenity..." : "Creating Amenity...",
        success: (msg) => {
          if (!data) router.push("/admin/amenities");
          return msg;
        },
        error: (err) => {
          console.error("Amenity save error:", err);
          return (err as Error).message;
        },
      });
    });
  };

  return {
    amenityName, setAmenityName,
    iconUrl: iconPreview, iconUploading,
    nameError,
    fileInputRef,
    handleNameBlur,
    handleIconFileChange, handleSubmit,
    loading,
  };
}
