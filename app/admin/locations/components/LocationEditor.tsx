"use client";

import { type ChangeEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Checkbox,
  Label,
  Select,
  TabItem,
  Tabs,
  TextInput,
  Textarea,
} from "flowbite-react";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import MyButton from "@/components/MyButton";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { uploadLocationIconAction } from "@/actions/imageActions";
import {
  addBrandToLocation,
  createLocation,
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
  normalizeLocationTag,
  validateLocationParentRoles,
} from "@/lib/locationValidation";
import type {
  BrandLocationDetail,
  LocationDetail,
  LocationOption,
  LocationRole,
  NearbyLocationMapping,
} from "@/types/locations";
import LocationContentTab from "./LocationContentTab";
import LocationFaqTab from "./LocationFaqTab";
import LocationMetadataTab from "./LocationMetadataTab";

interface LocationEditorProps {
  data?: LocationDetail | null;
  brands: Array<{ id: string; name: string }>;
  locationOptions: LocationOption[];
  lockedRoles?: LocationRole[];
  showLocationTag?: boolean;
  hideParentSelector?: boolean;
  createContextLabel?: string;
  createContextDescription?: string;
  breadcrumbItems?: Array<{ href: string; label: string }>;
}

function createEmptyFaq() {
  return { question: "", answer: "", weight: 1, isActive: true };
}

function createEmptyNearbyMapping(): NearbyLocationMapping {
  return { nearbyLocationId: "", sortOrder: "0" };
}

function getBrandDetailId(detail?: BrandLocationDetail | null) {
  return detail?.brandId ?? "";
}

