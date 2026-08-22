"use client";

import { useMemo } from "react";
import { Card } from "flowbite-react";
import PropertyCompareView from "@/components/properties/PropertyCompareView";

interface ReviewStepProps {
  parentText: string;
  customSectionsText: string;
  showHighCustomizationWarning: boolean;
  parentPropertyId: string | null;
  parentPreview?: any | null;
  childPreview?: any | null;
}

export default function ReviewStep({
  parentText,
  customSectionsText,
  showHighCustomizationWarning,
  parentPropertyId,
  parentPreview,
  childPreview,
}: ReviewStepProps) {
  const safeParentId = useMemo(() => (parentPropertyId ? parentPropertyId : null), [parentPropertyId]);
  return (
    <Card>
      <h6 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Confirm</h6>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Parent:</span> {parentText}
        </div>
        <div>
          <span className="font-medium">Custom Sections:</span> {customSectionsText}
        </div>
        {showHighCustomizationWarning && (
          <div className="rounded bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            You customized many sections. Double-check review before creating.
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Parent vs Child</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Read-only comparison based on your current wizard edits.
        </div>
        <div className="mt-3">
          <PropertyCompareView
            parent={{ propertyId: safeParentId, preview: parentPreview ?? null, full: parentPreview ?? null }}
            child={{ propertyId: null, preview: childPreview ?? null, full: childPreview ?? null }}
          />
        </div>
      </div>
    </Card>
  );
}
