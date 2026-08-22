import { createTag, editTag } from "@/actions/instafarm-settingsActions";
import { Tag } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export type TagEditorBrandOptions = { brandScope?: BrandAdminScope };

export function useTagEditorForm(data?: Tag, options?: TagEditorBrandOptions) {
  const brandScope = options?.brandScope ?? "instafarms";
  const settingsHubPath = BRAND_CONTENT_ROUTES[brandScope].tags;
  const [loading, startTransition] = useTransition();
  const [name, setName] = useState(data?.name ?? "");
  const [color, setColor] = useState(data?.color ?? "");
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    formData.set("name", name);
    formData.set("color", color);

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        promise = parseServerActionResult(editTag(data.id, formData, brandScope));
      } else {
        promise = parseServerActionResult(createTag(formData, brandScope));
      }

      toast.promise(promise, {
        loading: "Saving Tag...",
        success: (msg) => {
          if (!data) router.push(settingsHubPath);
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return { name, setName, color, setColor, loading, handleSubmit };
}
