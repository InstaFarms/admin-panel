"use client";

import { useState, useEffect, useCallback } from "react";

import { getAllLocations } from "@/actions/areaActions";
import { getAllAmenities } from "@/actions/amenityActions";
import { getActivitiesInfo } from "@/actions/activityActions";

import { PropertySearchInput, ClientFilters } from "@/types/search";

import { PRICE_SLIDER_MAX } from "@/constants/search";

import { PrimaryFilters } from "@/components/PrimaryFilters";
import { RefinementFilters } from "@/components/RefinementFilters";

interface AdvancedSearchProps {
  onSearch: (filters: PropertySearchInput) => void;
  isLoading?: boolean;
  hasResults: boolean;
  onClientFiltersChange: (filters: ClientFilters) => void;
}

export function AdvancedSearch({ onSearch, isLoading, hasResults, onClientFiltersChange }: AdvancedSearchProps) {
  // --- API data ---
  const [locations, setLocations] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [amenities, setAmenities] = useState<{ id: string; name: string }[]>([]);
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([]);

  // --- Primary filter state (server-side) ---
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState("");

  // --- Client filter state (applied on results) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [googleRating, setGoogleRating] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [bedroomCount, setBedroomCount] = useState<string>("0");
  const [instantBook, setInstantBook] = useState(false);

  // --- UI state ---
  const [error, setError] = useState<string | null>(null);
  const [showAmenities, setShowAmenities] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [amenitySearchTerm, setAmenitySearchTerm] = useState("");
  const [activitySearchTerm, setActivitySearchTerm] = useState("");

  // Fetch filter data on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const locsResult = await getAllLocations();
        if (locsResult?.data) {
          setLocations(
            locsResult.data.map((a: any) => ({
              id: a.id,
              slug: a.slug,
              name: a.area || a.name || "",
            }))
          );
        }
      } catch (e) {
        console.error("Failed to fetch locations", e);
      }

      try {
        const amsResult = await getAllAmenities();
        if (amsResult) {
          setAmenities(amsResult.map((a: any) => ({ id: a.id, name: a.name })));
        }
      } catch (e) {
        console.error("Failed to fetch amenities", e);
      }

      try {
        const actsResult = await getActivitiesInfo();
        if (Array.isArray(actsResult)) {
          setActivities(actsResult.map((a: any) => ({ id: a.id, name: a.name })));
        }
      } catch (e) {
        console.error("Failed to fetch activities", e);
      }
    };

    fetchFilters();
  }, []);

  // Emit client filter changes
  const emitClientFilters = useCallback(() => {
    onClientFiltersChange({
      searchQuery,
      googleRating: googleRating || null,
      priceRange: {
        min: parseInt(priceMin) || 0,
        max: parseInt(priceMax) || PRICE_SLIDER_MAX,
      },
      selectedAmenities,
      selectedActivities,
      bedroomCount: parseInt(bedroomCount) || 0,
      instantBook,
    });
  }, [searchQuery, googleRating, priceMin, priceMax, selectedAmenities, selectedActivities, bedroomCount, instantBook, onClientFiltersChange]);

  useEffect(() => {
    if (hasResults) {
      emitClientFilters();
    }
  }, [hasResults, emitClientFilters]);

  // --- Primary filter handlers ---
  const handleSearch = () => {
    if (selectedLocations.length === 0) {
      setError("Please select at least one location.");
      return;
    }
    setError(null);
    const selectedSlugs = Array.from(
      new Set(
        selectedLocations
          .map((locationId) => {
            const location = locations.find((item) => item.id === locationId);
            if (!location) return "";
            return (
              location.slug ||
              location.name.trim().toLowerCase().replace(/\s+/g, "-")
            );
          })
          .filter((slug): slug is string => Boolean(slug))
      )
    );

    const filters: PropertySearchInput = {
      location: selectedSlugs.join(","),
    };
    onSearch(filters);
  };

  const toggleLocation = (locationId: string) => {
    if (error) setError(null);
    setSelectedLocations(prev =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
    );
  };

  const toggleAllLocations = () => {
    if (error) setError(null);
    setSelectedLocations(prev =>
      prev.length === locations.length ? [] : locations.map((location) => location.id)
    );
  };


  // --- Client filter handlers ---
  const toggleAmenity = (name: string) => {
    setSelectedAmenities(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const toggleActivity = (name: string) => {
    setSelectedActivities(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const clearClientFilters = () => {
    setSearchQuery("");
    setGoogleRating("");
    setPriceMin("");
    setPriceMax("");
    setSelectedAmenities([]);
    setSelectedActivities([]);
    setBedroomCount("0");
    setInstantBook(false);
  };

  const activeClientFilterCount = [
    searchQuery,
    googleRating,
    ((parseInt(priceMin) || 0) > 0 || (parseInt(priceMax) || 0) > 0) && (parseInt(priceMax) || PRICE_SLIDER_MAX) < PRICE_SLIDER_MAX,
    selectedAmenities.length > 0,
    selectedActivities.length > 0,
    parseInt(bedroomCount) > 0,
    instantBook,
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Property Search</h3>

      {error && (
        <div className="p-3 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* ═══════════════ PRIMARY FILTERS (Server-side) ═══════════════ */}
      <PrimaryFilters
        locations={locations}
        selectedLocations={selectedLocations}
        toggleLocation={toggleLocation}
        toggleAllLocations={toggleAllLocations}
        isLocationDropdownOpen={isLocationDropdownOpen}
        setIsLocationDropdownOpen={setIsLocationDropdownOpen}
        locationSearchTerm={locationSearchTerm}
        setLocationSearchTerm={setLocationSearchTerm}
        handleSearch={handleSearch}
        isLoading={isLoading || false}
        error={error}
      />

      {/* ═══════════════ REFINEMENT FILTERS (Client-side) ═══════════════ */}
      {hasResults && (
        <RefinementFilters
          activeClientFilterCount={activeClientFilterCount}
          clearClientFilters={clearClientFilters}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          googleRating={googleRating}
          setGoogleRating={setGoogleRating}
          priceMin={priceMin}
          setPriceMin={setPriceMin}
          priceMax={priceMax}
          setPriceMax={setPriceMax}
          bedroomCount={bedroomCount}
          setBedroomCount={setBedroomCount}
          instantBook={instantBook}
          setInstantBook={setInstantBook}
          showAmenities={showAmenities}
          setShowAmenities={setShowAmenities}
          amenities={amenities}
          selectedAmenities={selectedAmenities}
          toggleAmenity={toggleAmenity}
          amenitySearchTerm={amenitySearchTerm}
          setAmenitySearchTerm={setAmenitySearchTerm}
          showActivities={showActivities}
          setShowActivities={setShowActivities}
          activities={activities}
          selectedActivities={selectedActivities}
          toggleActivity={toggleActivity}
          activitySearchTerm={activitySearchTerm}
          setActivitySearchTerm={setActivitySearchTerm}
        />
      )}
    </div>
  );
}
