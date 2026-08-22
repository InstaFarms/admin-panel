"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, TextInput, Textarea } from "flowbite-react";
import { HiMenu, HiPlus, HiTrash, HiUpload } from "react-icons/hi";
import { Check, ExternalLink, Image as ImageIcon, Link2, Monitor, Smartphone, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { uploadSettingAssetAction } from "@/actions/imageActions";
import { createStaticImage, deleteStaticImage, updateStaticImage } from "@/actions/staticImageActions";
import LabelWrapper from "@/components/LabelWrapper";
import { STATIC_IMAGES_BASE, type BrandAdminScope } from "@/constants/brandAdminScope";
import {
  STATIC_IMAGE_ERRORS,
  STATIC_IMAGE_SUCCESS,
  STATIC_IMAGE_UPLOAD,
  getSectionLabel,
  type StaticImageSection,
} from "@/constants/staticImages";
import { parseServerActionResult } from "@/utils/utils";

interface StaticImageData {
  id: string;
  section: StaticImageSection;
  title: string;
  description: string | null;
  desktopImageUrl: string;
  desktopImagePath: string;
  mobileImageUrl: string;
  mobileImagePath: string;
  altText: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  desktopFile?: File;
  mobileFile?: File;
  desktopPreview?: string;
  mobilePreview?: string;
}

interface StaticImageEditorProps {
  data?: StaticImageData[];
  section: StaticImageSection | string;
  adminScope?: BrandAdminScope;
}

function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return STATIC_IMAGE_ERRORS.desktopImageRequired;
  if (file.size > STATIC_IMAGE_UPLOAD.maxSizeBytes) {
    return `Image size must be less than ${STATIC_IMAGE_UPLOAD.maxSizeMB}MB`;
  }
  return null;
}

function makeBlankImage(section: StaticImageSection | string, sortOrder: number): StaticImageData {
  return {
    id: v4(),
    section: section as StaticImageSection,
    title: "",
    description: null,
    desktopImageUrl: "",
    desktopImagePath: "",
    mobileImageUrl: "",
    mobileImagePath: "",
    altText: null,
    linkUrl: null,
    sortOrder,
    isActive: true,
  };
}

