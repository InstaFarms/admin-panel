"use client";

/**
 * Ops Configuration panel — client shell.
 *
 * Owns three things and nothing else:
 *  1. Organization resolution (the ops platform is org-scoped; everything below
 *     needs an organizationId) + a bootstrap escape hatch when the platform has
 *     never been initialised in this environment.
 *  2. Property selection, via the shared <PropertySelector/>.
 *  3. The tab strip. Each tab is a self-contained section component that loads
 *     its own data from the existing /api/ops/config API.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Card, Label, Select } from "flowbite-react";
import { HiOutlineExclamation, HiOutlineOfficeBuilding } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import PropertySelector from "@/components/PropertySelector";
import ActivationSection from "@/components/ops-config/ActivationSection";
import AssetsSection from "@/components/ops-config/AssetsSection";
import SpacesSection from "@/components/ops-config/SpacesSection";
import CatalogSection from "@/components/ops-config/CatalogSection";
import OperationsSection from "@/components/ops-config/OperationsSection";
import StandardsSection from "@/components/ops-config/StandardsSection";
import OverridesSection from "@/components/ops-config/OverridesSection";
import ResponsibilitiesSection from "@/components/ops-config/ResponsibilitiesSection";
import SchedulesSection from "@/components/ops-config/SchedulesSection";
import GenerationHealthSection from "@/components/ops-config/GenerationHealthSection";
import {
  bootstrapOps,
  getAssetTypes,
  getOrganizations,
  getSpaceTypes,
  type OpsOrganization,
} from "@/actions/opsConfigActions";
import {
  DEFAULT_ORG_NAME,
  DEFAULT_ORG_SLUG,
  DEFAULT_OPS_CONFIG_TAB,
  OPS_CONFIG_TABS,
  type OpsConfigTabId,
} from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

/** Tabs describing one property cannot render without one. */
const PROPERTY_SCOPED_TABS: OpsConfigTabId[] = [
  "activate",
  "spaces",
  "assets",
  "operations",
  "overrides",
  "responsibilities",
  "schedules",
  "errors",
];

