import { createCarousel, editCarousel } from "@/actions/instafarm-settingsActions";
import { Carousel } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export type CarouselEditorBrandOptions = { brandScope?: BrandAdminScope };

export function useCarouselEditorForm(
  data?: Carousel,
  typeProp?: "WEB" | "APP",
  options?: CarouselEditorBrandOptions,
) {
  const brandScope = options?.brandScope ?? "instafarms";
  const [loading, startTransition] = useTransition();
  const [heading, setHeading] = useState(data?.heading ?? "");
  const [subHeading, setSubHeading] = useState(data?.subHeading ?? "");
  const [weight, setWeight] = useState(data?.weight?.toString() ?? "0");
  const [slug, setSlug] = useState(data?.slug ?? "");
  const [desktopPreview, setDesktopPreview] = useState<string | null>(data?.desktopBannerUrl ?? null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(data?.mobileBannerUrl ?? null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const router = useRouter();

  const carouselType = typeProp ?? data?.type ?? "WEB";
  const settingsHubPath =
    carouselType === "APP"
      ? BRAND_CONTENT_ROUTES[brandScope].appCarousel
      : BRAND_CONTENT_ROUTES[brandScope].webCarousel;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (type === "desktop") { setDesktopPreview(result); setDesktopFile(file); }
      else { setMobilePreview(result); setMobileFile(file); }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: "desktop" | "mobile") => {
    if (type === "desktop") { setDesktopPreview(null); setDesktopFile(null); }
    else { setMobilePreview(null); setMobileFile(null); }
  };

  const handleSubmit = (formData: FormData) => {
    formData.set("heading", heading);
    formData.set("subHeading", subHeading);
    formData.set("weight", weight);
    formData.set("slug", slug);
    formData.set("type", carouselType);
    if (desktopFile) formData.set("desktopBanner", desktopFile);
    if (mobileFile) formData.set("mobileBanner", mobileFile);

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        promise = parseServerActionResult(editCarousel(data.id, formData, brandScope));
      } else {
        promise = parseServerActionResult(createCarousel(formData, brandScope));
      }

      toast.promise(promise, {
        loading: "Saving Carousel Item...",
        success: (msg) => {
          if (!data) router.push(settingsHubPath);
          return msg ?? "Success";
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return {
    heading, setHeading,
    subHeading, setSubHeading,
    weight, setWeight,
    slug, setSlug,
    desktopPreview, mobilePreview,
    handleImageChange, removeImage,
    carouselType, loading, handleSubmit,
  };
}
