"use client";

import MyButton from "@/components/MyButton";
import DeletePropertyButton from "@/app/admin/properties/DeletePropertyButton";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import { PROPERTY_EDITOR_TAB_INDEX } from "./PropertyEditorTabs";
import { Copy, ExternalLink, MoreVertical, Plus, Save, Trash2 } from "lucide-react";
import type { BrandSlug } from "@/lib/properties/propertyEditorDraft";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

/**
 * Pops in/out with a spring instead of appearing/disappearing instantly -
 * this is the main "you have unsaved work" signal and fires on nearly every
 * keystroke, so it stays mounted briefly after isDirty flips false to let the
 * exit play instead of vanishing mid-animation.
 */
function UnsavedChangesBadge({ isDirty }: { isDirty: boolean }) {
  const [rendered, setRendered] = useState(isDirty);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isDirty) setRendered(true);
  }, [isDirty]);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (!ref.current) return;
      if (isDirty) {
        gsap.fromTo(
          ref.current,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }
        );
      } else {
        gsap.to(ref.current, {
          scale: 0.6,
          opacity: 0,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => setRendered(false),
        });
      }
    });
  }, [isDirty]);

  if (!rendered) return null;

  return (
    <span
      ref={ref}
      className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      Unsaved Changes
    </span>
  );
}

/** Slides/fades in and out around the "Switching to {brand}..." loading state. */
function BrandSwitchingBanner({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  const [rendered, setRendered] = useState(active);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) setRendered(true);
  }, [active]);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (!ref.current) return;
      if (active) {
        gsap.fromTo(
          ref.current,
          { y: -10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        gsap.to(ref.current, {
          y: -10,
          opacity: 0,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => setRendered(false),
        });
      }
    });
  }, [active]);

  if (!rendered) return null;

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm font-medium text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"
    >
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent dark:border-blue-200 dark:border-t-transparent" />
      Switching to {label}. Loading latest brand data...
    </div>
  );
}

/** Pop-in scale+fade for a small anchored dropdown/popover - mount-only (these close instantly on click-away, which is standard and not worth animating). */
function AnimatedDropdown({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { scale: 0.92, opacity: 0, y: -4 },
        { scale: 1, opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }
      );
    });
  }, []);

  return (
    <div ref={ref} className={className} style={{ transformOrigin: "top" }}>
      {children}
    </div>
  );
}

interface HeaderBrandOption {
  id: string;
  name: string;
  slug: BrandSlug;
  propertyBrandMappingId?: string | null;
  viewUrl?: string | null;
}

interface PropertyEditorHeaderProps {
  title: string;
  titleTooltip?: string;
  propertyDerivativeType?: string | null;
  isDirty: boolean;
  isEditMode: boolean;
  loading: boolean;
  isBrandSwitching?: boolean;
  switchingBrandName?: string | null;
  propertyId?: string | null;
  activeBrandSlug: BrandSlug;
  activeScope: "property" | "brand";
  activeTabIndex: number;
  activeBrandName: string;
  availableBrands: HeaderBrandOption[];
  addableBrands: HeaderBrandOption[];
  onSubmit: () => void | Promise<boolean>;
  onPropertyPillSelect: () => void;
  onBrandSelect: (brand: HeaderBrandOption) => void | Promise<void>;
  onBrandRemove: (brand: HeaderBrandOption) => void | Promise<void>;
  onBrandAdd: (brand: HeaderBrandOption) => void | Promise<void>;
}

const getSubmitButtonLabel = (
  loading: boolean,
  isEditMode: boolean,
  activeScope: "property" | "brand",
  activeBrandName: string,
): string => {
  if (loading) return isEditMode ? "Updating..." : "Creating...";
  if (!isEditMode) return "Create";
  return activeScope === "property" ? "Save Property" : `Save ${activeBrandName}`;
};