function slugifyLocationName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LocationEditor({
  data,
  brands,
  locationOptions,
  lockedRoles,
  showLocationTag = true,
  hideParentSelector = false,
  createContextLabel,
  createContextDescription,
  breadcrumbItems,
}: LocationEditorProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [iconUploading, setIconUploading] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [localIsEditMode, setLocalIsEditMode] = useState(Boolean(data));
  const [localLocationId, setLocalLocationId] = useState(data?.id ?? "");

  const [name, setName] = useState(data?.name ?? "");
  const [slug, setSlug] = useState(data?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(data?.slug));
  const [locationTag, setLocationTag] = useState(data?.locationTag ?? "");
  const [locationRoles, setLocationRoles] = useState<LocationRole[]>(
    lockedRoles ?? ((data?.locationRoles as LocationRole[]) ?? [])
  );
  const [parentId, setParentId] = useState(data?.parentId ?? "");
  const [marketType, setMarketType] = useState(data?.marketType ?? "mixed");
  const [displayMode, setDisplayMode] = useState(data?.displayMode ?? "mixed");
  const [isActive, setIsActive] = useState(data?.isActive ?? true);

  const initialSelectedBrandId =
    data?.activeBrandId ||
    getBrandDetailId(data?.brandDetails?.[0]) ||
    brands[0]?.id ||
    "";
  const [selectedBrandId, setSelectedBrandId] = useState(initialSelectedBrandId);
  const [brandHasOverride, setBrandHasOverride] = useState(
    Boolean(data?.activeBrandDetail)
  );
  const [showAddBrandMenu, setShowAddBrandMenu] = useState(false);
  const [openBrandMenuId, setOpenBrandMenuId] = useState<string | null>(null);

  const [brandSlug, setBrandSlug] = useState("");
  const [brandHeading, setBrandHeading] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [brandIsActive, setBrandIsActive] = useState(true);
  const [brandWeight, setBrandWeight] = useState("0");
  const [featured, setFeatured] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [mapSearchKey, setMapSearchKey] = useState("");
  const [howToReachOpen, setHowToReachOpen] = useState(false);
  const [howToReachTitle, setHowToReachTitle] = useState("");
  const [howToReachDescription, setHowToReachDescription] = useState("");
  const [nearByPlaces, setNearByPlaces] = useState<string[]>([""]);
  const [nearByAttractions, setNearByAttractions] = useState<string[]>([""]);
  const [faqs, setFaqs] = useState([createEmptyFaq()]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaUrl, setMetaUrl] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaImageUrl, setMetaImageUrl] = useState("");
  const [nearbyMappings, setNearbyMappings] = useState<NearbyLocationMapping[]>(
    data?.nearbyMappings?.length ? data.nearbyMappings : [createEmptyNearbyMapping()]
  );

  const selectedBrandName =
    brands.find((brand) => brand.id === selectedBrandId)?.name || "selected brand";
  const configuredBrandIds = data?.configuredBrandIds ?? [];
  const configuredBrandCount = configuredBrandIds.length;
  const selectedBrandConfigured = configuredBrandIds.includes(selectedBrandId);
  const configuredBrands = brands.filter((brand) => configuredBrandIds.includes(brand.id));
  const addableBrands = brands.filter((brand) => !configuredBrandIds.includes(brand.id));
  const showBrandEditor = localIsEditMode && brandHasOverride;
  const isCreateMode = !localIsEditMode;
  const singleLockedRole = lockedRoles?.length === 1 ? lockedRoles[0] : null;
  const showRoleChecklist = !lockedRoles?.length;
  const showParentField =
    !hideParentSelector && !locationRoles.includes("state");
  const allowedParentOptions = useMemo(
    () => getAllowedParentOptions(locationRoles, locationOptions, localLocationId),
    [locationRoles, locationOptions, localLocationId]
  );

  useEffect(() => {
    if (!data) return;
    setLocalIsEditMode(true);
    setLocalLocationId(data.id);
    setName(data.name || "");
    setSlug(data.slug || "");
    setLocationTag(data.locationTag || "");
    setLocationRoles(lockedRoles ?? ((data.locationRoles as LocationRole[]) || []));
    setParentId(data.parentId || "");
    setMarketType(data.marketType || "mixed");
    setDisplayMode(data.displayMode || "mixed");
    setIsActive(data.isActive ?? true);
    setNearbyMappings(
      data.nearbyMappings?.length ? data.nearbyMappings : [createEmptyNearbyMapping()]
    );
  }, [data, lockedRoles]);

  useEffect(() => {
    if (!data && lockedRoles?.length) {
      setLocationRoles(lockedRoles);
    }
  }, [data, lockedRoles]);

  useEffect(() => {
    if (!isCreateMode || slugTouched) return;
    setSlug(slugifyLocationName(name));
  }, [isCreateMode, name, slugTouched]);

  useEffect(() => {
    if (!isCreateMode || singleLockedRole !== "state") return;
    setDisplayMode((current) => (current === "mixed" ? "area_first" : current));
  }, [isCreateMode, singleLockedRole]);

  useEffect(() => {
    if (locationRoles.some((role) => role === "state")) {
      setParentId("");
      return;
    }

    if (parentId && !allowedParentOptions.some((option) => option.id === parentId)) {
      setParentId("");
    }
  }, [allowedParentOptions, locationRoles, parentId]);

  useEffect(() => {
    if (!localIsEditMode) return;

    const detail =
      data?.brandDetails?.find((item) => item.brandId === selectedBrandId) ?? null;
    setBrandHasOverride(Boolean(detail));
    setBrandSlug(detail?.slug ?? "");
    setBrandHeading(detail?.heading ?? "");
    setBrandDescription(detail?.description ?? "");
    setBrandIsActive(detail?.isActive ?? true);
    setBrandWeight(detail?.weight?.toString() ?? "0");
    setFeatured(detail?.featured ?? false);
    setIconUrl(detail?.icon ?? null);
    setIconPreview(detail?.icon ?? null);
    setPageTitle(detail?.info?.title ?? "");
    setPageDescription(detail?.info?.description ?? "");
    setMapSearchKey(detail?.info?.mapSearchKey ?? "");
    setHowToReachTitle(detail?.info?.howToReach?.title ?? "");
    setHowToReachDescription(detail?.info?.howToReach?.description ?? "");
    setNearByPlaces(detail?.info?.howToReach?.nearByPlaces?.length ? detail.info.howToReach.nearByPlaces : [""]);
    setNearByAttractions(detail?.info?.nearByAttractions?.length ? detail.info.nearByAttractions : [""]);
    setFaqs(detail?.faqs?.length ? detail.faqs : [createEmptyFaq()]);
    setMetaTitle(detail?.meta?.metaTitle ?? "");
    setMetaUrl(detail?.meta?.metaUrl ?? "");
    setMetaKeywords(detail?.meta?.metaKeywords ?? "");
    setMetaDescription(detail?.meta?.metaDescription ?? "");
    setMetaImageUrl(detail?.meta?.metaImage ?? "");
    setHowToReachOpen(
      Boolean(
        detail?.info?.howToReach?.title ||
          detail?.info?.howToReach?.description ||
          detail?.info?.howToReach?.nearByPlaces?.length
      )
    );
  }, [data, localIsEditMode, selectedBrandId]);

  const handleRoleToggle = (role: LocationRole) => {
    if (lockedRoles?.length) return;
    setLocationRoles((prev) => {
      if (prev.includes(role)) return prev.filter((item) => item !== role);
      if (prev.length >= 2) {
        toast.error("A location can have at most two roles.");
        return prev;
      }
      return [...prev, role];
    });
  };

  const handleIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/webp", "image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP icon.");
      return;
    }

    setIconUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setIconPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("locationType", locationRoles[0] ?? "");
      formData.append("brandName", selectedBrandName);
      formData.append("locationId", localLocationId);

      const result = await uploadLocationIconAction(formData);
      if (!result.success) {
        throw new Error(result.error || "Failed to upload icon");
      }

      setIconUrl(result.success.path);
      toast.success("Icon uploaded successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload icon.");
      setIconPreview(null);
    } finally {
      setIconUploading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast.error("Location name is required.");
      return false;
    }

    if (!slug.trim()) {
      toast.error("Base slug is required.");
      return false;
    }

    if (!marketType) {
      toast.error("Market type is required.");
      return false;
    }

    if (!displayMode) {
      toast.error("Display mode is required.");
      return false;
    }

    const parentRoles =
      locationOptions.find((option) => option.id === parentId)?.locationRoles ?? null;
    const validation = validateLocationParentRoles(
      locationRoles,
      parentRoles,
      normalizeLocationTag(locationTag)
    );
    if (!validation.ok) {
      toast.error(validation.error);
      return false;
    }

    const filteredNearbyMappings = nearbyMappings.filter((mapping) =>
      mapping.nearbyLocationId?.trim()
    );
    const nearbyIds = filteredNearbyMappings.map((mapping) => mapping.nearbyLocationId);
    if (new Set(nearbyIds).size !== nearbyIds.length) {
      toast.error("Nearby locations cannot contain duplicates.");
      return false;
    }
    if (localLocationId && nearbyIds.includes(localLocationId)) {
      toast.error("A location cannot be nearby to itself.");
      return false;
    }

    return true;
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("locationTag", locationTag);
    formData.set("locationRoles", JSON.stringify(locationRoles));
    formData.set("parentId", parentId);
    formData.set("marketType", marketType);
    formData.set("displayMode", displayMode);
    formData.set("isActive", isActive ? "true" : "false");
    formData.set(
      "nearbyMappings",
      JSON.stringify(
        nearbyMappings
          .filter((mapping) => mapping.nearbyLocationId?.trim())
          .map((mapping) => ({
            nearbyLocationId: mapping.nearbyLocationId,
            sortOrder: mapping.sortOrder ?? "0",
          }))
      )
    );

    if (localIsEditMode && selectedBrandId && showBrandEditor) {
      formData.set("brandId", selectedBrandId);
      formData.set("brandSlug", brandSlug);
      formData.set("heading", brandHeading);
      formData.set("brandDescription", brandDescription);
      formData.set("brandIsActive", brandIsActive ? "true" : "false");
      formData.set("weight", brandWeight || "0");
      formData.set("featured", featured ? "true" : "false");
      formData.set("icon", iconUrl || "");
      formData.set("pageTitle", pageTitle);
      formData.set("pageDescription", pageDescription);
      formData.set("mapSearchKey", mapSearchKey);
      formData.set("howToReachTitle", howToReachTitle);
      formData.set("howToReachDescription", howToReachDescription);
      formData.set(
        "nearByPlaces",
        JSON.stringify(nearByPlaces.filter((value) => value.trim()))
      );
      formData.set(
        "nearByAttractions",
        JSON.stringify(nearByAttractions.filter((value) => value.trim()))
      );
      formData.set(
        "faqs",
        JSON.stringify(
          faqs.filter((faq) => faq.question.trim() && faq.answer.trim())
        )
      );
      formData.set("metaTitle", metaTitle);
      formData.set("metaUrl", metaUrl);
      formData.set("metaKeywords", metaKeywords);
      formData.set("metaDescription", metaDescription);
      formData.set("metaImageUrl", metaImageUrl);
    }

    return formData;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    startTransition(async () => {
      try {
        const formData = buildFormData();
        if (localIsEditMode && localLocationId) {
          await updateLocation(localLocationId, formData);
          toast.success("Location saved successfully.");
          router.refresh();
          return;
        }

        const created = await createLocation(formData);
        toast.success("Location created successfully.");
        router.push(`/admin/locations/${created.id}`);
      } catch (error: any) {
        toast.error(error?.message || "Failed to save location.");
      }
    });
  };

  const handleAddBrand = async () => {
    if (!localLocationId || !selectedBrandId) return;
    setAddingBrand(true);
    try {
      await addBrandToLocation(localLocationId, selectedBrandId);
      toast.success(`Brand override added for ${selectedBrandName}.`);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add brand override.");
    } finally {
      setAddingBrand(false);
    }
  };

  const handleAddSpecificBrand = async (brandId: string) => {
    if (!localLocationId || !brandId) return;
    setAddingBrand(true);
    setShowAddBrandMenu(false);
    try {
      await addBrandToLocation(localLocationId, brandId);
      setSelectedBrandId(brandId);
      toast.success(
        `Brand override added for ${
          brands.find((brand) => brand.id === brandId)?.name || "selected brand"
        }.`
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add brand override.");
    } finally {
      setAddingBrand(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!localLocationId) return;
    if (!window.confirm("Delete this location?")) return;

    startTransition(async () => {
      try {
        await deleteLocation(localLocationId);
        toast.success("Location deleted successfully.");
        router.push("/admin/locations");
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete location.");
      }
    });
  };

  const handleDeleteBrand = async (brandId?: string) => {
    const targetBrandId = brandId ?? selectedBrandId;
    const targetBrandName =
      brands.find((brand) => brand.id === targetBrandId)?.name || selectedBrandName;
    if (!localLocationId || !targetBrandId) return;
    if (!window.confirm(`Remove ${targetBrandName} override from this location?`)) return;

    startTransition(async () => {
      try {
        await deleteLocationBrand(localLocationId, targetBrandId);
        toast.success("Brand override removed successfully.");
        if (targetBrandId === selectedBrandId) {
          const nextBrandId =
            configuredBrands.find((brand) => brand.id !== targetBrandId)?.id ??
            brands.find((brand) => brand.id !== targetBrandId)?.id ??
            "";
          setSelectedBrandId(nextBrandId);
        }
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to remove brand override.");
      }
    });
  };

  const detailForm = (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      {isCreateMode ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
                {createContextLabel ?? "Create Location"}
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Start with the base location details
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {createContextDescription ??
                  "Set up the core location first. Brand content, metadata, FAQs, and nearby mappings can be added from the edit page right after creation."}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Recommended setup
            </p>
            <div className="mt-4 space-y-3 text-sm text-blue-900/90 dark:text-blue-100/90">
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                <p className="font-medium">Slug</p>
                <p className="mt-1 text-xs leading-5">
                  The slug auto-fills from the name, but you can still fine-tune it before saving.
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                <p className="font-medium">Display mode</p>
                <p className="mt-1 text-xs leading-5">
                  States generally work best with <span className="font-semibold">Area First</span>.
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                <p className="font-medium">After save</p>
                <p className="mt-1 text-xs leading-5">
                  Add brand overrides, page content, SEO metadata, and nearby relationships from the edit screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Base Details
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              These fields define the base location record used across the frontend and admin.
            </p>
          </div>
          {singleLockedRole ? (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Role locked: {singleLockedRole}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name" className="mb-2 block">
              Name
            </Label>
            <TextInput
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter location name"
            />
          </div>
          <div>
            <Label htmlFor="slug" className="mb-2 block">
              Base Slug
            </Label>
            <TextInput
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="location-slug"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Used as the default frontend URL slug before any brand-specific override.
            </p>
          </div>
          {showLocationTag ? (
            <div>
              <Label htmlFor="locationTag" className="mb-2 block">
                Location Tag
              </Label>
              <TextInput
                id="locationTag"
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value.toUpperCase())}
                placeholder="HYD"
                maxLength={3}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Use a unique 3-letter uppercase tag for state and city pages.
              </p>
            </div>
          ) : null}
          {showParentField ? (
            <div>
              <Label htmlFor="parentId" className="mb-2 block">
                Parent Location
              </Label>
              <Select
                id="parentId"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">No parent</option>
                {allowedParentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({option.locationRoles.join(", ")})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <Label htmlFor="marketType" className="mb-2 block">
              Market Type
            </Label>
            <Select
              id="marketType"
              value={marketType}
              onChange={(e) => setMarketType(e.target.value as any)}
            >
              {LOCATION_MARKET_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className={showParentField ? "" : "md:col-span-2"}>
            <Label htmlFor="displayMode" className="mb-2 block">
              Display Mode
            </Label>
            <Select
              id="displayMode"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as any)}
            >
              {LOCATION_DISPLAY_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {LOCATION_DISPLAY_MODE_LABELS[option]}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {LOCATION_DISPLAY_MODE_HELPERS[displayMode]}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Classification
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the structural role for this location.
            </p>
          </div>

          {showRoleChecklist ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {LOCATION_ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                >
                  <Checkbox
                    checked={locationRoles.includes(role as LocationRole)}
                    onChange={() => handleRoleToggle(role as LocationRole)}
                    disabled={Boolean(lockedRoles?.length)}
                  />
                  <span className="text-sm capitalize">{role}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                This page is scoped to <span className="capitalize">{singleLockedRole}</span> locations.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                The role is fixed here to keep the creation flow simple and reduce accidental misclassification.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Status
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Control whether the base location is active.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <Checkbox
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="isActive">Base location is active</Label>
          </div>
        </div>
      </div>

      {localIsEditMode && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedBrandName} Override
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Optional brand-specific content and SEO overrides.
              </p>
            </div>
            {!showBrandEditor && (
              <MyButton type="button" onClick={handleAddBrand} loading={addingBrand}>
                Add Brand Override
              </MyButton>
            )}
          </div>

          {!showBrandEditor ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    Initialize {selectedBrandName} for this location
                  </h4>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Once added, you can define a brand-specific slug, heading, description, icon,
                    featured state, SEO metadata, FAQs, and rich page content without affecting the
                    base location.
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Locked Until Added
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                    {selectedBrandName} override is live
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-emerald-800/80 dark:text-emerald-100/80">
                    Changes in this panel apply only to the selected brand experience for this location.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Brand Override Active
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="brandSlug" className="mb-2 block">
                Brand Slug Override
              </Label>
              <TextInput
                id="brandSlug"
                value={brandSlug}
                onChange={(e) => setBrandSlug(e.target.value)}
                placeholder="brand-specific-slug"
              />
            </div>
            <div>
              <Label htmlFor="weight" className="mb-2 block">
                Weight
              </Label>
              <TextInput
                id="weight"
                value={brandWeight}
                onChange={(e) => setBrandWeight(e.target.value)}
                placeholder="0"
                type="number"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="heading" className="mb-2 block">
                Heading
              </Label>
              <TextInput
                id="heading"
                value={brandHeading}
                onChange={(e) => setBrandHeading(e.target.value)}
                placeholder="Brand-specific heading"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="brandDescription" className="mb-2 block">
                Short Description
              </Label>
              <Textarea
                id="brandDescription"
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                rows={3}
                placeholder="Short override description"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="brandIsActive"
                  checked={brandIsActive}
                  onChange={(e) => setBrandIsActive(e.target.checked)}
                />
                <Label htmlFor="brandIsActive">Brand page is active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                <Label htmlFor="featured">Featured for this brand</Label>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="brandIcon" className="mb-2 block">
                Icon
              </Label>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleIconChange} />
                {iconPreview ? (
                  <img
                    src={iconPreview}
                    alt="Icon preview"
                    className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                  />
                ) : null}
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {isCreateMode ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          Content tabs, SEO metadata, FAQs, and nearby mappings become available right after the location is created.
        </div>
      ) : null}

      <div className="flex justify-end">
        <MyButton type="button" loading={loading} disabled={iconUploading} onClick={handleSubmit}>
          {localIsEditMode ? "Save Location" : "Create Location"}
        </MyButton>
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      {localIsEditMode && brands.length > 0 && (
        <div className="mb-2 flex flex-col gap-4">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 dark:border-slate-800">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Brands
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {name || "Location"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Configure the base location details for <span className="font-semibold text-slate-700 dark:text-slate-200">{name || "this location"}</span>, then manage the <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedBrandName}</span> brand experience with page content, FAQs, SEO metadata, and override settings.
                </p>
                {breadcrumbItems?.length ? (
                  <PageBreadcrumb
                    items={breadcrumbItems}
                    className="mt-3 bg-transparent p-0 text-sm [&_a]:text-slate-500 [&_a]:transition [&_a]:hover:text-slate-900 [&_a]:dark:text-slate-400 [&_a]:dark:hover:text-slate-100 [&_li]:text-slate-500 [&_li]:dark:text-slate-400"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {addableBrands.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={loading || addingBrand}
                      onClick={() => {
                        setOpenBrandMenuId(null);
                        setShowAddBrandMenu((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                    >
                      <Plus size={16} />
                      Add Brand
                    </button>
                    {showAddBrandMenu ? (
                      <div className="absolute right-0 top-full z-20 mt-2 min-w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        {addableBrands.map((brand) => (
                          <button
                            key={brand.id}
                            type="button"
                            onClick={() => void handleAddSpecificBrand(brand.id)}
                            className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {brand.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <MyButton
                  type="button"
                  loading={loading}
                  disabled={iconUploading}
                  onClick={handleSubmit}
                >
                  Save Location
                </MyButton>
                {localIsEditMode && (
                  <button
                    type="button"
                    onClick={handleDeleteLocation}
                    aria-label="Delete location"
                    title="Delete location"
                    className="inline-flex items-center justify-center rounded-xl bg-rose-600 p-2.5 text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400/70 dark:bg-rose-600 dark:hover:bg-rose-700"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {configuredBrands.map((brand) => {
                const isActiveBrand = selectedBrandId === brand.id;
                const isMenuOpen = openBrandMenuId === brand.id;
                return (
                  <div key={brand.id} className="relative">
                    <div
                      className={`inline-flex items-center rounded-2xl border text-sm font-semibold shadow-sm transition ${
                        isActiveBrand
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setShowAddBrandMenu(false);
                          setOpenBrandMenuId(null);
                          if (brand.id === selectedBrandId) return;
                          if (
                            window.confirm(
                              "Switching brands discards any unsaved changes in the current tab. Continue?"
                            )
                          ) {
                            setSelectedBrandId(brand.id);
                          }
                        }}
                        className="rounded-l-2xl px-4 py-2.5 outline-none transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {brand.name}
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        aria-label={`Open ${brand.name} actions`}
                        onClick={() => {
                          setShowAddBrandMenu(false);
                          setOpenBrandMenuId((prev) => (prev === brand.id ? null : brand.id));
                        }}
                        className={`rounded-r-2xl border-l px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-70 ${
                          isActiveBrand
                            ? "border-white/20 hover:bg-white/10"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    {isMenuOpen ? (
                      <div className="absolute left-0 top-full z-20 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenBrandMenuId(null);
                            void handleDeleteBrand(brand.id);
                          }}
                          className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                          Remove Brand
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isCreateMode ? (
          detailForm
        ) : (
          <Tabs>
          <TabItem title="Detail">
            {detailForm}
          </TabItem>

          <TabItem title="Page Content">
            <LocationContentTab
              localIsEditMode={localIsEditMode}
              showBrandEditor={showBrandEditor}
              selectedBrandName={selectedBrandName}
              onAddBrand={handleAddBrand}
              addingBrand={addingBrand}
              locationName={name}
              pageTitle={pageTitle}
              setPageTitle={setPageTitle}
              pageDescription={pageDescription}
              setPageDescription={setPageDescription}
              mapSearchKey={mapSearchKey}
              setMapSearchKey={setMapSearchKey}
              howToReachOpen={howToReachOpen}
              setHowToReachOpen={setHowToReachOpen}
              howToReachTitle={howToReachTitle}
              setHowToReachTitle={setHowToReachTitle}
              howToReachDescription={howToReachDescription}
              setHowToReachDescription={setHowToReachDescription}
              nearByPlaces={nearByPlaces}
              addNearByPlace={() => setNearByPlaces((prev) => [...prev, ""])}
              removeNearByPlace={(index) =>
                setNearByPlaces((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
              }
              updateNearByPlace={(index, value) =>
                setNearByPlaces((prev) =>
                  prev.map((item, itemIndex) => (itemIndex === index ? value : item))
                )
              }
              nearByAttractions={nearByAttractions}
              addNearByAttraction={() => setNearByAttractions((prev) => [...prev, ""])}
              removeNearByAttraction={(index) =>
                setNearByAttractions((prev) =>
                  prev.filter((_, itemIndex) => itemIndex !== index)
                )
              }
              updateNearByAttraction={(index, value) =>
                setNearByAttractions((prev) =>
                  prev.map((item, itemIndex) => (itemIndex === index ? value : item))
                )
              }
            />
          </TabItem>

          <TabItem title="FAQs">
            <LocationFaqTab
              localIsEditMode={localIsEditMode}
              showBrandEditor={showBrandEditor}
              selectedBrandName={selectedBrandName}
              onAddBrand={handleAddBrand}
              addingBrand={addingBrand}
              locationName={name}
              faqs={faqs}
              addFaq={() => setFaqs((prev) => [...prev, createEmptyFaq()])}
              removeFaq={(index) =>
                setFaqs((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
              }
              updateFaq={(index, field, value) =>
                setFaqs((prev) =>
                  prev.map((faq, itemIndex) =>
                    itemIndex === index ? { ...faq, [field]: value } : faq
                  )
                )
              }
            />
          </TabItem>

          <TabItem title="Metadata">
            <LocationMetadataTab
              localIsEditMode={localIsEditMode}
              showBrandEditor={showBrandEditor}
              selectedBrandName={selectedBrandName}
              onAddBrand={handleAddBrand}
              addingBrand={addingBrand}
              locationName={name}
              metaTitle={metaTitle}
              setMetaTitle={setMetaTitle}
              metaUrl={metaUrl}
              setMetaUrl={setMetaUrl}
              metaKeywords={metaKeywords}
              setMetaKeywords={setMetaKeywords}
              metaDescription={metaDescription}
              setMetaDescription={setMetaDescription}
              metaImageUrl={metaImageUrl}
              setMetaImageUrl={setMetaImageUrl}
            />
          </TabItem>

          <TabItem title="Nearby">
            {!localIsEditMode ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create Location First
                </h3>
                <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  Save the location before managing nearby mappings.
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
                <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Add as many nearby locations as needed. Duplicates and self-links are blocked.
                </div>
                <div className="flex justify-end">
                  <MyButton
                    type="button"
                    onClick={() =>
                      setNearbyMappings((prev) => [...prev, createEmptyNearbyMapping()])
                    }
                  >
                    Add Nearby Location
                  </MyButton>
                </div>
                <div className="flex flex-col gap-4">
                  {nearbyMappings.map((mapping, index) => (
                    <div
                      key={`${mapping.id ?? "new"}-${index}`}
                      className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_auto] dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div>
                        <Label className="mb-2 block">Nearby Location</Label>
                        <Select
                          value={mapping.nearbyLocationId}
                          onChange={(e) =>
                            setNearbyMappings((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      nearbyLocationId: e.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <option value="">Select location</option>
                          {locationOptions
                            .filter((option) => option.id !== localLocationId)
                            .map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name} ({option.locationRoles.join(", ")})
                              </option>
                            ))}
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-2 block">Sort Order</Label>
                        <TextInput
                          type="number"
                          value={mapping.sortOrder?.toString() ?? "0"}
                          onChange={(e) =>
                            setNearbyMappings((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, sortOrder: e.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            setNearbyMappings((prev) =>
                              prev.length > 1
                                ? prev.filter((_, itemIndex) => itemIndex !== index)
                                : [createEmptyNearbyMapping()]
                            )
                          }
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabItem>
        </Tabs>
        )}
      </div>
    </div>
  );
}
