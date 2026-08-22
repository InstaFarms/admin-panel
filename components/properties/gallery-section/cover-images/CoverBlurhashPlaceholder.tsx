"use client";

import { Blurhash } from "react-blurhash";

interface CoverBlurhashPlaceholderProps {
  /** BlurHash string from cover photo. Only renders when non-empty. */
  blurHash: string | null | undefined;
  /** Optional className for the wrapper (e.g. "absolute inset-0 w-full h-full"). */
  className?: string;
}

export default function CoverBlurhashPlaceholder({
  blurHash,
  className = "absolute inset-0 w-full h-full",
}: CoverBlurhashPlaceholderProps) {
  const hash = typeof blurHash === "string" ? blurHash.trim() : "";
  if (!hash) return null;

  return (
    <div className={className} aria-hidden>
      <Blurhash
        hash={hash}
        width="100%"
        height="100%"
        resolutionX={32}
        resolutionY={24}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}
