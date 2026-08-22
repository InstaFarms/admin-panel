"use client";

import AreaSelector from "@/components/AreaSelector";
import SecondaryLocationsSection from "@/components/SecondaryLocationsSection";
import LabelWrapper from "@/components/LabelWrapper";
import LocationSearchSelect from "@/components/LocationSearchSelect";
import SectionHeading from "@/components/properties/SectionHeading";
import { TextInput } from "flowbite-react";
import { useEffect, useState } from "react";
import type { LocationOption } from "@/components/LocationSearchSelect";

interface AddressSectionProps {
  // Primary location IDs + names (for initial display)
  stateId?: string;
  stateName?: string;
  cityId?: string;
  cityName?: string;
  areaId?: string;
  areaName?: string;
  destinationId?: string;
  destinationName?: string;
  regionId?: string;
  regionName?: string;
  localityId?: string;
  localityName?: string;
  // Callbacks pass (id, name) so parent can store both
  onStateChange?: (id: string, name: string) => void;
  onCityChange?: (id: string, name: string) => void;
  onAreaChange?: (id: string, name: string) => void;
  onDestinationChange?: (id: string, name: string) => void;
  onRegionChange?: (id: string, name: string) => void;
  onLocalityChange?: (id: string, name: string) => void;
  // Secondary locations
  secondaryLocationIds?: string[];
  secondaryLocationNames?: string[];
  onSecondaryLocationIdsChange?: (ids: string[]) => void;
  // Address fields
  address?: string;
  setAddress?: (value: string) => void;
  pincode?: string;
  setPincode?: (value: string) => void;
  landmark?: string;
  setLandmark?: (value: string) => void;
  latitude?: string;
  setLatitude?: (value: string) => void;
  longitude?: string;
  setLongitude?: (value: string) => void;
  mapLink?: string;
  setMapLink?: (value: string) => void;
}

export default function AddressSection({
  stateId, stateName,
  cityId, cityName,
  areaId, areaName,
  destinationId, destinationName,
  regionId, regionName,
  localityId, localityName,
  onStateChange, onCityChange, onAreaChange,
  onDestinationChange, onRegionChange, onLocalityChange,
  secondaryLocationIds, secondaryLocationNames, onSecondaryLocationIdsChange,
  address, setAddress,
  pincode, setPincode,
  landmark, setLandmark,
  latitude, setLatitude,
  longitude, setLongitude,
  mapLink, setMapLink,
}: AddressSectionProps) {
  const [destVal, setDestVal] = useState<LocationOption | null>(
    destinationId ? { value: destinationId, label: destinationName || destinationId } : null,
  );
  const [regionVal, setRegionVal] = useState<LocationOption | null>(
    regionId ? { value: regionId, label: regionName || regionId } : null,
  );
  const [localityVal, setLocalityVal] = useState<LocationOption | null>(
    localityId ? { value: localityId, label: localityName || localityId } : null,
  );

  useEffect(() => {
    setDestVal(destinationId ? { value: destinationId, label: destinationName || destinationId } : null);
  }, [destinationId, destinationName]);

  useEffect(() => {
    setRegionVal(regionId ? { value: regionId, label: regionName || regionId } : null);
  }, [regionId, regionName]);

  useEffect(() => {
    setLocalityVal(localityId ? { value: localityId, label: localityName || localityId } : null);
  }, [localityId, localityName]);

  const sectionCardClass =
    "border-b border-slate-200/80 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800";

  return (
    <div className="mx-auto max-w-275 space-y-6">
      <section className={sectionCardClass}>
        <SectionHeading
          title="Location Mapping"
          description="Assign state, city, area, and optional destination, region, or locality for this property."
        />
        <AreaSelector
          stateId={stateId}
          stateName={stateName}
          cityId={cityId}
          cityName={cityName}
          areaId={areaId}
          areaName={areaName}
          onStateChange={onStateChange}
          onCityChange={onCityChange}
          onAreaChange={onAreaChange}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LabelWrapper label="Destination">
            <LocationSearchSelect
              inputId="destinationId"
              types={["destination"]}
              placeholder="Search destination..."
              value={destVal}
              onChange={(opt) => {
                setDestVal(opt);
                onDestinationChange?.(opt?.value ?? "", opt?.label ?? "");
              }}
            />
          </LabelWrapper>
          <LabelWrapper label="Region">
            <LocationSearchSelect
              inputId="regionId"
              types={["region"]}
              placeholder="Search region..."
              value={regionVal}
              onChange={(opt) => {
                setRegionVal(opt);
                onRegionChange?.(opt?.value ?? "", opt?.label ?? "");
              }}
            />
          </LabelWrapper>
          <LabelWrapper label="Locality">
            <LocationSearchSelect
              inputId="localityId"
              types={["locality"]}
              placeholder="Search locality..."
              value={localityVal}
              onChange={(opt) => {
                setLocalityVal(opt);
                onLocalityChange?.(opt?.value ?? "", opt?.label ?? "");
              }}
            />
          </LabelWrapper>
        </div>
        <SecondaryLocationsSection
          secondaryLocationIds={secondaryLocationIds}
          secondaryLocationNames={secondaryLocationNames}
          onSecondaryLocationIdsChange={onSecondaryLocationIdsChange}
          primaryLocationIds={[stateId, cityId, areaId, destinationId, regionId, localityId].filter(Boolean) as string[]}
        />
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Address Details"
          description="Capture the complete postal address and nearby landmark."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LabelWrapper label="Address">
            <TextInput
              id="address"
              name="address"
              type="text"
              placeholder="Enter Address"
              value={address || ""}
              onChange={(e) => setAddress?.(e.target.value)}
            />
          </LabelWrapper>
          <LabelWrapper label="Pincode">
            <TextInput
              type="text"
              inputMode="text"
              id="pincode"
              name="pincode"
              value={pincode || ""}
              onChange={(e) => setPincode?.(e.target.value)}
            />
          </LabelWrapper>
          <LabelWrapper label="Landmark">
            <TextInput
              type="text"
              inputMode="text"
              id="landmark"
              name="landmark"
              value={landmark || ""}
              onChange={(e) => setLandmark?.(e.target.value)}
            />
          </LabelWrapper>
        </div>
      </section>

      <section className={sectionCardClass}>
        <SectionHeading
          title="Coordinates & Map"
          description="Set the property coordinates and map link for accurate location display."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LabelWrapper label="Latitude">
            <TextInput
              type="text"
              inputMode="text"
              id="latitude"
              name="latitude"
              value={latitude || ""}
              onChange={(e) => setLatitude?.(e.target.value)}
            />
          </LabelWrapper>
          <LabelWrapper label="Longitude">
            <TextInput
              type="text"
              inputMode="text"
              id="longitude"
              name="longitude"
              value={longitude || ""}
              onChange={(e) => setLongitude?.(e.target.value)}
            />
          </LabelWrapper>
          <LabelWrapper label="Map Link">
            <TextInput
              type="text"
              inputMode="text"
              id="mapLink"
              name="mapLink"
              value={mapLink || ""}
              onChange={(e) => setMapLink?.(e.target.value)}
            />
          </LabelWrapper>
        </div>
      </section>
    </div>
  );
}
