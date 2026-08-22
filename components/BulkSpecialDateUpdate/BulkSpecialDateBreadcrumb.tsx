"use client";

import { Breadcrumb, BreadcrumbItem } from "flowbite-react";

import { HiHome } from "react-icons/hi";

export default function BulkUpdateBreadcrumb({
    isCreatePage = false,
    basePath = "/admin/properties/bulk-update",
    brandPropertiesPath = "/admin/properties"
}: {
    isCreatePage?: boolean;
    basePath?: string;
    brandPropertiesPath?: string;
}) {
    return (
        <Breadcrumb aria-label="Default breadcrumb example" className="mb-4">
            <BreadcrumbItem href="/admin/dashboard" icon={HiHome}>
                Dashboard
            </BreadcrumbItem>
            <BreadcrumbItem href={brandPropertiesPath}>
                Properties
            </BreadcrumbItem>
            <BreadcrumbItem href={isCreatePage ? basePath : "#"}>
                Bulk Special Date Update
            </BreadcrumbItem>
            {isCreatePage && (
                <BreadcrumbItem href="#">
                    Create
                </BreadcrumbItem>
            )}
        </Breadcrumb>
    );
}
