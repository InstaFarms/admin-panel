import { createCms, editCms } from "@/actions/instafarm-settingsActions";
import { CMS } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export type CmsEditorBrandOptions = {
  brandScope?: BrandAdminScope;
};

export function useCmsEditorForm(data?: CMS, options?: CmsEditorBrandOptions) {
  const brandScope = options?.brandScope ?? "instafarms";
  const settingsHubPath = BRAND_CONTENT_ROUTES[brandScope].cms;
  const [loading, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const router = useRouter();

  const [fields, setFields] = useState({
    title: data?.title ?? "",
    heading: data?.heading ?? "",
    subHeading: data?.subHeading ?? "",
    content: data?.content ?? "",
    isActive: data?.isActive ?? false,
    metaTitle: data?.meta?.metaTitle ?? "",
    metaDescription: data?.meta?.metaDescription ?? "",
    metaUrl: data?.meta?.metaUrl ?? "",
    metaImage: data?.meta?.metaImage ?? "",
  });

  const setField = (key: keyof typeof fields, value: string | boolean) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (formData: FormData) => {
    Object.entries(fields).forEach(([key, val]) =>
      formData.set(key, val.toString())
    );

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        promise = parseServerActionResult(editCms(data.id, formData, brandScope));
      } else {
        promise = parseServerActionResult(createCms(formData, brandScope));
      }

      toast.promise(promise, {
        loading: "Saving CMS Content...",
        success: (msg) => {
          if (!data) router.push(settingsHubPath);
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return { fields, setField, activeTab, setActiveTab, loading, handleSubmit };
}
