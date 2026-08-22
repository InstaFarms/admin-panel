"use client";

import { Checkbox, Label, Select, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createLocation } from "@/actions/locationActions";
import MyButton from "@/components/MyButton";
import { LOCATION_MARKET_TYPE_OPTIONS } from "@/constants/locations";
import { normalizeLocationTag, validateLocationRoles } from "@/lib/locationValidation";
import type { LocationDisplayMode, LocationMarketType } from "@/types/locations";

const DISPLAY_MODE_OPTIONS: Array<{
  value: LocationDisplayMode;
  title: string;
  description: string;
}> = [
  {
    value: "area_first",
    title: "Area First",
    description:
      "Use this when the state page should lead with area and destination-style content.",
  },
  {
    value: "listing_first",
    title: "Listing First",
    description:
      "Use this when the state page should lead directly with property listings.",
  },
  {
    value: "mixed",
    title: "Mixed",
    description:
      "Use this when the state page should balance both content and listings together.",
  },
];

function slugifyStateName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewLocationStateCreator() {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [stateName, setStateName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [locationTag, setLocationTag] = useState("");
  const [marketType, setMarketType] = useState<LocationMarketType>("mixed");
  const [displayMode, setDisplayMode] = useState<LocationDisplayMode>("area_first");
  const [isActive, setIsActive] = useState(true);

  const [nameError, setNameError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  const normalizedTag = useMemo(
    () => normalizeLocationTag(locationTag) ?? "",
    [locationTag]
  );

  const slugPreview = useMemo(() => slugifyStateName(stateName), [stateName]);

  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "State name is required.";
    if (trimmed.length < 2) return "State name must be at least 2 characters.";
    return null;
  };

  const validateSlug = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Base slug is required.";
    if (!/^[a-z][a-z0-9-]*$/.test(trimmed)) {
      return "Slug must start with a letter and use only lowercase letters, numbers, and hyphens.";
    }
    return null;
  };

  const validateTag = (value: string) => {
    const validation = validateLocationRoles(["state"], value);
    return validation.ok ? null : validation.error;
  };

  const handleNameChange = (value: string) => {
    setStateName(value);
    if (!slugTouched) {
      setSlug(slugifyStateName(value));
    }
    if (nameError) {
      setNameError(validateName(value));
    }
  };

  const handleSubmit = () => {
    const nextNameError = validateName(stateName);
    const nextSlugError = validateSlug(slug);
    const nextTagError = validateTag(locationTag);

    setNameError(nextNameError);
    setSlugError(nextSlugError);
    setTagError(nextTagError);

    if (nextNameError || nextSlugError || nextTagError) {
      toast.error(nextNameError || nextSlugError || nextTagError || "Please fix the highlighted fields.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", stateName.trim());
        formData.set("slug", slug.trim());
        formData.set("locationTag", normalizedTag);
        formData.set("locationRoles", JSON.stringify(["state"]));
        formData.set("parentId", "");
        formData.set("marketType", marketType);
        formData.set("displayMode", displayMode);
        formData.set("isActive", isActive ? "true" : "false");

        const created = await createLocation(formData);
        toast.success("State created successfully.");
        router.push(`/admin/locations/states/${created.id}`);
      } catch (error: any) {
        toast.error(error?.message || "Failed to create state.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-slate-700 bg-slate-950/65 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.32)]">
          <div className="mb-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              State Setup
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Create the base state record
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              This flow is only for state creation. It sets up the structural state record in the
              new `locations` table first, and then you can configure brand content from the state
              edit page.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="stateName" className="mb-2 block text-slate-100">
                State Name
              </Label>
              <TextInput
                id="stateName"
                value={stateName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Telangana"
                color={nameError ? "failure" : undefined}
                helperText={nameError ?? "Use the public-facing state name."}
              />
            </div>

            <div>
              <Label htmlFor="slug" className="mb-2 block text-slate-100">
                Base Slug
              </Label>
              <TextInput
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                  if (slugError) {
                    setSlugError(validateSlug(e.target.value));
                  }
                }}
                placeholder="telangana"
                color={slugError ? "failure" : undefined}
                helperText={
                  slugError ??
                  (slugPreview
                    ? `Auto suggestion: ${slugPreview}`
                    : "The frontend will use this as the default state URL slug.")
                }
              />
            </div>

            <div>
              <Label htmlFor="locationTag" className="mb-2 block text-slate-100">
                State Tag
              </Label>
              <TextInput
                id="locationTag"
                value={locationTag}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase();
                  setLocationTag(next);
                  if (tagError) {
                    setTagError(validateTag(next));
                  }
                }}
                placeholder="TEL"
                maxLength={3}
                color={tagError ? "failure" : undefined}
                helperText={tagError ?? "Exactly 3 uppercase letters."}
              />
            </div>

            <div>
              <Label htmlFor="marketType" className="mb-2 block text-slate-100">
                Market Type
              </Label>
              <Select
                id="marketType"
                value={marketType}
                onChange={(e) => setMarketType(e.target.value as LocationMarketType)}
              >
                {LOCATION_MARKET_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="mb-3">
                <Label className="text-slate-100">Display Mode</Label>
                <p className="mt-1 text-xs text-slate-400">
                  Choose how the frontend state page should behave by default.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {DISPLAY_MODE_OPTIONS.map((option) => {
                  const active = displayMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDisplayMode(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.3)]"
                          : "border-slate-700 bg-slate-900/80 hover:border-slate-500"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{option.title}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-4">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <div>
                  <Label htmlFor="isActive" className="text-slate-100">
                    State is active
                  </Label>
                  <p className="text-xs text-slate-400">
                    Inactive states stay in admin but can be kept out of the active frontend flow.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
            <MyButton color="light" type="button" onClick={() => router.push("/admin/locations/states")}>
              Back to States
            </MyButton>
            <MyButton type="button" loading={loading} onClick={handleSubmit}>
              Create State
            </MyButton>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-700 bg-slate-950/65 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.26)]">
            <p className="text-sm font-semibold text-white">Live Summary</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Name</p>
                <p className="mt-1 text-base font-medium text-white">
                  {stateName.trim() || "Not set yet"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Slug</p>
                <p className="mt-1 break-all font-mono text-cyan-300">
                  /{slug.trim() || "state-slug"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">State Tag</p>
                <p className="mt-1 text-base font-medium text-white">
                  {normalizedTag || "___"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Frontend Behavior</p>
                <p className="mt-1 text-white">
                  {displayMode === "area_first"
                    ? "Area-led landing page"
                    : displayMode === "listing_first"
                      ? "Listings-led landing page"
                      : "Balanced content and listings"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950/65 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.26)]">
            <p className="text-sm font-semibold text-white">What happens next</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <p>
                1. The state record is created in the new `locations` table with the `state` role.
              </p>
              <p>
                2. You land on the state edit page, where brand content, metadata, FAQs, and nearby
                mappings become available.
              </p>
              <p>
                3. This page stays intentionally focused on base state creation only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
