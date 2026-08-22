"use client";

import { TabItem, Tabs } from "flowbite-react";
import DetailSection from "@/components/properties/DetailSection";
import AddressSection from "@/components/properties/AddressSection";
import GooglePlaceSection from "@/components/properties/GooglePlaceSection";
import DayWiseVariablesSection from "@/components/properties/DayWiseVariablesSection";
import SpecialDatesSection from "@/components/properties/SpecialDatesSection";
import AmenitiesActivitiesSection from "@/components/properties/AmenitiesActivitiesSection";
import SafetyHygieneSection from "@/components/properties/SafetyHygieneSection";
import SpacesSection from "@/components/properties/SpacesSection";
import PlansSection from "@/components/properties/PlansSection";
import OthersTabsSection from "@/components/properties/OthersTabsSection";
import UserManagementTab from "@/components/properties/UserManagementTab";
import ICalManagement from "@/components/properties/ICalManagement";
import AuditAreasSection from "@/components/properties/AuditAreasSection";
import { GallerySection } from "@/components/properties/gallery-section";
import SplitGallerySection from "@/components/properties/SplitGallerySection";
import { PropertyEditorTabKey, SharedPropertySectionAdapters } from "@/components/properties/sectionAdapters";
import { PROPERTY_SECTION_ORDER } from "@/types/jarvis-property-sections";

interface SharedPropertySectionTabsProps {
  adapters: SharedPropertySectionAdapters;
  propertyId?: string | null;
  enabledTabs?: PropertyEditorTabKey[];
  onGalleryChange?: (galleries: any[]) => void;
}

const ALL_TABS: PropertyEditorTabKey[] = [...PROPERTY_SECTION_ORDER];

export default function SharedPropertySectionTabs({
  adapters,
  propertyId,
  enabledTabs = ALL_TABS,
  onGalleryChange,
}: SharedPropertySectionTabsProps) {
  const isEnabled = (key: PropertyEditorTabKey) => enabledTabs.includes(key);
  return (
    <Tabs className="">
      {isEnabled("DETAIL") && (
        <TabItem title="Detail" className="align-center flex flex-col">
          <DetailSection {...(adapters.detail || {})} />
        </TabItem>
      )}
      {isEnabled("AUDIT_MANAGEMENT") && (
        <TabItem title="Audit & Management">
          <AuditAreasSection {...(adapters.auditManagement || {})} />
        </TabItem>
      )}
      {isEnabled("ADDRESS") && (
        <TabItem title="Address">
          <AddressSection {...(adapters.address || {})} />
        </TabItem>
      )}
      {isEnabled("GOOGLE_PLACE") && (
        <TabItem title="Google Place">
          <GooglePlaceSection {...(adapters.googlePlace || {})} />
        </TabItem>
      )}
      {isEnabled("DAY_WISE_VARIABLES") && (
        <TabItem title="Day wise Variables">
          <DayWiseVariablesSection {...(adapters.dayWise || {})} />
        </TabItem>
      )}
      {isEnabled("SPECIAL_DATES") && (
        <TabItem title="Special Dates">
          <SpecialDatesSection {...(adapters.specialDates || {})} />
        </TabItem>
      )}
      {isEnabled("AMENITIES_ACTIVITIES") && (
        <TabItem title="Amenities & Activities">
          <AmenitiesActivitiesSection {...(adapters.amenitiesActivities || {})} />
        </TabItem>
      )}
      {isEnabled("GALLERY") && (
        <TabItem title="Gallery">
          {propertyId ? (
            <GallerySection
              propertyId={propertyId}
              initialCoverPhotos={adapters.gallery?.initialCoverPhotos || []}
              onGalleryChange={onGalleryChange}
            />
          ) : (
            <SplitGallerySection
              gallery={Array.isArray(adapters.gallery?.gallery) ? adapters.gallery.gallery : []}
              coverPhotos={Array.isArray(adapters.gallery?.coverPhotos) ? adapters.gallery.coverPhotos : []}
              onGalleryChange={adapters.gallery?.onGalleryChange}
              onCoverPhotosChange={adapters.gallery?.onCoverPhotosChange}
            />
          )}
        </TabItem>
      )}
      {isEnabled("SAFETY_HYGIENE") && (
        <TabItem title="Safety/Hygiene">
          <SafetyHygieneSection {...(adapters.safetyHygiene || {})} />
        </TabItem>
      )}
      {isEnabled("SPACES") && (
        <TabItem title="Spaces">
          <SpacesSection {...(adapters.spaces || {})} />
        </TabItem>
      )}
      {isEnabled("OWNERS") && (
        <TabItem title="Owners">
          <UserManagementTab {...(adapters.owners || {})} userType="Owners" />
        </TabItem>
      )}
      {isEnabled("MANAGERS") && (
        <TabItem title="Managers">
          <UserManagementTab {...(adapters.managers || {})} userType="Managers" />
        </TabItem>
      )}
      {isEnabled("CARETAKERS") && (
        <TabItem title="Caretakers">
          <UserManagementTab {...(adapters.caretakers || {})} userType="Caretakers" />
        </TabItem>
      )}
      {isEnabled("PLANS") && (
        <TabItem title="Plans">
          <PlansSection {...(adapters.plans || {})} />
        </TabItem>
      )}
      {isEnabled("ICAL_INTEGRATION") && (
        <TabItem title="iCal Integration">
          <ICalManagement propertyId={propertyId} {...(adapters.ical || {})} />
        </TabItem>
      )}
      {isEnabled("OTHERS") && (
        <TabItem title="Others">
          <OthersTabsSection {...(adapters.others || {})} joditConfig={adapters.others?.joditConfig || {}} />
        </TabItem>
      )}
    </Tabs>
  );
}
