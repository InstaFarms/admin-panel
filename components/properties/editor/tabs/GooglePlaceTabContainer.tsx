"use client";

import GooglePlaceSection from "@/components/properties/GooglePlaceSection";
import { useState } from "react";
import type { SectionChange } from "./types";

interface GooglePlaceTabContainerProps {
  sectionData: Record<string, unknown>;
  detailSectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
}

export default function GooglePlaceTabContainer({
  sectionData,
  detailSectionData,
  onSectionChange,
}: GooglePlaceTabContainerProps) {
  const [editingReviewIndex, setEditingReviewIndex] = useState<number | null>(
    null,
  );
  const [editingNearbyIndex, setEditingNearbyIndex] = useState<number | null>(
    null,
  );

  return (
    <GooglePlaceSection
      googlePlaceId={(sectionData.googlePlaceId as string) || ""}
      setGooglePlaceId={(value) => onSectionChange("googlePlace.googlePlaceId", value)}
      latitude={(detailSectionData.latitude as string) || ""}
      longitude={(detailSectionData.longitude as string) || ""}
      googlePlaceRating={(sectionData.googlePlaceRating as string) || "0.00"}
      setGooglePlaceRating={(value) => onSectionChange("googlePlace.googlePlaceRating", value)}
      googlePlaceUserRatingCount={
        typeof sectionData.googlePlaceUserRatingCount === "number"
          ? sectionData.googlePlaceUserRatingCount
          : 0
      }
      setGooglePlaceUserRatingCount={(value) =>
        onSectionChange("googlePlace.googlePlaceUserRatingCount", value)
      }
      googlePlaceReviews={
        (Array.isArray(sectionData.googlePlaceReviews) ? sectionData.googlePlaceReviews : []) as any[]
      }
      setGooglePlaceReviews={(value) => onSectionChange("googlePlace.googlePlaceReviews", value as any)}
      nearbyPlaces={(Array.isArray(sectionData.nearbyPlaces) ? sectionData.nearbyPlaces : []) as any[]}
      setNearbyPlaces={(value) => onSectionChange("googlePlace.nearbyPlaces", value as any)}
      editingReviewIndex={editingReviewIndex}
      setEditingReviewIndex={setEditingReviewIndex}
      editingNearbyIndex={editingNearbyIndex}
      setEditingNearbyIndex={setEditingNearbyIndex}
    />
  );
}

