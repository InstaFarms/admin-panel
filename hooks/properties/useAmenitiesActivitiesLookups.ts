"use client";

import { fetchHelperData } from "@/actions/propertyActions";
import type { Activity, Amenity } from "@/utils/types";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export function useAmenitiesActivitiesLookups() {
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [amenitiesLoaded, setAmenitiesLoaded] = useState(false);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const ensureAmenitiesLoaded = useCallback(async () => {
    if (amenitiesLoaded || amenitiesLoading) return;
    setAmenitiesLoading(true);
    try {
      const result = await fetchHelperData("amenities");
      setAllAmenities((result.data || []) as Amenity[]);
      setAmenitiesLoaded(true);
    } catch (err) {
      console.error("Error loading amenities:", err);
      toast.error("Failed to load amenities");
    } finally {
      setAmenitiesLoading(false);
    }
  }, [amenitiesLoaded, amenitiesLoading]);

  const ensureActivitiesLoaded = useCallback(async () => {
    if (activitiesLoaded || activitiesLoading) return;
    setActivitiesLoading(true);
    try {
      const result = await fetchHelperData("activities");
      setAllActivities((result.data || []) as Activity[]);
      setActivitiesLoaded(true);
    } catch (err) {
      console.error("Error loading activities:", err);
      toast.error("Failed to load activities");
    } finally {
      setActivitiesLoading(false);
    }
  }, [activitiesLoaded, activitiesLoading]);

  return {
    allAmenities,
    allActivities,
    amenitiesLoaded,
    amenitiesLoading,
    activitiesLoaded,
    activitiesLoading,
    ensureAmenitiesLoaded,
    ensureActivitiesLoaded,
  };
}
