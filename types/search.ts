export interface PropertySearchInput {
    location?: string;
    startdate?: string;
    enddate?: string;
    GuestCount?: number;
    attributes?: string;
}

export interface ClientFilters {
    searchQuery: string;
    googleRating: string | null;
    priceRange: { min: number; max: number };
    selectedAmenities: string[];
    selectedActivities: string[];
    bedroomCount: number;
    instantBook: boolean;
}

export interface PrimaryFiltersProps {
    locations: { id: string; slug: string; name: string }[];
    selectedLocations: string[];
    toggleLocation: (locationId: string) => void;
    toggleAllLocations: () => void;
    isLocationDropdownOpen: boolean;
    setIsLocationDropdownOpen: (open: boolean) => void;
    locationSearchTerm: string;
    setLocationSearchTerm: (term: string) => void;
    handleSearch: () => void;
    isLoading: boolean;
    error: string | null;
}

export interface RefinementFiltersProps {
    activeClientFilterCount: number;
    clearClientFilters: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    googleRating: string;
    setGoogleRating: (rating: string) => void;
    priceMin: string;
    setPriceMin: (min: string) => void;
    priceMax: string;
    setPriceMax: (max: string) => void;
    bedroomCount: string;
    setBedroomCount: (count: string) => void;
    instantBook: boolean;
    setInstantBook: (instant: boolean) => void;
    showAmenities: boolean;
    setShowAmenities: (show: boolean) => void;
    amenities: { id: string; name: string }[];
    selectedAmenities: string[];
    toggleAmenity: (name: string) => void;
    amenitySearchTerm: string;
    setAmenitySearchTerm: (term: string) => void;
    showActivities: boolean;
    setShowActivities: (show: boolean) => void;
    activities: { id: string; name: string }[];
    selectedActivities: string[];
    toggleActivity: (name: string) => void;
    activitySearchTerm: string;
    setActivitySearchTerm: (term: string) => void;
}
