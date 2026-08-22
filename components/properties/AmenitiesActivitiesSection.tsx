"use client";

import { useRef } from "react";
import { Activity, ActivityData, Amenity, AmenityData } from "@/utils/types";
import { TabItem, Tabs } from "flowbite-react";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SectionHeading from "@/components/properties/SectionHeading";
import AddAmenitySearchBar from "@/components/common/AddAmenitySearchBar";
import AddActivitySearchBar from "@/components/common/AddActivitySearchBar";
import SortableAmenityRow from "@/components/common/SortableAmenityRow";
import SortableActivityRow from "@/components/common/SortableActivityRow";
import { useFlipListTransition } from "@/hooks/useFlipListTransition";

interface AmenitiesActivitiesSectionProps {
  allAmenities: Amenity[];
  allActivities: Activity[];
  amenitiesLoaded?: boolean;
  amenitiesLoading?: boolean;
  activitiesLoaded?: boolean;
  activitiesLoading?: boolean;
  ensureAmenitiesLoaded?: () => Promise<void>;
  ensureActivitiesLoaded?: () => Promise<void>;
  amenities: AmenityData[];
  activities: ActivityData[];
  addAmenityWithSelection: (amenity: Amenity) => void;
  removeAmenity: (id: string) => void;
  addActivityWithSelection: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  handleAmenityDragEnd: (event: DragEndEvent) => void;
  handleActivityDragEnd: (event: DragEndEvent) => void;
}

export default function AmenitiesActivitiesSection({
  allAmenities,
  allActivities,
  amenitiesLoaded = true,
  amenitiesLoading = false,
  activitiesLoaded = true,
  activitiesLoading = false,
  ensureAmenitiesLoaded = async () => {},
  ensureActivitiesLoaded = async () => {},
  amenities,
  activities,
  addAmenityWithSelection,
  removeAmenity,
  addActivityWithSelection,
  removeActivity,
  handleAmenityDragEnd,
  handleActivityDragEnd,
}: AmenitiesActivitiesSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Smooths the reflow when a row is added/removed via a button click (dnd-kit
  // already animates the live drag itself, so drag-end reordering is untouched).
  const amenitiesBodyRef = useRef<HTMLTableSectionElement>(null);
  const activitiesBodyRef = useRef<HTMLTableSectionElement>(null);
  const captureAmenitiesFlip = useFlipListTransition(amenitiesBodyRef, amenities);
  const captureActivitiesFlip = useFlipListTransition(activitiesBodyRef, activities);

  const handleAddAmenity = (amenity: Amenity) => {
    captureAmenitiesFlip();
    addAmenityWithSelection(amenity);
  };
  const handleRemoveAmenity = (id: string) => {
    captureAmenitiesFlip();
    removeAmenity(id);
  };
  const handleAddActivity = (activity: Activity) => {
    captureActivitiesFlip();
    addActivityWithSelection(activity);
  };
  const handleRemoveActivity = (id: string) => {
    captureActivitiesFlip();
    removeActivity(id);
  };

  const sectionCardClass =
    "w-full border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";
  const tableShellClass =
    "overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800";
  const amenityAvailableCount = amenitiesLoaded
    ? Math.max(0, allAmenities.length - amenities.length)
    : null;
  const activityAvailableCount = activitiesLoaded
    ? Math.max(0, allActivities.length - activities.length)
    : null;

  return (
    <div className="flex justify-center">
      
    <Tabs className="w-full max-w-[1100px]">
      <TabItem title="Amenities">
        <div className="w-full space-y-5">
          <section className={sectionCardClass}>
            <SectionHeading
              title="Amenities"
              description="Search, add, reorder, and manage amenity visibility settings."
            />
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Selected: {amenities.length}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Available to add: {amenityAvailableCount ?? "--"}
              </span>
              {!amenitiesLoaded && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Load on search interaction
                </span>
              )}
              {amenitiesLoading && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Loading...
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Drag using handle to reorder
              </span>
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeading
              title="Add Amenity"
              description="Start typing to find amenities not yet added to this property."
            />
            <AddAmenitySearchBar
              options={allAmenities}
              addedIds={amenities.map((a) => a.id)}
              onSelect={handleAddAmenity}
              isLoaded={amenitiesLoaded}
              isLoading={amenitiesLoading}
              onInteract={ensureAmenitiesLoaded}
            />
          </section>

          <section className={sectionCardClass}>
            <SectionHeading
              title="Selected Amenities"
              description="Update weight and tags, then remove items you no longer want."
            />
            {amenities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
                No amenities selected yet. Use the search box above to add one.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAmenityDragEnd}
              >
                <div className={tableShellClass}>
                  <table className="w-full min-w-[780px] table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="w-12 px-3 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Amenity Name
                        </th>
                        <th className="w-36 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Weight
                        </th>
                        <th className="w-28 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Paid
                        </th>
                        <th className="w-28 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          USP
                        </th>
                        <th className="w-28 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody ref={amenitiesBodyRef}>
                      <SortableContext
                        items={amenities.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {amenities.map((amenity) => (
                          <SortableAmenityRow
                            data={amenity}
                            key={amenity.id}
                            removeAmenity={handleRemoveAmenity}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                </div>
              </DndContext>
            )}
          </section>
        </div>
      </TabItem>
      <TabItem title="Activities">
        <div className="w-full space-y-5">
          <section className={sectionCardClass}>
            <SectionHeading
              title="Activities"
              description="Search, add, reorder, and manage activity visibility settings."
            />
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Selected: {activities.length}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Available to add: {activityAvailableCount ?? "--"}
              </span>
              {!activitiesLoaded && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Load on search interaction
                </span>
              )}
              {activitiesLoading && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Loading...
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Drag using handle to reorder
              </span>
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeading
              title="Add Activity"
              description="Start typing to find activities not yet added to this property."
            />
            <AddActivitySearchBar
              options={allActivities}
              addedIds={activities.map((a) => a.id)}
              onSelect={handleAddActivity}
              isLoaded={activitiesLoaded}
              isLoading={activitiesLoading}
              onInteract={ensureActivitiesLoaded}
            />
          </section>

          <section className={sectionCardClass}>
            <SectionHeading
              title="Selected Activities"
              description="Update weight and tags, then remove items you no longer want."
            />
            {activities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
                No activities selected yet. Use the search box above to add one.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleActivityDragEnd}
              >
                <div className={tableShellClass}>
                  <table className="w-full min-w-[780px] table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="w-12 px-3 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Activity Name
                        </th>
                        <th className="w-36 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Weight
                        </th>
                        <th className="w-28 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Paid
                        </th>
                        <th className="w-28 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          USP
                        </th>
                        <th className="w-28 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody ref={activitiesBodyRef}>
                      <SortableContext
                        items={activities.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activities.map((activity) => (
                          <SortableActivityRow
                            data={activity}
                            key={activity.id}
                            removeActivity={handleRemoveActivity}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                </div>
              </DndContext>
            )}
          </section>
        </div>
      </TabItem>
    </Tabs>
    
    </div>
  );
}
