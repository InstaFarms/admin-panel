import { ClientFilters } from "@/types/search";

export const PRICE_SLIDER_MAX = 100000;

export const DEFAULT_CLIENT_FILTERS: ClientFilters = {
    searchQuery: "",
    googleRating: null,
    priceRange: { min: 0, max: PRICE_SLIDER_MAX },
    selectedAmenities: [],
    selectedActivities: [],
    bedroomCount: 0,
    instantBook: false,
};

export const GOOGLE_RATING_OPTIONS = [
    { value: "3.5-4", label: "3.5 to 4" },
    { value: "4-4.5", label: "4 to 4.5" },
    { value: "4.5+", label: "4.5 above" },
];

export const BEDROOM_OPTIONS = [
    { value: 0, label: "Any" },
    { value: 1, label: "1 Bedroom" },
    { value: 2, label: "2 Bedrooms" },
    { value: 3, label: "3 Bedrooms" },
    { value: 4, label: "4 Bedrooms" },
    { value: 5, label: "5 Bedrooms" },
    { value: 6, label: "6+ Bedrooms" },
];