export default function OpsConfigManager() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OpsConfigTabId>(
    DEFAULT_OPS_CONFIG_TAB,
  );

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [organizations, setOrganizations] = useState<OpsOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  /** null while unknown; false when the org exists but has no catalogs yet. */
  const [catalogsReady, setCatalogsReady] = useState<boolean | null>(null);
  const [bootstrapping, startBootstrap] = useTransition();

  /**
   * Several ops organizations can exist in one environment. Prefer the
   * conventional dev/bootstrap slug so the panel does not silently land on an
   * unrelated org whose catalogs do not match the property's assets.
   */
  const loadOrganizations = useCallback(async () => {
    setLoadingOrg(true);
    try {
      const orgs = await getOrganizations();
      setOrganizations(orgs);
      setOrganizationId((current) => {
        if (current && orgs.some((org) => org.id === current)) return current;
        const preferred = orgs.find((org) => org.slug === DEFAULT_ORG_SLUG);
        return (preferred ?? orgs[0])?.id ?? null;
      });
      if (orgs.length === 0) setCatalogsReady(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load ops organizations",
      );
      setOrganizations([]);
      setOrganizationId(null);
      setCatalogsReady(null);
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    Promise.all([getAssetTypes(organizationId), getSpaceTypes(organizationId)])
      .then(([assetTypes, spaceTypes]) => {
        if (!active) return;
        setCatalogsReady(assetTypes.length > 0 && spaceTypes.length > 0);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load ops catalogs",
        );
        setCatalogsReady(null);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  const runBootstrap = useCallback(() => {
    startBootstrap(() => {
      toast
        .promise(
          parseServerActionResult(
            bootstrapOps({
              organizationName: DEFAULT_ORG_NAME,
              organizationSlug: DEFAULT_ORG_SLUG,
            }),
          ),
          {
            loading: "Bootstrapping the ops platform...",
            success: (message: string) =>
              message || "Ops platform bootstrapped",
            error: (error: Error) =>
              error.message || "Failed to bootstrap the ops platform",
          },
        )
        .then(() => loadOrganizations())
        .catch(() => undefined);
    });
  }, [loadOrganizations]);

  const update = useCallback((next: string | null) => {
    setPropertyId(next);
  }, []);

  const organization =
    organizations.find((org) => org.id === organizationId) ?? null;
  const needsBootstrap =
    !loadingOrg && (!organization || catalogsReady === false);

  return (
    <div className="flex w-full flex-col gap-4">
      {loadingOrg ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex items-center justify-center py-10">
            <JarvisLoader />
          </div>
        </Card>
      ) : null}

      {needsBootstrap ? (
        <Card className="w-full border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                <HiOutlineExclamation className="h-6 w-6" />
              </span>
              <div>
                <h6 className="text-base font-semibold text-amber-900 dark:text-amber-100">
                  Ops platform not bootstrapped
                </h6>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {organization
                    ? `“${organization.name}” has no asset or space catalogs yet. Bootstrap seeds the standard catalogs and the default workflows.`
                    : "No ops organization exists in this environment yet. Bootstrap creates it along with the standard asset/space catalogs and default workflows."}{" "}
                  Bootstrapping is idempotent — it reuses an existing
                  organization with the same slug.
                </p>
              </div>
            </div>
            <MyButton
              color="warning"
              loading={bootstrapping}
              onClick={runBootstrap}
              className="shrink-0"
            >
              Bootstrap ops platform
            </MyButton>
          </div>
        </Card>
      ) : null}

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <Label htmlFor="opsConfigProperty">Property</Label>
          <div className="max-w-xl">
            <PropertySelector propertyId={propertyId} update={update} loadAllByDefault />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a property to configure the spaces and assets it actually has.
            Every physical thing is one row — two pools are two asset rows.
          </p>
          {organizations.length > 1 ? (
            <div className="flex max-w-xs flex-col gap-2 pt-2">
              <Label htmlFor="opsConfigOrganization">Ops organization</Label>
              <Select
                id="opsConfigOrganization"
                value={organizationId ?? ""}
                onChange={(e) => setOrganizationId(e.target.value || null)}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </Select>
            </div>
          ) : organization ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Organization: {organization.name} ({organization.slug})
            </p>
          ) : null}
        </div>
      </Card>

      {organizationId ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {OPS_CONFIG_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-gray-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {!organizationId && !loadingOrg && !needsBootstrap ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No ops organization is available, so configuration cannot be loaded.
          </p>
        </Card>
      ) : null}

      {organizationId ? (
        <OpsConfigTabPanel
          activeTab={activeTab}
          organizationId={organizationId}
          propertyId={propertyId}
        />
      ) : null}
    </div>
  );
}

function OpsConfigTabPanel({
  activeTab,
  organizationId,
  propertyId,
}: {
  activeTab: OpsConfigTabId;
  organizationId: string;
  propertyId: string | null;
}) {
  const tabLabel =
    OPS_CONFIG_TABS.find((tab) => tab.id === activeTab)?.label ?? "";

  if (PROPERTY_SCOPED_TABS.includes(activeTab) && !propertyId) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
            <HiOutlineOfficeBuilding className="h-6 w-6" />
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a property above to configure its {tabLabel.toLowerCase()}.
          </p>
        </div>
      </Card>
    );
  }

  switch (activeTab) {
    case "activate":
      return (
        <ActivationSection
          key={`activate-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId as string}
        />
      );
    case "standards":
      return (
        <StandardsSection
          key={`standards-${organizationId}-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId}
        />
      );
    case "spaces":
      return (
        <SpacesSection
          key={`spaces-${propertyId}`}
          propertyId={propertyId as string}
          organizationId={organizationId}
        />
      );
    case "assets":
      return (
        <AssetsSection
          key={`assets-${propertyId}`}
          propertyId={propertyId as string}
          organizationId={organizationId}
        />
      );
    case "catalog":
      return <CatalogSection organizationId={organizationId} />;
    case "operations":
      return (
        <OperationsSection
          key={`operations-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId as string}
        />
      );
    case "overrides":
      return (
        <OverridesSection
          key={`overrides-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId as string}
        />
      );
    case "responsibilities":
      return (
        <ResponsibilitiesSection
          key={`responsibilities-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId as string}
        />
      );
    case "schedules":
      return (
        <SchedulesSection
          key={`schedules-${propertyId}`}
          organizationId={organizationId}
          propertyId={propertyId as string}
        />
      );
    case "errors":
      return (
        <GenerationHealthSection
          key={`errors-${propertyId}`}
          propertyId={propertyId as string}
        />
      );
    default:
      return null;
  }
}
