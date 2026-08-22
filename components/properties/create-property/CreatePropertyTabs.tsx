"use client";

import { GallerySection } from "@/components/properties/gallery-section";
import {
  type BrandTabBundle,
  createEmptyBrandTabBundle,
  type PropertySourceType,
} from "@/lib/properties/propertyEditorDraft";
import { TabItem, Tabs, type TabsRef } from "flowbite-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import AddressTabContainer from "@/components/properties/editor/tabs/AddressTabContainer";
import AmenitiesTabContainer from "@/components/properties/editor/tabs/AmenitiesTabContainer";
import AuditTabContainer from "@/components/properties/editor/tabs/AuditTabContainer";
import CommercialTabContainer from "@/components/properties/editor/tabs/CommercialTabContainer";
import GooglePlaceTabContainer from "@/components/properties/editor/tabs/GooglePlaceTabContainer";
import ICalTabContainer from "@/components/properties/editor/tabs/ICalTabContainer";
import OthersTabContainer from "@/components/properties/editor/tabs/OthersTabContainer";
import PeopleRolesTabContainer from "@/components/properties/editor/tabs/PeopleRolesTabContainer";
import PlansTabContainer from "@/components/properties/editor/tabs/PlansTabContainer";
import SpacesTabContainer from "@/components/properties/editor/tabs/SpacesTabContainer";
import CreateDetailTabContainer from "./CreateDetailTabContainer";
import type { BrandOption, SectionChange } from "@/components/properties/editor/tabs/types";
import { ImageIcon } from "lucide-react";

export const CREATE_TAB_INDEX = {
  DETAIL: 0,
  AUDIT: 1,
  ADDRESS: 2,
  GOOGLE_PLACE: 3,
  COMMERCIAL: 4,
  AMENITIES: 5,
  SPACES: 6,
  PEOPLE: 7,
  PLANS: 8,
  ICAL: 9,
  OTHERS: 10,
  GALLERY: 11,
} as const;

interface SourceOption {
  id: string;
  name: string;
  description: string;
}

interface CreatePropertyTabsProps {
  propertyId: string | null;
  propertySource: string;
  sources: SourceOption[];
  draft: Record<string, Partial<BrandTabBundle>>;
  activeTab: number;
  onActiveTabChange: (tab: number) => void;
  onSectionChange: SectionChange;
  fieldErrors?: { propertyName?: string; propertyCode?: string };
  codeWarning?: string;
  codeSuggestion?: string;
}

const TAB_COUNT = 12;

