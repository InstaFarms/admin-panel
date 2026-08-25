import { SortableProperty as Property } from "@/utils/types";

import { ClientFilters } from "@/types/search";

import { PRICE_SLIDER_MAX } from "@/constants/search";

import { resolveImageSrc } from "@/utils/image";

// Picks a raw (possibly relative Hetzner key) candidate, replicating
// instafarms-new logic. Not resolved yet — see getPropertyImage.
function getRawPropertyImage(p: any): string | null {
    if (!p) return null;

    // 1. coverPhotos
    if (Array.isArray(p.coverPhotos) && p.coverPhotos.length > 0) {
        const first = p.coverPhotos[0];
        if (typeof first === 'string') return first;
        if (first?.thumbnailUrl) return first.thumbnailUrl;
        if (first?.gridUrl) return first.gridUrl;
        if (first?.url) return first.url;
    }

    // 2. coverimages (backward compatibility)
    if (Array.isArray(p.coverimages) && p.coverimages.length > 0) {
        const first = p.coverimages[0];
        if (typeof first === 'string') return first;
        if (first?.thumbnailUrl) return first.thumbnailUrl;
        if (first?.url) return first.url;
    }

    // 3. featured_image
    if (p.featured_image?.url) return p.featured_image.url;

    // 4. gallery
    if (Array.isArray(p.gallery) && p.gallery.length > 0) {
        const first = p.gallery[0];
        if (typeof first === 'string') return first;
        if (first?.url) return first.url;
    }

    return null;
}

// Robust image selection replicating instafarms-new logic. Resolves relative
// Hetzner keys to full URLs; falls back to the local placeholder only when no
// candidate exists or it fails to resolve (never resolve the placeholder itself).
export const getPropertyImage = (p: any): string => {
    const DEFAULT_IMAGE = "/logo.jpg";
    const raw = getRawPropertyImage(p);
    return resolveImageSrc(raw) ?? DEFAULT_IMAGE;
};

// Normalize API property (snake_case or full detail) to display shape expected by UI
export function mapPropertyData(data: any): Property {
    // Debug log for specific property to see raw keys
    if (data && (data.propertyCode === 'HYD1058' || data.code_name === 'HYD1058')) {
        console.log("[mapPropertyData] Raw data for HYD1058:", data);
    }

    const rawGallery = data.gallery || (data.featured_image ? [data.featured_image] : []);
    const gallery = Array.isArray(rawGallery)
        ? rawGallery.map((g: any) => ({ ...g, url: g.url ?? g.photoUrl ?? g.rawUrl ?? "/logo.jpg" }))
        : [];
    const area = typeof data.area === "object" ? data.area?.area : (data.areaName || data.area || "");
    const city = typeof data.city === "object" ? (data.city?.city ?? data.city?.name ?? "") : (data.cityName || data.city || "");

    return {
        ...data,
        propertyName: data.propertyName ?? data.name ?? data.heading ?? "",
        propertyCode: data.propertyCode ?? data.code_name ?? data.property_code_name ?? "",
        bedroomCount: data.bedroomCount ?? data.bedroom_count ?? 0,
        activityNames: data.activityNames ?? [],
        activities: data.activities ?? data.activities_list ?? [],
        area,
        city,
        gallery,
    } as Property;
}

// requiresConfirmation === false means guests can book instantly, without host approval.
// null/undefined means the setting was never configured -- treat that as NOT instant (the safer default).
export function isInstantBooking(requiresConfirmation: boolean | null | undefined): boolean {
    return requiresConfirmation === false;
}

// For display: flips a tri-state requiresConfirmation value into "is instant booking",
// preserving null/undefined instead of coercing it to a boolean.
export function invertRequiresConfirmation(requiresConfirmation: boolean | null | undefined): boolean | null {
    if (requiresConfirmation === true) return false;
    if (requiresConfirmation === false) return true;
    return null;
}

export function applyClientFilters(properties: Property[], filters: ClientFilters): Property[] {
    return properties.filter((p: any) => {
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const name = (p.propertyName || "").toLowerCase();
            const code = (p.propertyCode || p.propertyCodeName || "").toLowerCase();
            if (!name.includes(query) && !code.includes(query)) {
                return false;
            }
        }

        if (filters.googleRating) {
            const rating = parseFloat(p.googlePlaceRating);
            if (isNaN(rating)) return false;
            switch (filters.googleRating) {
                case "3.5-4": if (rating < 3.5 || rating >= 4) return false; break;
                case "4-4.5": if (rating < 4 || rating >= 4.5) return false; break;
                case "4.5+": if (rating < 4.5) return false; break;
            }
        }

        if (filters.priceRange.min > 0 || filters.priceRange.max < PRICE_SLIDER_MAX) {
            const price = p.mondayPriceWithGST || 0;
            if (price === 0) return false;
            if (filters.priceRange.min > 0 && price < filters.priceRange.min) return false;
            if (filters.priceRange.max < PRICE_SLIDER_MAX && price > filters.priceRange.max) return false;
        }

        if (filters.selectedAmenities.length > 0) {
            const propAmenities = (p.amenities || []).map((a: any) => (a.name || "").toLowerCase());
            if (!filters.selectedAmenities.every(am =>
                propAmenities.some((pa: string) => pa.includes(am.toLowerCase()))
            )) return false;
        }

        if (filters.bedroomCount > 0) {
            const propBedrooms = parseInt(p.bedroomCount) || 0;
            console.log(`[applyClientFilters] ${p.propertyCode} bedrooms: ${propBedrooms}, filter: ${filters.bedroomCount}`);
            if (propBedrooms < filters.bedroomCount) return false;
        }

        if (filters.instantBook) {
            if (!isInstantBooking(p.requiresConfirmation)) return false;
        }

        return true;
    });
}
