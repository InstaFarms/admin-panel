"use client";

import { GallerySection } from "@/components/properties/gallery-section";
import {
  type BrandSlug,
  type PropertyEditorDraft,
} from "@/lib/properties/propertyEditorDraft";
import { TabItem, Tabs, type TabsRef } from "flowbite-react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import AddressTabContainer from "./tabs/AddressTabContainer";
import AmenitiesTabContainer from "./tabs/AmenitiesTabContainer";
import AuditTabContainer from "./tabs/AuditTabContainer";
import CommercialTabContainer from "./tabs/CommercialTabContainer";
import DetailTabContainer from "./tabs/DetailTabContainer";
import GooglePlaceTabContainer from "./tabs/GooglePlaceTabContainer";
import ICalTabContainer from "./tabs/ICalTabContainer";
import OthersTabContainer from "./tabs/OthersTabContainer";
import PeopleRolesTabContainer from "./tabs/PeopleRolesTabContainer";
import PlansTabContainer from "./tabs/PlansTabContainer";
import SpacesTabContainer from "./tabs/SpacesTabContainer";
import OccasionScoresTabContainer from "./tabs/OccasionScoresTabContainer";
import ResortRoomsTabContainer from "./tabs/ResortRoomsTabContainer";
import TabScopeGate from "./TabScopeGate";
import type { BrandOption, SectionChange } from "./tabs/types";
import PropertyGstStatusSection from "@/components/properties/gst-status/PropertyGstStatusSection";
import { Lock } from "lucide-react";

interface PropertyEditorTabsProps {
  propertyId?: string | null;
  isEditMode: boolean;
  brands: BrandOption[];
  activeBrandId?: string | null;
  draft: PropertyEditorDraft;
  activeBrandSlug: BrandSlug;
  activeScope: "property" | "brand";
  onSectionChange: SectionChange;
  onActiveTabChange?: (tabIndex: number) => void;
  /** True when the property type is Resort — shows the Manage Rooms tab */
  isResort?: boolean;
  /** Currently effective accommodation GST boundary/rates for the active brand. */
  gstPolicy?: { boundary: number; lower: number; higher: number };
}

export const PROPERTY_EDITOR_TAB_INDEX = {
  DETAIL: 0,
  AUDIT: 1,
  ADDRESS: 2,
  GOOGLE_PLACE: 3,
  COMMERCIAL: 4,
  AMENITIES: 5,
  GALLERY: 6,
  SPACES: 7,
  PEOPLE: 8,
  PLANS: 9,
  ICAL: 10,
  OTHERS: 11,
  OCCASION_SCORES: 12,
  MANAGE_ROOMS: 13,
} as const;

/**
 * Flowbite's Tabs mounts a fresh panel on every switch (the old one is fully
 * unmounted, not kept around to crossfade against), so this animates the new
 * panel's entrance - a slightly springier fade+rise than a plain CSS
 * transition gives.
 */
function TabContentMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import("gsap").then(({ gsap }) => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" }
      );
    });
  }, []);

  return <div ref={ref}>{children}</div>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const BRAND_LOCKED_MSG = "Select a brand above to edit these brand-specific settings.";
const PROPERTY_LOCKED_MSG = "Switch to Property above to edit these shared property settings.";

const BRAND_TAB_INDICES = new Set([
  PROPERTY_EDITOR_TAB_INDEX.AUDIT, PROPERTY_EDITOR_TAB_INDEX.GALLERY,
  PROPERTY_EDITOR_TAB_INDEX.PLANS, PROPERTY_EDITOR_TAB_INDEX.OTHERS,
]);
const PROPERTY_TAB_INDICES = new Set([
  PROPERTY_EDITOR_TAB_INDEX.ADDRESS, PROPERTY_EDITOR_TAB_INDEX.GOOGLE_PLACE, PROPERTY_EDITOR_TAB_INDEX.AMENITIES,
  PROPERTY_EDITOR_TAB_INDEX.SPACES, PROPERTY_EDITOR_TAB_INDEX.PEOPLE, PROPERTY_EDITOR_TAB_INDEX.ICAL,
  PROPERTY_EDITOR_TAB_INDEX.OCCASION_SCORES,
]);
// Commercial is dual-scope: Property shows shared GST Status; Brand shows brand commercial settings.

function TabLabel({
  label,
  scope,
  isLocked,
}: {
  label: string;
  scope: "property" | "brand";
  isLocked: boolean;
}) {
  if (!isLocked) return <>{label}</>;

  return (
    <span className="group/label relative inline-flex items-center gap-1.5">
      <Lock size={11} className="shrink-0 opacity-60" />
      {label}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover/label:opacity-100 dark:bg-gray-700"
      >
        {scope === "property"
          ? "Switch to Property scope to edit"
          : "Select a brand to edit"}
      </span>
    </span>
  );
}

