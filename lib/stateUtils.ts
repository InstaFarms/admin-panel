import { STATES_VALIDATION } from "@/constants/states";

export const generateSlug = (str: string): string =>
    str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

export const validateStateName = (name: string): string | null => {
    if (!name || name.trim().length === 0) return STATES_VALIDATION.nameRequired;
    if (name.trim().length < 2) return STATES_VALIDATION.nameMinLength;
    if (name.trim().length > 100) return STATES_VALIDATION.nameMaxLength;
    return null;
};

export const validateWeight = (value: string): string | null => {
    if (value === "" || value === undefined) return null; // optional
    if (isNaN(parseFloat(value))) return STATES_VALIDATION.weightInvalid;
    return null;
};
