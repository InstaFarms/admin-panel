"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";

import { format } from "date-fns";

import { Button, Card, TextInput, Spinner } from "flowbite-react";

import Image from "next/image";

import { advancedSearchProperties, getPropertyByCode } from "@/actions/propertyActions";

import { AdvancedSearch } from "@/components/AdvancedSearch";

import { ClientFilters } from "@/types/search";

import { DEFAULT_CLIENT_FILTERS } from "@/constants/search";

import { mapPropertyData, applyClientFilters, getPropertyImage } from "@/lib/propertyUtils";

import { SortableProperty as Property } from "@/utils/types";

interface PropertySearchProps {
    onAddProperty: (property: Property) => void;
    selectedProperties: Property[];
    checkinDate: Date | null;
    checkoutDate: Date | null;
    guestCount: number;
    brandName?: string;
}

export default function PropertySearch({ onAddProperty, selectedProperties, checkinDate, checkoutDate, guestCount, brandName }: PropertySearchProps) {
    const [rawSearchResults, setRawSearchResults] = useState<Property[]>([]);
    const [clientFilters, setClientFilters] = useState<ClientFilters>(DEFAULT_CLIENT_FILTERS);
    const [visibleCount, setVisibleCount] = useState(12);
    const [isSearching, setIsSearching] = useState(false);
    const [codeInput, setCodeInput] = useState("");
    const [isSearchingCode, setIsSearchingCode] = useState(false);

    const appType = useMemo(() => {
        if (!brandName) return undefined;
        const b = brandName.toLowerCase();
        if (b === "mago") return "MAGO_ADMIN";
        if (b === "instafarms") return "INSTAFARMS_ADMIN";
        return undefined;
    }, [brandName]);

    const searchResults = useMemo(() => {
        if (rawSearchResults.length === 0) return [];
        // Debug: Inspect data structure of first result
        if (rawSearchResults[0]) {
            console.log("[PropertySearch] First raw result structure:", {
                code: rawSearchResults[0].propertyCode,
                activities: (rawSearchResults[0] as any).activities,
                tags: (rawSearchResults[0] as any).tags,
                gallery: (rawSearchResults[0] as any).gallery?.length,
                coverPhotos: (rawSearchResults[0] as any).coverPhotos?.length
            });
        }
        let filtered = applyClientFilters(rawSearchResults, clientFilters);
        if (brandName) {
            filtered = filtered.filter(p => {
                const pBrand = (p as any).brandName || (p as any).brand_name;
                if (!pBrand) return true; // If property has no brand info, we include it safely.
                return pBrand.toLowerCase() === brandName.toLowerCase();
            });
        }
        console.log(`[PropertySearch] raw: ${rawSearchResults.length}, filtered: ${filtered.length}`, clientFilters, { brandName });
        return filtered;
    }, [rawSearchResults, clientFilters, brandName]);

    const handleClientFiltersChange = useCallback((filters: ClientFilters) => {
        setClientFilters(filters);
        setVisibleCount(12);
    }, []);

    const handleAddByCode = async () => {
        if (!codeInput) return;
        setIsSearchingCode(true);
        const res = await getPropertyByCode(codeInput, { appType });
        setIsSearchingCode(false);

        if (res.data) {
            const mappedProperty = mapPropertyData(res.data);
            const pBrand = (mappedProperty as any).brandName || (mappedProperty as any).brand_name;
            if (brandName && pBrand && pBrand.toLowerCase() !== brandName.toLowerCase()) {
                toast.error(`This property belongs to ${pBrand}, but you are creating a ${brandName} proposal.`);
                return;
            }
            onAddProperty(mappedProperty);
            setCodeInput("");
        } else {
            toast.error(res.error || "Property not found");
        }
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4 dark:text-white">2. Add Properties</h3>

            <div className="mb-6 space-y-4">
                {/* Add by Code Section */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600">
                    <h4 className="text-sm font-semibold mb-2 dark:text-white">Quick Add by Property Code</h4>
                    <div className="flex gap-2">
                        <TextInput
                            placeholder="Enter Property Code (e.g. HYD1000)"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button color="light" onClick={handleAddByCode} disabled={!codeInput || isSearchingCode}>
                            {isSearchingCode ? <Spinner size="sm" /> : "Add"}
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-sm text-gray-500 dark:bg-gray-800">or Search Properties</span>
                    </div>
                </div>

                <AdvancedSearch
                    onSearch={async (filters) => {
                        setIsSearching(true);
                        setVisibleCount(12);
                        setClientFilters(DEFAULT_CLIENT_FILTERS);

                        // Inject parent dates
                        const searchPayload = {
                            ...filters,
                            startdate: checkinDate ? format(checkinDate, "yyyy-MM-dd") : undefined,
                            enddate: checkoutDate ? format(checkoutDate, "yyyy-MM-dd") : undefined,
                            brandName: brandName,
                        };

                        console.log("[PropertySearch] Calling advancedSearchProperties with:", searchPayload, "appType:", appType);
                        const res = await advancedSearchProperties(searchPayload, { appType });
                        console.log("[PropertySearch] Full response from server action:", res);

                        if (res.data) {
                            console.log(`[PropertySearch] Received ${res.data.length} properties from API`);
                            if (res.data.length > 0) {
                                console.log("[PropertySearch] First raw property:", res.data[0]);
                            }
                            const mappedResults = res.data.map(mapPropertyData);
                            console.log(`[PropertySearch] Mapped ${mappedResults.length} properties`);
                            if (mappedResults.length > 0) {
                                console.log("[PropertySearch] First mapped property:", mappedResults[0]);
                            }
                            setRawSearchResults(mappedResults);
                        } else {
                            console.log("[PropertySearch] No results or error:", (res as any).error);
                            setRawSearchResults([]);
                        }
                        setIsSearching(false);
                    }}
                    isLoading={isSearching}
                    hasResults={rawSearchResults.length > 0}
                    onClientFiltersChange={handleClientFiltersChange}
                />
            </div>

            {/* Search Results Display */}
            <div className="space-y-4">
                {rawSearchResults.length > 0 && (
                    <h4 className="font-semibold text-lg">
                        Search Results ({searchResults.length}
                        {searchResults.length !== rawSearchResults.length && (
                            <span className="text-sm font-normal text-gray-500"> of {rawSearchResults.length} total</span>
                        )}
                        )
                    </h4>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
                    {searchResults.slice(0, visibleCount).map((property) => {
                        const isAdded = selectedProperties.some((p) => p.id === property.id);
                        return (
                            <div key={property.id} className="p-3 border rounded hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800 flex flex-col">
                                <div className="h-40 relative bg-gray-200 rounded mb-3 overflow-hidden">
                                    <Image src={getPropertyImage(property)} alt="" fill className="object-cover transition-transform hover:scale-105" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm truncate dark:text-white mb-1" title={property.propertyName}>{property.propertyName}</p>
                                    <p className="text-xs text-gray-500">{property.propertyCode} • {property.area}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 mb-2">
                                        {(property as any).mondayPriceWithGST > 0 && (
                                            <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                                                ₹{Number((property as any).mondayPriceWithGST).toLocaleString("en-IN")}
                                            </span>
                                        )}
                                        {(property as any).googlePlaceRating && (
                                            <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                                                ★ {(property as any).googlePlaceRating}
                                            </span>
                                        )}
                                        {(property as any).bedroomCount > 0 && (
                                            <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded dark:bg-purple-900 dark:text-purple-300">
                                                {(property as any).bedroomCount} BR
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    color={isAdded ? "light" : "blue"}
                                    fullSized
                                    disabled={isAdded}
                                    onClick={() => onAddProperty(property)}
                                >
                                    {isAdded ? "Added" : "Add to Proposal"}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {visibleCount < searchResults.length && (
                    <div className="flex justify-center mt-4">
                        <Button color="light" onClick={() => setVisibleCount((prev) => prev + 12)}>
                            See More
                        </Button>
                    </div>
                )}

                {searchResults.length === 0 && !isSearching && rawSearchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed dark:bg-gray-800 dark:border-gray-700">
                        Use the filters above to find properties. Results will appear here.
                    </div>
                )}

                {searchResults.length === 0 && !isSearching && rawSearchResults.length > 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded border border-dashed dark:bg-gray-800 dark:border-gray-700">
                        No properties match the current refinement filters. Try adjusting or clearing the filters.
                    </div>
                )}
            </div>
        </Card>
    );
}