function TabContentMotion({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      className={`transition-all duration-300 ease-out will-change-transform ${
        entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.995] opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export function getCompletedTabs(bundle: Partial<BrandTabBundle> | undefined): Set<number> {
  if (!bundle) return new Set();
  const completed = new Set<number>();

  const detail = asRecord(bundle.detail);
  const address = asRecord(bundle.address);
  const googlePlace = asRecord(bundle.googlePlace);
  const commercial = asRecord(bundle.commercial);
  const amenities = asRecord(bundle.amenitiesActivities);
  const spaces = Array.isArray(bundle.spaces) ? bundle.spaces : [];
  const people = asRecord(bundle.peopleRoles);
  const plans = asRecord(bundle.plans);
  const others = asRecord(bundle.others);

  const str = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  const num = (v: unknown) => typeof v === "number" && v > 0;

  if (str(detail.propertyName) || str(detail.propertyCode)) completed.add(CREATE_TAB_INDEX.DETAIL);
  if (str(commercial.managementType) || str(commercial.bookingType)) completed.add(CREATE_TAB_INDEX.AUDIT);
  if (str(address.stateId) || str(address.cityId) || str(address.address)) completed.add(CREATE_TAB_INDEX.ADDRESS);
  if (Object.keys(googlePlace).some((k) => str(googlePlace[k]))) completed.add(CREATE_TAB_INDEX.GOOGLE_PLACE);
  if (
    num(commercial.securityDeposit) ||
    num(commercial.cookingAccessFee) ||
    num(commercial.cleaningFee) ||
    num(commercial.mondayPrice) ||
    num(commercial.commissionPercentage)
  ) completed.add(CREATE_TAB_INDEX.COMMERCIAL);
  if (arr(amenities.amenities) || arr(amenities.activities) || arr(amenities.safetyHygiene)) completed.add(CREATE_TAB_INDEX.AMENITIES);
  if (spaces.length > 0) completed.add(CREATE_TAB_INDEX.SPACES);
  if (arr(people.owners) || arr(people.managers) || arr(people.caretakers)) completed.add(CREATE_TAB_INDEX.PEOPLE);
  if (arr(plans.discountPlanIds) || str(plans.shortTermCancellationPlanId) || str(plans.longTermCancellationPlanId)) completed.add(CREATE_TAB_INDEX.PLANS);
  if (Object.values(others).some((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))) completed.add(CREATE_TAB_INDEX.OTHERS);

  return completed;
}

function TabTitle({ label, hasData, hasError }: { label: string; hasData: boolean; hasError?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      {hasError ? (
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Has errors" />
      ) : hasData ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Has data" />
      ) : null}
    </span>
  );
}

export function CreatePropertyTabs({
  propertyId,
  propertySource,
  sources,
  draft,
  activeTab,
  onActiveTabChange,
  onSectionChange,
  fieldErrors = {},
  codeWarning,
  codeSuggestion,
}: CreatePropertyTabsProps) {
  const tabsRef = useRef<TabsRef>(null);
  const [visitedTabs, setVisitedTabs] = useState<Record<number, boolean>>({
    [CREATE_TAB_INDEX.DETAIL]: true,
  });

  const activeDraftBundle = (draft[propertySource] as BrandTabBundle | undefined) ?? {
    ...createEmptyBrandTabBundle(),
  };

  const getPrefix = (section: string) => `${propertySource}.${section}`;
  const detail = asRecord(activeDraftBundle.detail);
  const address = asRecord(activeDraftBundle.address);
  const googlePlace = asRecord(activeDraftBundle.googlePlace);
  const amenitiesActivities = asRecord(activeDraftBundle.amenitiesActivities);
  const peopleRoles = asRecord(activeDraftBundle.peopleRoles);
  const commercial = asRecord(activeDraftBundle.commercial);
  const plans = asRecord(activeDraftBundle.plans);
  const others = asRecord(activeDraftBundle.others);
  const spaces = Array.isArray(activeDraftBundle.spaces) ? activeDraftBundle.spaces : [];

  const detailPropertyBrandMappingId =
    typeof detail.propertyBrandMappingId === "string"
      ? detail.propertyBrandMappingId
      : typeof detail.propertiesDataSpecificToBrandsId === "string"
        ? detail.propertiesDataSpecificToBrandsId
        : null;

  const completedTabs = getCompletedTabs(activeDraftBundle);
  const hasDetailError = Boolean(fieldErrors?.propertyName || fieldErrors?.propertyCode);

  const isTabVisited = (tab: number) => visitedTabs[tab] || activeTab === tab;

  useEffect(() => {
    tabsRef.current?.setActiveTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: number) => {
    const tabIndex = typeof tab === "number" ? tab : CREATE_TAB_INDEX.DETAIL;
    // Gallery is locked until property is created
    if (tabIndex === CREATE_TAB_INDEX.GALLERY && !propertyId) return;
    onActiveTabChange(tabIndex);
    setVisitedTabs((prev) =>
      prev[tabIndex] ? prev : { ...prev, [tabIndex]: true },
    );
  };

  return (
    <>
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
      onActiveTabChange={handleTabChange}
    >
      <TabItem title={<TabTitle label="Detail" hasData={completedTabs.has(CREATE_TAB_INDEX.DETAIL)} hasError={hasDetailError} />}>
        <TabContentMotion>
          <CreateDetailTabContainer
            sectionData={detail}
            commercialSectionData={commercial}
            activeBrandName={propertySource}
            commercialBrandSlug={propertySource as BrandSlug}
            onSectionChange={onSectionChange}
            fieldErrors={fieldErrors}
            codeWarning={codeWarning}
            codeSuggestion={codeSuggestion}
          />
        </TabContentMotion>
      </TabItem>

      <TabItem title={<TabTitle label="Audit & Management" hasData={completedTabs.has(CREATE_TAB_INDEX.AUDIT)} />}>
        {isTabVisited(CREATE_TAB_INDEX.AUDIT) ? (
          <TabContentMotion>
            <AuditTabContainer
              commercialSectionData={commercial}
              onSectionChange={onSectionChange}
              commercialBrandSlug={propertySource as BrandSlug}
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Address" hasData={completedTabs.has(CREATE_TAB_INDEX.ADDRESS)} />}>
        {isTabVisited(CREATE_TAB_INDEX.ADDRESS) ? (
          <TabContentMotion>
            <AddressTabContainer
              sectionData={address}
              onSectionChange={(path, value) =>
                onSectionChange(`${propertySource}.${path}`, value)
              }
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Google Place" hasData={completedTabs.has(CREATE_TAB_INDEX.GOOGLE_PLACE)} />}>
        {isTabVisited(CREATE_TAB_INDEX.GOOGLE_PLACE) ? (
          <TabContentMotion>
            <GooglePlaceTabContainer
              sectionData={googlePlace}
              detailSectionData={address}
              onSectionChange={(path, value) =>
                onSectionChange(`${propertySource}.${path}`, value)
              }
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Commercial" hasData={completedTabs.has(CREATE_TAB_INDEX.COMMERCIAL)} />}>
        {isTabVisited(CREATE_TAB_INDEX.COMMERCIAL) ? (
          <TabContentMotion>
              <CommercialTabContainer
                sectionData={commercial}
                detailSectionData={detail}
                commercialBrandSlug={propertySource as BrandSlug}
                propertyId={propertyId}
                onSectionChange={onSectionChange}
              />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Amenities & Activities" hasData={completedTabs.has(CREATE_TAB_INDEX.AMENITIES)} />}>
        {isTabVisited(CREATE_TAB_INDEX.AMENITIES) ? (
          <TabContentMotion>
            <AmenitiesTabContainer
              sectionData={amenitiesActivities}
              onSectionChange={(path, value) =>
                onSectionChange(`${slug}.${path}`, value)
              }
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Spaces" hasData={completedTabs.has(CREATE_TAB_INDEX.SPACES)} />}>
        {isTabVisited(CREATE_TAB_INDEX.SPACES) ? (
          <TabContentMotion>
            <SpacesTabContainer
              sectionData={spaces}
              propertyId={propertyId}
              onSectionChange={(path, value) =>
                onSectionChange(`${slug}.${path}`, value)
              }
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="People & Roles" hasData={completedTabs.has(CREATE_TAB_INDEX.PEOPLE)} />}>
        {isTabVisited(CREATE_TAB_INDEX.PEOPLE) ? (
          <TabContentMotion>
            <PeopleRolesTabContainer
              sectionData={peopleRoles}
              onSectionChange={(path, value) =>
                onSectionChange(`${slug}.${path}`, value)
              }
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Plans" hasData={completedTabs.has(CREATE_TAB_INDEX.PLANS)} />}>
        {isTabVisited(CREATE_TAB_INDEX.PLANS) ? (
          <TabContentMotion>
            <PlansTabContainer
              sectionData={plans}
              onSectionChange={onSectionChange}
              plansBrandSlug={slug}
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="iCal Integration" hasData={false} />}>
        {isTabVisited(CREATE_TAB_INDEX.ICAL) ? (
          <TabContentMotion>
            <ICalTabContainer propertyId={propertyId} />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem title={<TabTitle label="Others" hasData={completedTabs.has(CREATE_TAB_INDEX.OTHERS)} />}>
        {isTabVisited(CREATE_TAB_INDEX.OTHERS) ? (
          <TabContentMotion>
            <OthersTabContainer
              sectionData={others}
              onSectionChange={onSectionChange}
              othersBrandSlug={slug}
            />
          </TabContentMotion>
        ) : null}
      </TabItem>

      <TabItem disabled={!propertyId} title={<TabTitle label="Gallery" hasData={Boolean(propertyId)} />}>
        {isTabVisited(CREATE_TAB_INDEX.GALLERY) ? (
          <TabContentMotion>
            {propertyId ? (
              <GallerySection
                key={`${slug}:${detailPropertyBrandMappingId ?? "no-brand-mapping"}`}
                propertyId={propertyId}
                brandScope={slug === "mago" ? "mago" : "instafarms"}
                propertyBrandMappingId={detailPropertyBrandMappingId}
              />
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <ImageIcon size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                    Gallery available after creation
                  </p>
                  <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Fill in the property details and click &ldquo;Create&rdquo; to save. The gallery will
                    appear here so you can upload images.
                  </p>
                </div>
              </div>
            )}
          </TabContentMotion>
        ) : null}
      </TabItem>
    </Tabs>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="button"
          disabled={activeTab === 0}
          onClick={() => onActiveTabChange(activeTab - 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Back
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {activeTab + 1} / {TAB_COUNT}
        </span>
        <button
          type="button"
          disabled={
            activeTab === TAB_COUNT - 1 ||
            (activeTab === CREATE_TAB_INDEX.OTHERS && !propertyId)
          }
          onClick={() => onActiveTabChange(activeTab + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Next →
        </button>
      </div>
    </>
  );
}