export function PropertyEditorTabs({
  propertyId,
  brands,
  activeBrandId,
  draft,
  activeBrandSlug,
  activeScope,
  onSectionChange,
  onActiveTabChange,
  isResort = false,
  gstPolicy,
}: PropertyEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<number>(PROPERTY_EDITOR_TAB_INDEX.DETAIL);
  const [visitedTabs, setVisitedTabs] = useState<Record<number, boolean>>({
    [PROPERTY_EDITOR_TAB_INDEX.DETAIL]: true,
  });
  const tabsRef = useRef<TabsRef>(null);
  const activeTabRef = useRef<number>(PROPERTY_EDITOR_TAB_INDEX.DETAIL);
  const lastPropertyTabRef = useRef<number>(PROPERTY_EDITOR_TAB_INDEX.DETAIL);
  const lastBrandTabRef = useRef<number>(PROPERTY_EDITOR_TAB_INDEX.DETAIL);

  useEffect(() => {
    const lockedTabs =
      activeScope === "property" ? BRAND_TAB_INDICES : PROPERTY_TAB_INDICES;
    if (lockedTabs.has(activeTabRef.current)) {
      const saved =
        activeScope === "property"
          ? lastPropertyTabRef.current
          : lastBrandTabRef.current;
      const target = lockedTabs.has(saved) ? PROPERTY_EDITOR_TAB_INDEX.DETAIL : saved;
      setActiveTab(target);
      activeTabRef.current = target;
      tabsRef.current?.setActiveTab(target);
      onActiveTabChange?.(target);
      setVisitedTabs((prev) =>
        prev[target] ? prev : { ...prev, [target]: true },
      );
    }
  }, [activeScope, onActiveTabChange]);

  const activeBundle = draft[activeBrandSlug];
  const detail = asRecord(activeBundle?.detail);
  const address = asRecord(activeBundle?.address);
  const googlePlace = asRecord(activeBundle?.googlePlace);
  const amenitiesActivities = asRecord(activeBundle?.amenitiesActivities);
  const peopleRoles = asRecord(activeBundle?.peopleRoles);
  const detailPropertyBrandMappingId =
    typeof detail.propertyBrandMappingId === "string"
      ? detail.propertyBrandMappingId
      : typeof detail.propertiesDataSpecificToBrandsId === "string"
        ? detail.propertiesDataSpecificToBrandsId
        : null;
  const activeBrandName =
    brands.find((brand) => brand.id === (detail.brandId as string))?.name ??
    (activeBrandSlug === "mago" ? "Mago" : "Instafarms");
  const commercial = asRecord(activeBundle?.commercial);
  const plans = asRecord(activeBundle?.plans);
  const others = asRecord(activeBundle?.others);

  const isTabVisited = (tab: number) => visitedTabs[tab] || activeTab === tab;

  return (
    <Tabs
      ref={tabsRef}
      theme={{
        tablist: {
          tabitem: {
            base: "flex items-center justify-center rounded-t-lg px-3 py-2 text-sm font-medium first:ml-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-400 disabled:dark:text-gray-500",
          },
        },
        tabpanel: "pt-0",
      }}
      onActiveTabChange={(tab) => {
        const tabIndex = typeof tab === "number" ? tab : PROPERTY_EDITOR_TAB_INDEX.DETAIL;
        setActiveTab(tabIndex);
        activeTabRef.current = tabIndex;
        onActiveTabChange?.(tabIndex);
        setVisitedTabs((prev) =>
          prev[tabIndex] ? prev : { ...prev, [tabIndex]: true },
        );
        if (activeScope === "brand") {
          lastBrandTabRef.current = tabIndex;
        } else {
          lastPropertyTabRef.current = tabIndex;
        }
      }}
    >
      <TabItem title="Detail" className="align-center flex flex-col">
        <TabContentMotion>
          <DetailTabContainer
            sectionData={detail}
            commercialSectionData={commercial}
            activeBrandName={activeBrandName}
            commercialBrandSlug={activeBrandSlug}
            activeScope={activeScope}
            onSectionChange={onSectionChange}
          />
        </TabContentMotion>
      </TabItem>

      <TabItem title={<TabLabel label="Audit & Management" scope="brand" isLocked={activeScope === "property"} />} disabled={activeScope === "property"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.AUDIT) ? (
          <TabScopeGate locked={activeScope === "property"} message={BRAND_LOCKED_MSG}>
            <TabContentMotion>
              <AuditTabContainer
                commercialSectionData={commercial}
                onSectionChange={onSectionChange}
                commercialBrandSlug={activeBrandSlug}
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Address" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.ADDRESS) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <AddressTabContainer
                sectionData={address}
                onSectionChange={(path, value) =>
                  onSectionChange(`${activeBrandSlug}.${path}`, value)
                }
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Google Place" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.GOOGLE_PLACE) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <GooglePlaceTabContainer
                sectionData={googlePlace}
                detailSectionData={address}
                onSectionChange={(path, value) =>
                  onSectionChange(`${activeBrandSlug}.${path}`, value)
                }
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title="Commercial">
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.COMMERCIAL) ? (
          <TabContentMotion>
            {activeScope === "property" ? (
              propertyId ? (
                <PropertyGstStatusSection propertyId={propertyId} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  Save the property first to configure shared GST status.
                </div>
              )
            ) : (
              <CommercialTabContainer
                sectionData={commercial}
                detailSectionData={detail}
                commercialBrandSlug={activeBrandSlug}
                propertyId={propertyId}
                onSectionChange={onSectionChange}
                gstPolicy={gstPolicy}
              />
            )}
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Amenities & Activities" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.AMENITIES) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <AmenitiesTabContainer
                sectionData={amenitiesActivities}
                onSectionChange={(path, value) =>
                  onSectionChange(`${activeBrandSlug}.${path}`, value)
                }
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Gallery" scope="brand" isLocked={activeScope === "property"} />} disabled={activeScope === "property"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.GALLERY) ? (
          <TabScopeGate locked={activeScope === "property"} message={BRAND_LOCKED_MSG}>
            <TabContentMotion>
              <GallerySection
                key={`${activeBrandSlug}:${detailPropertyBrandMappingId ?? "no-brand-mapping"}`}
                propertyId={propertyId}
                brandScope={activeBrandSlug === "mago" ? "mago" : "instafarms"}
                propertyBrandMappingId={detailPropertyBrandMappingId}
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Spaces" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.SPACES) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <SpacesTabContainer
                sectionData={
                  Array.isArray(activeBundle?.spaces)
                    ? activeBundle.spaces
                    : []
                }
                propertyId={propertyId}
                onSectionChange={(path, value) =>
                  onSectionChange(`${activeBrandSlug}.${path}`, value)
                }
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="People & Roles" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.PEOPLE) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <PeopleRolesTabContainer
                sectionData={peopleRoles}
                onSectionChange={(path, value) =>
                  onSectionChange(`${activeBrandSlug}.${path}`, value)
                }
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Plans" scope="brand" isLocked={activeScope === "property"} />} disabled={activeScope === "property"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.PLANS) ? (
          <TabScopeGate locked={activeScope === "property"} message={BRAND_LOCKED_MSG}>
            <TabContentMotion>
              <PlansTabContainer
                sectionData={plans}
                onSectionChange={onSectionChange}
                plansBrandSlug={activeBrandSlug}
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="iCal Integration" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.ICAL) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <ICalTabContainer
                propertyId={propertyId}
                isResort={isResort}
                resortRooms={draft.RESORT_ROOMS as any}
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Others" scope="brand" isLocked={activeScope === "property"} />} disabled={activeScope === "property"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.OTHERS) ? (
          <TabScopeGate locked={activeScope === "property"} message={BRAND_LOCKED_MSG}>
            <TabContentMotion>
              <OthersTabContainer
                sectionData={others}
                onSectionChange={onSectionChange}
                othersBrandSlug={activeBrandSlug}
              />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      <TabItem title={<TabLabel label="Occasion Scores" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
        {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.OCCASION_SCORES) ? (
          <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
            <TabContentMotion>
              <OccasionScoresTabContainer propertyId={propertyId} />
            </TabContentMotion>
          </TabScopeGate>
        ) : null}
      </TabItem>

      {/* Manage Rooms — visible only for Resort property type */}
      {isResort && propertyId ? (
        <TabItem title={<TabLabel label="Manage Rooms" scope="property" isLocked={activeScope === "brand"} />} disabled={activeScope === "brand"}>
          {isTabVisited(PROPERTY_EDITOR_TAB_INDEX.MANAGE_ROOMS) ? (
            <TabScopeGate locked={activeScope === "brand"} message={PROPERTY_LOCKED_MSG}>
              <TabContentMotion>
                <ResortRoomsTabContainer
                  propertyId={propertyId}
                  activeBrandId={String(detail.brandId ?? activeBrandId ?? "")}
                />
              </TabContentMotion>
            </TabScopeGate>
          ) : null}
        </TabItem>
      ) : null}
    </Tabs>
  );
}
