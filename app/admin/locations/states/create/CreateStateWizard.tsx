"use client";

import { useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Compass,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Info,
  Layers3,
  MapPin,
  Plus,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadLocationIconAction } from "@/actions/imageActions";
import {
  addBrandToLocation,
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/actions/locationActions";
import type {
  BrandLocationFaq,
  LocationDisplayMode,
  LocationMarketType,
  LocationOption,
  LocationRole,
} from "@/types/locations";
import { NearbyPicker } from "../../components/NearbyPicker";
import styles from "./CreateStateWizard.module.css";

type BrandSeed = {
  id: string;
  name: string;
  short: string;
  color: string;
  category: string;
};

type BrandContent = {
  slugOverride: string;
  weight: string;
  heading: string;
  shortDesc: string;
  brandActive: boolean;
  featured: boolean;
  icon: string | null;
  page: { intro: string; body: string };
  faqs: Array<{ q: string; a: string }>;
  meta: { title: string; description: string; keywords: string };
};

type Draft = {
  name: string;
  slug: string;
  slugTouched: boolean;
  tag: string;
  tagTouched: boolean;
  market: LocationMarketType;
  display: LocationDisplayMode;
  active: boolean;
  roles: Record<string, boolean>;
  nearby: string[];
  brands: string[];
  brandData: Record<string, BrandContent>;
};

type WizardProps = {
  brands: Array<{ id: string; name: string }>;
  stateOptions: LocationOption[];
};

type WizardState = {
  step: number;
  activeBrand: string;
  draft: Draft;
};

type WizardAction =
  | { type: "set_step"; step: number }
  | { type: "set_active_brand"; brandId: string }
  | { type: "set_draft"; patch: Partial<Draft> }
  | { type: "set_name"; value: string }
  | { type: "set_nearby"; nearby: string[] }
  | { type: "toggle_brand"; brandId: string }
  | { type: "set_brand_data"; brandId: string; patch: Partial<BrandContent> }
  | { type: "set_brand_page"; brandId: string; patch: Partial<BrandContent["page"]> }
  | { type: "set_brand_meta"; brandId: string; patch: Partial<BrandContent["meta"]> }
  | { type: "set_from_storage"; value: WizardState };

const STORAGE_KEY = "admin-create-state-wizard-draft-v1";

const DISPLAY_MODES: Array<{
  value: LocationDisplayMode;
  title: string;
  icon: typeof Compass;
  desc: string;
  behavior: string;
}> = [
  {
    value: "area_first",
    title: "Area First",
    icon: Compass,
    desc: "Lead with area and destination-style content.",
    behavior: "Area-led landing page",
  },
  {
    value: "listing_first",
    title: "Listing First",
    icon: Building2,
    desc: "Lead directly with property listings.",
    behavior: "Listing-led landing page",
  },
  {
    value: "mixed",
    title: "Mixed",
    icon: Layers3,
    desc: "Balance content and listings together.",
    behavior: "Balanced landing page",
  },
];

const STEP_ITEMS = [
  { key: "01", name: "Basics" },
  { key: "02", name: "Brands" },
  { key: "03", name: "Brand content" },
  { key: "04", name: "Review" },
];

const MARKET_OPTIONS: Array<{
  value: LocationMarketType;
  label: string;
}> = [
  { value: "mixed", label: "Mixed" },
  { value: "urban", label: "Urban" },
  { value: "leisure", label: "Leisure" },
  { value: "nearby_escape", label: "Nearby Escape" },
  { value: "business", label: "Business" },
  { value: "pilgrimage", label: "Pilgrimage" },
];

const STATE_ROLE_COMBINATIONS: readonly (readonly LocationRole[])[] = [
  ["state"],
  ["state", "destination"],
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function tagify(value: string) {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
}

function displayLabel(value: LocationDisplayMode) {
  return DISPLAY_MODES.find((item) => item.value === value)?.title ?? value;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function createRoleRecord(selectedRoles: readonly LocationRole[]) {
  return Object.fromEntries(
    ["state", "destination"].map((role) => [
      titleCase(role),
      selectedRoles.includes(role as LocationRole),
    ])
  ) as Record<string, boolean>;
}

function getSelectedRoles(draft: Draft) {
  return STATE_ROLE_COMBINATIONS[STATE_ROLE_COMBINATIONS.length - 1]!.filter(
    (role) => draft.roles[titleCase(role)]
  ) as LocationRole[];
}

function blankBrand(): BrandContent {
  return {
    slugOverride: "",
    weight: "0.00",
    heading: "",
    shortDesc: "",
    brandActive: true,
    featured: false,
    icon: null,
    page: { intro: "", body: "" },
    faqs: [],
    meta: { title: "", description: "", keywords: "" },
  };
}

function getInitialState(defaultBrandId?: string): WizardState {
  const brandIds = defaultBrandId ? [defaultBrandId] : [];
  const brandData = defaultBrandId ? { [defaultBrandId]: blankBrand() } : {};
  return {
    step: 0,
    activeBrand: defaultBrandId ?? "",
    draft: {
      name: "",
      slug: "",
      slugTouched: false,
      tag: "",
      tagTouched: false,
      market: "mixed",
      display: "area_first",
      active: true,
      roles: createRoleRecord(["state"]),
      nearby: [],
      brands: brandIds,
      brandData,
    },
  };
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "set_step":
      return { ...state, step: action.step };
    case "set_active_brand":
      return { ...state, activeBrand: action.brandId };
    case "set_draft":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "set_name":
      return {
        ...state,
        draft: {
          ...state.draft,
          name: action.value,
          slug: state.draft.slugTouched ? state.draft.slug : slugify(action.value),
          tag: state.draft.tagTouched ? state.draft.tag : tagify(action.value),
        },
      };
    case "set_nearby":
      return { ...state, draft: { ...state.draft, nearby: action.nearby } };
    case "toggle_brand": {
      const hasBrand = state.draft.brands.includes(action.brandId);
      const brands = hasBrand
        ? state.draft.brands.filter((brandId) => brandId !== action.brandId)
        : [...state.draft.brands, action.brandId];
      const brandData = { ...state.draft.brandData };
      if (!hasBrand && !brandData[action.brandId]) {
        brandData[action.brandId] = blankBrand();
      }
      const nextActiveBrand = brands.includes(state.activeBrand)
        ? state.activeBrand
        : brands[0] ?? "";
      return {
        ...state,
        activeBrand: nextActiveBrand,
        draft: {
          ...state.draft,
          brands,
          brandData,
        },
      };
    }
    case "set_brand_data":
      return {
        ...state,
        draft: {
          ...state.draft,
          brandData: {
            ...state.draft.brandData,
            [action.brandId]: {
              ...state.draft.brandData[action.brandId],
              ...action.patch,
            },
          },
        },
      };
    case "set_brand_page":
      return {
        ...state,
        draft: {
          ...state.draft,
          brandData: {
            ...state.draft.brandData,
            [action.brandId]: {
              ...state.draft.brandData[action.brandId],
              page: {
                ...state.draft.brandData[action.brandId]?.page,
                ...action.patch,
              },
            },
          },
        },
      };
    case "set_brand_meta":
      return {
        ...state,
        draft: {
          ...state.draft,
          brandData: {
            ...state.draft.brandData,
            [action.brandId]: {
              ...state.draft.brandData[action.brandId],
              meta: {
                ...state.draft.brandData[action.brandId]?.meta,
                ...action.patch,
              },
            },
          },
        },
      };
    case "set_from_storage":
      return action.value;
    default:
      return state;
  }
}

function avatarMeta(index: number) {
  const palette = [
    { color: "#2f6df6", category: "Managed farmland" },
    { color: "#8b5cf6", category: "City apartments" },
    { color: "#18b981", category: "Plotted estates" },
    { color: "#e0a23a", category: "Serviced stays" },
    { color: "#06b6d4", category: "Beach villas" },
    { color: "#ef4655", category: "Legacy homes" },
  ];
  return palette[index % palette.length];
}

function shortCode(name: string) {
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  const letters = name.replace(/[^A-Za-z]/g, "");
  return letters.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function toFaqPayload(items: Array<{ q: string; a: string }>): BrandLocationFaq[] {
  return items
    .filter((item) => item.q.trim() && item.a.trim())
    .map((item, index) => ({
      question: item.q.trim(),
      answer: item.a.trim(),
      isActive: true,
      weight: index + 1,
    }));
}

function createFormDataFromBrand(
  draft: Draft,
  brandId: string,
  selectedRoles: readonly LocationRole[]
) {
  const brand = draft.brandData[brandId] ?? blankBrand();
  const formData = new FormData();
  formData.set("name", draft.name.trim());
  formData.set("slug", draft.slug.trim());
  formData.set("locationTag", draft.tag.trim());
  formData.set("locationRoles", JSON.stringify(selectedRoles));
  formData.set("parentId", "");
  formData.set("marketType", draft.market);
  formData.set("displayMode", draft.display);
  formData.set("isActive", draft.active ? "true" : "false");
  formData.set(
    "nearbyMappings",
    JSON.stringify(
      draft.nearby.map((nearbyLocationId, index) => ({
        nearbyLocationId,
        sortOrder: String(index),
      }))
    )
  );
  formData.set("brandId", brandId);
  formData.set("brandSlug", brand.slugOverride.trim());
  formData.set("heading", brand.heading.trim());
  formData.set("brandDescription", brand.shortDesc.trim());
  formData.set("brandIsActive", brand.brandActive ? "true" : "false");
  formData.set("weight", brand.weight || "0.00");
  formData.set("featured", brand.featured ? "true" : "false");
  formData.set("icon", brand.icon ?? "");
  formData.set("pageTitle", brand.page.intro.trim());
  formData.set("pageDescription", brand.page.body.trim());
  formData.set("mapSearchKey", "");
  formData.set("howToReachTitle", "");
  formData.set("howToReachDescription", "");
  formData.set("nearByPlaces", JSON.stringify([]));
  formData.set("nearByAttractions", JSON.stringify([]));
  formData.set("faqs", JSON.stringify(toFaqPayload(brand.faqs)));
  formData.set("metaTitle", brand.meta.title.trim());
  formData.set("metaDescription", brand.meta.description.trim());
  formData.set("metaKeywords", brand.meta.keywords.trim());
  formData.set("metaUrl", "");
  formData.set("metaImageUrl", "");
  return formData;
}

const MAX_ICON_BYTES = 300 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ""] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header ?? "")?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function CreateStateWizard({ brands, stateOptions }: WizardProps) {
  const router = useRouter();
  const normalizedBrands = useMemo<BrandSeed[]>(
    () =>
      brands.map((brand, index) => ({
        ...brand,
        short: shortCode(brand.name),
        ...avatarMeta(index),
      })),
    [brands]
  );
  const stateCandidates = useMemo(
    () =>
      stateOptions.filter(
        (option) =>
          option.locationRoles.includes("state") && option.isActive
      ),
    [stateOptions]
  );
  const [state, dispatch] = useReducer(
    reducer,
    normalizedBrands[0]?.id,
    getInitialState
  );
  const [tab, setTab] = useState<"detail" | "page" | "faqs" | "meta">("detail");
  const [loading, startTransition] = useTransition();
  const [successState, setSuccessState] = useState<{
    name: string;
    brands: string[];
    id: string;
  } | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const resetWizard = () => {
    setSuccessState(null);
    setTab("detail");
    dispatch({ type: "set_from_storage", value: getInitialState(normalizedBrands[0]?.id) });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as WizardState;
      dispatch({ type: "set_from_storage", value: parsed });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || successState) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, successState]);

  const activeBrand = state.draft.brandData[state.activeBrand] ?? blankBrand();
  const selectedRoles = useMemo(() => getSelectedRoles(state.draft), [state.draft]);
  const canNext =
    state.step === 0
      ? Boolean(
          state.draft.name.trim() &&
            state.draft.slug.trim() &&
            state.draft.tag.trim()
        )
      : true;
  const activeBrandName =
    normalizedBrands.find((brand) => brand.id === state.activeBrand)?.name ?? "Brand";
  const nearby = state.draft.nearby;

  const completeBrand = (brandId: string) =>
    Boolean(state.draft.brandData[brandId]?.heading.trim());

  const goStep = (step: number) => {
    if (step < 0 || step > 3) return;
    dispatch({ type: "set_step", step });
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !state.activeBrand) return;

    if (!["image/webp", "image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, WEBP, or SVG icon.");
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      toast.error("Icon must be smaller than 300KB.");
      return;
    }

    setUploadingIcon(true);
    try {
      // The state doesn't exist yet, so the icon can't be keyed by locationId until
      // handleComplete creates it — stage it as a data URL (survives the localStorage
      // draft persistence below) and upload for real once we have a real id.
      const dataUrl = await readFileAsDataUrl(file);
      dispatch({
        type: "set_brand_data",
        brandId: state.activeBrand,
        patch: { icon: dataUrl },
      });
      toast.success("Icon staged — it'll upload once you finish creating this state.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to read icon file.");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleComplete = () => {
    startTransition(async () => {
      let createdLocationId = "";
      try {
        const createFormData = new FormData();
        createFormData.set("name", state.draft.name.trim());
        createFormData.set("slug", state.draft.slug.trim());
        createFormData.set("locationTag", state.draft.tag.trim());
        createFormData.set("locationRoles", JSON.stringify(selectedRoles));
        createFormData.set("parentId", "");
        createFormData.set("marketType", state.draft.market);
        createFormData.set("displayMode", state.draft.display);
        createFormData.set("isActive", state.draft.active ? "true" : "false");
        const created = await createLocation(createFormData);
        createdLocationId = created.id;

        const resolvedBrandData = { ...state.draft.brandData };
        for (const brandId of state.draft.brands) {
          const brand = resolvedBrandData[brandId];
          if (brand?.icon?.startsWith("data:")) {
            const brandName = normalizedBrands.find((b) => b.id === brandId)?.name ?? "";
            const iconFormData = new FormData();
            iconFormData.append("file", dataUrlToBlob(brand.icon), "icon");
            iconFormData.append("locationType", "state");
            iconFormData.append("brandName", brandName);
            iconFormData.append("locationId", created.id);
            const uploadResult = await uploadLocationIconAction(iconFormData);
            if (!uploadResult.success) {
              throw new Error(uploadResult.error || "Failed to upload brand icon.");
            }
            resolvedBrandData[brandId] = { ...brand, icon: uploadResult.success.path };
          }
        }
        const resolvedDraft = { ...state.draft, brandData: resolvedBrandData };

        for (const brandId of state.draft.brands) {
          await addBrandToLocation(created.id, brandId);
          await updateLocation(created.id, createFormDataFromBrand(resolvedDraft, brandId, selectedRoles));
        }

        if (nearby.length > 0 && state.draft.brands.length === 0) {
          const nearbyOnly = new FormData();
          nearbyOnly.set("name", state.draft.name.trim());
          nearbyOnly.set("slug", state.draft.slug.trim());
          nearbyOnly.set("locationTag", state.draft.tag.trim());
          nearbyOnly.set("locationRoles", JSON.stringify(selectedRoles));
          nearbyOnly.set("parentId", "");
          nearbyOnly.set("marketType", state.draft.market);
          nearbyOnly.set("displayMode", state.draft.display);
          nearbyOnly.set("isActive", state.draft.active ? "true" : "false");
          nearbyOnly.set(
            "nearbyMappings",
            JSON.stringify(nearby.map((id, index) => ({ nearbyLocationId: id, sortOrder: String(index) })))
          );
          await updateLocation(created.id, nearbyOnly);
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setSuccessState({
          id: created.id,
          name: state.draft.name,
          brands: state.draft.brands,
        });
      } catch (error: any) {
        if (createdLocationId) {
          try {
            await deleteLocation(createdLocationId);
          } catch {
            // Best-effort cleanup if the multi-step create fails after the base record is created.
          }
        }
        toast.error(error?.message || "Failed to create state.");
      }
    });
  };

  if (successState) {
    return (
      <div className={`${styles.successWrap} ${styles.fadeIn}`}>
        <div className={styles.successRing}>
          <Check size={40} strokeWidth={2.5} />
        </div>
        <h1 className={styles.pageTitle} style={{ textAlign: "center" }}>
          {successState.name} is live
        </h1>
        <p className={styles.sectionSub} style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 440 }}>
          The state record and {successState.brands.length} brand experience
          {successState.brands.length === 1 ? "" : "s"} were created together in the locations table.
        </p>
        <div className={styles.brandPills}>
          {successState.brands.map((brandId) => {
            const brand = normalizedBrands.find((item) => item.id === brandId);
            if (!brand) return null;
            return (
              <span key={brandId} className={styles.brandPill}>
                <span className={`${styles.avatar} ${styles.avatarSm}`} style={{ background: brand.color }}>
                  {brand.short}
                </span>
                {brand.name}
              </span>
            );
          })}
        </div>
        <div className={styles.rowWrap} style={{ justifyContent: "center", gap: 12, marginTop: 30 }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            onClick={resetWizard}
          >
            <Plus size={16} />
            Create another
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => router.push("/admin/locations/states")}
          >
            Back to States
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wizard} ${styles.fadeIn}`}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>State setup</div>
          <h1 className={styles.pageTitle}>Create a new state</h1>
          <div className={styles.crumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span>States</span>
            <ChevronRight size={13} />
            <span className={styles.crumbNow}>New</span>
          </div>
        </div>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/admin/locations/states")}
        >
          <ArrowLeft size={16} />
          Back to States
        </button>
      </div>

      <div className={`${styles.panel} ${styles.cardPad}`} style={{ marginBottom: 22 }}>
        <div className={styles.stepper}>
          {STEP_ITEMS.map((stepItem, index) => (
            <FragmentStep
              key={stepItem.key}
              item={stepItem}
              index={index}
              currentStep={state.step}
              onClick={() => {
                if (index <= state.step) {
                  goStep(index);
                }
              }}
              hasNext={index < STEP_ITEMS.length - 1}
            />
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={`${styles.panel} ${styles.cardPad}`}>
            {state.step === 0 ? (
              <StepBasics
                draft={state.draft}
                selectedRoles={selectedRoles}
                stateOptions={stateCandidates}
                onSetName={(value) => dispatch({ type: "set_name", value })}
                onSetDraft={(patch) => dispatch({ type: "set_draft", patch })}
                onSelectRoles={(roles) =>
                  dispatch({ type: "set_draft", patch: { roles: createRoleRecord(roles) } })
                }
                onSetNearby={(nearby) => dispatch({ type: "set_nearby", nearby })}
              />
            ) : null}
            {state.step === 1 ? (
              <StepBrands
                draft={state.draft}
                brands={normalizedBrands}
                onToggleBrand={(brandId) => dispatch({ type: "toggle_brand", brandId })}
              />
            ) : null}
            {state.step === 2 ? (
              <StepContent
                draft={state.draft}
                activeBrand={state.activeBrand}
                brands={normalizedBrands}
                tab={tab}
                onTabChange={setTab}
                onSetActiveBrand={(brandId) =>
                  dispatch({ type: "set_active_brand", brandId })
                }
                onSetBrandData={(brandId, patch) =>
                  dispatch({ type: "set_brand_data", brandId, patch })
                }
                onSetBrandPage={(brandId, patch) =>
                  dispatch({ type: "set_brand_page", brandId, patch })
                }
                onSetBrandMeta={(brandId, patch) =>
                  dispatch({ type: "set_brand_meta", brandId, patch })
                }
                onGoBrands={() => goStep(1)}
                onIconUpload={handleIconUpload}
                uploadingIcon={uploadingIcon}
              />
            ) : null}
            {state.step === 3 ? (
              <StepReview
                draft={state.draft}
                selectedRoles={selectedRoles}
                brands={normalizedBrands}
                onGo={goStep}
                onOpenBrand={(brandId) => {
                  dispatch({ type: "set_active_brand", brandId });
                  setTab("detail");
                  goStep(2);
                }}
              />
            ) : null}

            <div className={styles.wizardFoot}>
              {state.step > 0 ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={() => goStep(state.step - 1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={() => router.push("/admin/locations/states")}
                >
                  Cancel
                </button>
              )}
              <span className={styles.grow} />
              <span className={styles.autosave}>
                <span className={styles.autosaveDot} />
                Draft saved automatically
              </span>
              {state.step < 3 ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={() => goStep(state.step + 1)}
                  disabled={!canNext}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={handleComplete}
                  disabled={loading}
                >
                  <Check size={16} />
                  {loading ? "Creating..." : "Create state & publish"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.side}>
          <LiveSummary
            draft={state.draft}
            selectedRoles={selectedRoles}
            brands={normalizedBrands}
          />
        </aside>
      </div>
    </div>
  );
}

function FragmentStep({
  item,
  index,
  currentStep,
  onClick,
  hasNext,
}: {
  item: { key: string; name: string };
  index: number;
  currentStep: number;
  onClick: () => void;
  hasNext: boolean;
}) {
  const isDone = index < currentStep;
  const isActive = index === currentStep;
  return (
    <>
      <button
        type="button"
        className={`${styles.step} ${index <= currentStep ? styles.stepClickable : ""} ${isDone ? styles.stepDone : ""} ${isActive ? styles.stepActive : ""}`}
        onClick={onClick}
      >
        <span className={styles.stepDot}>
          {isDone ? <Check size={16} strokeWidth={3} /> : item.key}
        </span>
        <span className={styles.stepLabel}>
          <span className={styles.stepKey}>Step {item.key}</span>
          <span className={styles.stepName}>{item.name}</span>
        </span>
      </button>
      {hasNext ? (
        <span className={`${styles.stepLine} ${isDone ? styles.stepLineFilled : ""}`} />
      ) : null}
    </>
  );
}

function StepBasics({
  draft,
  selectedRoles,
  stateOptions,
  onSetName,
  onSetDraft,
  onSelectRoles,
  onSetNearby,
}: {
  draft: Draft;
  selectedRoles: readonly LocationRole[];
  stateOptions: LocationOption[];
  onSetName: (value: string) => void;
  onSetDraft: (patch: Partial<Draft>) => void;
  onSelectRoles: (roles: readonly LocationRole[]) => void;
  onSetNearby: (nearby: string[]) => void;
}) {
  return (
    <div className={styles.fadeIn}>
      <h2 className={styles.sectionTitle}>Base state record</h2>
      <p className={styles.sectionSub}>
        Enter these once. They define the structural state record in the{" "}
        <code className={styles.code}>locations</code> table and you won&apos;t be asked for them again.
      </p>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            State name <span className={styles.required}>*</span>
          </label>
          <input
            className={styles.input}
            value={draft.name}
            placeholder="e.g. Maharashtra"
            onChange={(event) => onSetName(event.target.value)}
            autoFocus
          />
        </div>

        <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Base slug <span className={styles.required}>*</span>
            </label>
            <div className={styles.hint}>
              Auto-generated from the name. Edit if you need a custom URL.
            </div>
            <div className={styles.inputPrefixWrap}>
              <span className={styles.inputPrefix}>/</span>
              <input
                className={`${styles.input} ${styles.inputMono} ${styles.inputPrefixed}`}
                value={draft.slug}
                onChange={(event) =>
                  onSetDraft({
                    slug: slugify(event.target.value),
                    slugTouched: true,
                  })
                }
                placeholder="maharashtra"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              State tag <span className={styles.required}>*</span>
            </label>
            <div className={styles.hint}>
              Unique 3-letter uppercase code for this state.
            </div>
            <input
              className={`${styles.input} ${styles.inputMono}`}
              value={draft.tag}
              onChange={(event) =>
                onSetDraft({
                  tag: event.target.value.toUpperCase().slice(0, 3),
                  tagTouched: true,
                })
              }
              placeholder="MAH"
              maxLength={3}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Classification</label>
          <div className={styles.hint}>
            A paired role also makes this entry appear under that paired location type in admin and frontend.
          </div>
          <div className={styles.options3}>
            {STATE_ROLE_COMBINATIONS.map((combo) => {
              const selected =
                combo.length === selectedRoles.length &&
                combo.every((role) => selectedRoles.includes(role));
              const label = combo.map((role) => titleCase(role)).join(" + ");
              return (
                <button
                  key={label}
                  type="button"
                  className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                  onClick={() => onSelectRoles(combo)}
                  aria-pressed={selected}
                >
                  <div className={styles.optionTitle}>
                    <Layers3 size={18} />
                    {label}
                  </div>
                  <div className={styles.optionDesc}>
                    {combo.includes("destination")
                      ? "Supports destination-style content on top of the state record."
                      : "Keeps this as a pure structural state record."}
                  </div>
                  <span className={styles.optionCheck}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Market type</label>
          <select
            className={styles.select}
            value={draft.market}
            onChange={(event) =>
              onSetDraft({ market: event.target.value as LocationMarketType })
            }
          >
            {MARKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Display mode</label>
          <div className={styles.hint}>
            How the frontend state page leads by default.
          </div>
          <div className={styles.options3}>
            {DISPLAY_MODES.map((option) => {
              const Icon = option.icon;
              const selected = draft.display === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                  onClick={() => onSetDraft({ display: option.value })}
                  aria-pressed={selected}
                >
                  <div className={styles.optionTitle}>
                    <Icon size={18} />
                    {option.title}
                  </div>
                  <div className={styles.optionDesc}>{option.desc}</div>
                  <span className={styles.optionCheck}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => onSetDraft({ active: event.target.checked })}
            />
            <span className={styles.switchTrack}>
              <span className={styles.switchThumb} />
            </span>
          </label>
          <div>
            <div className={styles.toggleTitle}>State is active</div>
            <div className={styles.toggleSub}>
              Inactive states stay in admin but are kept out of the live frontend flow.
            </div>
          </div>
        </div>

        {stateOptions.length > 0 ? (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Nearby states{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>(optional)</span>
            </label>
            <div className={styles.hint}>
              Link nearby states to cross-promote on the frontend. Shared across all brands.
            </div>
            <div style={{ marginTop: 8 }}>
              <NearbyPicker
                options={stateOptions}
                selected={draft.nearby}
                onChange={onSetNearby}
                currentSlug={draft.slug}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepBrands({
  draft,
  brands,
  onToggleBrand,
}: {
  draft: Draft;
  brands: BrandSeed[];
  onToggleBrand: (brandId: string) => void;
}) {
  const count = draft.brands.length;
  return (
    <div className={styles.fadeIn}>
      <h2 className={styles.sectionTitle}>
        Which brands run in {draft.name || "this state"}?
      </h2>
      <p className={styles.sectionSub}>
        Pick every brand that should have a presence here. You&apos;ll fill in each brand&apos;s content next.
        Brands you skip can always be added later and nothing is locked.
      </p>

      <div className={`${styles.banner} ${styles.bannerBlue}`} style={{ marginTop: 20 }}>
        <span className={styles.bannerIcon}>
          <Info size={18} />
        </span>
        <div>
          <div className={styles.bannerTitle}>Base record is shared, content is per-brand</div>
          <div className={styles.bannerBody}>
            The state name, slug and tag above are shared. Each brand below gets its own page
            content, FAQs, SEO and overrides without affecting the others.
          </div>
        </div>
      </div>

      <div className={styles.brandGrid}>
        {brands.map((brand) => {
          const selected = draft.brands.includes(brand.id);
          return (
            <button
              key={brand.id}
              type="button"
              className={`${styles.brandPick} ${selected ? styles.brandSelected : ""}`}
              onClick={() => onToggleBrand(brand.id)}
              aria-pressed={selected}
            >
              <span className={styles.avatar} style={{ background: brand.color }}>
                {brand.short}
              </span>
              <div>
                <div className={styles.brandName}>{brand.name}</div>
                <div className={styles.brandMeta}>{brand.category}</div>
              </div>
              <span className={styles.brandCheck}>
                <Check size={14} strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.rowWrap} style={{ color: "var(--muted)", fontSize: 13, marginTop: 24 }}>
        <span className={`${styles.badge} ${count ? styles.badgeBlue : styles.badgeMuted}`}>
          {count} selected
        </span>
        {count === 0 ? (
          <span>You can continue with none and add brands after the state exists.</span>
        ) : null}
      </div>
    </div>
  );
}

function StepContent(props: {
  draft: Draft;
  activeBrand: string;
  brands: BrandSeed[];
  tab: "detail" | "page" | "faqs" | "meta";
  onTabChange: (tab: "detail" | "page" | "faqs" | "meta") => void;
  onSetActiveBrand: (brandId: string) => void;
  onSetBrandData: (brandId: string, patch: Partial<BrandContent>) => void;
  onSetBrandPage: (brandId: string, patch: Partial<BrandContent["page"]>) => void;
  onSetBrandMeta: (brandId: string, patch: Partial<BrandContent["meta"]>) => void;
  onGoBrands: () => void;
  onIconUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingIcon: boolean;
}) {
  const {
    draft,
    activeBrand,
    brands,
    tab,
    onTabChange,
    onSetActiveBrand,
    onSetBrandData,
    onSetBrandPage,
    onSetBrandMeta,
    onGoBrands,
    onIconUpload,
    uploadingIcon,
  } = props;

  if (draft.brands.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyRing}>
          <Layers3 size={32} />
        </div>
        <h2 className={styles.sectionTitle}>No brands selected</h2>
        <p className={styles.sectionSub} style={{ maxWidth: 420, margin: "8px auto 22px" }}>
          You can create the bare state now and configure brand content whenever you&apos;re ready.
        </p>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonGhost}`}
          onClick={onGoBrands}
        >
          <ArrowLeft size={16} />
          Pick brands
        </button>
      </div>
    );
  }

  const brand = brands.find((item) => item.id === activeBrand);
  const data = draft.brandData[activeBrand] ?? blankBrand();
  const complete = (brandId: string) => Boolean(draft.brandData[brandId]?.heading.trim());
  const subTabs = [
    { id: "detail", label: "Detail", icon: Tag, opt: false },
    { id: "page", label: "Page content", icon: Layers3, opt: true },
    { id: "faqs", label: "FAQs", icon: HelpCircle, opt: true },
    { id: "meta", label: "Metadata", icon: Tag, opt: true },
  ] as const;

  return (
    <div className={styles.fadeIn}>
      <h2 className={styles.sectionTitle}>Brand content</h2>
      <p className={styles.sectionSub}>
        Switch between brands and fill each one. Only <b>Detail</b> is required to publish and the rest can be completed any time.
      </p>

      <div className={styles.brandSwitch}>
        {draft.brands.map((brandId) => {
          const currentBrand = brands.find((item) => item.id === brandId);
          if (!currentBrand) return null;
          return (
            <button
              key={brandId}
              type="button"
              className={`${styles.brandTab} ${brandId === activeBrand ? styles.brandTabActive : ""}`}
              onClick={() => onSetActiveBrand(brandId)}
              aria-pressed={brandId === activeBrand}
            >
              <span className={`${styles.avatar} ${styles.avatarSm}`} style={{ background: currentBrand.color }}>
                {currentBrand.short}
              </span>
              {currentBrand.name}
              <span className={`${styles.brandTabProgress} ${complete(brandId) ? styles.brandTabComplete : ""}`} />
            </button>
          );
        })}
      </div>

      <div className={`${styles.banner} ${styles.bannerEmerald}`}>
        <span className={styles.bannerIcon}>
          <Zap size={18} />
        </span>
        <div style={{ flex: 1 }}>
          <div className={styles.bannerRow}>
            <div className={styles.bannerEmeraldTitle}>{brand?.name} override is live</div>
            <span className={`${styles.badge} ${styles.badgeActive}`}>Brand override active</span>
          </div>
          <div className={styles.bannerBody}>
            Everything in these tabs applies only to the {brand?.name} experience for {draft.name || "this state"}.
          </div>
        </div>
      </div>

      <div className={styles.subTabs}>
        {subTabs.map((subTab) => {
          const Icon = subTab.icon;
          const active = tab === subTab.id;
          return (
            <button
              key={subTab.id}
              type="button"
              className={`${styles.subTab} ${active ? styles.subTabActive : ""}`}
              onClick={() => onTabChange(subTab.id)}
            >
              <Icon size={15} />
              {subTab.label}
              {"opt" in subTab ? <span className={styles.optTag}>opt</span> : null}
              {subTab.id === "detail" && complete(activeBrand) ? (
                <span className={styles.pip} />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "detail" ? (
        <div className={`${styles.fadeIn} ${styles.contentStack}`}>
          <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Brand slug override</label>
              <div className={styles.hint}>
                Defaults to /{draft.slug || "slug"} if left empty.
              </div>
              <div className={styles.inputPrefixWrap}>
                <span className={styles.inputPrefix}>/</span>
                <input
                  className={`${styles.input} ${styles.inputMono} ${styles.inputPrefixed}`}
                  value={data.slugOverride}
                  placeholder={draft.slug || "brand-specific-slug"}
                  onChange={(event) =>
                    onSetBrandData(activeBrand, {
                      slugOverride: slugify(event.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Weight</label>
              <div className={styles.hint}>Sort priority for this brand&apos;s listing.</div>
              <input
                className={styles.input}
                value={data.weight}
                onChange={(event) =>
                  onSetBrandData(activeBrand, { weight: event.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Heading <span className={styles.required}>*</span>
            </label>
            <div className={styles.hint}>The H1 shown on the brand&apos;s state page.</div>
            <input
              className={styles.input}
              value={data.heading}
              placeholder={`${brand?.name} in ${draft.name || "this state"}`}
              onChange={(event) =>
                onSetBrandData(activeBrand, { heading: event.target.value })
              }
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Short description</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={data.shortDesc}
              placeholder="One or two lines summarising this brand's offering here."
              onChange={(event) =>
                onSetBrandData(activeBrand, { shortDesc: event.target.value })
              }
            />
          </div>

          <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
            <div className={styles.toggleRow}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={data.brandActive}
                  onChange={(event) =>
                    onSetBrandData(activeBrand, { brandActive: event.target.checked })
                  }
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </label>
              <div>
                <div className={styles.toggleTitle}>Brand page is active</div>
                <div className={styles.toggleSub}>Show this brand&apos;s page on the frontend.</div>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={data.featured}
                  onChange={(event) =>
                    onSetBrandData(activeBrand, { featured: event.target.checked })
                  }
                />
                <span className={styles.switchTrack}>
                  <span className={styles.switchThumb} />
                </span>
              </label>
              <div>
                <div className={styles.toggleTitle}>Featured for this brand</div>
                <div className={styles.toggleSub}>Pin to featured rails and home modules.</div>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Brand icon</label>
            <label
              className={styles.optionCard}
              style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
            >
              <span className={styles.avatar} style={{ background: data.icon ? brand?.color : "var(--field)" }}>
                {data.icon ? brand?.short : <ImageIcon size={18} />}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {data.icon ? "Uploaded icon" : "Upload an icon"}
                </div>
                <div className={styles.brandMeta}>PNG, JPG, WEBP, or SVG, square preferred</div>
              </div>
              <span style={{ flex: 1 }} />
              <span className={`${styles.button} ${styles.buttonGhost}`} style={{ height: 36 }}>
                {uploadingIcon ? "Uploading..." : "Choose file"}
              </span>
              <input type="file" hidden onChange={onIconUpload} />
            </label>
          </div>
        </div>
      ) : null}

      {tab === "page" ? (
        <div className={`${styles.fadeIn} ${styles.contentStack}`}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Intro heading</label>
            <div className={styles.hint}>Optional section heading above the rich body.</div>
            <input
              className={styles.input}
              value={data.page.intro}
              placeholder="Why buy here"
              onChange={(event) =>
                onSetBrandPage(activeBrand, { intro: event.target.value })
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Page body</label>
            <div className={styles.hint}>Rich content for the brand's state landing page.</div>
            <textarea
              className={styles.textarea}
              rows={9}
              value={data.page.body}
              placeholder="Write the long-form page content here..."
              onChange={(event) =>
                onSetBrandPage(activeBrand, { body: event.target.value })
              }
            />
          </div>
        </div>
      ) : null}

      {tab === "faqs" ? (
        <div className={styles.fadeIn}>
          {data.faqs.length === 0 ? (
            <div className={`${styles.banner} ${styles.bannerBlue}`} style={{ marginBottom: 16 }}>
              <span className={styles.bannerIcon}>
                <HelpCircle size={18} />
              </span>
              <div>
                <div className={styles.bannerTitle}>No FAQs yet</div>
                <div className={styles.bannerBody}>
                  Add a few common questions to boost SEO and answer buyers up-front.
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.contentStack} style={{ gap: 12 }}>
            {data.faqs.map((faq, index) => (
              <div key={index} className={styles.repeatRow}>
                <span className={styles.grab}>
                  <GripVertical size={16} />
                </span>
                <div className={styles.contentStack} style={{ flex: 1, gap: 12 }}>
                  <input
                    className={styles.input}
                    value={faq.q}
                    placeholder={`Question ${index + 1}`}
                    onChange={(event) => {
                      const next = data.faqs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, q: event.target.value } : item
                      );
                      onSetBrandData(activeBrand, { faqs: next });
                    }}
                  />
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    value={faq.a}
                    placeholder="Answer"
                    onChange={(event) => {
                      const next = data.faqs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, a: event.target.value } : item
                      );
                      onSetBrandData(activeBrand, { faqs: next });
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.repeatDelete}
                  onClick={() =>
                    onSetBrandData(activeBrand, {
                      faqs: data.faqs.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost}`}
            style={{ marginTop: 16, height: 36 }}
            onClick={() =>
              onSetBrandData(activeBrand, {
                faqs: [...data.faqs, { q: "", a: "" }],
              })
            }
          >
            <Plus size={16} />
            Add question
          </button>
        </div>
      ) : null}

      {tab === "meta" ? (
        <div className={`${styles.fadeIn} ${styles.contentStack}`}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>SEO title</label>
            <div className={styles.hint}>{(data.meta.title || "").length}/60 characters</div>
            <input
              className={styles.input}
              value={data.meta.title}
              placeholder={`${brand?.name} in ${draft.name || "State"} | Plots & more`}
              onChange={(event) =>
                onSetBrandMeta(activeBrand, { title: event.target.value })
              }
              maxLength={70}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Meta description</label>
            <div className={styles.hint}>{(data.meta.description || "").length}/160 characters</div>
            <textarea
              className={styles.textarea}
              rows={3}
              value={data.meta.description}
              placeholder="A concise summary search engines will show..."
              onChange={(event) =>
                onSetBrandMeta(activeBrand, { description: event.target.value })
              }
              maxLength={180}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Keywords</label>
            <div className={styles.hint}>Comma-separated.</div>
            <input
              className={styles.input}
              value={data.meta.keywords}
              placeholder="farmland, plots, investment"
              onChange={(event) =>
                onSetBrandMeta(activeBrand, { keywords: event.target.value })
              }
            />
          </div>
        </div>
      ) : null}

    </div>
  );
}

function StepReview({
  draft,
  selectedRoles,
  brands,
  onGo,
  onOpenBrand,
}: {
  draft: Draft;
  selectedRoles: readonly LocationRole[];
  brands: BrandSeed[];
  onGo: (step: number) => void;
  onOpenBrand: (brandId: string) => void;
}) {
  return (
    <div className={styles.fadeIn}>
      <h2 className={styles.sectionTitle}>Review &amp; create</h2>
      <p className={styles.sectionSub}>
        One action creates the state record and all brand content together. Nothing is saved piecemeal.
      </p>

      <div className={styles.reviewGrid}>
        <div className={styles.reviewCard}>
          <div className={styles.reviewHead}>
            <span className={styles.avatar} style={{ background: "var(--blue-soft)", color: "var(--blue-bright)" }}>
              <MapPin size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {draft.name || "Untitled state"}
              </div>
              <div className={styles.brandMeta}>Base location record</div>
            </div>
            <button
              type="button"
              className={styles.backButton}
              style={{ height: 36, paddingInline: 14 }}
              onClick={() => onGo(0)}
            >
              Edit
            </button>
          </div>
          <dl className={styles.kv}>
            <dt>Slug</dt>
            <dd className={styles.kvMono}>/{draft.slug || "—"}</dd>
            <dt>State tag</dt>
            <dd className={styles.kvMono}>{draft.tag || "—"}</dd>
            <dt>Market type</dt>
            <dd style={{ textTransform: "capitalize" }}>{draft.market.replaceAll("_", " ")}</dd>
            <dt>Display mode</dt>
            <dd>{displayLabel(draft.display)}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`${styles.badge} ${draft.active ? styles.badgeActive : styles.badgeMuted}`}>
                {draft.active ? "Active" : "Inactive"}
              </span>
            </dd>
          </dl>
        </div>

        <div className={styles.reviewCard}>
          <div className={styles.reviewHead}>
            <span className={styles.avatar} style={{ background: "var(--emerald-soft)", color: "var(--emerald)" }}>
              <Layers3 size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {draft.brands.length} brand{draft.brands.length === 1 ? "" : "s"} configured
              </div>
              <div className={styles.brandMeta}>Per-brand content & overrides</div>
            </div>
            <button
              type="button"
              className={styles.backButton}
              style={{ height: 36, paddingInline: 14 }}
              onClick={() => onGo(1)}
            >
              Edit
            </button>
          </div>
          {draft.brands.length === 0 ? (
            <div className={styles.brandMeta}>
              No brands yet — you can add them after creating the state.
            </div>
          ) : null}
          <div className={styles.contentStack} style={{ gap: 12 }}>
            {draft.brands.map((brandId) => {
              const brand = brands.find((item) => item.id === brandId);
              const brandData = draft.brandData[brandId];
              const ready = Boolean(brandData?.heading.trim());
              if (!brand) return null;
              return (
                <div
                  key={brandId}
                  className={styles.rowWrap}
                  style={{
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <div className={styles.rowWrap}>
                    <span className={`${styles.avatar} ${styles.avatarSm}`} style={{ background: brand.color }}>
                      {brand.short}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{brand.name}</div>
                      <div className={styles.brandMeta}>
                        {brandData?.heading || (
                          <span style={{ fontStyle: "italic", color: "var(--dim)" }}>
                            Heading not set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.rowWrap} style={{ gap: 12 }}>
                    <span className={`${styles.badge} ${ready ? styles.badgeActive : styles.badgeAmber}`}>
                      {ready ? "Ready" : "Needs heading"}
                    </span>
                    <button
                      type="button"
                      className={styles.backButton}
                      style={{ height: 36, paddingInline: 14 }}
                      onClick={() => onOpenBrand(brandId)}
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSummary({
  draft,
  selectedRoles,
  brands,
}: {
  draft: Draft;
  selectedRoles: readonly LocationRole[];
  brands: BrandSeed[];
}) {
  const next = [
    `The state record is created in the locations table with ${selectedRoles
      .map((role) => titleCase(role))
      .join(" + ")}.`,
    "Each selected brand gets its own page, content, FAQs and SEO.",
    "Everything is committed together — one create, no half-saved records.",
  ];
  const displayBehavior =
    DISPLAY_MODES.find((item) => item.value === draft.display)?.behavior ?? "Balanced landing page";

  return (
    <div className={styles.contentStack} style={{ gap: 20 }}>
      <div className={`${styles.panel} ${styles.cardPad}`}>
        <div className={styles.eyebrow} style={{ color: "var(--ink-2)", letterSpacing: ".5px" }}>
          Live summary
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryKey}>Name</div>
          <div className={`${styles.summaryValue} ${!draft.name ? styles.summaryValueEmpty : ""}`}>
            {draft.name || "Not set"}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryKey}>Slug</div>
          <div
            className={`${styles.summaryValue} ${styles.summaryValueMono} ${
              !draft.slug ? styles.summaryValueEmpty : ""
            }`}
          >
            {draft.slug ? `/${draft.slug}` : "—"}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryKey}>State tag</div>
          <div
            className={`${styles.summaryValue} ${!draft.tag ? styles.summaryValueEmpty : ""}`}
            style={draft.tag ? { fontFamily: "var(--mono)" } : undefined}
          >
            {draft.tag || "—"}
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryKey}>Frontend behavior</div>
              <div className={styles.summaryValue} style={{ fontSize: 14 }}>
                {displayBehavior}
              </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryKey}>Brands</div>
          {draft.brands.length === 0 ? (
            <div className={`${styles.summaryValue} ${styles.summaryValueEmpty}`}>None yet</div>
          ) : (
            <div className={styles.rowWrap} style={{ gap: 6, marginTop: 8 }}>
              {draft.brands.map((brandId) => {
                const brand = brands.find((item) => item.id === brandId);
                if (!brand) return null;
                return (
                  <span
                    key={brand.id}
                    className={`${styles.avatar} ${styles.avatarSm}`}
                    style={{ background: brand.color }}
                  >
                    {brand.short}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={`${styles.panel} ${styles.cardPad}`}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>What happens on create</div>
        <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
          {next.map((text, index) => (
            <li
              key={index}
              className={styles.rowWrap}
              style={{
                alignItems: "flex-start",
                gap: 11,
                marginBottom: 14,
                fontSize: 12.5,
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  flex: "0 0 auto",
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "var(--blue-soft)",
                  color: "var(--blue-bright)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {index + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
