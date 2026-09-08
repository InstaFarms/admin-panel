"use client";

import LabelWrapper from "@/components/LabelWrapper";
import TimeSelector from "@/components/TimeSelector";
import SectionHeading from "@/components/properties/SectionHeading";
import ToggleField from "@/components/properties/ToggleField";
import { Property, PropertyType } from "@/utils/types";
import { isInstantBooking } from "@/lib/propertyUtils";
import { TextInput, Select } from "flowbite-react";
import type { ReactNode } from "react";

interface DetailSectionProps {
  propertyTypes: PropertyType[];
  data?: Property;

  // From hook
  propertyTypeId?: string;
  setPropertyTypeId?: (value: string) => void;
  propertyName?: string;
  setPropertyName?: (value: string) => void;
  propertyCodeName?: string;
  setPropertyCodeName?: (value: string) => void;
  slug?: string;
  setSlug?: (value: string) => void;
  propertyCode?: string;
  setPropertyCode?: (value: string) => void;
  heading?: string;
  setHeading?: (value: string) => void;
  weight?: number | null;
  setWeight?: (value: number | null) => void;
  bedroomCount?: number | null;
  setBedroomCount?: (value: number | null) => void;
  bathroomCount?: number | null;
  setBathroomCount?: (value: number | null) => void;
  doubleBedCount?: number | null;
  setDoubleBedCount?: (value: number | null) => void;
  singleBedCount?: number | null;
  setSingleBedCount?: (value: number | null) => void;
  mattressCount?: number | null;
  setMattressCount?: (value: number | null) => void;
  baseGuestCount?: number | null;
  setBaseGuestCount?: (value: number | null) => void;
  maxGuestCount?: number | null;
  setMaxGuestCount?: (value: number | null) => void;
  platformStartDate?: string | null;
  setPlatformStartDate?: (value: string | null) => void;
  allowOnlineBooking: boolean;
  setAllowOnlineBooking: (value: boolean) => void;
  allowCallBooking: boolean;
  setAllowCallBooking: (value: boolean) => void;
  allowEnquiry: boolean;
  setAllowEnquiry: (value: boolean) => void;
  requiresConfirmation: boolean;
  setRequiresConfirmation: (value: boolean) => void;
  checkinTime: string | null;
  setCheckinTime: (value: string | null) => void;
  checkoutTime: string | null;
  setCheckoutTime: (value: string | null) => void;
  propertyFieldsDisabled?: boolean;
  propertyFieldsHint?: string;
  brandFieldsDisabled?: boolean;
  brandFieldsHint?: string;
  showRequiredMarkers?: boolean;
  fieldErrors?: { propertyName?: string; propertyCode?: string };
  codeWarning?: string;
  codeSuggestion?: string;
}

function DisabledFieldWrapper({
  disabled,
  hint,
  children,
}: {
  disabled: boolean;
  hint?: string;
  children: ReactNode;
}) {
  if (!disabled) return <>{children}</>;
  return (
    <div className="cursor-not-allowed opacity-60" title={hint}>
      <div className="pointer-events-none">{children}</div>
    </div>
  );
}

