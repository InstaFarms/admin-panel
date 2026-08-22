"use client";

import { ToggleSwitch } from "flowbite-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { togglePropertyAuditConfigLock } from "@/actions/propertyActions";

export default function PropertyAuditConfigLockToggle({
  propertyId,
  initialIsLocked,
}: {
  propertyId: string;
  initialIsLocked: boolean;
}) {
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    const previous = isLocked;
    setIsLocked(checked);
    setIsLoading(true);
    try {
      const result = await togglePropertyAuditConfigLock(propertyId, checked);
      if (result.error) {
        setIsLocked(previous);
        toast.error(result.error);
      } else {
        toast.success(result.success || "Audit lock updated");
      }
    } catch {
      setIsLocked(previous);
      toast.error("Failed to update audit lock");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1" title={isLocked ? "Only admins can edit audit setup" : "Hosts and supervisors can edit audit setup"}>
      <ToggleSwitch checked={isLocked} onChange={handleToggle} disabled={isLoading} color="red" />
      <span className="text-xs text-gray-500">{isLocked ? "Locked" : "Unlocked"}</span>
    </div>
  );
}
