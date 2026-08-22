import { ChevronRight } from "lucide-react";
import { getAllBrands } from "@/actions/brandActions";
import { getEnrichedPaginatedLocations } from "@/actions/locationActions";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";
import StateListControls from "./StateListControls";
import LocationListClient from "../components/LocationListClient";
import styles from "./StateListPage.module.css";

const SEARCH_BY_MAP: Record<string, "name" | "slug" | "locationTag"> = {
  Name: "name",
  Slug: "slug",
  Tag: "locationTag",
};

export default async function StateListPage({
  searchParams,
}: {
  searchParams?: ServerPageProps["searchParams"];
}) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params ?? {});
  const filterParams = parseFilterParams(params ?? {});
  const searchKey = filterParams?.searchKey ?? "Name";
  const searchValue = filterParams?.searchValue ?? "";
  const currentPage = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const perPage = Math.min(limit, 100);
  const [enriched, brands] = await Promise.all([
    getEnrichedPaginatedLocations({
      pageNumber: currentPage,
      perPage,
      searchKey: searchValue || undefined,
      searchBy: SEARCH_BY_MAP[searchKey] || "name",
      role: "state",
      orderBy: "name",
      sortorder: "asc",
    }),
    getAllBrands(["id", "name"]),
  ]);

  const hasNextPage = enriched.length >= perPage;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>States</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>States</span>
          </div>
        </div>
      </div>

      <LocationListClient
        initialLocations={enriched}
        brands={brands}
        role="state"
        searchKeys={["Name", "Slug", "Tag"]}
        editHrefPrefix="/admin/locations/states"
        showLocationTag={true}
        showParent={false}
        childListHrefPrefix="/admin/locations/cities"
        childParamKey="stateId"
        nameColumn="State"
        offset={offset}
        createHref="/admin/locations/states/create"
        createLabel="New state"
        initialSearchKey={searchKey}
        initialSearchValue={searchValue}
      />

      <StateListControls
        pageSize={Math.min(limit, 100)}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
      />
    </div>
  );
}