export default function DetailSection({
  propertyTypes,
  propertyTypeId,
  setPropertyTypeId,
  propertyName,
  setPropertyName,
  propertyCodeName,
  setPropertyCodeName,
  slug,
  setSlug,
  propertyCode,
  setPropertyCode,
  heading,
  setHeading,
  weight,
  setWeight,
  bedroomCount,
  setBedroomCount,
  bathroomCount,
  setBathroomCount,
  doubleBedCount,
  setDoubleBedCount,
  singleBedCount,
  setSingleBedCount,
  mattressCount,
  setMattressCount,
  baseGuestCount,
  setBaseGuestCount,
  maxGuestCount,
  setMaxGuestCount,
  platformStartDate,
  setPlatformStartDate,
  allowOnlineBooking,
  setAllowOnlineBooking,
  allowCallBooking,
  setAllowCallBooking,
  allowEnquiry,
  setAllowEnquiry,
  requiresConfirmation,
  setRequiresConfirmation,
  checkinTime,
  setCheckinTime,
  checkoutTime,
  setCheckoutTime,
  propertyFieldsDisabled,
  propertyFieldsHint,
  brandFieldsDisabled,
  brandFieldsHint,
  showRequiredMarkers,
  fieldErrors,
  codeWarning,
  codeSuggestion,
}: DetailSectionProps) {
  const parseNonNegativeNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return Math.max(0, num);
  };

  const sectionCardClass =
    "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  const instantBooking = isInstantBooking(requiresConfirmation);
  const handleInstantBookingChange = (value: boolean) =>
    setRequiresConfirmation(!value);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <section className={sectionCardClass}>
        <SectionHeading
          title="Property Identity"
          description="Core identifiers for this property."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
            <LabelWrapper label="Property Type">
              <Select
                id="propertyTypeId"
                name="propertyTypeId"
                value={propertyTypeId || ""}
                onChange={(e) => setPropertyTypeId?.(e.target.value)}
              >
                <option value="">Select Property Type</option>
                {propertyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </LabelWrapper>
          </DisabledFieldWrapper>
          <div>
            <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
              <LabelWrapper label="Property Code" required={showRequiredMarkers}>
                <TextInput
                  id="propertyCode"
                  name="propertyCode"
                  type="text"
                  placeholder="Enter Property Code"
                  value={propertyCode || ""}
                  color={fieldErrors?.propertyCode ? "failure" : "gray"}
                  onChange={(e) => setPropertyCode?.(e.target.value)}
                />
              </LabelWrapper>
            </DisabledFieldWrapper>
            {fieldErrors?.propertyCode && (
              <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.propertyCode}</p>
            )}
            {!fieldErrors?.propertyCode && codeWarning && (
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{codeWarning}</p>
            )}
            {!fieldErrors?.propertyCode && !codeWarning && !propertyCode && codeSuggestion && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                Suggestion:
                <button
                  type="button"
                  onClick={() => setPropertyCode?.(codeSuggestion)}
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {codeSuggestion}
                </button>
              </p>
            )}
            {!fieldErrors?.propertyCode && !codeWarning && !propertyCode && !codeSuggestion && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">e.g. VILLA-GOA-01</p>
            )}
          </div>
          <div className="xl:col-span-2">
            <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
              <LabelWrapper label="Property Name" required={showRequiredMarkers}>
                <TextInput
                  id="propertyName"
                  name="propertyName"
                  type="text"
                  placeholder="Enter Property Name"
                  required
                  value={propertyName || ""}
                  color={fieldErrors?.propertyName ? "failure" : "gray"}
                  onChange={(e) => setPropertyName?.(e.target.value)}
                />
              </LabelWrapper>
              {fieldErrors?.propertyName && (
                <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.propertyName}</p>
              )}
            </DisabledFieldWrapper>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
            <LabelWrapper label="Property Code Name">
              <TextInput
                id="propertyCodeName"
                name="propertyCodeName"
                type="text"
                placeholder="Enter Property Code Name"
                value={propertyCodeName || ""}
                onChange={(e) => setPropertyCodeName?.(e.target.value)}
              />
            </LabelWrapper>
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
            <LabelWrapper label="Platform Start Date">
              <TextInput
                id="platformStartDate"
                name="platformStartDate"
                type="date"
                value={platformStartDate || ""}
                onChange={(e) =>
                  setPlatformStartDate?.(e.target.value || null)
                }
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Date the property goes live on the platform. Milestone billing for
                the first partial month is prorated from this date (leave blank for
                a full month).
              </p>
            </LabelWrapper>
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <LabelWrapper label="Property Slug">
              <TextInput
                id="slug"
                name="slug"
                type="text"
                placeholder="Enter Property Slug"
                value={slug || ""}
                onChange={(e) => setSlug?.(e.target.value)}
              />
            </LabelWrapper>
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <LabelWrapper label="Heading">
              <TextInput
                id="heading"
                name="heading"
                type="text"
                placeholder="Enter Heading"
                value={heading || ""}
                onChange={(e) => setHeading?.(e.target.value)}
              />
            </LabelWrapper>
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <LabelWrapper label="Weight">
              <TextInput
                type="numeric"
                inputMode="numeric"
                id="weight"
                name="weight"
                value={weight?.toString() || ""}
                onChange={(e) =>
                  setWeight?.(parseNonNegativeNumber(e.target.value))
                }
              />
            </LabelWrapper>
          </DisabledFieldWrapper>
        </div>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Booking Controls"
          description="Configure channels, confirmation flow, and payment behavior."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-4">
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <ToggleField
              label="Online Booking"
              checked={allowOnlineBooking}
              onChange={setAllowOnlineBooking}
              description="When on, guests can book this property online through the website or app."
            />
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <ToggleField
              label="Call Booking"
              checked={allowCallBooking}
              onChange={setAllowCallBooking}
              description="When on, guests can request to book this property by phone."
            />
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <ToggleField
              label="Enquiry"
              checked={allowEnquiry}
              onChange={setAllowEnquiry}
              description="When on, guests can send an enquiry about this property instead of booking directly."
            />
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <ToggleField
              label="Instant Booking"
              checked={instantBooking}
              onChange={handleInstantBookingChange}
              description="When on, guests can book without host approval. When off, bookings need to be confirmed manually."
            />
          </DisabledFieldWrapper>
        </div>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Capacity & Occupancy"
          description="Maintain bed and guest limits to keep bookings accurate."
        />
        <DisabledFieldWrapper disabled={!!propertyFieldsDisabled} hint={propertyFieldsHint}>
        <div className="grid grid-cols-7 grid-rows-1 gap-4 md:grid-cols-7 xl:grid-cols-7">
          <LabelWrapper label="Bedroom Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="bedroomCount"
              name="bedroomCount"
              value={bedroomCount?.toString() || ""}
              onChange={(e) =>
                setBedroomCount?.(parseNonNegativeNumber(e.target.value))
              }
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Bathroom Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="bathroomCount"
              name="bathroomCount"
              value={bathroomCount?.toString() || ""}
              onChange={(e) =>
                setBathroomCount?.(parseNonNegativeNumber(e.target.value))
              }
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Double Bed Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="doubleBedCount"
              name="doubleBedCount"
              value={doubleBedCount?.toString() || ""}
              onChange={(e) =>
                setDoubleBedCount?.(parseNonNegativeNumber(e.target.value))
              }
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Single Bed Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="singleBedCount"
              name="singleBedCount"
              value={singleBedCount?.toString() || ""}
              onChange={(e) =>
                setSingleBedCount?.(parseNonNegativeNumber(e.target.value))
              }
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Mattress Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="mattressCount"
              name="mattressCount"
              value={mattressCount?.toString() || ""}
              onChange={(e) =>
                setMattressCount?.(parseNonNegativeNumber(e.target.value))
              }
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Base Guest Count">
            <TextInput
              type="number"
              inputMode="numeric"
              id="baseGuestCount"
              name="baseGuestCount"
              min="0"
              value={baseGuestCount?.toString() || ""}
              onChange={(e) => {
                const newValue = parseNonNegativeNumber(e.target.value);
                setBaseGuestCount?.(newValue);

                const baseCount = newValue ?? 0;
                const maxCount = maxGuestCount || 0;
                if (maxCount > 0) {
                  e.target.setAttribute("max", maxCount.toString());
                  if (baseCount > maxCount) {
                    e.target.setCustomValidity(
                      `Base guest count cannot exceed max guest count (${maxCount})`,
                    );
                    e.target.reportValidity();
                  } else {
                    e.target.setCustomValidity("");
                  }
                }
              }}
            ></TextInput>
          </LabelWrapper>
          <LabelWrapper label="Max Guest Count">
            <TextInput
              type="numeric"
              inputMode="numeric"
              id="maxGuestCount"
              name="maxGuestCount"
              value={maxGuestCount?.toString() || ""}
              onChange={(e) => {
                const newValue = parseNonNegativeNumber(e.target.value);
                setMaxGuestCount?.(newValue);

                const maxCount = newValue ?? 0;
                const baseCount = baseGuestCount || 0;
                if (maxCount > 0 && baseCount > maxCount) {
                  const baseCountInput = document.getElementById(
                    "baseGuestCount",
                  ) as HTMLInputElement | null;
                  baseCountInput?.setCustomValidity(
                    `Base guest count cannot exceed max guest count (${maxCount})`,
                  );
                  baseCountInput?.reportValidity();
                } else {
                  const baseCountInput = document.getElementById(
                    "baseGuestCount",
                  ) as HTMLInputElement | null;
                  baseCountInput?.setCustomValidity("");
                }
                // Also trigger validation for all day-wise base guest counts
                const daySuffixes = [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ];
                daySuffixes.forEach((suffix) => {
                  const dayBaseInput = document.getElementById(
                    `${suffix}BaseGuestCount`,
                  ) as HTMLInputElement | null;
                  if (dayBaseInput) {
                    const dayBaseCount = Math.max(
                      0,
                      parseFloat(dayBaseInput.value) || 0,
                    );
                    if (maxCount > 0 && dayBaseCount > maxCount) {
                      dayBaseInput.setCustomValidity(
                        `Base guest count cannot exceed max guest count (${maxCount})`,
                      );
                      dayBaseInput.reportValidity();
                    } else {
                      dayBaseInput.setCustomValidity("");
                    }
                  }
                });
                // Trigger input event to update calculations
                daySuffixes.forEach((suffix) => {
                  const dayBaseInput = document.getElementById(
                    `${suffix}BaseGuestCount`,
                  ) as HTMLInputElement | null;
                  if (dayBaseInput) {
                    dayBaseInput.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                  }
                });
              }}
            ></TextInput>
          </LabelWrapper>
        </div>
        </DisabledFieldWrapper>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Check-In Window"
          description="Set standard check-in and check-out times used across bookings."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <LabelWrapper label="Check-in Time [HH:MM]">
              <TimeSelector timestamp={checkinTime} update={setCheckinTime} />
            </LabelWrapper>
          </DisabledFieldWrapper>
          <DisabledFieldWrapper disabled={!!brandFieldsDisabled} hint={brandFieldsHint}>
            <LabelWrapper label="Check-out Time [HH:MM]">
              <TimeSelector timestamp={checkoutTime} update={setCheckoutTime} />
            </LabelWrapper>
          </DisabledFieldWrapper>
        </div>
      </section>
    </div>
  );
}
