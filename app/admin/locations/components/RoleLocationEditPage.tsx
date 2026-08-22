"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Info,
  Layers3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadLocationIconAction } from "@/actions/imageActions";
import { resolveImageSrc } from "@/utils/image";
import {
  addBrandToLocation,
  deleteLocation,
  deleteLocationBrand,
  updateLocation,
} from "@/actions/locationActions";
import {
  LOCATION_DISPLAY_MODE_HELPERS,
  LOCATION_DISPLAY_MODE_LABELS,
  LOCATION_DISPLAY_MODE_OPTIONS,
  LOCATION_MARKET_TYPE_OPTIONS,
  LOCATION_ROLE_OPTIONS,
} from "@/constants/locations";
import {
  getAllowedParentOptions,
  validateLocationParentRoles,
} from "@/lib/locationValidation";
import type {
  BrandLocationDetail,
  LocationDetail,
  LocationDisplayMode,
  LocationMarketType,
  LocationOption,
  LocationRole,
} from "@/types/locations";
import { NearbyPicker } from "./NearbyPicker";
import wizardStyles from "../states/create/CreateStateWizard.module.css";
import styles from "../states/[id]/StateEditPage.module.css";

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

type EditModel = {
  name: string;
  slug: string;
  tag: string;
  parentId: string;
  market: LocationMarketType;
  display: LocationDisplayMode;
  active: boolean;
  roles: Record<string, boolean>;
  nearby: string[];
  brandData: Record<string, BrandContent>;
};

type RoleLocationEditPageProps = {
  data: LocationDetail;
  brands: Array<{ id: string; name: string }>;
  locationOptions: LocationOption[];
  role: LocationRole;
  singularLabel: string;
  pluralLabel: string;
  backHref: string;
  showLocationTag?: boolean;
  allowedCombinations?: readonly (readonly LocationRole[])[];
};

const BRAND_COLORS = ["#2f6df6", "#8b5cf6", "#18b981", "#e0a23a", "#06b6d4", "#ef4655"];

