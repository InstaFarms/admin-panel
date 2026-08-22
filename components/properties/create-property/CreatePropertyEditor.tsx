"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  type BrandSlug,
  type BrandTabBundle,
  createEmptyBrandTabBundle,
  type PropertyEditorDraft,
} from "@/lib/properties/propertyEditorDraft";
import { buildPropertyUpsertPayload } from "@/components/properties/editor/buildPropertyUpsertPayload";
import { createPropertyFromPayload } from "@/actions/propertyActions";
import { PropertyEditorServicesProvider } from "@/components/properties/editor/usePropertyEditorServicesContext";
import { usePropertyServices } from "@/hooks/properties/usePropertyServices";
import {
  confirmAdvanceAmountIfHigherThanBase,
  validatePropertySubmitPayload,
} from "@/components/properties/editor/propertySubmitValidation";
import { captureError } from "@/lib/sentry";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import MyButton from "@/components/MyButton";
import { Save, Trash2, X } from "lucide-react";
import { ADMIN_BASE_PATH } from "@/constants/routes";
import BrandSelectScreen from "./BrandSelectScreen";
import { CreatePropertyTabs, CREATE_TAB_INDEX, getCompletedTabs } from "./CreatePropertyTabs";
import { checkPropertyCodeExists } from "./checkPropertyCode";
import { GallerySection } from "@/components/properties/gallery-section";
import type { SectionChange } from "@/components/properties/editor/tabs/types";

interface Source {
  id: string;
  name: string;
  description: string;
}

interface CreatePropertyEditorProps {
  sources: Source[];
}

type FieldErrors = { propertyName?: string; propertyCode?: string };

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "/admin/properties", label: "Properties" },
  { href: "#", label: "Create" },
];

const PROPERTY_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]*$/;

const DRAFT_KEY = (slug: string) => `create-property-draft-${slug}`;
const LAST_BRAND_KEY = "create-property-last-brand";

function saveLastSource(source: { id: string; name: string }) {
  try {
    localStorage.setItem(LAST_BRAND_KEY, JSON.stringify(source));
  } catch {
    // ignore
  }
}

function loadLastSource(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(LAST_BRAND_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { id: string; name: string };
  } catch {
    return null;
  }
}

function saveDraft(slug: string, draft: Record<string, Partial<BrandTabBundle>>) {
  try {
    localStorage.setItem(DRAFT_KEY(slug), JSON.stringify(draft));
  } catch {
    // ignore quota / unavailable errors
  }
}

function loadDraft(slug: string): Record<string, Partial<BrandTabBundle>> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(slug));
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, Partial<BrandTabBundle>>;
  } catch {
    return null;
  }
}

function clearDraft(slug: string) {
  try {
    localStorage.removeItem(DRAFT_KEY(slug));
  } catch {
    // ignore
  }
}

function hasMeaningfulData(draft: Record<string, Partial<BrandTabBundle>>, slug: string): boolean {
  const bundle = draft[slug];
  if (!bundle) return false;
  const detail = (bundle.detail ?? {}) as Record<string, unknown>;
  return Object.values(detail).some(
    (v) =>
      (typeof v === "string" && v.trim().length > 0) ||
      typeof v === "number" ||
      (Array.isArray(v) && v.length > 0),
  );
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown) {
  if (path.length === 1) {
    obj[path[0]] =
      typeof value === "function"
        ? (value as (prev: unknown) => unknown)(obj[path[0]])
        : value;
  } else {
    const [key, ...rest] = path;
    obj[key] = { ...(obj[key] as Record<string, unknown>) };
    setNestedValue(obj[key] as Record<string, unknown>, rest, value);
  }
}

