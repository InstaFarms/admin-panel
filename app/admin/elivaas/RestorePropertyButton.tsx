"use client";

import { useTransition } from "react";
import { restoreElivaasProperty } from "@/actions/elivaasActions";
import { useRouter } from "next/navigation";

export default function RestorePropertyButton({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRestore() {
    startTransition(async () => {
      await restoreElivaasProperty(propertyId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRestore}
      disabled={pending}
      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
    >
      {pending ? "Restoring…" : "Restore & Make Visible"}
    </button>
  );
}
