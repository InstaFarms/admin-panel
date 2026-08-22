"use client";

import { ToggleSwitch } from "flowbite-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { togglePropertyBrandStatus } from "@/actions/propertyActions";

interface PropertyBrandStatusToggleProps {
  propertyId: string;
  brandId: string;
  brandName: string;
  initialIsActive: boolean;
}

export default function PropertyBrandStatusToggle({
  propertyId,
  brandId,
  brandName,
  initialIsActive,
}: PropertyBrandStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    const previousState = isActive;
    setIsActive(checked);
    setIsLoading(true);

    try {
      const result = await togglePropertyBrandStatus(
        propertyId,
        brandId,
        brandName,
        checked
      );
      if (result.error) {
        setIsActive(previousState);
        toast.error(result.error);
      } else {
        toast.success(result.success || `${brandName} status updated`);
      }
    } catch {
      setIsActive(previousState);
      toast.error("Failed to update brand status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToggleSwitch
      checked={isActive}
      onChange={handleToggle}
      disabled={isLoading}
      color="blue"
    />
  );
}
