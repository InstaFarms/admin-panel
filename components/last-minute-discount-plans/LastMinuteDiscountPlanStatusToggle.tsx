"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ToggleSwitch } from "flowbite-react";

import { toggleLastMinuteDiscountPlanStatus } from "@/actions/lastMinuteDiscountPlanActions";
import type { PlanBrandScope } from "@/constants/planBrandScope";

interface LastMinuteDiscountPlanStatusToggleProps {
  planId: string;
  initialStatus: boolean;
  adminScope?: PlanBrandScope;
}

export default function LastMinuteDiscountPlanStatusToggle({
  planId,
  initialStatus,
  adminScope = "instafarms",
}: LastMinuteDiscountPlanStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    const previousStatus = isActive;
    setIsActive(checked);

    startTransition(async () => {
      const result = await toggleLastMinuteDiscountPlanStatus(planId, checked, adminScope);
      if (result.error) {
        setIsActive(previousStatus);
        toast.error(result.error);
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