function MediaPane({
  label,
  type,
  preview,
  onSelect,
}: {
  label: string;
  type: "desktop" | "mobile";
  preview?: string;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-950/[0.02] p-4 dark:border-slate-700/80 dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:text-sky-300">
            {type === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {type === "desktop" ? "Wide layout preview" : "Compact layout preview"}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-950/[0.03] dark:border-slate-600 dark:bg-white/[0.02] ${
          type === "desktop" ? "aspect-[16/7]" : "mx-auto max-w-[180px] aspect-[4/5]"
        }`}
      >
        {preview ? (
          <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <ImageIcon size={18} className="text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload image to preview</p>
          </div>
        )}
      </div>

      <Button size="xs" onClick={onSelect} className="mt-3 w-full" color="blue">
        {preview ? "Replace" : "Upload"} {label}
      </Button>
    </div>
  );
}

export default function StaticImageEditor({
  data,
  section,
  adminScope = "instafarms",
}: StaticImageEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const [images, setImages] = useState<StaticImageData[]>(
    data?.length ? data.map((img, i) => ({ ...img, sortOrder: img.sortOrder ?? i })) : []
  );
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const sectionLabel = getSectionLabel(section);
  const activeCount = images.filter((img) => img.isActive).length;
  const completedCount = images.filter(
    (img) =>
      img.title.trim() &&
      (img.desktopPreview || img.desktopImageUrl) &&
      (img.mobilePreview || img.mobileImageUrl)
  ).length;

  const addImage = () => setImages((prev) => [...prev, makeBlankImage(section, prev.length)]);

  const updateImage = (id: string, updates: Partial<StaticImageData>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...updates } : img)));
  };

  const removeImage = async (id: string) => {
    const target = images.find((img) => img.id === id);
    if (target?.desktopImagePath) {
      const result = await deleteStaticImage(id, adminScope);
      if (result.error) {
        toast.error(result.error);
        return;
      }
    }
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.success("Image removed");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id);
      const newIndex = prev.findIndex((img) => img.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((img, i) => ({ ...img, sortOrder: i }));
    });
    toast.success("Images reordered");
  };

  const handleBulkAdd = (desktopFiles: File[], mobileFiles: File[]) => {
    const count = Math.max(desktopFiles.length, mobileFiles.length);
    const startIndex = images.length;

    const newImages: StaticImageData[] = Array.from({ length: count }, (_, i) => {
      const desktopFile = desktopFiles[i];
      const mobileFile = mobileFiles[i];
      const fileName = desktopFile?.name || mobileFile?.name || `Image ${startIndex + i + 1}`;
      const title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      return {
        ...makeBlankImage(section, startIndex + i),
        title,
        desktopFile,
        mobileFile,
        desktopPreview: desktopFile ? URL.createObjectURL(desktopFile) : undefined,
        mobilePreview: mobileFile ? URL.createObjectURL(mobileFile) : undefined,
      };
    });

    setImages((prev) => [...prev, ...newImages]);
    toast.success(`Added ${count} images`);
    setShowBulkUpload(false);
  };

  const handleSubmit = async () => {
    for (const img of images) {
      if (!img.title) {
        toast.error(STATIC_IMAGE_ERRORS.titleRequired);
        return;
      }

      const isNew = !img.desktopImageUrl && !img.mobileImageUrl;
      if (isNew && (!img.desktopFile || !img.mobileFile)) {
        toast.error(STATIC_IMAGE_ERRORS.bothImagesRequired);
        return;
      }
    }

    const loadingToast = toast.loading("Processing images...");

    try {
      const processed = await Promise.all(
        images.map(async (img) => {
          let desktopUrl = img.desktopImageUrl;
          let desktopPath = img.desktopImagePath;
          let mobileUrl = img.mobileImageUrl;
          let mobilePath = img.mobileImagePath;

          if (img.desktopFile) {
            const fd = new FormData();
            fd.append("file", img.desktopFile);
            fd.append("brandName", adminScope);
            fd.append("category", "static");
            fd.append("slot", `${img.id}-desktop`);
            const result = await uploadSettingAssetAction(fd);
            if (result.error || !result.success) throw new Error(result.error || "Desktop upload failed");
            desktopUrl = result.success.url;
            desktopPath = result.success.path;
          }

          if (img.mobileFile) {
            const fd = new FormData();
            fd.append("file", img.mobileFile);
            fd.append("brandName", adminScope);
            fd.append("category", "static");
            fd.append("slot", `${img.id}-mobile`);
            const result = await uploadSettingAssetAction(fd);
            if (result.error || !result.success) throw new Error(result.error || "Mobile upload failed");
            mobileUrl = result.success.url;
            mobilePath = result.success.path;
          }

          return {
            id: img.id,
            section,
            title: img.title,
            description: img.description || undefined,
            desktopImageUrl: desktopUrl,
            desktopImagePath: desktopPath,
            mobileImageUrl: mobileUrl,
            mobileImagePath: mobilePath,
            altText: img.altText || undefined,
            linkUrl: img.linkUrl || undefined,
            sortOrder: img.sortOrder,
            isActive: img.isActive,
          };
        })
      );

      toast.dismiss(loadingToast);

      startTransition(() => {
        const promises = processed.map((img) => {
          const existing = data?.find((d) => d.id === img.id);
          return existing
            ? parseServerActionResult(
                updateStaticImage(img.id, img, existing.desktopImagePath, existing.mobileImagePath, adminScope)
              )
            : parseServerActionResult(createStaticImage(img, adminScope));
        });

        Promise.all(promises)
          .then(() => {
            toast.success(STATIC_IMAGE_SUCCESS.savedAll);
            router.push(STATIC_IMAGES_BASE[adminScope]);
          })
          .catch((err) => toast.error(err.message || STATIC_IMAGE_ERRORS.createFailed));
      });
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : STATIC_IMAGE_ERRORS.createFailed);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl dark:border-slate-700">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
                Static website images
              </span>
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-medium text-cyan-100">
                {sectionLabel}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">{sectionLabel}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Organize reusable website artwork with consistent copy, paired desktop and mobile assets, and clear ordering.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Items</p>
              <p className="mt-2 text-2xl font-semibold">{images.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
              <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Ready</p>
              <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Scope</p>
              <p className="mt-2 text-sm font-semibold">{adminScope === "mago" ? "Mago" : "Instafarms"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:text-sky-300">
                    <ImageIcon size={16} />
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Image set</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Add, reorder, and fine-tune each asset before saving the full section.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={addImage} color="blue">
                  <HiPlus className="mr-2" /> Add Image
                </Button>
                <Button onClick={() => setShowBulkUpload(true)} color="purple">
                  <HiUpload className="mr-2" /> Bulk Upload
                </Button>
              </div>
            </div>
          </section>

          {images.length === 0 ? (
            <section className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ImageIcon size={28} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">No images added yet</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Start with a single image or bring in paired desktop/mobile files in bulk.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button onClick={addImage} color="blue">
                  <HiPlus className="mr-2" /> Add First Image
                </Button>
                <Button onClick={() => setShowBulkUpload(true)} color="purple">
                  <HiUpload className="mr-2" /> Bulk Upload
                </Button>
              </div>
            </section>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-5">
                  {images.map((image, index) => (
                    <StaticImageRow
                      key={image.id}
                      image={image}
                      index={index}
                      onUpdate={updateImage}
                      onRemove={removeImage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Publishing</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Save the full section once every image has the right metadata and paired artwork.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {completedCount}/{images.length || 0} ready
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Section guidance</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Each row should have a title, desktop image, and mobile image. Use ordering to control display sequence.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <Button onClick={handleSubmit} disabled={loading} color="green">
                {loading ? "Saving..." : "Save All Images"}
              </Button>
              <Button onClick={() => router.back()} color="gray">
                Cancel
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-300">
                <Check size={16} />
              </span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Checklist</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-white">Titles are clear</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Keep names scannable for future editors.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-white">Desktop and mobile are paired</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Avoid leaving one surface unfilled.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="font-medium text-slate-900 dark:text-white">Link and alt text are intentional</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Fill these when they improve accessibility or click-through context.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <BulkUploadModal show={showBulkUpload} onClose={() => setShowBulkUpload(false)} onUpload={handleBulkAdd} />
    </div>
  );
}

function StaticImageRow({
  image,
  index,
  onUpdate,
  onRemove,
}: {
  image: StaticImageData;
  index: number;
  onUpdate: (id: string, updates: Partial<StaticImageData>) => void;
  onRemove: (id: string) => void;
}) {
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    const preview = URL.createObjectURL(file);
    onUpdate(
      image.id,
      type === "desktop"
        ? { desktopFile: file, desktopPreview: preview }
        : { mobileFile: file, mobilePreview: preview }
    );
  };

  const desktopPreview = image.desktopPreview || image.desktopImageUrl;
  const mobilePreview = image.mobilePreview || image.mobileImageUrl;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" className="cursor-move rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300" title="Drag to reorder">
            <HiMenu className="text-xl" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {image.title.trim() || `Image ${index + 1}`}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Order {index + 1}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  image.isActive
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                }`}
              >
                {image.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Configure paired desktop and mobile artwork, then refine the metadata below.
            </p>
          </div>
        </div>

        <Button size="sm" color="red" onClick={() => onRemove(image.id)}>
          <HiTrash className="mr-2" />
          Remove
        </Button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
          <MediaPane
            label="Desktop image"
            type="desktop"
            preview={desktopPreview}
            onSelect={() => desktopRef.current?.click()}
          />
          <MediaPane
            label="Mobile image"
            type="mobile"
            preview={mobilePreview}
            onSelect={() => mobileRef.current?.click()}
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-950/[0.02] p-4 dark:border-slate-700/80 dark:bg-white/[0.02]">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-300">
                <Sparkles size={16} />
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Preview notes</p>
            </div>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li>Use concise titles so the section stays easy to manage later.</li>
              <li>Desktop crops should preserve the focal content near the center.</li>
              <li>Mobile artwork should remain legible in a tighter frame.</li>
            </ul>
          </div>
        </div>
      </div>

      <input
        ref={desktopRef}
        type="file"
        accept={STATIC_IMAGE_UPLOAD.acceptedTypes}
        onChange={(e) => handleFileSelect(e, "desktop")}
        className="hidden"
      />
      <input
        ref={mobileRef}
        type="file"
        accept={STATIC_IMAGE_UPLOAD.acceptedTypes}
        onChange={(e) => handleFileSelect(e, "mobile")}
        className="hidden"
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <LabelWrapper label="Title *">
          <TextInput
            value={image.title}
            onChange={(e) => onUpdate(image.id, { title: e.target.value })}
            placeholder="Homepage hero, partner logo, footer icon..."
          />
        </LabelWrapper>
        <LabelWrapper label="Alt Text">
          <TextInput
            value={image.altText || ""}
            onChange={(e) => onUpdate(image.id, { altText: e.target.value })}
            placeholder="Alternative text for accessibility"
          />
        </LabelWrapper>
      </div>

      <div className="mt-5">
        <LabelWrapper label="Description">
          <Textarea
            value={image.description || ""}
            onChange={(e) => onUpdate(image.id, { description: e.target.value })}
            rows={3}
            placeholder="Add optional editorial context for this asset"
          />
        </LabelWrapper>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <LabelWrapper label="Link URL (Optional)">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Link2 size={16} />
            </div>
            <TextInput
              value={image.linkUrl || ""}
              onChange={(e) => onUpdate(image.id, { linkUrl: e.target.value })}
              placeholder="https://example.com or /about"
              type="url"
              className="[&_input]:pl-10"
            />
          </div>
        </LabelWrapper>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-950/[0.02] p-4 dark:border-slate-700/80 dark:bg-white/[0.02]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Visibility</p>
          <label htmlFor={`active-${image.id}`} className="mt-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">Show this asset on site</span>
            <input
              id={`active-${image.id}`}
              type="checkbox"
              checked={image.isActive}
              onChange={(e) => onUpdate(image.id, { isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
          </label>
          {image.linkUrl ? (
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <ExternalLink size={12} />
              Linked
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function BulkUploadModal({
  show,
  onClose,
  onUpload,
}: {
  show: boolean;
  onClose: () => void;
  onUpload: (desktopFiles: File[], mobileFiles: File[]) => void;
}) {
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const [desktopFiles, setDesktopFiles] = useState<File[]>([]);
  const [mobileFiles, setMobileFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "desktop" | "mobile") => {
    const valid = Array.from(e.target.files || []).filter((file) => {
      const err = validateImageFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        return false;
      }
      return true;
    });

    if (type === "desktop") setDesktopFiles(valid);
    else setMobileFiles(valid);
  };

  const handleUpload = () => {
    if (!desktopFiles.length && !mobileFiles.length) {
      toast.error("Please select at least one image");
      return;
    }

    if (desktopFiles.length !== mobileFiles.length) {
      const ok = window.confirm(
        `${desktopFiles.length} desktop vs ${mobileFiles.length} mobile images. Some items will need to be completed manually. Continue?`
      );
      if (!ok) return;
    }

    onUpload(desktopFiles, mobileFiles);
    setDesktopFiles([]);
    setMobileFiles([]);
  };

  const handleClose = () => {
    setDesktopFiles([]);
    setMobileFiles([]);
    onClose();
  };

  const totalCount = Math.max(desktopFiles.length, mobileFiles.length);
  const mismatch =
    desktopFiles.length !== mobileFiles.length && (desktopFiles.length > 0 || mobileFiles.length > 0);

  return (
    <Modal show={show} onClose={handleClose} size="3xl">
      <div className="space-y-6 p-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Upload Images</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Add desktop and mobile batches together. Files are paired in the order you select them.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          Select matching desktop and mobile sets when possible so the editor starts with cleaner pairs.
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Desktop Images ({desktopFiles.length} selected)
            </label>
            <input
              ref={desktopRef}
              type="file"
              accept={STATIC_IMAGE_UPLOAD.acceptedTypes}
              multiple
              onChange={(e) => handleFileChange(e, "desktop")}
              className="hidden"
            />
            <Button onClick={() => desktopRef.current?.click()} color="blue" className="w-full">
              <HiUpload className="mr-2" /> Select Desktop Images
            </Button>
            {desktopFiles.length > 0 ? (
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                {desktopFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="text-sm text-slate-600 dark:text-slate-400">
                    {file.name}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile Images ({mobileFiles.length} selected)
            </label>
            <input
              ref={mobileRef}
              type="file"
              accept={STATIC_IMAGE_UPLOAD.acceptedTypes}
              multiple
              onChange={(e) => handleFileChange(e, "mobile")}
              className="hidden"
            />
            <Button onClick={() => mobileRef.current?.click()} color="purple" className="w-full">
              <HiUpload className="mr-2" /> Select Mobile Images
            </Button>
            {mobileFiles.length > 0 ? (
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                {mobileFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="text-sm text-slate-600 dark:text-slate-400">
                    {file.name}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {mismatch ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {desktopFiles.length} desktop vs {mobileFiles.length} mobile files selected. Unpaired items will need manual completion afterward.
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} color="gray">
            Cancel
          </Button>
          <Button onClick={handleUpload} color="green">
            Upload {totalCount} Image{totalCount !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
