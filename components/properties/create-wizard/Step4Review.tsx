"use client";

import { Button, Spinner } from "flowbite-react";

interface BrandOption {
  id: string;
  name: string;
}

interface PropertyTypeOption {
  id: string;
  name: string;
}

interface Step4ReviewProps {
  brands: BrandOption[];
  propertyTypes: PropertyTypeOption[];
  selectedBrandIds: string[];
  propertyName: string;
  propertyCode: string;
  propertyTypeId: string;
  heading: string;
  isResort: boolean;
  resortRoomNames: string[];
  bedroomCount: number;
  bathroomCount: number;
  doubleBedCount: number;
  singleBedCount: number;
  mattressCount: number;
  baseGuestCount: number;
  maxGuestCount: number;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

interface ReviewRowProps {
  label: string;
  value: React.ReactNode;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-b-0 dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

export default function Step4Review({
  brands,
  propertyTypes,
  selectedBrandIds,
  propertyName,
  propertyCode,
  propertyTypeId,
  heading,
  isResort,
  resortRoomNames,
  bedroomCount,
  bathroomCount,
  doubleBedCount,
  singleBedCount,
  mattressCount,
  baseGuestCount,
  maxGuestCount,
  isSubmitting,
  submitError,
  onSubmit,
}: Step4ReviewProps) {
  const selectedBrandNames = selectedBrandIds
    .map((id) => brands.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const propertyTypeName =
    propertyTypeId
      ? propertyTypes.find((t) => t.id === propertyTypeId)?.name ?? "—"
      : "—";

  const effectiveHeading = heading.trim() || propertyName;

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review & Create</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Confirm the details below and create your property.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
          Brands
        </h3>
        <ReviewRow label="Selected brand(s)" value={selectedBrandNames || "—"} />

        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 mt-5">
          Identity
        </h3>
        <ReviewRow label="Property name" value={propertyName} />
        <ReviewRow label="Property code" value={<span className="font-mono">{propertyCode}</span>} />
        <ReviewRow label="Property type" value={propertyTypeName} />
        <ReviewRow label="Heading" value={effectiveHeading || "—"} />

        {isResort ? (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 mt-5">
              Room Setup
            </h3>
            <ReviewRow label="Rooms" value={`${resortRoomNames.length} room${resortRoomNames.length === 1 ? "" : "s"}`} />
            <ReviewRow label="Room names" value={resortRoomNames.join(", ")} />
            <ReviewRow label="Room details" value="Configured room by room in the editor" />
          </>
        ) : (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 mt-5">
              Basic Details
            </h3>
            <ReviewRow label="Bedrooms" value={bedroomCount > 0 ? bedroomCount : "—"} />
            <ReviewRow label="Bathrooms" value={bathroomCount > 0 ? bathroomCount : "—"} />
            <ReviewRow label="Double beds" value={doubleBedCount > 0 ? doubleBedCount : "—"} />
            <ReviewRow label="Single beds" value={singleBedCount > 0 ? singleBedCount : "—"} />
            <ReviewRow label="Mattresses" value={mattressCount > 0 ? mattressCount : "—"} />
            <ReviewRow label="Base guests" value={baseGuestCount > 0 ? baseGuestCount : "—"} />
            <ReviewRow label="Max guests" value={maxGuestCount > 0 ? maxGuestCount : "—"} />
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          After creation you will be taken to the full property editor. For a resort, finish every
          room&apos;s capacity, pricing, amenities, photos, and availability there.
        </p>
      </div>

      {submitError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
        </div>
      )}

      <Button
        color="blue"
        size="lg"
        className="mt-6 w-full"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" className="me-2" light />
            Creating Property…
          </>
        ) : (
          "Create Property"
        )}
      </Button>
    </div>
  );
}
