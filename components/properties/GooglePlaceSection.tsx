"use client";

import { Button, Textarea, TextInput } from "flowbite-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionHeading from "@/components/properties/SectionHeading";

const MapWithPins = dynamic(() => import("@/components/MapWithPins"), { ssr: false });

type GooglePlaceReview = {
  author_name: string;
  author_url?: string;
  language?: string;
  original_language?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  translated?: boolean;
};

type NearbyPlace = {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  lat: number;
  lng: number;
  distanceKm?: number;
};

interface GooglePlaceSectionProps {
  googlePlaceId?: string;
  setGooglePlaceId?: (value: string) => void;
  latitude?: string;
  longitude?: string;
  googlePlaceRating: string;
  setGooglePlaceRating: (value: string) => void;
  googlePlaceUserRatingCount: number;
  setGooglePlaceUserRatingCount: (value: number) => void;
  googlePlaceReviews: GooglePlaceReview[];
  setGooglePlaceReviews: (
    value: GooglePlaceReview[] | ((prev: GooglePlaceReview[]) => GooglePlaceReview[])
  ) => void;
  nearbyPlaces: NearbyPlace[];
  setNearbyPlaces: (value: NearbyPlace[] | ((prev: NearbyPlace[]) => NearbyPlace[])) => void;
  editingReviewIndex: number | null;
  setEditingReviewIndex: (
    value: number | null | ((prev: number | null) => number | null)
  ) => void;
  editingNearbyIndex: number | null;
  setEditingNearbyIndex: (value: number | null) => void;
}

const EARTH_RADIUS_KM = 6371;
const DEFAULT_VISIBLE_NEARBY_LOCATIONS = 5;
const DEFAULT_VISIBLE_REVIEWS = 5;
const LABEL_CLASS = "mb-0.5 block text-xs text-gray-500 dark:text-gray-400";
const SECTION_CARD_CLASS =
  "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

function parsePropertyCoords(
  latitude?: string,
  longitude?: string,
): { propLat: number; propLng: number; hasCoords: boolean } {
  const propLat = latitude != null && latitude !== "" ? parseFloat(latitude) : Number.NaN;
  const propLng = longitude != null && longitude !== "" ? parseFloat(longitude) : Number.NaN;
  const hasCoords = !Number.isNaN(propLat) && !Number.isNaN(propLng);
  return { propLat, propLng, hasCoords };
}

function distanceFromProperty(
  propLat: number,
  propLng: number,
  placeLat: number,
  placeLng: number,
): number | undefined {
  if (Number.isNaN(propLat) || Number.isNaN(propLng)) return undefined;
  return haversineDistanceKm(propLat, propLng, placeLat, placeLng);
}