export default function CreatePropertyEditor({ sources }: CreatePropertyEditorProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();

  const [selectedSource, setSelectedSource] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [detectedDraft, setDetectedDraft] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [draft, setDraft] = useState<Record<string, Partial<BrandTabBundle>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [codeWarning, setCodeWarning] = useState<string | null>(null);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const codeCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstDraftSave = useRef(true);
  const handleSubmitRef = useRef<() => Promise<boolean>>();

  const services = usePropertyServices(createdPropertyId);

  // Clear draft on unmount if creation wasn't successful
  useEffect(() => {
    return () => {
      if (selectedSource && !hasMeaningfulData(draft, selectedSource.id)) {
        clearDraft(selectedSource.id);
      }
    };
  }, [selectedSource, draft]);

  // Persist draft to localStorage whenever it changes, show brief "saved" indicator
  useEffect(() => {
    if (!selectedSource || createdPropertyId) return;
    if (isFirstDraftSave.current) {
      isFirstDraftSave.current = false;
      return;
    }
    saveDraft(selectedSource.id, draft);
    setShowDraftSaved(true);
    if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    draftSavedTimerRef.current = setTimeout(() => setShowDraftSaved(false), 2000);
  }, [draft, selectedSource, createdPropertyId]);

  // Ctrl/Cmd+S keyboard shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (handleSubmitRef.current && !createdPropertyId) {
          void handleSubmitRef.current();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createdPropertyId]);

  const handleSectionChange = useCallback<SectionChange>((path, value) => {
    // Clear inline field error when user edits the field
    if (path.endsWith(".detail.propertyName")) {
      setFieldErrors((prev) => ({ ...prev, propertyName: undefined }));
    } else if (path.endsWith(".detail.propertyCode")) {
      setFieldErrors((prev) => ({ ...prev, propertyCode: undefined }));
      // Debounced uniqueness check
      if (codeCheckTimeoutRef.current) clearTimeout(codeCheckTimeoutRef.current);
      setCodeWarning(null);
      const code = typeof value === "string" ? value.toUpperCase().trim() : "";
      if (code && PROPERTY_CODE_REGEX.test(code)) {
        codeCheckTimeoutRef.current = setTimeout(() => {
          void checkPropertyCodeExists(code).then((exists) => {
            setCodeWarning(
              exists ? "A property with this code already exists. Consider using a different code." : null,
            );
          });
        }, 700);
      }
    }

    setDraft((prev) => {
      const parts = path.split(".");
      if (parts.length < 2) return prev;

      const [id, section, ...rest] = parts;
      const brandData = {
        ...(prev[id] ?? createEmptyBrandTabBundle()),
      } as Record<string, unknown>;

      if (rest.length === 0) {
        brandData[section] =
          typeof value === "function"
            ? (value as (prev: unknown) => unknown)(brandData[section])
            : value;
      } else {
        const sectionData = { ...(brandData[section] as Record<string, unknown>) };
        setNestedValue(sectionData, rest, value);
        brandData[section] = sectionData;
      }

      return { ...prev, [id]: brandData };
    });
  }, []);

  // Detect a saved draft on first mount — let the user choose to resume or start fresh
  useEffect(() => {
    const lastSource = loadLastSource();
    if (!lastSource) return;
    const saved = loadDraft(lastSource.id);
    if (!saved) return;
    setDetectedDraft(lastSource);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSourceSelect = (source: { id: string; name: string }) => {
    const saved = loadDraft(source.id);
    saveLastSource(source);
    setSelectedSource(source);
    setCreatedPropertyId(null);
    setActiveTab(0);
    setFieldErrors({});
    if (saved) {
      setDraft(saved);
      isFirstDraftSave.current = false;
      toast.success("Draft restored from previous session.", { duration: 3000 });
    } else {
      setDraft({});
    }
  };

  const handleResumeDraft = () => {
    if (!detectedDraft) return;
    handleSourceSelect(detectedDraft);
    setDetectedDraft(null);
  };

  const handleDiscardDraft = () => {
    if (!detectedDraft) return;
    clearDraft(detectedDraft.id);
    try { localStorage.removeItem(LAST_BRAND_KEY); } catch { /* ignore */ }
    setDetectedDraft(null);
  };

  const handleClearDraft = () => {
    if (!window.confirm("Clear all filled data and start fresh? This cannot be undone.")) return;
    if (selectedSource) clearDraft(selectedSource.id);
    try { localStorage.removeItem(LAST_BRAND_KEY); } catch { /* ignore */ }
    setDraft({});
    setFieldErrors({});
  };

  const handleChangeSource = () => {
    if (selectedSource && hasMeaningfulData(draft, selectedSource.id)) {
      if (
        !window.confirm(
          "You have unsaved data. Changing the source will clear your current form. Continue?",
        )
      ) {
        return;
      }
    }
    setSelectedSource(null);
    setFieldErrors({});
  };

  const handleCancel = () => {
    router.push("/admin/properties");
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!selectedSource || createdPropertyId) return false;

    const toastId = "create-property-submit";

    const detailDraft = (draft[selectedSource.id]?.detail ?? {}) as Record<string, unknown>;
    const propertyName =
      typeof detailDraft.propertyName === "string" ? detailDraft.propertyName.trim() : "";
    const propertyCode =
      typeof detailDraft.propertyCode === "string" ? detailDraft.propertyCode.trim() : "";

    const errors: FieldErrors = {};

    if (!propertyName) {
      errors.propertyName = "Property Name is required.";
    }
    if (!propertyCode) {
      errors.propertyCode = "Property Code is required.";
    } else if (!PROPERTY_CODE_REGEX.test(propertyCode)) {
      errors.propertyCode = "Must be uppercase letters, numbers and hyphens only (e.g. MY-VILLA-01).";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setActiveTab(CREATE_TAB_INDEX.DETAIL);
      toast.error("Please fix the highlighted fields before creating.");
      setTimeout(() => {
        const fieldId = errors.propertyName ? "propertyName" : "propertyCode";
        document.getElementById(fieldId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return false;
    }

    setFieldErrors({});

    const brandBundle = {
      ...createEmptyBrandTabBundle(),
      ...(draft[selectedSource.id] ?? {}),
    } as BrandTabBundle;

    const fullDraft = {
      [selectedSource.id]: brandBundle,
    } as unknown as PropertyEditorDraft;

    const payload = buildPropertyUpsertPayload({
      draft: fullDraft,
      brandSlugs: [selectedSource.id],
    }) as Record<string, unknown>;

    const brandNode =
      payload[selectedSource.id] && typeof payload[selectedSource.id] === "object"
        ? (payload[selectedSource.id] as Record<string, unknown>)
        : null;
    if (brandNode) delete brandNode.gallery;

    const rIntent =
      payload.relationIntent && typeof payload.relationIntent === "object"
        ? (payload.relationIntent as Record<string, unknown>)
        : null;
    if (rIntent) rIntent.gallery = "unchanged";

    const validationError = validatePropertySubmitPayload(payload);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    if (!confirmAdvanceAmountIfHigherThanBase(payload)) return false;

    toast.loading("Creating property...", { id: toastId, duration: Infinity });

    return new Promise<boolean>((resolve) => {
      startTransition(() => {
        createPropertyFromPayload(payload)
          .then((result) => {
            if (result.error) throw new Error(result.error);

            const newPropertyId = result.data?.propertyId ?? null;
            clearDraft(selectedSource.id);
            toast.success(
              `Property created under ${selectedSource.name}! Complete the details in the editor.`,
              { id: toastId, duration: 4000 },
            );

            if (newPropertyId) {
              setCreatedPropertyId(newPropertyId);
              setActiveTab(CREATE_TAB_INDEX.GALLERY);
            }

            resolve(true);
          })
          .catch((err) => {
            captureError(err);
            const errMsg = (err as Error).message || "Failed to create property.";
            toast.error(
              (t) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm">{errMsg}</span>
                  <button
                    type="button"
                    onClick={() => { toast.dismiss(t.id); void handleSubmitRef.current?.(); }}
                    className="self-start text-xs font-bold text-rose-600 underline hover:no-underline"
                  >
                    Retry →
                  </button>
                </div>
              ),
              { id: toastId, duration: 8000 },
            );
            resolve(false);
          });
      });
    });
  };

  if (!selectedSource) {
    return (
      <BrandSelectScreen
        sources={sources}
        onSelect={handleSourceSelect}
        resumableDraft={detectedDraft ?? undefined}
        onResumeDraft={handleResumeDraft}
        onDiscardDraft={handleDiscardDraft}
      />
    );
  }

  // Keep ref in sync so the keyboard shortcut can call it
  handleSubmitRef.current = handleSubmit;

  // Active brand slug for reading from draft state correctly
  const activeDraftBundle = (draft[selectedSource.id] as BrandTabBundle | undefined) ?? createEmptyBrandTabBundle();
  const bundle = activeDraftBundle;
  const completedCount = getCompletedTabs(bundle).size;
  const TOTAL_TABS = 11; // Gallery excluded from count (only available after creation)

  // Derive property code suggestion from the name whenever code is empty
  const detailData = (bundle.detail ?? {}) as Record<string, unknown>;
  const currentCode = typeof detailData.propertyCode === "string" ? detailData.propertyCode.trim() : "";
  const currentName = typeof detailData.propertyName === "string" ? detailData.propertyName.trim() : "";
  const codeSuggestion = !currentCode && currentName
    ? currentName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
    : "";

  return (
    <PropertyEditorServicesProvider value={{ services, bootstrapLoading: false }}>
      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {createdPropertyId
                    ? "Add Images"
                    : `Create Property for ${selectedSource.name}`}
                </h2>
                {!createdPropertyId && (
                  <button
                    type="button"
                    onClick={handleChangeSource}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    Change Source
                  </button>
                )}
              </div>
              <PageBreadcrumb
                items={BREADCRUMBS}
                className="bg-transparent p-0 pb-0 text-sm [&_a]:text-slate-500 [&_a]:transition [&_a]:hover:text-slate-900 [&_a]:dark:text-slate-400 [&_a]:dark:hover:text-slate-100 [&_li]:text-slate-500 [&_li]:dark:text-slate-400"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!createdPropertyId && showDraftSaved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Draft saved
                </span>
              )}

              {!createdPropertyId && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <Trash2 size={12} />
                    Clear draft
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <X size={12} />
                    Save & Exit
                  </button>
                </div>
              )}

              {createdPropertyId ? (
                <button
                  type="button"
                  onClick={() => router.push(`/admin/properties/${createdPropertyId}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Go to Edit Page →
                </button>
              ) : (
                <MyButton onClick={() => void handleSubmit()} loading={loading}>
                  <Save size={18} className="mr-1.5" />
                  <span className="text-sm font-semibold">
                    {loading ? "Creating..." : "Create"}
                  </span>
                </MyButton>
              )}
            </div>
          </div>
        </div>

        {createdPropertyId ? (
          <GallerySection
            propertyId={createdPropertyId}
            brandScope={selectedSource.id === "mago" ? "mago" : "instafarms"}
            propertyBrandMappingId={null}
          />
        ) : (
          <>
            {Object.values(fieldErrors).some(Boolean) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  Fix the following before creating:
                </p>
                <ul className="space-y-1">
                  {fieldErrors.propertyName && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(CREATE_TAB_INDEX.DETAIL);
                          setTimeout(() => document.getElementById("propertyName")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
                        }}
                        className="text-sm text-red-600 underline hover:no-underline dark:text-red-400"
                      >
                        Property Name — {fieldErrors.propertyName}
                      </button>
                    </li>
                  )}
                  {fieldErrors.propertyCode && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(CREATE_TAB_INDEX.DETAIL);
                          setTimeout(() => document.getElementById("propertyCode")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
                        }}
                        className="text-sm text-red-600 underline hover:no-underline dark:text-red-400"
                      >
                        Property Code — {fieldErrors.propertyCode}
                      </button>
                    </li>
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => setFieldErrors({})}
                  className="mt-2 text-xs text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Dismiss
                </button>
              </div>
            )}

            <CreatePropertyTabs
              propertyId={createdPropertyId}
              propertySource={selectedSource.id}
              sources={sources}
              draft={draft}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              onSectionChange={handleSectionChange}
              fieldErrors={fieldErrors}
              codeWarning={codeWarning ?? undefined}
              codeSuggestion={codeSuggestion || undefined}
            />
          </>
        )}
      </form>
    </PropertyEditorServicesProvider>
  );
}
