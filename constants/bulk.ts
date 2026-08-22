export const PERMANENT_PRICE_BREADCRUMBS = {
    list: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/properties", label: "Properties" },
        { href: "#", label: "Permanent Price Update" },
    ],
};

export const OPERATION_TYPES = [
    { value: "set_fixed", label: "Set Fixed Price (₹)" },
    { value: "increase_percentage", label: "Increase by Percentage (%)" },
    { value: "decrease_percentage", label: "Decrease by Percentage (%)" },
    { value: "increase_flat", label: "Increase by Flat Amount (₹)" },
    { value: "decrease_flat", label: "Decrease by Flat Amount (₹)" },
] as const;

export const BULK_VALDIATION_MESSAGES = {
    operationRequired: "Please select an operation type",
    valueRequired: "Please enter a value",
    daysRequired: "Please select at least one day",
    entityRequired: "Please select at least one property or select 'All Properties'",
};