function NearbyPlaceListItem({
  place,
  index,
  isEditing,
  editingNearbyIndex,
  propertyLat,
  propertyLng,
  setNearbyPlaces,
  setEditingNearbyIndex,
}: {
  place: NearbyPlace;
  index: number;
  isEditing: boolean;
  editingNearbyIndex: number | null;
  propertyLat: number;
  propertyLng: number;
  setNearbyPlaces: (value: NearbyPlace[] | ((prev: NearbyPlace[]) => NearbyPlace[])) => void;
  setEditingNearbyIndex: (value: number | null) => void;
}) {
  const updatePlace = (partial: Partial<NearbyPlace>) => {
    setNearbyPlaces((prev) => prev.map((p, i) => (i === index ? { ...p, ...partial } : p)));
  };

  const updateLat = (newLat: number) => {
    const distanceKm = distanceFromProperty(propertyLat, propertyLng, newLat, place.lng);
    updatePlace({ lat: newLat, ...(distanceKm != null && { distanceKm }) });
  };

  const updateLng = (newLng: number) => {
    const distanceKm = distanceFromProperty(propertyLat, propertyLng, place.lat, newLng);
    updatePlace({ lng: newLng, ...(distanceKm != null && { distanceKm }) });
  };

  const removePlace = () => {
    setNearbyPlaces((prev) => prev.filter((_, i) => i !== index));
    if (isEditing) {
      setEditingNearbyIndex(null);
      return;
    }

    if (editingNearbyIndex != null && editingNearbyIndex > index) {
      setEditingNearbyIndex(editingNearbyIndex - 1);
    }
  };

  if (isEditing) {
    return (
      <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-1">
            <label className={LABEL_CLASS}>Name</label>
            <TextInput value={place.name} onChange={(e) => updatePlace({ name: e.target.value })} />
          </div>
          <div className="xl:col-span-1">
            <label className={LABEL_CLASS}>Vicinity / Address</label>
            <TextInput
              value={place.vicinity}
              onChange={(e) => updatePlace({ vicinity: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Latitude</label>
            <TextInput
              type="number"
              step="any"
              value={place.lat}
              onChange={(e) => updateLat(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Longitude</label>
            <TextInput
              type="number"
              step="any"
              value={place.lng}
              onChange={(e) => updateLng(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {place.distanceKm != null ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{place.distanceKm} km from property</p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" size="xs" color="blue" onClick={() => setEditingNearbyIndex(null)}>
              Save
            </Button>
            <Button type="button" size="xs" color="gray" onClick={() => setEditingNearbyIndex(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
          <span className="font-medium text-gray-900 dark:text-white">{place.name || "--"}</span>
          {place.vicinity && <span className="truncate text-gray-500 dark:text-gray-400">- {place.vicinity}</span>}
          {place.distanceKm != null && (
            <span
              className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400"
              title="Distance from property (Haversine)"
            >
              {place.distanceKm} km
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" size="xs" color="light" onClick={() => setEditingNearbyIndex(index)}>
            Edit
          </Button>
          <Button type="button" size="xs" color="failure" onClick={removePlace}>
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

function GooglePlaceReviewCard({
  review,
  isEditing,
  onToggleEdit,
  onUpdateReview,
  onRemove,
}: {
  review: GooglePlaceReview;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdateReview: (partial: Partial<GooglePlaceReview>) => void;
  onRemove: () => void;
}) {
  const metaParts = [
    review.language && `lang: ${review.language}`,
    review.original_language &&
      review.original_language !== review.language &&
      `original: ${review.original_language}`,
    review.translated && "Translated",
  ].filter(Boolean);
  const initials =
    review.author_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";
  const normalizedRating = Math.max(0, Math.min(5, Number(review.rating) || 0));
  const roundedRating = Math.round(normalizedRating);
  const ratingTone =
    normalizedRating >= 4.5
      ? {
          chip: "border-emerald-300/70 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-900/20",
          text: "text-emerald-800 dark:text-emerald-200",
          star: "text-emerald-500",
        }
      : normalizedRating >= 3
        ? {
            chip: "border-amber-300/70 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20",
            text: "text-amber-800 dark:text-amber-200",
            star: "text-amber-500",
          }
        : {
            chip: "border-rose-300/70 bg-rose-50 dark:border-rose-700/60 dark:bg-rose-900/20",
            text: "text-rose-800 dark:text-rose-200",
            star: "text-rose-500",
          };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-700">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          {review.author_url ? (
            <a
              href={review.author_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {review.author_name}
            </a>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white">{review.author_name}</span>
          )}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {review.relative_time_description}
          </span>
          {metaParts.length > 0 && (
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{metaParts.join(" | ")}</span>
          )}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 ${ratingTone.chip}`}>
          <span className={`text-xs font-semibold ${ratingTone.text}`}>
            {normalizedRating.toFixed(1)}
          </span>
          <div
            className="flex items-center gap-0.5"
            aria-label={`Rating ${normalizedRating.toFixed(1)} out of 5`}
            title={`Rating: ${normalizedRating.toFixed(1)} / 5`}
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const filled = idx < roundedRating;
              return (
                <svg
                  key={idx}
                  viewBox="0 0 20 20"
                  className={`h-3.5 w-3.5 ${filled ? ratingTone.star : "text-slate-300 dark:text-slate-600"}`}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.8l-5.2 2.71.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
                </svg>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="xs" color={isEditing ? "gray" : "light"} onClick={onToggleEdit}>
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button type="button" size="xs" color="failure" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Reviewer Name</label>
              <TextInput
                value={review.author_name}
                onChange={(e) => onUpdateReview({ author_name: e.target.value })}
                placeholder="Enter reviewer name"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Rating</label>
              <div className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const filled = value <= roundedRating;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onUpdateReview({ rating: value })}
                      className={`text-lg leading-none transition ${filled ? ratingTone.star : "text-slate-300 dark:text-slate-600"} hover:scale-110`}
                      aria-label={`Set ${value} star rating`}
                      title={`${value} star${value > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  );
                })}
                <span className={`ml-2 text-xs font-semibold ${ratingTone.text}`}>
                  {normalizedRating.toFixed(1)} / 5
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Review</label>
            <Textarea
              value={review.text}
              onChange={(e) => onUpdateReview({ text: e.target.value })}
              placeholder="No review text"
              rows={Math.max(2, Math.min(20, (review.text?.split("\n").length ?? 1) + 1))}
              className="min-h-0 text-sm"
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 px-3 py-2.5 text-sm leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {review.text || <span className="italic text-gray-500 dark:text-gray-400">No review text</span>}
        </p>
      )}

      {review.time > 0 && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Posted:{" "}
          {new Date(review.time * 1000).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </p>
      )}
    </div>
  );
}

export default function GooglePlaceSection({
  googlePlaceId,
  setGooglePlaceId,
  latitude,
  longitude,
  googlePlaceRating,
  setGooglePlaceRating,
  googlePlaceUserRatingCount,
  setGooglePlaceUserRatingCount,
  googlePlaceReviews,
  setGooglePlaceReviews,
  nearbyPlaces,
  setNearbyPlaces,
  editingReviewIndex,
  setEditingReviewIndex,
  editingNearbyIndex,
  setEditingNearbyIndex,
}: GooglePlaceSectionProps) {
  const [showAllNearbyLocations, setShowAllNearbyLocations] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { propLat, propLng, hasCoords } = parsePropertyCoords(latitude, longitude);
  const hasProp = hasCoords;

  const hasRating =
    googlePlaceRating != null &&
    googlePlaceRating !== "" &&
    googlePlaceRating !== "0" &&
    googlePlaceRating !== "0.00";
  const hasReviewCount = googlePlaceUserRatingCount != null && googlePlaceUserRatingCount > 0;
  const hasReviews = googlePlaceReviews.length > 0;
  const hasLocations = nearbyPlaces.length > 0;
  const hasGooglePlaceData = hasRating || hasReviewCount || hasReviews || hasLocations;
  const canShowMap = hasProp || hasLocations;
  const visibleNearbyPlaces = showAllNearbyLocations
    ? nearbyPlaces
    : nearbyPlaces.slice(0, DEFAULT_VISIBLE_NEARBY_LOCATIONS);
  const hiddenNearbyCount = Math.max(
    0,
    nearbyPlaces.length - DEFAULT_VISIBLE_NEARBY_LOCATIONS,
  );
  const visibleReviews = showAllReviews
    ? googlePlaceReviews
    : googlePlaceReviews.slice(0, DEFAULT_VISIBLE_REVIEWS);
  const hiddenReviewCount = Math.max(
    0,
    googlePlaceReviews.length - DEFAULT_VISIBLE_REVIEWS,
  );

  useEffect(() => {
    if (
      editingNearbyIndex != null &&
      editingNearbyIndex >= DEFAULT_VISIBLE_NEARBY_LOCATIONS
    ) {
      setShowAllNearbyLocations(true);
    }
  }, [editingNearbyIndex]);

  useEffect(() => {
    if (editingReviewIndex != null && editingReviewIndex >= DEFAULT_VISIBLE_REVIEWS) {
      setShowAllReviews(true);
    }
  }, [editingReviewIndex]);

  const handleFetchGoogleData = async () => {
    const placeId = googlePlaceId?.trim();

    if (!placeId && !hasCoords) {
      toast.error("Enter Google Place ID or set property latitude/longitude (Location tab)");
      return;
    }

    try {
      const params = new URLSearchParams();
      if (placeId) params.set("place_id", placeId);
      if (hasCoords) {
        params.set("lat", String(propLat));
        params.set("lng", String(propLng));
      }

      const res = await fetch(`/api/google/place-details?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch details");

      setGooglePlaceRating(String(data.rating ?? "0.0"));
      setGooglePlaceUserRatingCount(data.user_ratings_total ?? 0);
      setGooglePlaceReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setNearbyPlaces(Array.isArray(data.nearbyPlaces) ? data.nearbyPlaces : []);
      toast.success("Fetched rating, reviews and nearby places");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fetch failed";
      toast.error(message);
    }
  };

  const handleAddLocation = () => {
    const newLat = hasCoords ? propLat : 0;
    const newLng = hasCoords ? propLng : 0;
    const distanceKm = hasCoords
      ? haversineDistanceKm(propLat, propLng, newLat, newLng)
      : undefined;

    setNearbyPlaces((prev) => [
      {
        place_id: `manual-${Date.now()}`,
        name: "New location",
        vicinity: "",
        types: [],
        lat: newLat,
        lng: newLng,
        distanceKm,
      },
      ...prev,
    ]);

    setEditingNearbyIndex(0);
  };

  const handleAddReview = () => {
    setGooglePlaceReviews((prev) => [
      {
        author_name: "Manual Review",
        language: "en",
        rating: 5,
        relative_time_description: "just now",
        text: "",
        time: Math.floor(Date.now() / 1000),
      },
      ...prev,
    ]);
    setEditingReviewIndex(0);
    setShowAllReviews(false);
  };

  const handleRemoveReview = (index: number) => {
    setGooglePlaceReviews((prev) => prev.filter((_, i) => i !== index));
    setEditingReviewIndex((prev) => {
      if (prev == null) return prev;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <section className={SECTION_CARD_CLASS}>
        <SectionHeading
          title="Google Place Source"
          description="Provide a Google Place ID, then fetch rating, reviews, and nearby places."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <label
              htmlFor="googlePlaceId"
              className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              Google Place ID
            </label>
            <TextInput
              id="googlePlaceId"
              name="googlePlaceId"
              type="text"
              placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
              value={googlePlaceId ?? ""}
              onChange={(e) => setGooglePlaceId?.(e.target.value)}
              className="w-full"
            />
          </div>
          <Button type="button" color="blue" className="w-full xl:w-auto" onClick={handleFetchGoogleData}>
            Fetch Google Data
          </Button>
        </div>
      </section>

      {hasGooglePlaceData && (
        <>
          <section className={SECTION_CARD_CLASS}>
            <SectionHeading
              title="Google Data Snapshot"
              description="Read-only metrics pulled from Google Place details."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Rating
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{googlePlaceRating || "--"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Reviews
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {googlePlaceUserRatingCount ?? 0}
                </p>
              </div>
            </div>
          </section>

          {canShowMap && (
            <section className={SECTION_CARD_CLASS}>
              <SectionHeading
                title="Map & Nearby Locations"
                description="Review and maintain nearby places shown around this property."
              />

              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden />
                  Property
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-blue-500" aria-hidden />
                  Nearby locations
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-600 dark:bg-gray-800">
                <MapWithPins
                  propertyLat={hasProp ? propLat : null}
                  propertyLng={hasProp ? propLng : null}
                  nearbyPlaces={nearbyPlaces.map((p) => ({
                    lat: p.lat,
                    lng: p.lng,
                    name: p.name,
                    vicinity: p.vicinity,
                  }))}
                  highlightedNearbyIndex={editingNearbyIndex}
                  height={420}
                />
              </div>

              {hasLocations && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nearby locations - editable
                    </h4>
                    <Button type="button" size="xs" color="light" onClick={handleAddLocation}>
                      Add location
                    </Button>
                  </div>
                  <ul className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                    {visibleNearbyPlaces.map((p, idx) => (
                      <NearbyPlaceListItem
                        key={p.place_id || idx}
                        place={p}
                        index={idx}
                        isEditing={editingNearbyIndex === idx}
                        editingNearbyIndex={editingNearbyIndex}
                        propertyLat={propLat}
                        propertyLng={propLng}
                        setNearbyPlaces={setNearbyPlaces}
                        setEditingNearbyIndex={setEditingNearbyIndex}
                      />
                    ))}
                  </ul>
                  {nearbyPlaces.length > DEFAULT_VISIBLE_NEARBY_LOCATIONS && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="xs"
                        color="light"
                        onClick={() =>
                          setShowAllNearbyLocations((prev) => !prev)
                        }
                      >
                        {showAllNearbyLocations
                          ? "See less"
                          : `See more (${hiddenNearbyCount} more)`}
                      </Button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Edit name, address, or coordinates. Click "Update" below to save to the property.
                  </p>
                </div>
              )}

              {hasProp && !hasLocations && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Set Google Place ID above and click "Fetch Google Data" to load nearby places on the map.
                </p>
              )}
            </section>
          )}

          <section className={SECTION_CARD_CLASS}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                title="Google Place Reviews"
                description="Review and edit fetched review text before saving property updates."
                className="mb-0"
              />
              <Button type="button" size="xs" color="light" onClick={handleAddReview}>
                Add review
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
              {visibleReviews.length > 0 ? (
                visibleReviews.map((review, idx) => (
                  <GooglePlaceReviewCard
                    key={`${review.time}-${idx}`}
                    review={review}
                    isEditing={editingReviewIndex === idx}
                    onToggleEdit={() => setEditingReviewIndex((prev) => (prev === idx ? null : idx))}
                    onUpdateReview={(partial) =>
                      setGooglePlaceReviews((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, ...partial } : r)),
                      )
                    }
                    onRemove={() => handleRemoveReview(idx)}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No reviews yet. Click &quot;Add review&quot; to create one.
                </p>
              )}
            </div>
            {googlePlaceReviews.length > DEFAULT_VISIBLE_REVIEWS && (
              <div className="mt-2">
                <Button
                  type="button"
                  size="xs"
                  color="light"
                  onClick={() => setShowAllReviews((prev) => !prev)}
                >
                  {showAllReviews
                    ? "See less"
                    : `See more (${hiddenReviewCount} more)`}
                </Button>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {googlePlaceReviews.length} review(s). Click "Update" below to save these to the property.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

