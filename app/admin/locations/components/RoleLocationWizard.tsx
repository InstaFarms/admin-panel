"use client";

import type { ReactNode } from "react";
import { useMemo, useReducer, useState, useTransition } from "react";
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
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadLocationIconAction } from "@/actions/imageActions";
import {
  addBrandToLocation,
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/actions/locationActions";
import {
  LOCATION_DISPLAY_MODE_HELPERS,
  LOCATION_DISPLAY_MODE_LABELS,
  LOCATION_MARKET_TYPE_OPTIONS,
} from "@/constants/locations";
import { getAllowedParentOptions, validateLocationParentRoles } from "@/lib/locationValidation";
import type {
  BrandLocationFaq,
  LocationDisplayMode,
  LocationMarketType,
  LocationOption,
  LocationRole,
} from "@/types/locations";
import { NearbyPicker } from "./NearbyPicker";
import styles from "../states/create/CreateStateWizard.module.css";

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
  parentId: string;
  roles: Record<string, boolean>;
  nearby: string[];
  market: LocationMarketType;
  display: LocationDisplayMode;
  active: boolean;
  brands: string[];
  brandData: Record<string, BrandContent>;
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
  | { type: "set_name"; value: string; showLocationTag: boolean }
  | { type: "set_nearby"; nearby: string[] }
  | { type: "toggle_brand"; brandId: string }
  | { type: "set_brand_data"; brandId: string; patch: Partial<BrandContent> }
  | { type: "set_brand_page"; brandId: string; patch: Partial<BrandContent["page"]> }
  | { type: "set_brand_meta"; brandId: string; patch: Partial<BrandContent["meta"]> };

type RoleLocationWizardProps = {
  brands: Array<{ id: string; name: string }>;
  locationOptions: LocationOption[];
  role: LocationRole;
  pluralLabel: string;
  singularLabel: string;
  backHref: string;
  showLocationTag?: boolean;
  allowedCombinations?: readonly (readonly LocationRole[])[];
};

const DISPLAY_MODES = [
  {
    value: "area_first" as const,
    title: "Area First",
    icon: Compass,
    desc: "Lead with area and destination-style content.",
  },
  {
    value: "listing_first" as const,
    title: "Listing First",
    icon: Building2,
    desc: "Lead directly with property listings.",
  },
  {
    value: "mixed" as const,
    title: "Mixed",
    icon: Layers3,
    desc: "Balance content and listings together.",
  },
];

const STEP_ITEMS = [
  { key: "01", name: "Basics" },
  { key: "02", name: "Brands" },
  { key: "03", name: "Brand content" },
  { key: "04", name: "Review" },
];

const SUB_TABS = [
  { id: "detail", label: "Detail", icon: Pencil },
  { id: "page", label: "Page content", icon: Layers3, opt: true },
  { id: "faqs", label: "FAQs", icon: HelpCircle, opt: true },
  { id: "meta", label: "Metadata", icon: Tag, opt: true },
] as const;

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

function comboKey(combo: readonly LocationRole[]) {
  return [...combo].join("|");
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

function roleTitle(role: LocationRole) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function createRoleRecord(selectedRoles: readonly LocationRole[]) {
  return Object.fromEntries(
    ["state", "city", "destination", "region", "area", "locality"].map((role) => [
      roleTitle(role as LocationRole),
      selectedRoles.includes(role as LocationRole),
    ])
  ) as Record<string, boolean>;
}

function getInitialState(
  defaultBrandId?: string,
  initialRoles: readonly LocationRole[] = []
): WizardState {
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
      parentId: "",
      roles: createRoleRecord(initialRoles),
      nearby: [],
      market: "mixed",
      display: "area_first",
      active: true,
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
          tag:
            action.showLocationTag && !state.draft.tagTouched
              ? tagify(action.value)
              : state.draft.tag,
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
    default:
      return state;
  }
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

function Field({
  label,
  hint,
  hintBelow,
  children,
}: {
  label: string;
  hint?: string;
  hintBelow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {hint && !hintBelow ? <div className={styles.hint}>{hint}</div> : null}
      {children}
      {hint && hintBelow ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}

function ReviewCard({
  children,
  icon,
  title,
  subtitle,
  onEdit,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onEdit: () => void;
}) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHead}>
        <span className={styles.avatar} style={{ background: "var(--blue-soft)", color: "var(--blue-bright)" }}>
          {icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <div className={styles.brandMeta}>{subtitle}</div>
        </div>
        <button
          type="button"
          className={styles.backButton}
          style={{ height: 36, paddingInline: 14 }}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

export default function RoleLocationWizard({
  brands,
  locationOptions,
  role,
  pluralLabel,
  singularLabel,
  backHref,
  showLocationTag = true,
  allowedCombinations,
}: RoleLocationWizardProps) {
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
  const allowedRoleCombinations = useMemo(
    () =>
      (allowedCombinations?.length
        ? allowedCombinations
        : [[role] as const]) as readonly (readonly LocationRole[])[],
    [allowedCombinations, role]
  );
  const visibleRoleOptions = useMemo(
    () =>
      ["state", "city", "destination", "region", "area", "locality"].filter((roleOption) =>
        allowedRoleCombinations.some((combo) => combo.includes(roleOption as LocationRole))
      ) as LocationRole[],
    [allowedRoleCombinations]
  );
  const [state, dispatch] = useReducer(
    reducer,
    { brandId: normalizedBrands[0]?.id, initialRoles: allowedRoleCombinations[0] ?? [role] },
    ({ brandId, initialRoles }) => getInitialState(brandId, initialRoles)
  );
  const [tab, setTab] = useState<"detail" | "page" | "faqs" | "meta">("detail");
  const [loading, startTransition] = useTransition();
  const [successId, setSuccessId] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const titleLabel = singularLabel[0].toUpperCase() + singularLabel.slice(1);
  const selectedRoles = useMemo(
    () =>
      visibleRoleOptions.filter((roleOption) => state.draft.roles[roleTitle(roleOption)]) as LocationRole[],
    [visibleRoleOptions, state.draft.roles]
  );
  const activeRoleComboKey = comboKey(selectedRoles);
  const shouldShowTag =
    showLocationTag || selectedRoles.includes("state") || selectedRoles.includes("city");
  const parentOptions = useMemo(
    () => getAllowedParentOptions(selectedRoles, locationOptions).filter((option) => option.isActive),
    [selectedRoles, locationOptions]
  );
  const nearbyOptions = useMemo(
    () => {
      const primaryNearbyRole =
        selectedRoles.find((selectedRole) => selectedRole !== "destination") ?? role;
      return locationOptions.filter(
        (option) => option.isActive && option.locationRoles.includes(primaryNearbyRole)
      );
    },
    [locationOptions, role, selectedRoles]
  );

  const activeBrand = state.draft.brandData[state.activeBrand] ?? blankBrand();
  const canNext =
    state.step === 0
      ? Boolean(
            state.draft.name.trim() &&
            state.draft.slug.trim() &&
            (!shouldShowTag || state.draft.tag.trim()) &&
            Boolean(selectedRoles.length) &&
            (!parentOptions.length || state.draft.parentId)
        )
      : true;

  const goStep = (step: number) => {
    if (step < 0 || step > 3) return;
    dispatch({ type: "set_step", step });
  };

  const setBrandData = (brandId: string, patch: Partial<BrandContent>) =>
    dispatch({ type: "set_brand_data", brandId, patch });

  const activeParent = parentOptions.find((option) => option.id === state.draft.parentId);

  const createBaseFormData = () => {
    const formData = new FormData();
    formData.set("name", state.draft.name.trim());
    formData.set("slug", state.draft.slug.trim());
    formData.set("locationTag", shouldShowTag ? state.draft.tag.trim() : "");
    formData.set("locationRoles", JSON.stringify(selectedRoles));
    formData.set("parentId", state.draft.parentId || "");
    formData.set("marketType", state.draft.market);
    formData.set("displayMode", state.draft.display);
    formData.set("isActive", state.draft.active ? "true" : "false");
    formData.set(
      "nearbyMappings",
      JSON.stringify(
        state.draft.nearby.map((nearbyLocationId, index) => ({
          nearbyLocationId,
          sortOrder: String(index),
        }))
      )
    );
    return formData;
  };

  const createBrandFormData = (brandId: string) => {
    const brand = state.draft.brandData[brandId] ?? blankBrand();
    const formData = createBaseFormData();
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
      // The location doesn't exist yet, so the icon can't be keyed by locationId until
      // handleComplete creates it — stage it as a data URL and upload for real once we
      // have a real id.
      const dataUrl = await readFileAsDataUrl(file);
      setBrandData(state.activeBrand, { icon: dataUrl });
      toast.success(`Icon staged — it'll upload once you finish creating this ${singularLabel}.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to read icon file.");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleComplete = () => {
    const parentRoles =
      parentOptions.find((option) => option.id === state.draft.parentId)?.locationRoles ?? null;
    const validation = validateLocationParentRoles(
      selectedRoles,
      parentRoles,
      shouldShowTag ? state.draft.tag : null
    );
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    startTransition(async () => {
      let createdLocationId = "";
      try {
        const created = await createLocation(createBaseFormData());
        createdLocationId = created.id;

        for (const brandId of state.draft.brands) {
          await addBrandToLocation(created.id, brandId);
          const brandFormData = createBrandFormData(brandId);
          const pendingIcon = state.draft.brandData[brandId]?.icon;
          if (pendingIcon?.startsWith("data:")) {
            const brandName = normalizedBrands.find((b) => b.id === brandId)?.name ?? "";
            const iconFormData = new FormData();
            iconFormData.append("file", dataUrlToBlob(pendingIcon), "icon");
            iconFormData.append("locationType", role);
            iconFormData.append("brandName", brandName);
            iconFormData.append("locationId", created.id);
            const uploadResult = await uploadLocationIconAction(iconFormData);
            if (!uploadResult.success) {
              throw new Error(uploadResult.error || "Failed to upload brand icon.");
            }
            brandFormData.set("icon", uploadResult.success.path);
          }
          await updateLocation(created.id, brandFormData);
        }

        setSuccessId(created.id);
      } catch (error: any) {
        if (createdLocationId) {
          try {
            await deleteLocation(createdLocationId);
          } catch {
            // Best-effort cleanup after partial create.
          }
        }
        toast.error(error?.message || `Failed to create ${singularLabel}.`);
      }
    });
  };

  if (successId) {
    return (
      <div className={`${styles.successWrap} ${styles.fadeIn}`}>
        <div className={styles.successRing}>
          <Check size={40} strokeWidth={2.5} />
        </div>
        <h1 className={styles.pageTitle} style={{ textAlign: "center" }}>
          {state.draft.name} is live
        </h1>
        <p className={styles.sectionSub} style={{ textAlign: "center", margin: "10px auto 0", maxWidth: 440 }}>
          The {singularLabel} record and {state.draft.brands.length} brand experience
          {state.draft.brands.length === 1 ? "" : "s"} were created together in the locations table.
        </p>
        <div className={styles.rowWrap} style={{ justifyContent: "center", gap: 12, marginTop: 30 }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => router.push(backHref)}
          >
            Back to {pluralLabel}
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
          <div className={styles.eyebrow}>{titleLabel} setup</div>
          <h1 className={styles.pageTitle}>Create a new {singularLabel}</h1>
          <div className={styles.crumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span>{pluralLabel}</span>
            <ChevronRight size={13} />
            <span className={styles.crumbNow}>New</span>
          </div>
        </div>
        <button type="button" className={styles.backButton} onClick={() => router.push(backHref)}>
          <ArrowLeft size={16} />
          Back to {pluralLabel}
        </button>
      </div>

      <div className={`${styles.panel} ${styles.cardPad}`} style={{ marginBottom: 22 }}>
        <div className={styles.stepper}>
          {STEP_ITEMS.map((item, index) => (
            <FragmentStep
              key={item.key}
              item={item}
              index={index}
              currentStep={state.step}
              onClick={() => goStep(index)}
              hasNext={index < STEP_ITEMS.length - 1}
            />
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={`${styles.panel} ${styles.cardPad}`}>
            {state.step === 0 ? (
              <div className={styles.fadeIn}>
                <h2 className={styles.sectionTitle}>Base {singularLabel} record</h2>
                <p className={styles.sectionSub}>
                  Enter these once. They define the structural {singularLabel} record in the{" "}
                  <code className={styles.code}>locations</code> table and anchor every brand experience below.
                </p>

                <div className={styles.fieldGrid}>
                  <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
                    <Field label={`${titleLabel} name`}>
                      <input
                        className={styles.input}
                        value={state.draft.name}
                        placeholder={`e.g. ${role === "city" ? "Hyderabad" : "Banjara Hills"}`}
                        onChange={(event) =>
                          dispatch({
                            type: "set_name",
                            value: event.target.value,
                            showLocationTag: shouldShowTag,
                          })
                        }
                        autoFocus
                      />
                    </Field>
                    <Field
                      label="Base slug"
                      hint="Auto-generated from the name. Edit if you need a custom URL."
                      hintBelow
                    >
                      <div className={styles.inputPrefixWrap}>
                        <span className={styles.inputPrefix}>/</span>
                        <input
                          className={`${styles.input} ${styles.inputMono} ${styles.inputPrefixed}`}
                          value={state.draft.slug}
                          onChange={(event) =>
                            dispatch({
                              type: "set_draft",
                              patch: { slug: slugify(event.target.value), slugTouched: true },
                            })
                          }
                        />
                      </div>
                    </Field>
                  </div>

                  <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
                    {shouldShowTag ? (
                      <Field
                        label={`${titleLabel} tag`}
                        hint="Unique 3-letter uppercase code."
                        hintBelow
                      >
                        <input
                          className={`${styles.input} ${styles.inputMono}`}
                          value={state.draft.tag}
                          maxLength={3}
                          onChange={(event) =>
                            dispatch({
                              type: "set_draft",
                              patch: { tag: event.target.value.toUpperCase().slice(0, 3), tagTouched: true },
                            })
                          }
                        />
                      </Field>
                    ) : (
                      <Field
                        label={role === "area" ? "Parent location" : "Parent state"}
                        hint={
                          role === "area"
                            ? "Choose the city or region this area belongs to."
                            : "Choose the state this city belongs to."
                        }
                        hintBelow
                      >
                        <select
                          className={styles.select}
                          value={state.draft.parentId}
                          onChange={(event) =>
                            dispatch({ type: "set_draft", patch: { parentId: event.target.value } })
                          }
                        >
                          <option value="">Select parent</option>
                          {parentOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="Market type" hintBelow>
                      <select
                        className={styles.select}
                        value={state.draft.market}
                        onChange={(event) =>
                          dispatch({
                            type: "set_draft",
                            patch: { market: event.target.value as LocationMarketType },
                          })
                        }
                      >
                        {LOCATION_MARKET_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {shouldShowTag ? (
                    <Field
                      label={role === "city" ? "Parent state" : "Parent location"}
                      hint={
                        role === "city"
                          ? "Choose the state this city belongs to."
                          : "Choose the parent location for this record."
                      }
                      hintBelow
                    >
                      <select
                        className={styles.select}
                        value={state.draft.parentId}
                        onChange={(event) =>
                          dispatch({ type: "set_draft", patch: { parentId: event.target.value } })
                        }
                      >
                        <option value="">Select parent</option>
                        {parentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}

                  {allowedRoleCombinations.length > 1 ? (
                    <Field
                      label={role === "destination" ? "Destination pairing" : "Role pairing"}
                      hint={
                        role === "destination"
                          ? "Choose the structural role this destination should pair with. The entry will also appear under that paired location type."
                          : "Choose the allowed role combination for this location. A paired role also makes this entry appear under that paired location type."
                      }
                    >
                      <div
                        className={styles.options3}
                        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
                      >
                        {allowedRoleCombinations.map((combo) => {
                          const selected = comboKey(combo) === activeRoleComboKey;
                          return (
                            <button
                              key={comboKey(combo)}
                              type="button"
                              className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                              onClick={() =>
                                dispatch({
                                  type: "set_draft",
                                  patch: {
                                    roles: createRoleRecord(combo),
                                    parentId: "",
                                  },
                                })
                              }
                            >
                              <div className={styles.optionTitle}>{combo.map(roleTitle).join(" + ")}</div>
                              <div className={styles.optionDesc}>
                                {combo.includes("destination")
                                  ? "This page will behave as a destination-enabled location."
                                  : "This page will stay as a pure structural location."}
                              </div>
                              <span className={styles.optionCheck}>
                                <Check size={14} strokeWidth={3} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  ) : null}

                  <Field label="Display mode" hint="How the frontend page leads by default.">
                    <div className={styles.options3}>
                      {DISPLAY_MODES.map((option) => {
                        const Icon = option.icon;
                        const selected = state.draft.display === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                            onClick={() =>
                              dispatch({
                                type: "set_draft",
                                patch: { display: option.value },
                              })
                            }
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
                  </Field>

                  <div className={styles.toggleRow}>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={state.draft.active}
                        onChange={(event) =>
                          dispatch({ type: "set_draft", patch: { active: event.target.checked } })
                        }
                      />
                      <span className={styles.switchTrack}>
                        <span className={styles.switchThumb} />
                      </span>
                    </label>
                    <div>
                      <div className={styles.toggleTitle}>{titleLabel} is active</div>
                      <div className={styles.toggleSub}>
                        Inactive {pluralLabel.toLowerCase()} stay in admin but are kept out of the live frontend flow.
                      </div>
                    </div>
                  </div>

                  {nearbyOptions.length > 0 ? (
                    <div>
                      <div className={styles.sectionTitle} style={{ marginBottom: 4 }}>
                        Nearby {pluralLabel.toLowerCase()}
                      </div>
                      <p className={styles.sectionSub} style={{ marginTop: 0, marginBottom: 12 }}>
                        Link nearby {pluralLabel.toLowerCase()} to cross-promote on the frontend. This is shared across all brands.
                      </p>
                      <NearbyPicker
                        options={nearbyOptions}
                        selected={state.draft.nearby}
                        onChange={(next) => dispatch({ type: "set_nearby", nearby: next })}
                        currentSlug={state.draft.slug}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {state.step === 1 ? (
              <div className={styles.fadeIn}>
                <h2 className={styles.sectionTitle}>
                  Which brands run in {state.draft.name || `this ${singularLabel}`}?
                </h2>
                <p className={styles.sectionSub}>
                  Pick every brand that should have a presence here. You&apos;ll fill in each brand&apos;s content next.
                </p>
                <div className={`${styles.banner} ${styles.bannerBlue}`} style={{ marginTop: 20 }}>
                  <span className={styles.bannerIcon}>
                    <Info size={18} />
                  </span>
                  <div>
                    <div className={styles.bannerTitle}>Base record is shared, content is per-brand</div>
                    <div className={styles.bannerBody}>
                      The {singularLabel} name, slug, parent and structural data are shared. Each brand below gets its
                      own page content, FAQs, SEO and overrides.
                    </div>
                  </div>
                </div>
                <div className={styles.brandGrid}>
                  {normalizedBrands.map((brand) => {
                    const selected = state.draft.brands.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        className={`${styles.brandPick} ${selected ? styles.brandSelected : ""}`}
                        onClick={() => dispatch({ type: "toggle_brand", brandId: brand.id })}
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
              </div>
            ) : null}

            {state.step === 2 ? (
              <div className={styles.fadeIn}>
                <h2 className={styles.sectionTitle}>Brand content</h2>
                <p className={styles.sectionSub}>
                  Switch between brands and fill each one. Only <b>Detail</b> is required to publish.
                </p>

                {state.draft.brands.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyRing}>
                      <Layers3 size={32} />
                    </div>
                    <h2 className={styles.sectionTitle}>No brands selected</h2>
                    <p className={styles.sectionSub} style={{ maxWidth: 420, margin: "8px auto 22px" }}>
                      You can create the bare {singularLabel} now and configure brand content later.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={styles.brandSwitch}>
                      {state.draft.brands.map((brandId) => {
                        const brand = normalizedBrands.find((item) => item.id === brandId);
                        if (!brand) return null;
                        const complete = Boolean(state.draft.brandData[brandId]?.heading.trim());
                        return (
                          <button
                            key={brandId}
                            type="button"
                            className={`${styles.brandTab} ${brandId === state.activeBrand ? styles.brandTabActive : ""}`}
                            onClick={() => dispatch({ type: "set_active_brand", brandId })}
                          >
                            <span className={`${styles.avatar} ${styles.avatarSm}`} style={{ background: brand.color }}>
                              {brand.short}
                            </span>
                            {brand.name}
                            <span className={`${styles.brandTabProgress} ${complete ? styles.brandTabComplete : ""}`} />
                          </button>
                        );
                      })}
                    </div>

                    <div className={`${styles.banner} ${styles.bannerEmerald}`} style={{ marginTop: 20 }}>
                      <span className={styles.bannerIcon} style={{ color: "var(--emerald)" }}>
                        <MapPin size={18} />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div className={styles.bannerRow}>
                          <div className={styles.bannerEmeraldTitle}>
                            {normalizedBrands.find((brand) => brand.id === state.activeBrand)?.name} override is live
                          </div>
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Brand override active</span>
                        </div>
                        <div className={styles.bannerBody}>
                          These changes apply only to the selected brand for {state.draft.name || `this ${singularLabel}`}.
                        </div>
                      </div>
                    </div>

                    <div className={styles.subTabs}>
                      {SUB_TABS.map((subTab) => {
                        const Icon = subTab.icon;
                        const active = tab === subTab.id;
                        return (
                          <button
                            key={subTab.id}
                            type="button"
                            className={`${styles.subTab} ${active ? styles.subTabActive : ""}`}
                            onClick={() => setTab(subTab.id)}
                          >
                            <Icon size={15} />
                            {subTab.label}
                            {"opt" in subTab ? <span className={styles.optTag}>opt</span> : null}
                          </button>
                        );
                      })}
                    </div>

                    {tab === "detail" ? (
                      <div className={`${styles.fadeIn} ${styles.contentStack}`}>
                        <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
                          <Field label="Brand slug override" hint={`Defaults to /${state.draft.slug || "slug"} if left empty.`}>
                            <div className={styles.inputPrefixWrap}>
                              <span className={styles.inputPrefix}>/</span>
                              <input
                                className={`${styles.input} ${styles.inputMono} ${styles.inputPrefixed}`}
                                value={activeBrand.slugOverride}
                                onChange={(event) =>
                                  setBrandData(state.activeBrand, { slugOverride: slugify(event.target.value) })
                                }
                              />
                            </div>
                          </Field>
                          <Field label="Weight" hint="Sort priority for this brand's listing.">
                            <input
                              className={styles.input}
                              value={activeBrand.weight}
                              onChange={(event) =>
                                setBrandData(state.activeBrand, { weight: event.target.value })
                              }
                            />
                          </Field>
                        </div>

                        <Field label="Heading" hint={`The H1 shown on the brand's ${singularLabel} page.`}>
                          <input
                            className={styles.input}
                            value={activeBrand.heading}
                            onChange={(event) =>
                              setBrandData(state.activeBrand, { heading: event.target.value })
                            }
                          />
                        </Field>

                        <Field label="Short description">
                          <textarea
                            className={styles.textarea}
                            rows={4}
                            value={activeBrand.shortDesc}
                            onChange={(event) =>
                              setBrandData(state.activeBrand, { shortDesc: event.target.value })
                            }
                          />
                        </Field>

                        <div className={`${styles.fieldGrid} ${styles.cols2}`} style={{ marginTop: 0 }}>
                          <div className={styles.toggleRow}>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={activeBrand.brandActive}
                                onChange={(event) =>
                                  setBrandData(state.activeBrand, { brandActive: event.target.checked })
                                }
                              />
                              <span className={styles.switchTrack}>
                                <span className={styles.switchThumb} />
                              </span>
                            </label>
                            <div>
                              <div className={styles.toggleTitle}>Brand page is active</div>
                              <div className={styles.toggleSub}>Show this brand's page on the frontend.</div>
                            </div>
                          </div>

                          <div className={styles.toggleRow}>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={activeBrand.featured}
                                onChange={(event) =>
                                  setBrandData(state.activeBrand, { featured: event.target.checked })
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

                        <Field label="Brand icon">
                          <label
                            className={styles.optionCard}
                            style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                          >
                            <span
                              className={styles.avatar}
                              style={{
                                background: activeBrand.icon
                                  ? normalizedBrands.find((brand) => brand.id === state.activeBrand)?.color
                                  : "var(--field)",
                              }}
                            >
                              {activeBrand.icon ? (
                                normalizedBrands.find((brand) => brand.id === state.activeBrand)?.short
                              ) : (
                                <ImageIcon size={18} />
                              )}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>
                                {activeBrand.icon ? "Uploaded icon" : "Upload an icon"}
                              </div>
                              <div className={styles.brandMeta}>PNG, JPG, WEBP, or SVG, square preferred</div>
                            </div>
                            <span style={{ flex: 1 }} />
                            <span className={`${styles.button} ${styles.buttonGhost}`} style={{ height: 36 }}>
                              {uploadingIcon ? "Uploading..." : "Choose file"}
                            </span>
                            <input type="file" hidden onChange={handleIconUpload} />
                          </label>
                        </Field>
                      </div>
                    ) : null}

                    {tab === "page" ? (
                      <div className={`${styles.fadeIn} ${styles.contentStack}`}>
                        <Field label="Intro heading" hint="Optional section heading above the rich body.">
                          <input
                            className={styles.input}
                            value={activeBrand.page.intro}
                            onChange={(event) =>
                              dispatch({
                                type: "set_brand_page",
                                brandId: state.activeBrand,
                                patch: { intro: event.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label="Page body" hint={`Rich content for the brand's ${singularLabel} landing page.`}>
                          <textarea
                            className={styles.textarea}
                            rows={9}
                            value={activeBrand.page.body}
                            onChange={(event) =>
                              dispatch({
                                type: "set_brand_page",
                                brandId: state.activeBrand,
                                patch: { body: event.target.value },
                              })
                            }
                          />
                        </Field>
                      </div>
                    ) : null}

                    {tab === "faqs" ? (
                      <div className={styles.fadeIn}>
                        <div className={styles.contentStack} style={{ gap: 12 }}>
                          {activeBrand.faqs.map((faq, index) => (
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
                                    const next = activeBrand.faqs.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, q: event.target.value } : item
                                    );
                                    setBrandData(state.activeBrand, { faqs: next });
                                  }}
                                />
                                <textarea
                                  className={styles.textarea}
                                  rows={2}
                                  value={faq.a}
                                  placeholder="Answer"
                                  onChange={(event) => {
                                    const next = activeBrand.faqs.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, a: event.target.value } : item
                                    );
                                    setBrandData(state.activeBrand, { faqs: next });
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                className={styles.repeatDelete}
                                onClick={() =>
                                  setBrandData(state.activeBrand, {
                                    faqs: activeBrand.faqs.filter((_, itemIndex) => itemIndex !== index),
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
                            setBrandData(state.activeBrand, {
                              faqs: [...activeBrand.faqs, { q: "", a: "" }],
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
                        <Field label="SEO title" hint={`${(activeBrand.meta.title || "").length}/60 characters`}>
                          <input
                            className={styles.input}
                            value={activeBrand.meta.title}
                            onChange={(event) =>
                              dispatch({
                                type: "set_brand_meta",
                                brandId: state.activeBrand,
                                patch: { title: event.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label="Meta description" hint={`${(activeBrand.meta.description || "").length}/160 characters`}>
                          <textarea
                            className={styles.textarea}
                            rows={3}
                            value={activeBrand.meta.description}
                            onChange={(event) =>
                              dispatch({
                                type: "set_brand_meta",
                                brandId: state.activeBrand,
                                patch: { description: event.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label="Keywords" hint="Comma-separated.">
                          <input
                            className={styles.input}
                            value={activeBrand.meta.keywords}
                            onChange={(event) =>
                              dispatch({
                                type: "set_brand_meta",
                                brandId: state.activeBrand,
                                patch: { keywords: event.target.value },
                              })
                            }
                          />
                        </Field>
                      </div>
                    ) : null}

                  </>
                )}
              </div>
            ) : null}

            {state.step === 3 ? (
              <div className={styles.fadeIn}>
                <h2 className={styles.sectionTitle}>Review &amp; create</h2>
                <p className={styles.sectionSub}>
                  One action creates the {singularLabel} record and all brand content together.
                </p>
                <div className={styles.reviewGrid}>
                  <ReviewCard
                    icon={<MapPin size={20} />}
                    title={state.draft.name || `Untitled ${singularLabel}`}
                    subtitle="Base location record"
                    onEdit={() => goStep(0)}
                  >
                    <dl className={styles.kv}>
                      <dt>Slug</dt>
                      <dd className={styles.kvMono}>/{state.draft.slug || "—"}</dd>
                      {shouldShowTag ? (
                        <>
                          <dt>{titleLabel} tag</dt>
                          <dd className={styles.kvMono}>{state.draft.tag || "—"}</dd>
                        </>
                      ) : null}
                      <dt>Roles</dt>
                      <dd>
                        {selectedRoles.length
                          ? selectedRoles.map((selectedRole) => roleTitle(selectedRole)).join(", ")
                          : "-"}
                      </dd>
                      <dt>Parent</dt>
                      <dd>{activeParent?.name || "—"}</dd>
                      <dt>Market type</dt>
                      <dd>{state.draft.market.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())}</dd>
                      <dt>Display mode</dt>
                      <dd>{LOCATION_DISPLAY_MODE_LABELS[state.draft.display]}</dd>
                    </dl>
                  </ReviewCard>

                  <ReviewCard
                    icon={<Layers3 size={20} />}
                    title={`${state.draft.brands.length} brand${state.draft.brands.length === 1 ? "" : "s"} configured`}
                    subtitle="Per-brand content & overrides"
                    onEdit={() => goStep(1)}
                  >
                    <div className={styles.contentStack} style={{ gap: 12 }}>
                      {state.draft.brands.map((brandId) => {
                        const brand = normalizedBrands.find((item) => item.id === brandId);
                        const brandData = state.draft.brandData[brandId];
                        if (!brand) return null;
                        const ready = Boolean(brandData?.heading.trim());
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
                                <div className={styles.brandMeta}>{brandData?.heading || "Heading not set"}</div>
                              </div>
                            </div>
                            <span className={`${styles.badge} ${ready ? styles.badgeActive : styles.badgeAmber}`}>
                              {ready ? "Ready" : "Needs heading"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ReviewCard>
                </div>
              </div>
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
              ) : null}
              <span className={styles.grow} />
              {state.step < 3 ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={!canNext}
                  onClick={() => goStep(state.step + 1)}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={loading}
                  onClick={handleComplete}
                >
                  {loading ? "Creating..." : `Create ${titleLabel}`}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.side}>
          <div className={styles.contentStack} style={{ gap: 20 }}>
            <div className={`${styles.panel} ${styles.cardPad}`}>
              <div className={styles.eyebrow} style={{ color: "var(--ink-2)", letterSpacing: ".5px" }}>
                Live summary
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryKey}>Name</div>
                <div className={`${styles.summaryValue} ${!state.draft.name ? styles.summaryValueEmpty : ""}`}>
                  {state.draft.name || "Not set"}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryKey}>Slug</div>
                <div className={`${styles.summaryValue} ${styles.summaryValueMono} ${!state.draft.slug ? styles.summaryValueEmpty : ""}`}>
                  {state.draft.slug ? `/${state.draft.slug}` : "—"}
                </div>
              </div>
              {shouldShowTag ? (
                <div className={styles.summaryItem}>
                  <div className={styles.summaryKey}>{titleLabel} tag</div>
                  <div className={`${styles.summaryValue} ${!state.draft.tag ? styles.summaryValueEmpty : ""}`}>
                    {state.draft.tag || "—"}
                  </div>
                </div>
              ) : null}
              <div className={styles.summaryItem}>
                <div className={styles.summaryKey}>Roles</div>
                <div className={`${styles.summaryValue} ${!selectedRoles.length ? styles.summaryValueEmpty : ""}`}>
                  {selectedRoles.length
                    ? selectedRoles.map((selectedRole) => roleTitle(selectedRole)).join(", ")
                    : "Not set"}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryKey}>Parent</div>
                <div className={`${styles.summaryValue} ${!activeParent ? styles.summaryValueEmpty : ""}`}>
                  {activeParent?.name || "Not set"}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryKey}>Frontend behavior</div>
                <div className={styles.summaryValue} style={{ fontSize: 14 }}>
                  {LOCATION_DISPLAY_MODE_HELPERS[state.draft.display]}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
