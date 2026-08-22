/**
 * Properties list page: paginated table with search (Property Name, Property Code).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import { fetchPropertiesPaginated, fetchHelperData } from "@/actions/propertyActions";
import { getAllBrands } from "@/actions/brandActions";
import Pagination from "@/components/Pagination";
import { getEmptyListMessage } from "@/constants/ui";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import PropertiesPageHeader from "@/components/properties/PropertiesPageHeader";
import PropertiesTable from "@/components/properties/PropertiesTable";
import styles from "@/components/properties/PropertiesListPage.module.css";
import {
  BREADCRUMBS,
  DEFAULT_SEARCH_KEY,
  SEARCH_KEYS,
  buildPropertiesFetchParams,
  getFirstQueryParam,
  type PropertiesListItem,
} from "@/lib/propertiesListUtils";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const areaId = getFirstQueryParam(params.areaId);

  const [result, deletedResult, rawBrands, typesResult] = await Promise.all([
    fetchPropertiesPaginated(buildPropertiesFetchParams({ limit, offset, filterParams, areaId })),
    fetchPropertiesPaginated(buildPropertiesFetchParams({ includeDeletedOnly: true, limit: 1000, offset: 0, filterParams: null, areaId: undefined })),
    getAllBrands(["id", "name"]),
    fetchHelperData("property-types"),
  ]);

  if (result.error) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.errorBox}>Error: {result.error}</div>
        </div>
      </div>
    );
  }

  const data: PropertiesListItem[] = result.data ?? [];
  const deletedData: PropertiesListItem[] = deletedResult.data ?? [];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("properties", hasSearch);
  const deletedEmptyMessage = "No deleted properties found.";

  const brands = (rawBrands ?? [])
    .filter((b: any) => b?.id && b?.name)
    .map((b: any) => ({ id: String(b.id), name: String(b.name) }));

  const propertyTypes = ((typesResult.data as any[]) ?? [])
    .filter((t: any) => t?.id && t?.name)
    .map((t: any) => ({ id: String(t.id), name: String(t.name) }));

  return (
    <div className={styles.page}>
      <PropertiesPageHeader
        breadcrumbs={BREADCRUMBS}
        searchKeys={SEARCH_KEYS}
        defaultSearchKey={
          (filterParams?.searchKey as (typeof SEARCH_KEYS)[number]) ??
          DEFAULT_SEARCH_KEY
        }
        deletedProperties={deletedData}
        deletedEmptyMessage={deletedEmptyMessage}
        brands={brands}
        propertyTypes={propertyTypes}
      />
      <PropertiesTable
        data={data}
        offset={offset}
        emptyMessage={emptyMessage}
      />
      <Pagination />
    </div>
  );
}
