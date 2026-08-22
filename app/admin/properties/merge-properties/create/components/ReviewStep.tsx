"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Label, Select } from "flowbite-react";
import PropertyCompareView from "@/components/properties/PropertyCompareView";

export default function ReviewStep(props: {
  constituentsText: string;
  customSectionsText: string;
  showHighCustomizationWarning: boolean;
  compareCandidates: { id: string; label: string; preview: any | null }[];
  defaultComparePropertyId: string | null;
  mergedPreview?: any | null;
}) {
  const [compareId, setCompareId] = useState<string>(() => props.defaultComparePropertyId ?? "");

  useEffect(() => {
    if (!props.compareCandidates?.length) {
      setCompareId("");
      return;
    }
    const exists = props.compareCandidates.some((c) => c.id === compareId);
    if (!exists) {
      setCompareId(props.defaultComparePropertyId ?? props.compareCandidates[0]!.id);
    }
  }, [props.compareCandidates, props.defaultComparePropertyId, compareId]);

  const compareCandidate = useMemo(
    () => props.compareCandidates.find((c) => c.id === compareId) ?? null,
    [props.compareCandidates, compareId]
  );

  return (
    <Card>
      <h6 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Confirm</h6>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Constituents:</span> {props.constituentsText}
        </div>
        <div>
          <span className="font-medium">Custom Sections:</span> {props.customSectionsText}
        </div>
        {props.showHighCustomizationWarning && (
          <div className="rounded bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            You customized many sections. Double-check review before creating.
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
          Compare constituent vs merged
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Read-only comparison based on your current wizard selections and edits.
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:max-w-md">
          <Label htmlFor="merge-review-compare" >Constituent property</Label>
          <Select
            id="merge-review-compare"
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            disabled={props.compareCandidates.length === 0}
          >
            {props.compareCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3">
          <PropertyCompareView
            parent={{
              propertyId: compareId ? compareId : null,
              preview: compareCandidate?.preview ?? null,
              full: compareCandidate?.preview ?? null,
            }}
            child={{ propertyId: null, preview: props.mergedPreview ?? null, full: props.mergedPreview ?? null }}
          />
        </div>
      </div>
    </Card>
  );
}

