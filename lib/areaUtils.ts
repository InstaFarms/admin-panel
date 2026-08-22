import { AREAS_VALIDATION } from "@/constants/areas";

export const validateAreaName = (name: string): string | null => {
    if (!name || name.trim().length === 0) return AREAS_VALIDATION.nameRequired;
    if (name.trim().length < 2) return AREAS_VALIDATION.nameMinLength;
    if (name.trim().length > 100) return AREAS_VALIDATION.nameMaxLength;
    return null;
};

export const validateState = (stateId: string): string | null => {
    if (!stateId || stateId.trim().length === 0) return AREAS_VALIDATION.stateRequired;
    return null;
};

export const validateCity = (cityId: string): string | null => {
    if (!cityId || cityId.trim().length === 0) return AREAS_VALIDATION.cityRequired;
    return null;
};

export const validateSlug = (slug: string): string | null => {
    if (!slug || slug.trim().length === 0) return null;
    if (!/^[a-z0-9-]+$/.test(slug.trim())) return AREAS_VALIDATION.slugInvalid;
    return null;
};

export const getBrandDetailId = (detail?: any | null) =>
    detail?.brandId ?? detail?.brand_id ?? detail?.brand?.id ?? "";

export const generateSlug = (str: string): string =>
    str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
