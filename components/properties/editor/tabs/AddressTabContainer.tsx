"use client";

import AddressSection from "@/components/properties/AddressSection";
import type { SectionChange } from "./types";

interface AddressTabContainerProps {
  sectionData: Record<string, unknown>;
  onSectionChange: SectionChange;
}

export default function AddressTabContainer({
  sectionData,
  onSectionChange,
}: AddressTabContainerProps) {
  const str = (key: string) => (sectionData[key] as string) || "";
  const arr = (key: string) =>
    Array.isArray(sectionData[key]) ? (sectionData[key] as string[]) : [];

  return (
    <AddressSection
      stateId={str("stateId")}
      stateName={str("stateName")}
      cityId={str("cityId")}
      cityName={str("cityName")}
      areaId={str("areaId")}
      areaName={str("areaName")}
      destinationId={str("destinationId")}
      destinationName={str("destinationName")}
      regionId={str("regionId")}
      regionName={str("regionName")}
      localityId={str("localityId")}
      localityName={str("localityName")}
      onStateChange={(id, name) => {
        onSectionChange("address.stateId", id);
        onSectionChange("address.stateName", name);
      }}
      onCityChange={(id, name) => {
        onSectionChange("address.cityId", id);
        onSectionChange("address.cityName", name);
      }}
      onAreaChange={(id, name) => {
        onSectionChange("address.areaId", id);
        onSectionChange("address.areaName", name);
      }}
      onDestinationChange={(id, name) => {
        onSectionChange("address.destinationId", id);
        onSectionChange("address.destinationName", name);
      }}
      onRegionChange={(id, name) => {
        onSectionChange("address.regionId", id);
        onSectionChange("address.regionName", name);
      }}
      onLocalityChange={(id, name) => {
        onSectionChange("address.localityId", id);
        onSectionChange("address.localityName", name);
      }}
      secondaryLocationIds={arr("secondaryLocationIds")}
      secondaryLocationNames={arr("secondaryLocationNames")}
      onSecondaryLocationIdsChange={(ids) =>
        onSectionChange("address.secondaryLocationIds", ids)
      }
      address={str("address")}
      setAddress={(v) => onSectionChange("address.address", v)}
      pincode={str("pincode")}
      setPincode={(v) => onSectionChange("address.pincode", v)}
      landmark={str("landmark")}
      setLandmark={(v) => onSectionChange("address.landmark", v)}
      latitude={str("latitude")}
      setLatitude={(v) => onSectionChange("address.latitude", v)}
      longitude={str("longitude")}
      setLongitude={(v) => onSectionChange("address.longitude", v)}
      mapLink={str("mapLink")}
      setMapLink={(v) => onSectionChange("address.mapLink", v)}
    />
  );
}
