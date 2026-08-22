"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { createLocationLandmark } from "@/actions/locationActions";
import type { LocationOption } from "@/types/locations";
import styles from "./CreateLocationLandmarkWizard.module.css";

interface CreateLocationLandmarkWizardProps {
  locationOptions: LocationOption[];
}

const STEP_ITEMS = [
  { key: "01", name: "Choose location" },
  { key: "02", name: "Landmark details" },
];

const ROLE_COLORS: Record<string, string> = {
  state: "#2f6df6",
  city: "#18b981",
  region: "#8b5cf6",
  area: "#e0a23a",
  locality: "#06b6d4",
  destination: "#ef4655",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPrimaryRole(location: LocationOption) {
  return location.locationRoles.find((role) => role !== "destination") ?? location.locationRoles[0] ?? "location";
}

export default function CreateLocationLandmarkWizard({
  locationOptions,
}: CreateLocationLandmarkWizardProps) {
  const router = useRouter();
  const areaLocationOptions = useMemo(
    () => locationOptions.filter((location) => location.locationRoles.includes("area") && location.isActive),
    [locationOptions]
  );
  const [step, setStep] = useState(0);
  const [locationId, setLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [landmark, setLandmark] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [icon, setIcon] = useState("");
  const [loading, startTransition] = useTransition();

  const locationMap = useMemo(
    () => new Map(locationOptions.map((location) => [location.id, location])),
    [locationOptions]
  );

  const getLocationPath = (location: LocationOption) => {
    const path: string[] = [];
    let cursor = location.parentId ? locationMap.get(location.parentId) : undefined;
    let guard = 0;
    while (cursor && guard < 6) {
      path.unshift(cursor.name);
      cursor = cursor.parentId ? locationMap.get(cursor.parentId) : undefined;
      guard += 1;
    }
    return path;
  };

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    const sorted = [...areaLocationOptions].sort((a, b) => a.name.localeCompare(b.name));
    return sorted.filter((location) => {
      if (!query) return true;
      const haystack = [
        location.name,
        location.slug,
        location.locationTag,
        ...location.locationRoles,
        ...getLocationPath(location),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [areaLocationOptions, locationSearch]);

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, LocationOption[]>();
    for (const location of filteredLocations) {
      const role = getPrimaryRole(location);
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(location);
    }
    return Array.from(groups.entries());
  }, [filteredLocations]);

  const selectedLocation = useMemo(
    () => areaLocationOptions.find((location) => location.id === locationId) ?? null,
    [locationId, areaLocationOptions]
  );

  const selectedLocationPath = useMemo(
    () => (selectedLocation ? getLocationPath(selectedLocation) : []),
    [selectedLocation]
  );

  const canContinue = step === 0 ? Boolean(locationId) : Boolean(locationId && landmark.trim());

  const handleSubmit = () => {
    if (!selectedLocation) {
      toast.error("Choose a location for this landmark.");
      return;
    }
    if (!landmark.trim()) {
      toast.error("Landmark name is required.");
      return;
    }

    const formData = new FormData();
    formData.set("landmark", landmark.trim());
    formData.set("slug", slugify(slug || landmark));
    formData.set("locationId", selectedLocation.id);
    if (icon.trim()) formData.set("icon", icon.trim());

    startTransition(async () => {
      try {
        const created = await createLocationLandmark(formData);
        toast.success("Landmark created successfully.");
        router.push("/admin/locations/landmarks");
      } catch (error: any) {
        toast.error(error?.message || "Failed to create landmark.");
      }
    });
  };

  return (
    <div className={styles.wizard}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Location setup</div>
          <h1 className={styles.pageTitle}>Create a new landmark</h1>
          <div className={styles.crumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span>Locations</span>
            <ChevronRight size={13} />
            <span>Landmarks</span>
            <ChevronRight size={13} />
            <span className={styles.crumbNow}>New</span>
          </div>
        </div>
      </div>

      <div className={`${styles.panel} ${styles.cardPad}`} style={{ marginBottom: 22 }}>
        <div className={styles.stepper}>
          {STEP_ITEMS.map((item, index) => {
            const isDone = index < step;
            const isActive = index === step;
            return (
              <div key={item.key} className={styles.stepWrap}>
                <button
                  type="button"
                  className={`${styles.step} ${index <= step ? styles.stepClickable : ""} ${
                    isDone ? styles.stepDone : ""
                  } ${isActive ? styles.stepActive : ""}`}
                  onClick={() => {
                    if (index <= step) setStep(index);
                  }}
                >
                  <span className={styles.stepDot}>
                    {isDone ? <Check size={16} strokeWidth={3} /> : item.key}
                  </span>
                  <span className={styles.stepLabel}>
                    <span className={styles.stepKey}>Step {item.key}</span>
                    <span className={styles.stepName}>{item.name}</span>
                  </span>
                </button>
                {index < STEP_ITEMS.length - 1 ? (
                  <span className={`${styles.stepLine} ${isDone ? styles.stepLineFilled : ""}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {step === 0 ? (
            <div className={`${styles.card} ${styles.cardPad}`}>
              <h2 className={styles.sectionTitle}>Where should this landmark live?</h2>
              <p className={styles.sectionSub}>
                Choose the primary location first. This decides the page context where the landmark will
                appear on the area page in admin and frontend.
              </p>

              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                  placeholder="Search areas by name, parent path, slug, or tag"
                  autoFocus
                />
              </div>

              <div className={styles.groupList}>
                {groupedLocations.length ? (
                  groupedLocations.map(([role, locations]) => (
                    <div key={role} className={styles.groupSection}>
                      <div className={styles.groupTitle}>{titleCase(role)}</div>
                      <div className={styles.locationList}>
                        {locations.map((location) => {
                          const selected = location.id === locationId;
                          const path = getLocationPath(location);
                          return (
                            <button
                              key={location.id}
                              type="button"
                              className={`${styles.locationRow} ${
                                selected ? styles.locationRowSelected : ""
                              }`}
                              onClick={() => setLocationId(location.id)}
                            >
                              <div className={styles.locationRowDot}>
                                {selected ? <Check size={10} strokeWidth={3} /> : null}
                              </div>
                              <div className={styles.locationRowName}>{location.name}</div>
                              <div className={styles.locationRowMid}>
                                <span className={styles.locationRowPath}>
                                  {path.length ? path.join(" › ") : "—"}
                                </span>
                                <span className={styles.locationRowSlug}>/{location.slug}</span>
                              </div>
                              <div className={styles.locationRowMeta}>
                                {location.locationTag ? (
                                  <span className={styles.tagChip}>{location.locationTag}</span>
                                ) : null}
                                {location.locationRoles.map((locationRole) => (
                                  <span
                                    key={`${location.id}-${locationRole}`}
                                    className={styles.roleBadge}
                                    style={{
                                      background: `${ROLE_COLORS[locationRole] ?? "#3b4658"}22`,
                                      color: ROLE_COLORS[locationRole] ?? "#b7c0d0",
                                    }}
                                  >
                                    {titleCase(locationRole)}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No locations match this search.</div>
                )}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className={`${styles.card} ${styles.cardPad}`}>
              <h2 className={styles.sectionTitle}>Landmark details</h2>
              <p className={styles.sectionSub}>
                Finalize the landmark name and URL key. The placement preview on the right shows exactly
                where it will surface.
              </p>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Landmark name</label>
                  <input
                    className={styles.input}
                    value={landmark}
                    placeholder="e.g. Charminar"
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setLandmark(nextValue);
                      if (!slugTouched) {
                        setSlug(slugify(nextValue));
                      }
                    }}
                    autoFocus
                  />
                  <div className={styles.hint}>
                    Use the name users naturally recognize and search for.
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Slug</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.inputPrefix}>/</span>
                    <input
                      className={`${styles.input} ${styles.inputMono} ${styles.inputPrefixed}`}
                      value={slug}
                      placeholder="charminar"
                      onChange={(event) => {
                        setSlugTouched(true);
                        setSlug(slugify(event.target.value));
                      }}
                    />
                  </div>
                  <div className={styles.hint}>
                    Auto-generated from the name. Update it if you need a cleaner public URL key.
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Icon <span className={styles.fieldOptional}>(optional)</span></label>
                  <input
                    className={styles.input}
                    value={icon}
                    placeholder="e.g. map-pin, monument, mosque"
                    onChange={(event) => setIcon(event.target.value)}
                  />
                  <div className={styles.hint}>
                    Icon identifier used to render a visual marker for this landmark on the frontend.
                  </div>
                </div>
              </div>

              <div className={`${styles.callout} ${styles.calloutBlue}`}>
                <span className={styles.calloutIcon}>
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className={styles.calloutTitle}>Placement preview</div>
                  <div className={styles.calloutBody}>
                    This landmark will be attached to{" "}
                    <strong>{selectedLocation?.name ?? "the selected location"}</strong> and will inherit
                    that location&apos;s role context.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.wizardFoot}>
            {step > 0 ? (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={() => router.push("/admin/locations/landmarks")}
              >
                Cancel
              </button>
            )}
            <span className={styles.grow} />
            {step < STEP_ITEMS.length - 1 ? (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => setStep(step + 1)}
                disabled={!canContinue}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={handleSubmit}
                disabled={!canContinue || loading}
              >
                {loading ? "Creating..." : "Create landmark"}
              </button>
            )}
          </div>
        </div>

        <aside className={styles.side}>
          <div className={`${styles.panel} ${styles.cardPad}`}>
            <div className={styles.eyebrow}>Placement summary</div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Location</div>
              <div className={`${styles.summaryValue} ${!selectedLocation ? styles.summaryValueEmpty : ""}`}>
                {selectedLocation?.name ?? "Not selected"}
              </div>
              {selectedLocation ? (
                <div className={styles.summaryPath}>
                  {selectedLocationPath.length ? selectedLocationPath.join(" / ") : "Top-level location"}
                </div>
              ) : null}
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Will appear under</div>
              <div className={styles.roleStack}>
                {selectedLocation?.locationRoles?.length ? (
                  selectedLocation.locationRoles.map((role) => (
                    <span
                      key={`summary-${role}`}
                      className={styles.roleBadge}
                      style={{
                        background: `${ROLE_COLORS[role] ?? "#3b4658"}22`,
                        color: ROLE_COLORS[role] ?? "#b7c0d0",
                      }}
                    >
                      {titleCase(role)}
                    </span>
                  ))
                ) : (
                  <span className={styles.summaryValueEmpty}>Select a location first</span>
                )}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Landmark</div>
              <div className={`${styles.summaryValue} ${!landmark ? styles.summaryValueEmpty : ""}`}>
                {landmark || "Not set"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>URL key</div>
              <div
                className={`${styles.summaryValue} ${styles.summaryValueMono} ${
                  !(slug || landmark) ? styles.summaryValueEmpty : ""
                }`}
              >
                {slug || landmark ? `/${slugify(slug || landmark)}` : "/-"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Icon</div>
              <div className={`${styles.summaryValue} ${!icon ? styles.summaryValueEmpty : ""}`}>
                {icon || "Not set"}
              </div>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.cardPad}`}>
            <div className={styles.tipHeader}>
              <span className={styles.tipIcon}>
                <MapPin size={16} />
              </span>
              Better landmark records
            </div>
            <ul className={styles.tipList}>
              <li>Choose the exact location page where the landmark should surface.</li>
              <li>Landmarks are always attached to area records only.</li>
              <li>Use the public-facing name people already recognize.</li>
              <li>Keep slugs short, readable, and close to the landmark name.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
