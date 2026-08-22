"use client";

import AmenitiesActivitiesSection from "@/components/properties/AmenitiesActivitiesSection";
import { useAmenitiesActivitiesLookups } from "@/hooks/properties/useAmenitiesActivitiesLookups";
import type { ActivityData, AmenityData } from "@/utils/types";
import { useEffect } from "react";
import type { SectionChange } from "./types";

interface AmenitiesTabContainerProps {
  sectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
}

export default function AmenitiesTabContainer({
  sectionData,
  onSectionChange,
}: AmenitiesTabContainerProps) {
  const lookup = useAmenitiesActivitiesLookups();

  useEffect(() => {
    void Promise.all([
      lookup.ensureAmenitiesLoaded(),
      lookup.ensureActivitiesLoaded(),
    ]);
  }, [lookup]);

  const updateArrayAtPath = <T,>(path: string, updater: (prev: T[]) => T[]) => {
    onSectionChange(path, (prev: T[] | undefined) => updater(Array.isArray(prev) ? prev : []));
  };

  return (
    <AmenitiesActivitiesSection
      allAmenities={lookup.allAmenities}
      allActivities={lookup.allActivities}
      amenitiesLoaded={lookup.amenitiesLoaded}
      amenitiesLoading={lookup.amenitiesLoading}
      activitiesLoaded={lookup.activitiesLoaded}
      activitiesLoading={lookup.activitiesLoading}
      ensureAmenitiesLoaded={lookup.ensureAmenitiesLoaded}
      ensureActivitiesLoaded={lookup.ensureActivitiesLoaded}
      amenities={(Array.isArray(sectionData.amenities) ? sectionData.amenities : []) as any[]}
      activities={(Array.isArray(sectionData.activities) ? sectionData.activities : []) as any[]}
      addAmenityWithSelection={(amenity) =>
        updateArrayAtPath<AmenityData>("amenitiesActivities.amenities", (prev) => {
          if (prev.some((item) => item.id === amenity.id)) return prev;
          return [
            ...prev,
            {
              id: amenity.id,
              name: amenity.name,
              weight: prev.length,
              isPaid: amenity.isPaid ?? false,
              isUSP: amenity.isUSP ?? false,
              createdAt: "",
              updatedAt: "",
              adminCreatedBy: "",
              adminUpdatedBy: "",
            },
          ];
        })
      }
      removeAmenity={(id) =>
        updateArrayAtPath<AmenityData>("amenitiesActivities.amenities", (prev) =>
          prev.filter((item) => item.id !== id).map((item, index) => ({ ...item, weight: index })),
        )
      }
      addActivityWithSelection={(activity) =>
        updateArrayAtPath<ActivityData>("amenitiesActivities.activities", (prev) => {
          if (prev.some((item) => item.id === activity.id)) return prev;
          return [
            ...prev,
            {
              id: activity.id,
              name: activity.name,
              weight: prev.length,
              isPaid: activity.isPaid ?? false,
              isUSP: activity.isUSP ?? false,
              createdAt: "",
              updatedAt: "",
              adminCreatedBy: "",
              adminUpdatedBy: "",
            },
          ];
        })
      }
      removeActivity={(id) =>
        updateArrayAtPath<ActivityData>("amenitiesActivities.activities", (prev) =>
          prev.filter((item) => item.id !== id).map((item, index) => ({ ...item, weight: index })),
        )
      }
      handleAmenityDragEnd={(event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        updateArrayAtPath<AmenityData>("amenitiesActivities.amenities", (prev) => {
          const oldIndex = prev.findIndex((item) => item.id === active.id);
          const newIndex = prev.findIndex((item) => item.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return next.map((item, index) => ({ ...item, weight: index }));
        });
      }}
      handleActivityDragEnd={(event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        updateArrayAtPath<ActivityData>("amenitiesActivities.activities", (prev) => {
          const oldIndex = prev.findIndex((item) => item.id === active.id);
          const newIndex = prev.findIndex((item) => item.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return next.map((item, index) => ({ ...item, weight: index }));
        });
      }}
    />
  );
}

