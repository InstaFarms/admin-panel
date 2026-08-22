import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import Searchbar from "@/components/Searchbar";
import AdminListControls from "@/app/admin/components/AdminListControls";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { getActivities } from "@/actions/activityActions";
import { getEmptyListMessage } from "@/constants/ui";
import { ACTIVITIES_SEARCH_KEYS, ACTIVITIES_ERRORS } from "@/constants/activities";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const pageNumber = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const searchBy = filterParams?.searchKey === "Name" ? "name" : undefined;

  let data: any[] = [];
  let error: string | null = null;

  try {
    const result = await getActivities(pageNumber, limit, filterParams?.searchValue, searchBy);
    data = Array.isArray(result) ? result : [];
  } catch (err) {
    error = err instanceof Error ? err.message : ACTIVITIES_ERRORS.fetchFailed;
  }

  const hasNextPage = data.length >= limit;
  const emptyMessage = error ?? getEmptyListMessage("activities", Boolean(filterParams?.searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Activities</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Activities</span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBarWrap}>
            <Suspense fallback={null}>
              <Searchbar
                searchKeys={[...ACTIVITIES_SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Name"}
              />
            </Suspense>
          </div>
          <Link href="/admin/activities/create" className={styles.createButton}>
            <Plus size={16} />
            New
          </Link>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeadCell}>S. No.</th>
                <th className={styles.tableHeadCell}>Activity</th>
                <th className={styles.tableHeadCell}>Icon</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!error && data.length > 0 ? (
                data.map(({ id, name, icon }: any, i: number) => (
                  <tr key={id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{offset + i + 1}</td>
                    <td className={styles.tableCell}>{name}</td>
                    <td className={styles.tableCell}>
                      {icon?.startsWith("http://") || icon?.startsWith("https://") ? (
                        <img src={icon} alt={name} loading="lazy"
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain" }} />
                      ) : (
                        <span style={{ fontSize: 13 }}>{icon ?? "—"}</span>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      <Link href={`/admin/activities/${id}`} className={styles.actionButton} title="Edit">
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminListControls pageSize={limit} currentPage={pageNumber} hasNextPage={hasNextPage} />
    </div>
  );
}
