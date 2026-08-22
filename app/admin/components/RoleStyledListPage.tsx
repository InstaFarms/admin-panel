import { ChevronRight } from "lucide-react";
import { getAllBrands } from "@/actions/brandActions";
import { getEnrichedPaginatedLocations } from "@/actions/locationActions";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";
import type { LocationRole } from "@/types/locations";
import StateListControls from "../locations/states/StateListControls";
import LocationListClient from "../locations/components/LocationListClient";
import styles from "../locations/states/StateListPage.module.css";

const SEARCH_BY_MAP: Record<string, "name" | "slug" | "locationTag" | "parentName"> = {
  Name: "name",
  Slug: "slug",
  Tag: "locationTag",
  Parent: "parentName",
};

type RoleStyledListPageProps = {
  role: LocationRole;
  label: string;
  singularLabel: string;
  createHref: string;
  editHrefPrefix: string;
  searchParams?: ServerPageProps["searchParams"];
  showLocationTag?: boolean;
  childListHrefPrefix?: string;
  childParamKey?: string;
  parentFilterParamKey?: string;
};

export default async function RoleStyledListPage({
  role,
  label,
  singularLabel,
  createHref,
  editHrefPrefix,
  searchParams,
  showLocationTag = true,
  childListHrefPrefix,
  childParamKey = "parentId",
  parentFilterParamKey,
}: RoleStyledListPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params ?? {});
  const filterParams = parseFilterParams(params ?? {});
  const searchKey = filterParams?.searchKey ?? "Name";
  const searchValue = filterParams?.searchValue ?? "";
  const currentPage = offset > 0 ? Math.floor(offset / limit) + 1 : 1;
  const rawParentId = parentFilterParamKey ? params?.[parentFilterParamKey] : undefined;
  const parentId = Array.isArray(rawParentId) ? rawParentId[0] : rawParentId;

  const perPage = Math.min(limit, 100);
  const [enriched, brands] = await Promise.all([
    getEnrichedPaginatedLocations({
      pageNumber: currentPage,
      perPage,
      searchKey: searchValue || undefined,
      searchBy: SEARCH_BY_MAP[searchKey] || "name",
      role,
      parentId: typeof parentId === "string" && parentId.length > 0 ? parentId : undefined,
      orderBy: "name",
      sortorder: "asc",
    }),
    getAllBrands(["id", "name"]),
  ]);

  const hasNextPage = enriched.length >= perPage;
  const createLabel = `New ${singularLabel.toLowerCase()}`;
  const titleKey = singularLabel.toLowerCase();
  const nameColumn = titleKey[0].toUpperCase() + titleKey.slice(1);
  const availableSearchKeys = showLocationTag
    ? ["Name", "Slug", "Tag", "Parent"]
    : ["Name", "Slug", "Parent"];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{label}</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>{label}</span>
          </div>
        </div>
      </div>

      <LocationListClient
        initialLocations={enriched}
        brands={brands}
        role={role}
        searchKeys={availableSearchKeys}
        editHrefPrefix={editHrefPrefix}
        showLocationTag={showLocationTag}
        showParent={true}
        childListHrefPrefix={childListHrefPrefix}
        childParamKey={childParamKey}
        nameColumn={nameColumn}
        offset={offset}
        createHref={createHref}
        createLabel={createLabel}
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
