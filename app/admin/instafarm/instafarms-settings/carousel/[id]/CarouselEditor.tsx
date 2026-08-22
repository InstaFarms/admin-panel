"use client";

import MyButton from "@/components/MyButton";
import DeleteCarouselButton from "../../DeleteCarouselButton";
import { Carousel } from "@/utils/types";
import { Label, TextInput } from "flowbite-react";
import {
  BadgeInfo,
  Check,
  Image as ImageIcon,
  Link2,
  Monitor,
  Smartphone,
  Type,
  X,
} from "lucide-react";
import { useCarouselEditorForm } from "@/hooks/useCarouselEditorForm";
import type { BrandAdminScope } from "@/constants/brandAdminScope";

interface CarouselEditorProps {
  data?: Carousel;
  type?: "WEB" | "APP";
  brandScope?: BrandAdminScope;
}

function ImageUploadArea({
  type,
  preview,
  onImageChange,
  onRemove,
  label,
  dimensions,
  helperText,
}: {
  type: "desktop" | "mobile";
  preview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  label: string;
  dimensions: string;
  helperText: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-950/[0.02] p-4 dark:border-slate-700/80 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:text-sky-300">
              {type === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
            </div>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {dimensions}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-950/[0.03] dark:border-slate-600 dark:bg-white/[0.02]">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt={`${label} preview`}
                className="h-56 w-full object-cover"
              />
              <button
                type="button"
                onClick={onRemove}
                className="absolute right-3 top-3 rounded-full bg-slate-950/80 p-2 text-white transition hover:bg-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="rounded-full bg-slate-200 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ImageIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">No image selected yet</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Upload artwork sized for {dimensions} to keep the carousel polished.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={`${type}Banner`}
            className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {preview ? "Replace image" : "Choose image"}
          </label>
          {preview && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        id={`${type}Banner`}
        name={`${type}Banner`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageChange}
      />
    </section>
  );
}

function FieldBlock({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function CarouselEditor({ data, type, brandScope = "instafarms" }: CarouselEditorProps) {
  const {
    heading,
    setHeading,
    subHeading,
    setSubHeading,
    weight,
    setWeight,
    slug,
    setSlug,
    desktopPreview,
    mobilePreview,
    handleImageChange,
    removeImage,
    carouselType,
    loading,
    handleSubmit,
  } = useCarouselEditorForm(data, type, { brandScope });

  const typeLabel = carouselType === "APP" ? "App" : "Web";
  const hasDesktopMedia = carouselType === "APP" ? true : Boolean(desktopPreview);
  const hasMobileMedia = Boolean(mobilePreview);
  const completedFields = [heading.trim(), slug.trim(), weight.trim()].filter(Boolean).length;
  const readinessItems = [
    { label: "Heading", ready: heading.trim().length > 0 },
    { label: "Slug", ready: slug.trim().length > 0 },
    { label: "Display order", ready: weight.trim().length > 0 },
    { label: "Mobile artwork", ready: hasMobileMedia },
    { label: "Desktop artwork", ready: hasDesktopMedia },
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="type" value={carouselType} />

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl dark:border-slate-700">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                {typeLabel} carousel
              </span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-200">
                {data ? "Editing live asset" : "Create new item"}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              {heading.trim() || `Untitled ${typeLabel} Carousel`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Build a cleaner hero experience with balanced artwork, clear copy, and predictable placement across the carousel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Fields</p>
              <p className="mt-2 text-2xl font-semibold">{completedFields}/3</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Media</p>
              <p className="mt-2 text-2xl font-semibold">
                {[hasDesktopMedia, hasMobileMedia].filter(Boolean).length}/{carouselType === "APP" ? 1 : 2}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Slug</p>
              <p className="mt-2 truncate text-sm font-semibold">{slug.trim() || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Order</p>
              <p className="mt-2 text-2xl font-semibold">{weight || "0"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <div className="space-y-6">
          <FieldBlock
            title="Media library"
            description="Upload artwork that feels intentional on every breakpoint. Keep the composition centered so overlays remain readable."
            icon={<ImageIcon size={18} />}
          >
            <div className={`grid gap-5 ${carouselType === "WEB" ? "xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]" : ""}`}>
              {carouselType === "WEB" && (
                <ImageUploadArea
                  type="desktop"
                  preview={desktopPreview}
                  onImageChange={(e) => handleImageChange(e, "desktop")}
                  onRemove={() => removeImage("desktop")}
                  label="Desktop banner image"
                  dimensions="1400 x 1050"
                  helperText="Used on wider screens and desktop-heavy layouts."
                />
              )}

              <ImageUploadArea
                type="mobile"
                preview={mobilePreview}
                onImageChange={(e) => handleImageChange(e, "mobile")}
                onRemove={() => removeImage("mobile")}
                label="Mobile banner image"
                dimensions="400 x 375"
                helperText="Used on compact layouts where the crop is tighter."
              />
            </div>
          </FieldBlock>

          <FieldBlock
            title="Carousel copy"
            description="Use a short, scannable headline and a supporting line only when it actually improves context."
            icon={<Type size={18} />}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="heading" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Heading
                </Label>
                <TextInput
                  id="heading"
                  name="heading"
                  required
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Summer escapes, weekend stays, family offers..."
                  theme={{
                    field: {
                      input: {
                        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                        colors: {
                          gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                        },
                      },
                    },
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="subHeading" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sub heading
                </Label>
                <TextInput
                  id="subHeading"
                  name="subHeading"
                  value={subHeading}
                  onChange={(e) => setSubHeading(e.target.value)}
                  placeholder="Optional supporting line for the banner"
                  theme={{
                    field: {
                      input: {
                        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                        colors: {
                          gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                        },
                      },
                    },
                  }}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Keep this light. If the headline already carries the message, it is fine to leave this empty.
                </p>
              </div>
            </div>
          </FieldBlock>

          <FieldBlock
            title="Placement settings"
            description="Control where the asset appears and how it resolves into frontend routes."
            icon={<Link2 size={18} />}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="weight" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Weight
                </Label>
                <TextInput
                  id="weight"
                  name="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  theme={{
                    field: {
                      input: {
                        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                        colors: {
                          gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                        },
                      },
                    },
                  }}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Lower numbers usually appear earlier in the carousel rotation.
                </p>
              </div>

              <div>
                <Label htmlFor="slug" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Slug
                </Label>
                <TextInput
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="summer-escapes"
                  theme={{
                    field: {
                      input: {
                        base: "block w-full border disabled:cursor-not-allowed disabled:opacity-50",
                        colors: {
                          gray: "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500",
                        },
                      },
                    },
                  }}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Use a stable route-friendly value so the linked experience stays predictable.
                </p>
              </div>
            </div>
          </FieldBlock>

        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publishing</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Save when the copy, artwork, and placement all look aligned.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {readyCount}/{readinessItems.length} ready
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {data ? "Updating existing carousel item" : `Creating new ${typeLabel.toLowerCase()} carousel item`}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {carouselType === "WEB"
                  ? "Web carousel expects both desktop and mobile artwork."
                  : "App carousel focuses on mobile artwork and supporting copy."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <MyButton type="submit" disabled={loading}>
                {loading ? "Saving..." : data ? "Save Carousel Item" : "Create Carousel Item"}
              </MyButton>
              {data?.id && (
                <DeleteCarouselButton
                  id={data.id}
                  brandScope={brandScope}
                  carouselType={carouselType}
                  fullWidth
                  showLabel
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-300">
                <Check size={16} />
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Readiness checklist</h3>
            </div>
            <div className="mt-4 space-y-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.ready
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.ready ? "Ready" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
                <BadgeInfo size={16} />
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Editor guidance</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                Keep the focal subject near the center so responsive crops stay usable.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                Shorter headlines generally perform better on busy banner artwork.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                Use weight intentionally so priority campaigns rotate first.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </form>
  );
}
