"use client";

import { recoverProperty } from "@/actions/propertyActions";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

interface RecoverPropertyButtonProps {
  propertyId: string;
}

export default function RecoverPropertyButton({
  propertyId,
}: RecoverPropertyButtonProps) {
  const [loading, startTransition] = useTransition();
  const [optimisticallyRecovered, setOptimisticallyRecovered] = useState(false);
  const router = useRouter();

  if (optimisticallyRecovered) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
        Recovered
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        startTransition(async () => {
          const result = await recoverProperty(propertyId);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          setOptimisticallyRecovered(true);
          toast.success(result.success || "Property recovered");
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RotateCcw size={14} />
      {loading ? "Recovering..." : "Recover"}
    </button>
  );
}
