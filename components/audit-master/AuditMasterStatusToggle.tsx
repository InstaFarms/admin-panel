"use client";

import { ToggleSwitch } from "flowbite-react";

import { useState } from "react";
import toast from "react-hot-toast";

import { updateAuditMasterItem } from "@/actions/auditMasterActions";

interface AuditMasterStatusToggleProps {
    type: "area-categories" | "checklist-categories" | "checklist-items" | "issue-types";
    id: string;
    initialStatus: boolean;
}

export default function AuditMasterStatusToggle({
    type,
    id,
    initialStatus,
}: AuditMasterStatusToggleProps) {
    const [isActive, setIsActive] = useState(initialStatus);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (checked: boolean) => {
        const previousState = isActive;
        setIsActive(checked);
        setIsLoading(true);

        try {
            const result = await updateAuditMasterItem(type, id, { isActive: checked });
            if (!result.success) {
                setIsActive(previousState);
                toast.error(result.message || "Failed to update status");
            } else {
                toast.success(`Status updated to ${checked ? "Active" : "Inactive"}`);
            }
        } catch (error) {
            setIsActive(previousState);
            toast.error("An error occurred while updating status");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToggleSwitch
            checked={isActive}
            onChange={handleToggle}
            disabled={isLoading}
        />
    );
}
