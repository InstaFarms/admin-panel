import { Card } from "flowbite-react";
import Link from "next/link";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { ServerPageProps } from "@/utils/types";
import {
  getElivaasPropertyCatalog,
  getElivaasPropertySettings,
  getElvaasCitySettings,
  getElvaasCatalogCities,
} from "@/actions/elivaasActions";
import SyncButton from "./SyncButton";
import ElvaasCityStateOverride from "./ElvaasCityStateOverride";
import RestorePropertyButton from "./RestorePropertyButton";
import ElivaasSearchForm from "./ElivaasSearchForm";
import ElivaasPropertyCard from "./ElivaasPropertyCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function ElivaasPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const successMessage = typeof params.success === "string" ? params.success : "";

  const filterCity     = typeof params.city          === "string" ? params.city          : "";
  const specialFilter  = typeof params.specialFilter === "string" ? params.specialFilter : "";
  const checkinDate    = typeof params.checkinDate   === "string" ? params.checkinDate   : "";
  const checkoutDate   = typeof params.checkoutDate  === "string" ? params.checkoutDate  : "";
  const adults         = typeof params.adults        === "string" ? Number(params.adults) : 2;
  const children       = typeof params.children      === "string" ? Number(params.children) : 0;
  const currentPage    = typeof params.page          === "string" ? Math.max(1, Number(params.page)) : 1;

  const [catalog, savedSettings, citySettings, resolvedCities] = await Promise.all([
    getElivaasPropertyCatalog(),
    getElivaasPropertySettings(),
    getElvaasCitySettings(),
    getElvaasCatalogCities(),
  ]);

  // cityName (lowercase) → resolved state — more reliable than slug matching
  const resolvedStateMap = new Map(resolvedCities.map((c) => [c.city.toLowerCase(), c.state]));

  // citySlug → DB state override
  const cityStateMap = new Map(citySettings.map((c) => [c.citySlug, c]));

  const settingsMap = new Map(savedSettings.map((s) => [s.propertyId, s]));

  const lastSynced = catalog.length > 0
    ? catalog.reduce((latest, p) =>
        new Date(p.lastSyncedAt) > new Date(latest) ? p.lastSyncedAt : latest,
        catalog[0].lastSyncedAt
      )
    : null;

  // Build city list with slugs (for state override lookup)
  const citySlugMap = new Map<string, string>(); // cityName → citySlug
  for (const p of catalog) {
    if (!citySlugMap.has(p.city) && (p as any).citySlug) {
      citySlugMap.set(p.city, (p as any).citySlug);
    }
  }
  const citiesSet = new Set(catalog.map((p) => p.city));
  const allCities = [...citiesSet].sort();

  // Cities with no state set (in DB with null stateOverride = needs mapping)
  const missingStateCitySlugs = new Set(
    citySettings.filter((c) => !c.stateOverride).map((c) => c.citySlug)
  );

  const deletedList = catalog.filter((p) => (settingsMap.get(p.propertyId) as any)?.isDeletedFromElivaas);
  const missingStateList = catalog.filter((p) => {
    const slug = citySlugMap.get(p.city);
    return slug && missingStateCitySlugs.has(slug);
  });

  const displayList = specialFilter === "deleted"
    ? deletedList
    : specialFilter === "missing-state"
      ? missingStateList
      : filterCity
        ? catalog.filter((p) => p.city === filterCity)
        : catalog;

  const totalPages  = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE));
  const safePage    = Math.min(currentPage, totalPages);
  const pagedList   = displayList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Build a query string preserving all current params except page
  function pageUrl(p: number) {
    const q = new URLSearchParams();
    if (filterCity)   q.set("city", filterCity);
    if (checkinDate)  q.set("checkinDate", checkinDate);
    if (checkoutDate) q.set("checkoutDate", checkoutDate);
    if (adults !== 2) q.set("adults", String(adults));
    if (children)     q.set("children", String(children));
    if (p > 1)        q.set("page", String(p));
    return `?${q.toString()}`;
  }

  const hiddenCount = displayList.filter((p) => {
    const s = settingsMap.get(p.propertyId);
    return s ? !s.isVisible : false;
  }).length;

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Elivaas Properties
              </h5>
              <PageBreadcrumb
                items={[
                  { label: "Home", href: "/admin/dashboard" },
                  { label: "Elivaas", href: "#" },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/admin/elivaas/bookings"
                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                📋 Bookings
              </a>
              <SyncButton />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>{catalog.length} properties total</span>
            {hiddenCount > 0 && (
              <span className="text-yellow-600">{hiddenCount} hidden from website</span>
            )}
            {lastSynced && (
              <span>Last synced {formatRelative(lastSynced)}</span>
            )}
          </div>

          {/* Search by date form */}
          <ElivaasSearchForm
            cities={allCities.map((c) => ({ slug: c, displayName: c, type: "CITY" }))}
            city={filterCity}
            checkinDate={checkinDate}
            checkoutDate={checkoutDate}
            adults={adults}
            children={children}
          />

          {/* Dates selected indicator */}
          {checkinDate && checkoutDate && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              <span>📅 Showing properties for <strong>{checkinDate}</strong> → <strong>{checkoutDate}</strong> · {adults} adult{adults !== 1 ? "s" : ""}{children > 0 ? `, ${children} children` : ""}</span>
              <Link href="?" className="ml-auto text-xs text-emerald-500 hover:underline">Clear dates</Link>
            </div>
          )}

          {/* Special filters */}
          {(deletedList.length > 0 || missingStateList.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {missingStateList.length > 0 && (
                <Link
                  href={specialFilter === "missing-state" ? "?" : "?specialFilter=missing-state"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    specialFilter === "missing-state"
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-orange-200 text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  ⚠️ Missing State
                  <span className="rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[10px] font-semibold">
                    {missingStateList.length}
                  </span>
                </Link>
              )}
              {deletedList.length > 0 && (
                <Link
                  href={specialFilter === "deleted" ? "?" : "?specialFilter=deleted"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    specialFilter === "deleted"
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  }`}
                >
                  🗑️ Removed from Elivaas — Action Needed
                  <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-semibold">
                    {deletedList.length}
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* City filter tabs */}
          {allCities.length > 1 && !specialFilter && (
            <div className="flex gap-2 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-1">
              <Link
                href={checkinDate ? `?checkinDate=${checkinDate}&checkoutDate=${checkoutDate}&adults=${adults}&children=${children}` : "?"}
                className={`pb-1 px-2 text-sm font-medium border-b-2 transition-colors ${
                  !filterCity ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                All
              </Link>
              {allCities.map((c) => {
                const slug = citySlugMap.get(c);
                const dbSetting = slug ? cityStateMap.get(slug) : undefined;
                const dbState = dbSetting?.stateOverride ?? null;
                // Show DB override if set, else fall back to backend-resolved state
                const resolvedState = resolvedStateMap.get(c.toLowerCase()) ?? null;
                const currentState = dbState ?? resolvedState;
                const isUnknown = !!slug && missingStateCitySlugs.has(slug) && !dbState;
                return (
                  <div key={c} className="flex flex-col items-start">
                    <Link
                      href={`?city=${encodeURIComponent(c)}${checkinDate ? `&checkinDate=${checkinDate}&checkoutDate=${checkoutDate}&adults=${adults}&children=${children}` : ""}`}
                      className={`pb-0.5 px-2 text-sm font-medium border-b-2 capitalize transition-colors ${
                        filterCity === c ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {c}
                    </Link>
                    {slug && (
                      <div className="px-2">
                        <ElvaasCityStateOverride
                          citySlug={slug}
                          cityName={c}
                          currentState={currentState}
                          isUnknown={isUnknown}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200">
              {successMessage}
            </div>
          )}

          {catalog.length === 0 && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
              No properties synced yet. Click &ldquo;Reload from Elivaas&rdquo; to fetch the property catalog.
            </div>
          )}
        </div>
      </Card>

      {/* Property list */}
      {displayList.length > 0 && (
        <div className="flex flex-col gap-3">
          {pagedList.map((property) => {
            const existingSettings = settingsMap.get(property.propertyId);
            const isHidden = existingSettings ? !existingSettings.isVisible : false;
            const isDeleted = (existingSettings as any)?.isDeletedFromElivaas ?? false;

            return (
              <div key={property.propertyId}>
              {isDeleted && (
                <div className="mb-1 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span>🗑️ <strong>Removed from Elivaas</strong> — property no longer returned by Elivaas API. Restore to make it visible again, or leave hidden.</span>
                  <RestorePropertyButton propertyId={property.propertyId} />
                </div>
              )}
              <ElivaasPropertyCard
                key={property.propertyId}
                propertyId={property.propertyId}
                displayName={existingSettings?.displayNameOverride ?? property.name}
                city={property.city}
                isHidden={isHidden}
                lastSyncedAt={property.lastSyncedAt}
                catalogData={{
                  description:    (property as any).description    ?? null,
                  maxOccupancy:   (property as any).maxOccupancy   ?? null,
                  lat:            (property as any).lat            ?? null,
                  lng:            (property as any).lng            ?? null,
                  firstImageUrl:  (property as any).firstImageUrl  ?? null,
                  imageCount:     (property as any).imageCount     ?? null,
                  amenityCount:   (property as any).amenityCount   ?? null,
                  faqsJson:       (property as any).faqsJson       ?? null,
                  imagesJson:     (property as any).imagesJson     ?? null,
                  amenitiesJson:  (property as any).amenitiesJson  ?? null,
                  houseRulesJson: (property as any).houseRulesJson ?? null,
                  metricsJson:    (property as any).metricsJson    ?? null,
                  extraAdultRate: (property as any).extraAdultRate ?? null,
                  extraChildRate: (property as any).extraChildRate ?? null,
                  securityFee:    (property as any).securityFee    ?? null,
                }}
                initialSettings={{
                  isVisible:            existingSettings?.isVisible            ?? true,
                  markupPercentage:     existingSettings?.markupPercentage     ?? 20,
                  displayNameOverride:  existingSettings?.displayNameOverride  ?? null,
                  adminNotes:           existingSettings?.adminNotes           ?? null,
                  descriptionOverride:  existingSettings?.descriptionOverride  ?? null,
                  imagesOverride:       existingSettings?.imagesOverride       ?? null,
                  maxGuestsOverride:    existingSettings?.maxGuestsOverride    ?? null,
                  bedroomCountOverride: existingSettings?.bedroomCountOverride ?? null,
                  bathroomCountOverride:existingSettings?.bathroomCountOverride?? null,
                  amenitiesOverride:    existingSettings?.amenitiesOverride    ?? null,
                  checkInTimeOverride:  existingSettings?.checkInTimeOverride  ?? null,
                  checkOutTimeOverride: existingSettings?.checkOutTimeOverride ?? null,
                  houseRulesOverride:      existingSettings?.houseRulesOverride                    ?? null,
                  tagsOverride:            existingSettings?.tagsOverride                          ?? null,
                  faqsOverride:            (existingSettings as any)?.faqsOverride                ?? null,
                  securityDepositOverride: (existingSettings as any)?.securityDepositOverride     ?? null,
                  extraAdultRateOverride:  (existingSettings as any)?.extraAdultRateOverride      ?? null,
                  extraChildRateOverride:  (existingSettings as any)?.extraChildRateOverride      ?? null,
                  areaOverride:            existingSettings?.areaOverride                         ?? null,
                  latOverride:             existingSettings?.latOverride                          ?? null,
                  lngOverride:             existingSettings?.lngOverride                          ?? null,
                  bedsCountOverride:       (existingSettings as any)?.bedsCountOverride           ?? null,
                  spacesOverride:          (existingSettings as any)?.spacesOverride              ?? null,
                  sectionsOverride:        (existingSettings as any)?.sectionsOverride            ?? null,
                  priceAmountOverride:     (existingSettings as any)?.priceAmountOverride         ?? null,
                }}
                checkinDate={checkinDate}
                checkoutDate={checkoutDate}
                adults={adults}
                children={children}
              />
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, displayList.length)} of {displayList.length}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={pageUrl(safePage - 1)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                safePage <= 1
                  ? "pointer-events-none border-gray-100 text-gray-300 dark:border-gray-700 dark:text-gray-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              ← Prev
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageUrl(p as number)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      p === safePage
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
            <Link
              href={pageUrl(safePage + 1)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                safePage >= totalPages
                  ? "pointer-events-none border-gray-100 text-gray-300 dark:border-gray-700 dark:text-gray-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              Next →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
