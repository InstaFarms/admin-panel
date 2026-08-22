"use client";

import { Label, TextInput, Checkbox, Select, ToggleSwitch } from "flowbite-react";

import { RefinementFiltersProps } from "@/types/search";

import { GOOGLE_RATING_OPTIONS, BEDROOM_OPTIONS } from "@/constants/search";

export function RefinementFilters({
    activeClientFilterCount,
    clearClientFilters,
    searchQuery,
    setSearchQuery,
    googleRating,
    setGoogleRating,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    bedroomCount,
    setBedroomCount,
    instantBook,
    setInstantBook,
    showAmenities,
    setShowAmenities,
    amenities,
    selectedAmenities,
    toggleAmenity,
    amenitySearchTerm,
    setAmenitySearchTerm,
    showActivities,
    setShowActivities,
    activities,
    selectedActivities,
    toggleActivity,
    activitySearchTerm,
    setActivitySearchTerm,
}: RefinementFiltersProps) {
    const filteredAmenities = amenitySearchTerm
        ? amenities.filter((a) => a.name.toLowerCase().includes(amenitySearchTerm.toLowerCase()))
        : amenities;

    const filteredActivities = activitySearchTerm
        ? activities.filter((a) => a.name.toLowerCase().includes(activitySearchTerm.toLowerCase()))
        : activities;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                    Refine Results
                    {activeClientFilterCount > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            {activeClientFilterCount} active
                        </span>
                    )}
                </h4>
                {activeClientFilterCount > 0 && (
                    <button
                        onClick={clearClientFilters}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                        Clear All Filters
                    </button>
                )}
            </div>

            {/* Row 1: Search */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="searchQuery">Search by Name / Code</Label>
                    </div>
                    <TextInput
                        id="searchQuery"
                        placeholder="Type property name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={() => (
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        )}
                    />
                </div>
            </div>

            {/* Row 2: Google Rating, Price Range, Bedrooms, Instant Book */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="googleRating">Google Rating</Label>
                    </div>
                    <Select id="googleRating" value={googleRating} onChange={(e) => setGoogleRating(e.target.value)}>
                        <option value="">Any Rating</option>
                        {GOOGLE_RATING_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <div className="mb-2 block">
                        <Label>Price Range (per night)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <TextInput
                            sizing="sm"
                            type="number"
                            placeholder="Min"
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                            className="flex-1"
                        />
                        <span className="text-gray-500 text-sm">to</span>
                        <TextInput
                            sizing="sm"
                            type="number"
                            placeholder="Max"
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                            className="flex-1"
                        />
                    </div>
                </div>

                <div>
                    <div className="mb-2 block">
                        <Label htmlFor="bedroomCount">Bedrooms</Label>
                    </div>
                    <Select id="bedroomCount" value={bedroomCount} onChange={(e) => setBedroomCount(e.target.value)}>
                        {BEDROOM_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="flex items-center gap-3 pb-1">
                    <ToggleSwitch checked={instantBook} onChange={setInstantBook} label="Instant Book Only" />
                </div>
            </div>

            {/* Key Amenities (Collapsible) */}
            <div className="border rounded-lg dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => setShowAmenities(!showAmenities)}
                    className="flex items-center justify-between w-full p-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                    <span>
                        Key Amenities
                        {selectedAmenities.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                {selectedAmenities.length} selected
                            </span>
                        )}
                    </span>
                    <svg
                        className={`w-4 h-4 transition-transform ${showAmenities ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {showAmenities && (
                    <div className="p-3 border-t dark:border-gray-700 space-y-2">
                        <TextInput
                            sizing="sm"
                            placeholder="Search amenities..."
                            value={amenitySearchTerm}
                            onChange={(e) => setAmenitySearchTerm(e.target.value)}
                        />
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pt-1">
                            {filteredAmenities.map((amenity) => (
                                <div key={amenity.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`amenity-${amenity.id}`}
                                        checked={selectedAmenities.includes(amenity.name)}
                                        onChange={() => toggleAmenity(amenity.name)}
                                    />
                                    <Label htmlFor={`amenity-${amenity.id}`} className="text-sm cursor-pointer">
                                        {amenity.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
