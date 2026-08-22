"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiPencil } from "react-icons/hi";
import { Archive } from "lucide-react";
import { togglePropertyStatus } from "@/actions/propertyActions";

export default function MergePropertyRowActions({
  mergedPropertyId,
  isDisabled,
}: {
  mergedPropertyId: string;
  isDisabled: boolean;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  const onArchive = async () => {
    setIsArchiving(true);
    const result = await togglePropertyStatus(mergedPropertyId, false);
    setIsArchiving(false);
    if (!result?.error) {
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <button
        type="button"
        aria-label="Archive property"
        title="Archive property"
        disabled={isArchiving || isDisabled}
        onClick={onArchive}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isArchiving ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-amber-400 border-t-transparent" />
        ) : (
          <Archive size={14} />
        )}
      </button>

      <Link
        href={`/admin/properties/${mergedPropertyId}`}
        aria-label="Edit property"
        title="Edit"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b2b3d] text-[#7dafd4] transition hover:bg-[#243a50] hover:text-white"
      >
        <HiPencil className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
