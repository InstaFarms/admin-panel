"use client";

import { toggleOwnerSettlement } from "@/actions/walletActions";
import { parseServerActionResult } from "@/utils/utils";
import { ToggleSwitch } from "flowbite-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

interface SettlementToggleProps {
  ownerId: string;
  initialEnabled: boolean;
}

export default function SettlementToggle({
  ownerId,
  initialEnabled,
}: SettlementToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    
    startTransition(() => {
      const promise = parseServerActionResult(
        toggleOwnerSettlement(ownerId, checked)
      );

      toast.promise(promise, {
        loading: checked ? "Enabling settlement..." : "Disabling settlement...",
        success: (data) => data,
        error: (err) => {
          // Revert on error
          setEnabled(!checked);
          return (err as Error).message;
        },
      });
    });
  };

  return (
    <div className="flex items-center gap-2">
      <ToggleSwitch
        checked={enabled}
        onChange={handleToggle}
        disabled={loading}
        color={enabled ? "green" : "gray"}
      />
      <span className={`text-sm ${enabled ? "text-green-600" : "text-gray-500"}`}>
        {enabled ? "ON" : "OFF"}
      </span>
    </div>
  );
}