"use client";

import { Button, Label, TextInput, Checkbox, Spinner } from "flowbite-react";

import { PrimaryFiltersProps } from "@/types/search";

export function PrimaryFilters({
    locations,
    selectedLocations,
    toggleLocation,
    toggleAllLocations,
    isLocationDropdownOpen,
    setIsLocationDropdownOpen,
    locationSearchTerm,
    setLocationSearchTerm,
    handleSearch,
    isLoading,
    error,
}: PrimaryFiltersProps) {
    const filteredLocations = locationSearchTerm
        ? locations.filter((l) => l.name.toLowerCase().includes(locationSearchTerm.toLowerCase()))
        : locations;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location Multi-Select with Search */}
                <div className="relative">
                    <div className="mb-2 block">
                        <Label htmlFor="location">Location</Label>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                        className={`flex items-center justify-between w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border ${error ? "border-red-500" : "border-gray-300"
                            } focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                    >
                        <span className="truncate">
                            {selectedLocations.length === 0
                                ? "Select Locations"
                                : selectedLocations.length === locations.length
                                    ? "All Locations"
                                    : `${selectedLocations.length} Selected`}
                        </span>
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isLocationDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 max-h-72 overflow-hidden flex flex-col">
                            <div className="p-2 border-b dark:border-gray-600">
                                <TextInput
                                    sizing="sm"
                                    placeholder="Search locations..."
                                    value={locationSearchTerm}
                                    onChange={(e) => setLocationSearchTerm(e.target.value)}
                                />
                            </div>
                            <ul className="p-3 space-y-1 text-sm text-gray-700 dark:text-gray-200 overflow-y-auto max-h-56">
                                <li>
                                    <div className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <Checkbox
                                            id="loc-all"
                                            checked={locations.length > 0 && selectedLocations.length === locations.length}
                                            onChange={toggleAllLocations}
                                        />
                                        <Label htmlFor="loc-all" className="w-full ml-2 text-sm font-medium cursor-pointer">
                                            All Locations
                                        </Label>
                                    </div>
                                </li>
                                {filteredLocations.map((loc) => (
                                    <li key={loc.id}>
                                        <div className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                                            <Checkbox
                                                id={`loc-${loc.id}`}
                                                checked={selectedLocations.includes(loc.id)}
                                                onChange={() => toggleLocation(loc.id)}
                                            />
                                            <Label htmlFor={`loc-${loc.id}`} className="w-full ml-2 text-sm font-medium cursor-pointer">
                                                {loc.name}
                                            </Label>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                    {isLoading ? "Searching..." : "Search Properties"}
                </Button>
            </div>
        </>
    );
}
