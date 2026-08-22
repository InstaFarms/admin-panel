"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import { ToggleSwitch } from "flowbite-react";

import { toggleCouponStatus } from "@/actions/couponActions";

interface CouponStatusToggleProps {
    couponId: string;
    initialStatus: boolean;
}

export default function CouponStatusToggle({ couponId, initialStatus }: CouponStatusToggleProps) {
    const [isActive, setIsActive] = useState(initialStatus);
    const [isPending, startTransition] = useTransition();

    const handleToggle = (checked: boolean) => {
        // Optimistic update
        const previousStatus = isActive;
        setIsActive(checked);

        startTransition(async () => {
            const result = await toggleCouponStatus(couponId, checked);
            if (result.error) {
                // Revert on error
                setIsActive(previousStatus);
                toast.error(result.error);
            } else {
                // Success message optional to reduce noise, or small toast
                // toast.success("Status updated");
            }
        });
    };

    return (
        <ToggleSwitch
            checked={isActive}
            onChange={handleToggle}
            color="blue"
            disabled={isPending}
        />
    );
}
