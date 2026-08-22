export const PROPOSALS_SUCCESS = {
    created: "Proposal created successfully",
    updated: "Proposal updated successfully",
    deleted: "Proposal deleted successfully",
};

export const PROPOSALS_ERRORS = {
    fetchFailed: "Failed to fetch proposals",
    createFailed: "Failed to create proposal",
    updateFailed: "Failed to update proposal",
    deleteFailed: "Failed to delete proposal",
};

export const BREADCRUMBS = {
    list: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/proposals", label: "Proposals" },
    ],
    create: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/proposals", label: "Proposals" },
        { href: "#", label: "Create" },
    ],
    edit: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin" },
        { href: "/admin/proposals", label: "Proposals" },
        { href: "#", label: "Edit" },
    ],
};

export const TABLE_COLUMNS = [
    "S. No.",
    "Customer",
    "Slug",
    "Created At",
    "Valid Till",
    "Properties",
    "Actions",
] as const;