const SUB_TABS = [
  { id: "detail", label: "Detail", icon: Pencil },
  { id: "page", label: "Page content", icon: Layers3, opt: true },
  { id: "faqs", label: "FAQs", icon: HelpCircle, opt: true },
  { id: "meta", label: "Metadata", icon: Tag, opt: true },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

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

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

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

function comboKey(combo: readonly LocationRole[]) {
  return [...combo].join("|");
}

function createRoleRecord(selectedRoles: readonly LocationRole[]) {
  return Object.fromEntries(
    ["state", "city", "destination", "region", "area", "locality"].map((role) => [
      titleCase(role as LocationRole),
      selectedRoles.includes(role as LocationRole),
    ])
  ) as Record<string, boolean>;
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

function detailToBrandContent(
  detail: BrandLocationDetail | undefined,
  baseSlug: string
): BrandContent {
  if (!detail) {
    return { ...blankBrand(), slugOverride: baseSlug };
  }

  return {
    slugOverride: detail.slug ?? "",
    weight: detail.weight?.toString() ?? "0.00",
    heading: detail.heading ?? "",
    shortDesc: detail.description ?? "",
    brandActive: detail.isActive ?? true,
    featured: detail.featured ?? false,
    icon: detail.icon ?? null,
    page: {
      intro: detail.info?.title ?? "",
      body: detail.info?.description ?? "",
    },
    faqs:
      detail.faqs?.map((faq) => ({
        q: faq.question ?? "",
        a: faq.answer ?? "",
      })) ?? [],
    meta: {
      title: detail.meta?.metaTitle ?? "",
      description: detail.meta?.metaDescription ?? "",
      keywords: detail.meta?.metaKeywords ?? "",
    },
  };
}

function buildInitialModel(
  data: LocationDetail,
  brands: BrandSeed[],
  showLocationTag: boolean
): EditModel {
  const roles = Object.fromEntries(
    LOCATION_ROLE_OPTIONS.map((role) => [
      titleCase(role),
      Boolean(data.locationRoles?.includes(role as LocationRole)),
    ])
  );
  const detailsByBrandId = new Map((data.brandDetails ?? []).map((detail) => [detail.brandId, detail]));
  const requiresTag =
    showLocationTag ||
    Boolean(data.locationRoles?.includes("state")) ||
    Boolean(data.locationRoles?.includes("city"));
  const brandData = Object.fromEntries(
    (data.configuredBrandIds ?? [])
      .filter((brandId) => brands.some((brand) => brand.id === brandId))
      .map((brandId) => [
        brandId,
        detailToBrandContent(detailsByBrandId.get(brandId), data.slug),
      ])
  );

  return {
    name: data.name,
    slug: data.slug,
    tag: requiresTag ? data.locationTag ?? "" : "",
    parentId: data.parentId ?? "",
    market: data.marketType,
    display: data.displayMode,
    active: data.isActive,
    roles,
    nearby: (data.nearbyMappings?.map((m) => m.nearbyLocationId).filter(Boolean) ?? []) as string[],
    brandData,
  };
}

function toFaqPayload(items: Array<{ q: string; a: string }>) {
  return items
    .filter((item) => item.q.trim() && item.a.trim())
    .map((item, index) => ({
      question: item.q.trim(),
      answer: item.a.trim(),
      isActive: true,
      weight: index + 1,
    }));
}

function buildBaseFormData(model: EditModel, showLocationTag: boolean) {
  const formData = new FormData();
  const selectedRoles = LOCATION_ROLE_OPTIONS.filter((role) => model.roles[titleCase(role)]);
  formData.set("name", model.name.trim());
  formData.set("slug", slugify(model.slug));
  formData.set("locationTag", showLocationTag ? model.tag.trim().toUpperCase() : "");
  formData.set("locationRoles", JSON.stringify(selectedRoles));
  formData.set("parentId", model.parentId || "");
  formData.set("marketType", model.market);
  formData.set("displayMode", model.display);
  formData.set("isActive", model.active ? "true" : "false");
  formData.set(
    "nearbyMappings",
    JSON.stringify(
      model.nearby.map((nearbyLocationId, index) => ({
        nearbyLocationId,
        sortOrder: String(index),
      }))
    )
  );
  return formData;
}

function buildBrandFormData(
  model: EditModel,
  brandId: string,
  showLocationTag: boolean
) {
  const formData = buildBaseFormData(model, showLocationTag);
  const brand = model.brandData[brandId] ?? blankBrand();
  formData.set("brandId", brandId);
  formData.set("brandSlug", slugify(brand.slugOverride || model.slug));
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

function Avatar({ brand, size = "md" }: { brand: BrandSeed; size?: "sm" | "md" }) {
  return (
    <span
      className={`${wizardStyles.avatar} ${size === "sm" ? wizardStyles.avatarSm : ""}`}
      style={{ background: brand.color }}
    >
      {brand.short}
    </span>
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
    <div className={wizardStyles.field}>
      <label className={wizardStyles.fieldLabel}>{label}</label>
      {hint && !hintBelow ? <div className={wizardStyles.hint}>{hint}</div> : null}
      {children}
      {hint && hintBelow ? <div className={wizardStyles.hint}>{hint}</div> : null}
    </div>
  );
}

function ToggleRow({
  title,
  sub,
  checked,
  onChange,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={wizardStyles.toggleRow}>
      <label className={wizardStyles.switch}>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className={wizardStyles.switchTrack}>
          <span className={wizardStyles.switchThumb} />
        </span>
      </label>
      <div>
        <div className={wizardStyles.toggleTitle}>{title}</div>
        <div className={wizardStyles.toggleSub}>{sub}</div>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "active" | "muted" | "amber" | "blue";
}) {
  const toneClass =
    tone === "active"
      ? wizardStyles.badgeActive
      : tone === "amber"
        ? wizardStyles.badgeAmber
        : tone === "blue"
          ? wizardStyles.badgeBlue
          : wizardStyles.badgeMuted;
  return <span className={`${wizardStyles.badge} ${toneClass}`}>{children}</span>;
}

export default function RoleLocationEditPage({
  data,
  brands,
  locationOptions,
  role,
  singularLabel,
  pluralLabel,
  backHref,
  showLocationTag = true,
  allowedCombinations,
}: RoleLocationEditPageProps) {
  const router = useRouter();
  const normalizedBrands = useMemo<BrandSeed[]>(
    () =>
      brands.map((brand, index) => ({
        ...brand,
        short: shortCode(brand.name),
        color: BRAND_COLORS[index % BRAND_COLORS.length]!,
        category: index % 2 === 0 ? "Managed farmland" : "City apartments",
      })),
    [brands]
  );
  const [model, setModel] = useState(() => buildInitialModel(data, normalizedBrands, showLocationTag));
  const [snapshot, setSnapshot] = useState(() =>
    JSON.stringify(buildInitialModel(data, normalizedBrands, showLocationTag))
  );
  const [scope, setScope] = useState<"base" | string>("base");
  const [tab, setTab] = useState<SubTabId>("detail");
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const addWrapRef = useRef<HTMLDivElement>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [loading, startTransition] = useTransition();

  const dirty = snapshot !== JSON.stringify(model);
  const activeBrandId = scope === "base" ? "" : scope;
  const activeBrand = activeBrandId ? normalizedBrands.find((brand) => brand.id === activeBrandId) : null;
  const activeBrandData = activeBrandId ? model.brandData[activeBrandId] ?? blankBrand() : null;
  const titleLabel = singularLabel[0].toUpperCase() + singularLabel.slice(1);

  const brandIds = Object.keys(model.brandData);
  const availableBrands = normalizedBrands.filter((brand) => !brandIds.includes(brand.id));
  const allowedRoleCombinations = useMemo(
    () =>
      (allowedCombinations?.length
        ? allowedCombinations
        : [[role] as const]) as readonly (readonly LocationRole[])[],
    [allowedCombinations, role]
  );
  const selectedRoles = LOCATION_ROLE_OPTIONS.filter((item) => model.roles[titleCase(item)]);
  const activeRoleComboKey = comboKey(selectedRoles as LocationRole[]);
  const shouldShowTag =
    showLocationTag ||
    selectedRoles.includes("state") ||
    selectedRoles.includes("city");
  const parentOptions = useMemo(
    () => getAllowedParentOptions(selectedRoles as LocationRole[], locationOptions, data.id).filter((item) => item.isActive),
    [selectedRoles, locationOptions, data.id]
  );
  const parent = locationOptions.find((item) => item.id === model.parentId);
  const nearbyOptions = useMemo(
    () => {
      const primaryNearbyRole =
        (selectedRoles.find((selectedRole) => selectedRole !== "destination") as LocationRole | undefined) ??
        role;
      return locationOptions.filter(
        (option) =>
          option.isActive &&
          option.id !== data.id &&
          option.locationRoles.includes(primaryNearbyRole)
      );
    },
    [locationOptions, role, data.id, selectedRoles]
  );

  const setBrand = (brandId: string, patch: Partial<BrandContent>) =>
    setModel((current) => ({
      ...current,
      brandData: {
        ...current.brandData,
        [brandId]: {
          ...current.brandData[brandId],
          ...patch,
        },
      },
    }));

  const isComplete = (brandId: string) => Boolean(model.brandData[brandId]?.heading.trim());

  const handleSelectCombination = (combo: readonly LocationRole[]) => {
    setModel((current) => {
      const nextParentOptions = getAllowedParentOptions(combo, locationOptions, data.id);
      const nextParentId = nextParentOptions.some((option) => option.id === current.parentId)
        ? current.parentId
        : "";
      return {
        ...current,
        roles: createRoleRecord(combo),
        parentId: nextParentId,
      };
    });
  };

  useEffect(() => {
    if (!menuOpen && !addOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuOpen && menuWrapRef.current && !menuWrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (addOpen && addWrapRef.current && !addWrapRef.current.contains(event.target as Node)) {
        setAddOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, addOpen]);

  const handleAddBrand = (brandId: string) => {
    setModel((current) => ({
      ...current,
      brandData: {
        ...current.brandData,
        [brandId]: blankBrand(),
      },
    }));
    setScope(brandId);
    setTab("detail");
    setAddOpen(false);
  };

  const handleRemoveBrand = (brandId: string) => {
    setModel((current) => {
      const nextBrandData = { ...current.brandData };
      delete nextBrandData[brandId];
      return { ...current, brandData: nextBrandData };
    });
    if (scope === brandId) setScope("base");
  };

  const handleDiscard = () => {
    const parsed = JSON.parse(snapshot) as EditModel;
    setModel(parsed);
    setScope("base");
    setTab("detail");
    toast.success("Changes discarded.");
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeBrand) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/webp", "image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, WEBP, or SVG icon.");
      return;
    }
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locationType", role);
      formData.append("brandName", activeBrand.name);
      formData.append("locationId", data.id);
      const result = await uploadLocationIconAction(formData);
      if (!result.success) throw new Error(result.error || "Failed to upload icon.");
      setBrand(activeBrand.id, { icon: result.success.path });
      toast.success("Brand icon uploaded.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload icon.");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSave = () => {
    const parentRoles = parentOptions.find((option) => option.id === model.parentId)?.locationRoles ?? null;
    const validation = validateLocationParentRoles(
      selectedRoles as LocationRole[],
      parentRoles,
      shouldShowTag ? model.tag : null
    );
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    startTransition(async () => {
      try {
        const snapshotModel = JSON.parse(snapshot) as EditModel;
        const previousBrandIds = Object.keys(snapshotModel.brandData);
        const currentBrandIds = Object.keys(model.brandData);
        const removedBrandIds = previousBrandIds.filter((brandId) => !currentBrandIds.includes(brandId));
        const addedBrandIds = currentBrandIds.filter((brandId) => !previousBrandIds.includes(brandId));

        await updateLocation(data.id, buildBaseFormData(model, shouldShowTag));
        for (const brandId of addedBrandIds) {
          await addBrandToLocation(data.id, brandId);
        }
        for (const brandId of currentBrandIds) {
          await updateLocation(data.id, buildBrandFormData(model, brandId, shouldShowTag));
        }
        for (const brandId of removedBrandIds) {
          await deleteLocationBrand(data.id, brandId);
        }

        const nextSnapshot = JSON.stringify(model);
        setSnapshot(nextSnapshot);
        setToastMessage("Changes saved");
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || `Failed to save ${singularLabel}.`);
      }
    });
  };

  const handleDelete = () => {
    const children = locationOptions.filter((loc) => loc.parentId === data.id);

    if (children.length > 0) {
      window.alert(
        `Cannot delete "${model.name}".\n\nThis ${singularLabel} has ${children.length} child location(s) that must be removed first:\n${children.map((c) => `• ${c.name}`).join("\n")}`
      );
      return;
    }

    const brandCount = data.brandDetails?.length ?? 0;
    const nearbyCount = data.nearbyMappings?.length ?? 0;
    const cascadeLines: string[] = [];
    if (brandCount > 0) cascadeLines.push(`${brandCount} brand association(s)`);
    if (nearbyCount > 0) cascadeLines.push(`${nearbyCount} nearby mapping(s)`);

    const confirmMsg =
      cascadeLines.length > 0
        ? `Delete "${model.name}"?\n\nThe following will also be permanently removed:\n${cascadeLines.map((l) => `• ${l}`).join("\n")}\n\nThis cannot be undone.`
        : `Delete "${model.name}"? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        await deleteLocation(data.id);
        toast.success(`${titleLabel} deleted successfully.`);
        router.push(backHref);
      } catch (error: any) {
        toast.error(error?.message || `Failed to delete ${singularLabel}.`);
      }
    });
  };

  const currentDisplayBehavior = LOCATION_DISPLAY_MODE_HELPERS[model.display] ?? LOCATION_DISPLAY_MODE_HELPERS.mixed;

  return (
    <div className={styles.editRoot} style={{ paddingBottom: dirty ? 96 : 0 }}>

      <div className={wizardStyles.fadeIn}>
        <div
          className={wizardStyles.rowWrap}
          style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}
        >
          <div>
            <div className={wizardStyles.eyebrow}>Edit {singularLabel}</div>
            <div className={wizardStyles.rowWrap} style={{ gap: 16, alignItems: "center", marginTop: 8 }}>
              <h1 className={wizardStyles.pageTitle} style={{ margin: 0 }}>
                {model.name}
              </h1>
              <Badge tone={model.active ? "active" : "muted"}>{model.active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className={wizardStyles.crumbs}>
              <span>Dashboard</span>
              <ChevronRight size={13} />
              <span>{pluralLabel}</span>
              <ChevronRight size={13} />
              <span className={wizardStyles.crumbNow}>{model.name}</span>
            </div>
          </div>

          <div className={wizardStyles.rowWrap} style={{ gap: 12 }}>
            <button
              type="button"
              className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
              onClick={() => router.push(backHref)}
            >
              <ArrowLeft size={16} />
              {pluralLabel}
            </button>
            <div className={styles.menuWrap} ref={menuWrapRef}>
              <button
                type="button"
                className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
                style={{ width: 48, paddingInline: 0 }}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen ? (
                <div className={styles.menu}>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.dangerMenuItem}`}
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} />
                    Delete {singularLabel}
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={`${wizardStyles.button} ${wizardStyles.buttonPrimary}`}
              onClick={handleSave}
              disabled={!dirty || loading}
            >
              <Check size={16} />
              Save changes
            </button>
          </div>
        </div>

        <div className={styles.scopeBar}>
          <button
            type="button"
            className={`${styles.scopeButton} ${scope === "base" ? styles.scopeBaseActive : ""}`}
            onClick={() => setScope("base")}
          >
            <MapPin size={16} />
            Base {singularLabel}
          </button>
          <span className={styles.scopeDivider} />
          {brandIds.map((brandId) => {
            const brand = normalizedBrands.find((item) => item.id === brandId);
            if (!brand) return null;
            return (
              <button
                key={brandId}
                type="button"
                className={`${styles.scopeButton} ${scope === brandId ? styles.scopeBrandActive : ""}`}
                onClick={() => {
                  setScope(brandId);
                  setTab("detail");
                }}
              >
                <Avatar brand={brand} size="sm" />
                {brand.name}
                <span className={isComplete(brandId) ? styles.scopeButtonCompleteDot : styles.scopeButtonDot} />
              </button>
            );
          })}
          <span className={styles.scopeSpacer} />
          <div className={styles.scopeAddWrap} ref={addWrapRef}>
            <button type="button" className={styles.scopeAdd} onClick={() => setAddOpen((value) => !value)}>
              <Plus size={16} />
              Add brand
            </button>
            {addOpen ? (
              <div className={styles.popover}>
                <div className={styles.popoverHeader}>Add a brand to {model.name}</div>
                {availableBrands.length === 0 ? (
                  <div className={styles.popoverEmpty}>All brands are already configured.</div>
                ) : null}
                {availableBrands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    className={styles.popoverItem}
                    onClick={() => handleAddBrand(brand.id)}
                  >
                    <Avatar brand={brand} size="sm" />
                    <div>
                      <div className={styles.popoverName}>{brand.name}</div>
                      <div className={styles.popoverCategory}>{brand.category}</div>
                    </div>
                    <span style={{ flex: 1 }} />
                    <Plus size={15} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {scope === "base" ? (
          <div className={`${wizardStyles.fadeIn} ${styles.baseLayout}`}>
            <div className={`${styles.baseMain} ${wizardStyles.contentStack}`} style={{ gap: 20 }}>
              <div className={`${wizardStyles.card} ${wizardStyles.cardPad}`}>
                <h2 className={wizardStyles.sectionTitle}>Base details</h2>
                <p className={wizardStyles.sectionSub}>
                  Shared across the frontend and admin. Brands inherit these unless they override below.
                </p>

                <div className={wizardStyles.fieldGrid} style={{ marginTop: 20 }}>
                  <div className={`${wizardStyles.fieldGrid} ${wizardStyles.cols2}`} style={{ marginTop: 0 }}>
                    <Field label="Name">
                      <input
                        className={wizardStyles.input}
                        value={model.name}
                        onChange={(event) =>
                          setModel((current) => ({
                            ...current,
                            name: event.target.value,
                            slug: current.slug === slugify(current.name) ? slugify(event.target.value) : current.slug,
                            tag:
                              shouldShowTag && current.tag === tagify(current.name)
                                ? tagify(event.target.value)
                                : current.tag,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Base slug" hint="Default frontend URL slug before any brand override." hintBelow>
                      <div className={wizardStyles.inputPrefixWrap}>
                        <span className={wizardStyles.inputPrefix}>/</span>
                        <input
                          className={`${wizardStyles.input} ${wizardStyles.inputMono} ${wizardStyles.inputPrefixed}`}
                          value={model.slug}
                          onChange={(event) => setModel((current) => ({ ...current, slug: slugify(event.target.value) }))}
                        />
                      </div>
                    </Field>
                  </div>

                  <div className={`${wizardStyles.fieldGrid} ${wizardStyles.cols2}`} style={{ marginTop: 0 }}>
                    {shouldShowTag ? (
                      <Field label={`${titleLabel} tag`} hint="Unique 3-letter uppercase code." hintBelow>
                        <input
                          className={`${wizardStyles.input} ${wizardStyles.inputMono}`}
                          value={model.tag}
                          maxLength={3}
                          onChange={(event) =>
                            setModel((current) => ({
                              ...current,
                              tag: event.target.value.toUpperCase().slice(0, 3),
                            }))
                          }
                        />
                      </Field>
                    ) : (
                      <Field
                        label={role === "area" ? "Parent location" : "Parent state"}
                        hint={role === "area" ? "Choose the city or region this area belongs to." : "Choose the state this city belongs to."}
                        hintBelow
                      >
                        <select
                          className={wizardStyles.select}
                          value={model.parentId}
                          onChange={(event) => setModel((current) => ({ ...current, parentId: event.target.value }))}
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
                        className={wizardStyles.select}
                        value={model.market}
                        onChange={(event) =>
                          setModel((current) => ({
                            ...current,
                            market: event.target.value as LocationMarketType,
                          }))
                        }
                      >
                        {LOCATION_MARKET_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {titleCase(option)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {shouldShowTag ? (
                    <Field
                      label={role === "city" ? "Parent state" : "Parent location"}
                      hint={role === "city" ? "Choose the state this city belongs to." : "Choose the parent location for this record."}
                      hintBelow
                    >
                      <select
                        className={wizardStyles.select}
                        value={model.parentId}
                        onChange={(event) => setModel((current) => ({ ...current, parentId: event.target.value }))}
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

                  <Field label="Display mode" hint={LOCATION_DISPLAY_MODE_HELPERS[model.display]} hintBelow>
                    <select
                      className={wizardStyles.select}
                      value={model.display}
                      onChange={(event) =>
                        setModel((current) => ({
                          ...current,
                          display: event.target.value as LocationDisplayMode,
                        }))
                      }
                    >
                      {LOCATION_DISPLAY_MODE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {LOCATION_DISPLAY_MODE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className={`${wizardStyles.card} ${wizardStyles.cardPad}`}>
                <h2 className={wizardStyles.sectionTitle}>Classification</h2>
                <p className={wizardStyles.sectionSub}>
                  A paired role also makes this entry appear under that paired location type in admin and frontend.
                </p>
                {allowedRoleCombinations.length > 1 ? (
                  <div
                    className={styles.options3}
                    style={{ marginTop: 20, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
                  >
                    {allowedRoleCombinations.map((combo) => {
                      const selected = comboKey(combo) === activeRoleComboKey;
                      return (
                        <button
                          key={comboKey(combo)}
                          type="button"
                          className={`${wizardStyles.optionCard} ${selected ? wizardStyles.optionSelected : ""}`}
                          onClick={() => handleSelectCombination(combo)}
                        >
                          <div className={wizardStyles.optionTitle}>{combo.map(titleCase).join(" + ")}</div>
                          <div className={wizardStyles.optionDesc}>
                            {combo.includes("destination")
                              ? "Destination-enabled configuration."
                              : "Pure structural configuration."}
                          </div>
                          <span className={wizardStyles.optionCheck}>
                            <Check size={14} strokeWidth={3} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.classGrid} style={{ marginTop: 20 }}>
                    {selectedRoles.map((roleOption) => {
                      const label = titleCase(roleOption);
                      return (
                        <div key={roleOption} className={`${styles.classCard} ${styles.classCardOn}`}>
                          <span className={styles.classBox}>
                            <Check size={13} strokeWidth={3} />
                          </span>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${wizardStyles.card} ${wizardStyles.cardPad}`}>
                <div className={wizardStyles.rowWrap} style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2 className={wizardStyles.sectionTitle}>Brands in this {singularLabel}</h2>
                    <p className={wizardStyles.sectionSub}>
                      {brandIds.length} configured. Open one to edit its content, FAQs and SEO.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  {brandIds.length === 0 ? (
                    <div className={`${wizardStyles.banner} ${wizardStyles.bannerBlue}`}>
                      <span className={wizardStyles.bannerIcon}>
                        <Info size={18} />
                      </span>
                      <div>
                        <div className={wizardStyles.bannerTitle}>No brands yet</div>
                        <div className={wizardStyles.bannerBody}>
                          Use &ldquo;Add brand&rdquo; above to give a brand its own experience here.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {brandIds.map((brandId) => {
                    const brand = normalizedBrands.find((item) => item.id === brandId);
                    const brandData = model.brandData[brandId];
                    if (!brand || !brandData) return null;
                    return (
                      <div key={brandId} className={styles.brandsOverviewRow}>
                        <Avatar brand={brand} />
                        <div style={{ flex: 1 }}>
                          <div className={styles.brandsOverviewName}>{brand.name}</div>
                          <div className={styles.brandsOverviewSub}>/{brandData.slugOverride || model.slug}</div>
                        </div>
                        <div className={wizardStyles.rowWrap} style={{ gap: 12 }}>
                          <Badge tone={brandData.brandActive ? "active" : "muted"}>
                            {brandData.brandActive ? "Live" : "Hidden"}
                          </Badge>
                          {brandData.featured ? <Badge tone="amber">Featured</Badge> : null}
                          <Badge tone={isComplete(brandId) ? "blue" : "amber"}>
                            {isComplete(brandId) ? "Ready" : "Needs heading"}
                          </Badge>
                          <button
                            type="button"
                            className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
                            style={{ height: 36 }}
                            onClick={() => {
                              setScope(brandId);
                              setTab("detail");
                            }}
                          >
                            Open
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {nearbyOptions.length > 0 ? (
                <div className={`${wizardStyles.card} ${wizardStyles.cardPad}`}>
                  <h2 className={wizardStyles.sectionTitle}>Nearby {pluralLabel}</h2>
                  <p className={wizardStyles.sectionSub}>
                    Link nearby {pluralLabel.toLowerCase()} to cross-promote on the frontend. This is shared across all brands.
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <NearbyPicker
                      options={nearbyOptions}
                      selected={model.nearby}
                      onChange={(next) =>
                        setModel((current) => ({ ...current, nearby: next }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <aside className={`${styles.baseSide} ${wizardStyles.contentStack}`} style={{ gap: 20 }}>
              <div className={`${wizardStyles.panel} ${wizardStyles.cardPad}`}>
                <h3 className={wizardStyles.sectionTitle} style={{ fontSize: 15 }}>
                  Status
                </h3>
                <p className={wizardStyles.sectionSub}>Controls whether the base location is live on the frontend.</p>
                <div style={{ marginTop: 16 }}>
                  <ToggleRow
                    title={`Base ${singularLabel} is active`}
                    sub="Inactive keeps it in admin only."
                    checked={model.active}
                    onChange={(value) => setModel((current) => ({ ...current, active: value }))}
                  />
                </div>
              </div>

              <div className={`${wizardStyles.panel} ${wizardStyles.cardPad}`}>
                <div className={wizardStyles.summaryItem} style={{ paddingTop: 0 }}>
                  <div className={wizardStyles.summaryKey}>Frontend URL</div>
                  <div className={`${wizardStyles.summaryValue} ${wizardStyles.summaryValueMono}`}>/{model.slug}</div>
                </div>
                <div className={wizardStyles.summaryItem}>
                  <div className={wizardStyles.summaryKey}>Parent</div>
                  <div className={wizardStyles.summaryValue} style={{ fontSize: 14 }}>
                    {parent?.name || "Not set"}
                  </div>
                </div>
                <div className={wizardStyles.summaryItem}>
                  <div className={wizardStyles.summaryKey}>Display behavior</div>
                  <div className={wizardStyles.summaryValue} style={{ fontSize: 14 }}>
                    {currentDisplayBehavior}
                  </div>
                </div>
                <div className={wizardStyles.summaryItem} style={{ paddingBottom: 0 }}>
                  <div className={wizardStyles.summaryKey}>Brands</div>
                  <div className={wizardStyles.rowWrap} style={{ gap: 6, marginTop: 8 }}>
                    {brandIds.length ? (
                      brandIds.map((brandId) => {
                        const brand = normalizedBrands.find((item) => item.id === brandId);
                        return brand ? <Avatar key={brandId} brand={brand} size="sm" /> : null;
                      })
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>None</span>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : activeBrand && activeBrandData ? (
          <div className={`${wizardStyles.fadeIn} ${wizardStyles.card} ${wizardStyles.cardPad}`}>
            <div className={`${wizardStyles.banner} ${wizardStyles.bannerEmerald}`} style={{ marginBottom: 22 }}>
              <span className={wizardStyles.bannerIcon} style={{ color: "var(--emerald)" }}>
                <Zap size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className={wizardStyles.bannerRow}>
                  <div className={wizardStyles.bannerEmeraldTitle}>
                    Editing the {activeBrand.name} experience
                  </div>
                  <Badge tone="active">Brand override active</Badge>
                </div>
                <div className={wizardStyles.bannerBody}>
                  These changes apply only to {activeBrand.name} for {model.name}. The base record is untouched.
                </div>
              </div>
            </div>

            <div className={wizardStyles.subTabs}>
              {SUB_TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${wizardStyles.subTab} ${active ? wizardStyles.subTabActive : ""}`}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon size={15} />
                    {item.label}
                    {"opt" in item ? <span className={wizardStyles.optTag}>opt</span> : null}
                  </button>
                );
              })}
            </div>

            {tab === "detail" ? (
              <div className={`${wizardStyles.fadeIn} ${wizardStyles.contentStack}`}>
                <div className={`${wizardStyles.fieldGrid} ${wizardStyles.cols2}`} style={{ marginTop: 0 }}>
                  <Field label="Brand slug override" hint={`Defaults to /${model.slug || "slug"} if left empty.`}>
                    <div className={wizardStyles.inputPrefixWrap}>
                      <span className={wizardStyles.inputPrefix}>/</span>
                      <input
                        className={`${wizardStyles.input} ${wizardStyles.inputMono} ${wizardStyles.inputPrefixed}`}
                        value={activeBrandData.slugOverride}
                        onChange={(event) => setBrand(activeBrand.id, { slugOverride: slugify(event.target.value) })}
                      />
                    </div>
                  </Field>
                  <Field label="Weight" hint="Sort priority for this brand's listing.">
                    <input
                      className={wizardStyles.input}
                      value={activeBrandData.weight}
                      onChange={(event) => setBrand(activeBrand.id, { weight: event.target.value })}
                    />
                  </Field>
                </div>

                <Field label="Heading" hint={`The H1 shown on the brand's ${singularLabel} page.`}>
                  <input
                    className={wizardStyles.input}
                    value={activeBrandData.heading}
                    onChange={(event) => setBrand(activeBrand.id, { heading: event.target.value })}
                  />
                </Field>

                <Field label="Short description">
                  <textarea
                    className={wizardStyles.textarea}
                    rows={4}
                    value={activeBrandData.shortDesc}
                    onChange={(event) => setBrand(activeBrand.id, { shortDesc: event.target.value })}
                  />
                </Field>

                <div className={`${wizardStyles.fieldGrid} ${wizardStyles.cols2}`} style={{ marginTop: 0 }}>
                  <ToggleRow
                    title="Brand page is active"
                    sub="Show this brand's page on the frontend."
                    checked={activeBrandData.brandActive}
                    onChange={(value) => setBrand(activeBrand.id, { brandActive: value })}
                  />
                  <ToggleRow
                    title="Featured for this brand"
                    sub="Pin to featured rails and home modules."
                    checked={activeBrandData.featured}
                    onChange={(value) => setBrand(activeBrand.id, { featured: value })}
                  />
                </div>

                <Field label="Brand icon">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    <div
                      style={{
                        width: 180,
                        height: 180,
                        borderRadius: 14,
                        overflow: "hidden",
                        flex: "0 0 auto",
                        background: "var(--field)",
                        border: "1px solid var(--border, rgba(255,255,255,0.1))",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {activeBrandData.icon ? (
                        <img
                          src={resolveImageSrc(activeBrandData.icon) ?? undefined}
                          alt="Area icon preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <ImageIcon size={32} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {activeBrandData.icon ? "Uploaded icon" : "No icon uploaded yet"}
                      </div>
                      <div className={wizardStyles.brandMeta}>PNG, JPG, WEBP, or SVG, square preferred</div>
                      <label
                        className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
                        style={{ height: 36, width: "fit-content", cursor: "pointer" }}
                      >
                        {uploadingIcon ? "Uploading..." : activeBrandData.icon ? "Replace icon" : "Choose file"}
                        <input type="file" hidden onChange={handleIconUpload} />
                      </label>
                    </div>
                  </div>
                </Field>
              </div>
            ) : null}

            {tab === "page" ? (
              <div className={`${wizardStyles.fadeIn} ${wizardStyles.contentStack}`}>
                <Field label="Intro heading" hint="Optional section heading above the rich body.">
                  <input
                    className={wizardStyles.input}
                    value={activeBrandData.page.intro}
                    onChange={(event) =>
                      setBrand(activeBrand.id, {
                        page: {
                          ...activeBrandData.page,
                          intro: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Page body" hint={`Rich content for the brand's ${singularLabel} landing page.`}>
                  <textarea
                    className={wizardStyles.textarea}
                    rows={9}
                    value={activeBrandData.page.body}
                    onChange={(event) =>
                      setBrand(activeBrand.id, {
                        page: {
                          ...activeBrandData.page,
                          body: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              </div>
            ) : null}

            {tab === "faqs" ? (
              <div className={wizardStyles.fadeIn}>
                <div className={wizardStyles.contentStack} style={{ gap: 12 }}>
                  {activeBrandData.faqs.map((faq, index) => (
                    <div key={index} className={wizardStyles.repeatRow}>
                      <span className={wizardStyles.grab}>
                        <GripVertical size={16} />
                      </span>
                      <div className={wizardStyles.contentStack} style={{ flex: 1, gap: 12 }}>
                        <input
                          className={wizardStyles.input}
                          value={faq.q}
                          placeholder={`Question ${index + 1}`}
                          onChange={(event) => {
                            const next = activeBrandData.faqs.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, q: event.target.value } : item
                            );
                            setBrand(activeBrand.id, { faqs: next });
                          }}
                        />
                        <textarea
                          className={wizardStyles.textarea}
                          rows={2}
                          value={faq.a}
                          placeholder="Answer"
                          onChange={(event) => {
                            const next = activeBrandData.faqs.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, a: event.target.value } : item
                            );
                            setBrand(activeBrand.id, { faqs: next });
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className={wizardStyles.repeatDelete}
                        onClick={() =>
                          setBrand(activeBrand.id, {
                            faqs: activeBrandData.faqs.filter((_, itemIndex) => itemIndex !== index),
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
                  className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
                  style={{ marginTop: 16, height: 36 }}
                  onClick={() =>
                    setBrand(activeBrand.id, { faqs: [...activeBrandData.faqs, { q: "", a: "" }] })
                  }
                >
                  <Plus size={16} />
                  Add question
                </button>
              </div>
            ) : null}

            {tab === "meta" ? (
              <div className={`${wizardStyles.fadeIn} ${wizardStyles.contentStack}`}>
                <Field label="SEO title" hint={`${(activeBrandData.meta.title || "").length}/60 characters`}>
                  <input
                    className={wizardStyles.input}
                    value={activeBrandData.meta.title}
                    onChange={(event) =>
                      setBrand(activeBrand.id, {
                        meta: { ...activeBrandData.meta, title: event.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Meta description" hint={`${(activeBrandData.meta.description || "").length}/160 characters`}>
                  <textarea
                    className={wizardStyles.textarea}
                    rows={3}
                    value={activeBrandData.meta.description}
                    onChange={(event) =>
                      setBrand(activeBrand.id, {
                        meta: { ...activeBrandData.meta, description: event.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Keywords" hint="Comma-separated.">
                  <input
                    className={wizardStyles.input}
                    value={activeBrandData.meta.keywords}
                    onChange={(event) =>
                      setBrand(activeBrand.id, {
                        meta: { ...activeBrandData.meta, keywords: event.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            ) : null}


            <div className={styles.dangerZone} style={{ marginTop: 24 }}>
              <div style={{ flex: 1 }}>
                <div className={styles.dangerTitle}>Remove this brand override</div>
                <div className={styles.dangerDescription}>
                  Delete only the {activeBrand.name} layer while keeping the base {singularLabel} record intact.
                </div>
              </div>
              <button
                type="button"
                className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
                style={{ height: 40 }}
                onClick={() => handleRemoveBrand(activeBrand.id)}
              >
                Remove brand
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {dirty ? (
        <div className={styles.saveBar}>
          <div className={styles.saveInfo}>
            <span className={styles.saveDot} />
            You have unsaved changes
          </div>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className={`${wizardStyles.button} ${wizardStyles.buttonGhost}`}
            style={{ height: 40 }}
            onClick={handleDiscard}
          >
            Discard
          </button>
          <button
            type="button"
            className={`${wizardStyles.button} ${wizardStyles.buttonPrimary}`}
            style={{ height: 40 }}
            onClick={handleSave}
            disabled={loading}
          >
            Save changes
          </button>
        </div>
      ) : null}

      {toastMessage ? (
        <div className={styles.toast} onAnimationEnd={() => setToastMessage("")}>
          <span className={styles.toastIcon}>
            <Check size={16} />
          </span>
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
