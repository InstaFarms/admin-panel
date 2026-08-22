"use client";

import { ToggleSwitch } from "flowbite-react";

import { useState } from "react";

import { togglePropertyStatus } from "../actions/propertyActions.ts";

import toast from "react-hot-toast";

interface PropertyStatusToggleProps {
    propertyId: string;
    initialIsLive: boolean;
}

export default function PropertyStatusToggle({
    propertyId,
    initialIsLive,
}: PropertyStatusToggleProps) {
    const [isLive, setIsLive] = useState(initialIsLive);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (checked: boolean) => {
        // Optimistic update
        const previousState = isLive;
        setIsLive(checked);
        setIsLoading(true);

        try {
            const result = await togglePropertyStatus(propertyId, checked);
            if (result.error) {
                setIsLive(previousState); // Revert on error
                toast.error(result.error);
            } else {
                toast.success(result.success || "Property status updated");
            }
        } catch (error) {
            setIsLive(previousState);
            toast.error("Failed to update status");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ToggleSwitch
            checked={isLive}
            onChange={handleToggle}
            disabled={isLoading}
            color="blue"
        />
    );
}
