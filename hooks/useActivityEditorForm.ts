import { createActivity, editActivity } from "@/actions/activityActions";
import { uploadActivityAmenityIconAction } from "@/actions/imageActions";
import { updateAmenityActivityIcon } from "@/actions/amenityActions";
import { ACTIVITIES_VALIDATION, ACTIVITIES_SUCCESS, ICON_CONFIG } from "@/constants/activities";
import { Activity } from "@/utils/types";
import { resolveImageSrc } from "@/utils/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";

const validateActivityName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return ACTIVITIES_VALIDATION.nameRequired;
  if (name.trim().length < 2) return ACTIVITIES_VALIDATION.nameMinLength;
  if (name.trim().length > 100) return ACTIVITIES_VALIDATION.nameMaxLength;
  return null;
};

export function useActivityEditorForm(data?: Activity) {
  const [loading, startTransition] = useTransition();
  const [activityName, setActivityName] = useState(data?.name ?? "");
  // Value that gets submitted/stored — a relative Hetzner key for anything uploaded
  // through this form, or whatever was already on the row (if-api already resolves
  // that to an absolute URL before it reaches us).
  const [iconPath, setIconPath] = useState(data?.icon ?? "");
  const [iconPreview, setIconPreview] = useState(data?.icon ?? "");
  const [iconUploading, setIconUploading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Create flow: no activity id exists yet, so the file is staged here and only
  // actually uploaded (keyed by the real id) once createActivity resolves.
  const pendingIconFileRef = useRef<File | null>(null);
  const router = useRouter();

  const handleNameBlur = () => setNameError(validateActivityName(activityName));

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > ICON_CONFIG.maxSizeMB * 1024 * 1024) {
      toast.error(ACTIVITIES_VALIDATION.iconMaxSize);
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
      uploadFormData.append("type", "activities");
      uploadFormData.append("id", data.id);

      const result = await uploadActivityAmenityIconAction(uploadFormData);
      if (result.error || !result.success) {
        toast.error(result.error || "Failed to upload icon.");
        return;
      }

      setIconPath(result.success.path);
      setIconPreview(resolveImageSrc(result.success.path) ?? result.success.path);
      toast.success(ACTIVITIES_SUCCESS.iconUploaded);
    } catch (err) {
      console.error("Icon upload error:", err);
      toast.error("Failed to upload icon. Please try again.");
    } finally {
      setIconUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (formData: FormData) => {
    const nameErr = validateActivityName(activityName);
    if (nameErr) { setNameError(nameErr); toast.error(nameErr); return; }
    setNameError(null);

    startTransition(() => {
      const run = async (): Promise<string> => {
        if (data) {
          formData.set("icon", iconPath);
          const res = await editActivity(data.id, formData);
          if (res.error) throw new Error(res.error);
          return res.success ?? "Updated.";
        }

        formData.set("icon", "");
        const created = await createActivity(formData);
        if (created.error) throw new Error(created.error);

        const newId = created.data?.id;
        if (pendingIconFileRef.current && newId) {
          const iconFormData = new FormData();
          iconFormData.append("file", pendingIconFileRef.current);
          iconFormData.append("type", "activities");
          iconFormData.append("id", newId);
          const uploadResult = await uploadActivityAmenityIconAction(iconFormData);
          if (uploadResult.error || !uploadResult.success) {
            throw new Error(uploadResult.error || "Failed to upload icon.");
          }
          const patchResult = await updateAmenityActivityIcon("activities", newId, uploadResult.success.path);
          if (patchResult.error) throw new Error(patchResult.error);
        }

        return created.success ?? "Created.";
      };

      const promise = run();
      toast.promise(promise, {
        loading: data ? "Updating Activity..." : "Creating Activity...",
        success: (msg) => {
          if (!data) router.push("/admin/activities");
          return msg;
        },
        error: (err) => {
          console.error("Activity save error:", err);
          return (err as Error).message;
        },
      });
    });
  };

  return {
    activityName, setActivityName,
    iconUrl: iconPreview, iconUploading,
    nameError,
    fileInputRef,
    handleNameBlur,
    handleIconFileChange, handleSubmit,
    loading,
  };
}
