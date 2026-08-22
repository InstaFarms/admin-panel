"use client";

import { Button } from "flowbite-react";
import { useEffect, useRef, useState } from "react";
import LabelWrapper from "@/components/LabelWrapper";
import LocationSearchSelect from "@/components/LocationSearchSelect";
import type { LocationOption } from "@/components/LocationSearchSelect";

interface SecondaryLocationsSectionProps {
  secondaryLocationIds?: string[];
  secondaryLocationNames?: string[];
  onSecondaryLocationIdsChange?: (ids: string[]) => void;
  primaryLocationIds?: string[];
}

export default function SecondaryLocationsSection({
  secondaryLocationIds,
  secondaryLocationNames,
  onSecondaryLocationIdsChange,
  primaryLocationIds = [],
}: SecondaryLocationsSectionProps) {
  const [entries, setEntries] = useState<LocationOption[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!secondaryLocationIds?.length) return;
    initialized.current = true;
    setEntries(
      secondaryLocationIds.map((id, i) => ({
        value: id,
        label: secondaryLocationNames?.[i] || id,
      })),
    );
  }, [secondaryLocationIds, secondaryLocationNames]);

  const commit = (updated: LocationOption[]) => {
    initialized.current = true;
    setEntries(updated);
    onSecondaryLocationIdsChange?.(
      updated.map((e) => e.value).filter((v) => v !== ""),
    );
  };

  const addEntry = () => commit([...entries, { value: "", label: "" }]);
  const removeEntry = (index: number) => commit(entries.filter((_, i) => i !== index));
  const changeEntry = (index: number, opt: LocationOption | null) => {
    const updated = [...entries];
    updated[index] = opt ?? { value: "", label: "" };
    commit(updated);
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Secondary Locations</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add additional location associations (any type) for this property.
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mb-3 space-y-3">
          {entries.map((entry, index) => {
            // Exclude: all primary IDs + all other secondary entries already selected
            const excludeIds = [
              ...primaryLocationIds,
              ...entries
                .filter((_, i) => i !== index)
                .map((e) => e.value)
                .filter((v) => v !== ""),
            ];
            return (
              <div
                key={index}
                className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex-1">
                  <LabelWrapper label={`Secondary Location ${index + 1}`}>
                    <LocationSearchSelect
                      inputId={`secondaryLocation-${index}`}
                      placeholder="Search any location (state, city, area...)"
                      value={entry.value ? entry : null}
                      onChange={(opt) => changeEntry(index, opt)}
                      excludeIds={excludeIds}
                    />
                  </LabelWrapper>
                </div>
                <div className="pb-1">
                  <Button size="xs" color="failure" onClick={() => removeEntry(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button size="xs" color="light" onClick={addEntry}>
        + Add Secondary Location
      </Button>
    </div>
  );
}
