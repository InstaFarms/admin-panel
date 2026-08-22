"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Search, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createLocationLandmark,
  deleteLocationLandmark,
  updateLocationLandmark,
} from "@/actions/locationActions";
import type { LocationLandmark, LocationOption } from "@/types/locations";
import styles from "./LocationLandmarkEditor.module.css";

interface LocationLandmarkEditorProps {
  data?: LocationLandmark | null;
  locationOptions: LocationOption[];
}

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

export default function LocationLandmarkEditor({
  data,
  locationOptions,
}: LocationLandmarkEditorProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [landmark, setLandmark] = useState(data?.landmark ?? "");
  const [slug, setSlug] = useState(data?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(data?.slug));
  const [icon, setIcon] = useState(data?.icon ?? "");
  const [locationId, setLocationId] = useState(data?.locationId ?? "");
  const [locationSearch, setLocationSearch] = useState("");
  const areaLocationOptions = useMemo(
    () => locationOptions.filter((location) => location.locationRoles.includes("area") && location.isActive),
    [locationOptions]
  );

  const locationMap = useMemo(
    () => new Map(locationOptions.map((location) => [location.id, location])),
    [locationOptions]
  );

  const getLocationPath = (location: { parentId?: string | null; name: string }): string[] => {
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
    if (!query) return sorted;
    return sorted.filter((location) => {
      const haystack = [
        location.name,
        location.slug,
        location.locationTag,
        ...(location.locationRoles ?? []),
        ...getLocationPath(location),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [areaLocationOptions, locationSearch]);

  const selectedLocation = useMemo(
    () => areaLocationOptions.find((location) => location.id === locationId) ?? null,
    [locationId, areaLocationOptions]
  );

  const handleSubmit = () => {
    if (!landmark.trim()) {
      toast.error("Landmark name is required.");
      return;
    }
    if (!locationId) {
      toast.error("Choose a location for this landmark.");
      return;
    }

    const formData = new FormData();
    formData.set("landmark", landmark.trim());
    formData.set("slug", slugify(slug || landmark));
    formData.set("locationId", locationId);
    if (icon.trim()) formData.set("icon", icon.trim());

    startTransition(async () => {
      try {
        if (data?.id) {
          await updateLocationLandmark(data.id, formData);
          toast.success("Landmark updated successfully.");
          router.refresh();
          return;
        }

        const created = await createLocationLandmark(formData);
        toast.success("Landmark created successfully.");
        router.push(`/admin/locations/landmarks/${created.id}`);
      } catch (error: any) {
        toast.error(error?.message || "Failed to save landmark.");
      }
    });
  };

  const handleDelete = () => {
    if (!data?.id) return;
    if (!window.confirm("Delete this landmark?")) return;

    startTransition(async () => {
      try {
        await deleteLocationLandmark(data.id);
        toast.success("Landmark deleted successfully.");
        router.push("/admin/locations/landmarks");
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete landmark.");
      }
    });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.eyebrow}>
                  {data?.id ? "Landmark setup" : "New landmark"}
                </div>
                <h2 className={styles.sectionTitle}>
                  {data?.id ? "Edit landmark details" : "Create landmark"}
                </h2>
                <p className={styles.sectionSub}>
                  Add a reusable landmark and attach it to the right area so it can surface in the area
                  experience cleanly.
                </p>
              </div>
            </div>

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
                />
                <div className={styles.hint}>
                  Use the most recognizable name people would search for.
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
                  Auto-generated from the name. Edit it if you want a different public URL key.
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
          </section>

          <section className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Attach to an area</h3>
                <p className={styles.sectionSub}>
                  Pick the area where this landmark should appear. Landmarks are always attached to area
                  records.
                </p>
              </div>
            </div>

            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Search areas by name, slug, tag, or role"
              />
            </div>

            <div className={styles.locationList}>
              {filteredLocations.length ? (
                filteredLocations.map((location) => {
                  const selected = location.id === locationId;
                  const path = getLocationPath(location);
                  return (
                    <button
                      key={location.id}
                      type="button"
                      className={`${styles.locationRow} ${selected ? styles.locationRowSelected : ""}`}
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
                        {location.locationRoles.map((role) => (
                          <span
                            key={`${location.id}-${role}`}
                            className={styles.roleBadge}
                            style={{
                              background: `${ROLE_COLORS[role] ?? "#3b4658"}22`,
                              color: ROLE_COLORS[role] ?? "#b7c0d0",
                            }}
                          >
                            {titleCase(role)}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className={styles.emptyState}>No locations match this search.</div>
              )}
            </div>
          </section>

          <div className={styles.actions}>
            {data?.id ? (
              <button
                type="button"
                className={styles.deleteButton}
                disabled={loading}
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                Delete landmark
              </button>
            ) : null}

            <button
              type="button"
              className={styles.primaryButton}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Saving..." : data?.id ? "Save landmark" : "Create landmark"}
            </button>
          </div>
        </div>

        <aside className={styles.side}>
          <div className={`${styles.panel} ${styles.cardPad}`}>
            <div className={styles.eyebrow}>Live summary</div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Landmark</div>
              <div className={`${styles.summaryValue} ${!landmark ? styles.summaryEmpty : ""}`}>
                {landmark || "Not set"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Slug</div>
              <div className={`${styles.summaryValue} ${styles.summaryMono} ${!slug ? styles.summaryEmpty : ""}`}>
                {slug ? `/${slug}` : "/-"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Icon</div>
              <div className={`${styles.summaryValue} ${!icon ? styles.summaryEmpty : ""}`}>
                {icon || "Not set"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryKey}>Linked location</div>
              {selectedLocation ? (
                <div className={styles.locationSummary}>
                  <div className={styles.locationSummaryName}>{selectedLocation.name}</div>
                  <div className={styles.locationSummarySlug}>/{selectedLocation.slug}</div>
                  <div className={styles.roleStack} style={{ marginTop: 10 }}>
                    {selectedLocation.locationRoles.map((role) => (
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
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`${styles.summaryValue} ${styles.summaryEmpty}`}>No location selected</div>
              )}
            </div>
          </div>

          <div className={`${styles.panel} ${styles.cardPad}`}>
            <div className={styles.tipHeader}>
              <span className={styles.tipIcon}>
                <Sparkles size={16} />
              </span>
              Landmark guidance
            </div>
            <ul className={styles.tipList}>
              <li>Pick the location where this landmark should actually show up.</li>
              <li>Landmarks should always be linked to an area record.</li>
              <li>Keep the landmark name clean and human-readable.</li>
              <li>Use a short slug so links stay neat and consistent.</li>
            </ul>
          </div>

          <div className={`${styles.panel} ${styles.cardPad}`}>
            <div className={styles.tipHeader}>
              <span className={styles.tipIcon}>
                <MapPin size={16} />
              </span>
              What happens
            </div>
            <ul className={styles.tipList}>
              <li>This landmark is attached to a single area record.</li>
              <li>The selected area decides the context where it appears.</li>
              <li>You can reopen the entry later to refine the slug or move it.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