const DERIVATIVE_BADGE: Record<string, { label: string; color: string }> = {
  SPLIT: { label: "Split", color: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  MERGE: { label: "Merge", color: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  NORMAL: { label: "Normal", color: "border-slate-600 bg-slate-800 text-slate-400" },
};

export default function PropertyEditorHeader({
  title,
  titleTooltip,
  propertyDerivativeType,
  isDirty,
  isEditMode,
  loading,
  isBrandSwitching = false,
  switchingBrandName = null,
  propertyId,
  activeBrandSlug,
  activeScope,
  activeTabIndex,
  activeBrandName,
  availableBrands,
  addableBrands,
  onSubmit,
  onPropertyPillSelect,
  onBrandSelect,
  onBrandRemove,
  onBrandAdd,
}: PropertyEditorHeaderProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [openBrandMenuId, setOpenBrandMenuId] = useState<string | null>(null);
  const isGalleryTabActive = activeTabIndex === PROPERTY_EDITOR_TAB_INDEX.GALLERY;

  // Small scale pulse on whichever scope pill (Property / a brand) just became
  // active - the background/border color already crossfades via Tailwind's
  // `transition` class, this adds a bit of "arrival" feedback on top.
  const propertyPillRef = useRef<HTMLButtonElement>(null);
  const brandPillRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pulse = (el: Element | null) => {
    if (!el) return;
    import("gsap").then(({ gsap }) => {
      gsap.fromTo(el, { scale: 1 }, { scale: 1.05, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1 });
    });
  };
  useEffect(() => {
    if (activeScope === "property") {
      pulse(propertyPillRef.current);
    } else {
      pulse(brandPillRefs.current[activeBrandSlug] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope, activeBrandSlug]);

  // Pulses the Save button on a successful save, on top of the toast.
  const saveButtonRef = useRef<HTMLDivElement>(null);
  const handleSaveClick = () => {
    void (async () => {
      const result = await onSubmit();
      if (result) pulse(saveButtonRef.current);
    })();
  };
  const breadcrumbs = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: ADMIN_BASE_PATH, label: "Admin" },
      { href: "/admin/properties", label: "Properties" },
      { href: "#", label: isEditMode ? "Edit" : "Create" },
    ],
    [isEditMode],
  );

  useEffect(() => {
    if (!isGalleryTabActive) return;
    setShowAddMenu(false);
    setOpenBrandMenuId(null);
  }, [isGalleryTabActive]);

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2
              className="min-w-0 truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-white"
              title={titleTooltip}
            >
              {title}
            </h2>
            {propertyDerivativeType && (() => {
              const badge = DERIVATIVE_BADGE[propertyDerivativeType] ?? { label: propertyDerivativeType, color: "border-slate-600 bg-slate-800 text-slate-400" };
              return (
                <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xl font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
              );
            })()}
          </div>
          <PageBreadcrumb
            items={breadcrumbs}
            className="bg-transparent p-0 pb-0 text-sm [&_a]:text-slate-500 [&_a]:transition [&_a]:hover:text-slate-900 [&_a]:dark:text-slate-400 [&_a]:dark:hover:text-slate-100 [&_li]:text-slate-500 [&_li]:dark:text-slate-400"
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {isGalleryTabActive ? (
            <p className="max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              📌 Gallery is managed independently. Switch to another tab to use Save, Add Brand, or Delete.
            </p>
          ) : (
            <>
              <UnsavedChangesBadge isDirty={isDirty} />
              {addableBrands.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={isBrandSwitching}
                    onClick={() => {
                      setOpenBrandMenuId(null);
                      setShowAddMenu((prev) => !prev);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                  >
                    <Plus size={16} />
                    Add Brand
                  </button>
                  {showAddMenu ? (
                    <AnimatedDropdown className="absolute right-0 top-full z-20 mt-2 min-w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      {addableBrands.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => {
                            setShowAddMenu(false);
                            void onBrandAdd(brand);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {brand.name}
                        </button>
                      ))}
                    </AnimatedDropdown>
                  ) : null}
                </div>
              ) : null}
              <div ref={saveButtonRef}>
                <MyButton onClick={handleSaveClick} loading={loading}>
                  <Save size={20} className="mr-2" />
                  <span className="text-base font-semibold">
                    {getSubmitButtonLabel(loading, isEditMode, activeScope, activeBrandName)}
                  </span>
                </MyButton>
              </div>
              {propertyId ? (
                <div onClick={(e) => e.preventDefault()}>
                  <DeletePropertyButton id={propertyId} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Editing
        </div>
        <BrandSwitchingBanner active={isBrandSwitching} label={switchingBrandName ?? activeBrandName} />
        <div className="flex flex-wrap items-center gap-3">
          {/* Property scope pill */}
          <div className="flex items-center gap-2">
            <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium text-slate-400 dark:text-slate-500">Common</span>
            <button
              ref={propertyPillRef}
              type="button"
              disabled={isBrandSwitching}
              onClick={() => {
                setShowAddMenu(false);
                setOpenBrandMenuId(null);
                onPropertyPillSelect();
              }}
              className={`inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                activeScope === "property"
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <span>Property</span>
              <span
                className={`ml-2 text-xs font-normal ${
                  activeScope === "property" ? "text-violet-100" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                shared by all brands
              </span>
            </button>
          </div>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium text-slate-400 dark:text-slate-500">Brands</span>

          {availableBrands.map((brand) => {
            const isActive = brand.slug === activeBrandSlug && activeScope === "brand";
            const isMenuOpen = openBrandMenuId === brand.id;
            return (
              <div key={brand.id} className="relative">
                <div
                  ref={(el) => {
                    brandPillRefs.current[brand.slug] = el;
                  }}
                  className={`inline-flex items-center rounded-2xl border text-sm font-semibold shadow-sm transition ${
                    isActive
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isBrandSwitching}
                    onClick={() => {
                      setShowAddMenu(false);
                      setOpenBrandMenuId(null);
                      void onBrandSelect(brand);
                    }}
                    className="rounded-l-2xl px-4 py-2.5 outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {brand.name}
                  </button>
                  <button
                    type="button"
                    disabled={isBrandSwitching}
                    aria-label={`Open ${brand.name} actions`}
                    onClick={() => {
                      setShowAddMenu(false);
                      setOpenBrandMenuId((prev) => (prev === brand.id ? null : brand.id));
                    }}
                    className={`rounded-r-2xl border-l px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 ${
                      isActive
                        ? "border-white/20 hover:bg-white/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
                {isMenuOpen ? (
                  <AnimatedDropdown className="absolute left-0 top-full z-20 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {brand.viewUrl ? (
                      <a
                        href={brand.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenBrandMenuId(null)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <ExternalLink size={14} />
                        View on {brand.name}
                      </a>
                    ) : null}
                    {brand.propertyBrandMappingId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenBrandMenuId(null);
                          void navigator.clipboard.writeText(brand.propertyBrandMappingId!);
                          toast.success("Mapping ID copied");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Copy size={14} />
                        Copy Mapping ID
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenBrandMenuId(null);
                        void onBrandRemove(brand);
                      }}
                      className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10 whitespace-nowrap"
                    >
                      Remove Brand
                    </button>
                  </AnimatedDropdown>
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
