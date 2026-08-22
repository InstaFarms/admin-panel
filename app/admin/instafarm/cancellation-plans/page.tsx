import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import Searchbar from "@/components/Searchbar";
import AdminListControls from "@/app/admin/components/AdminListControls";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { getCancellationPlansList } from "@/actions/cancellationPlanActions";
import { getEmptyListMessage } from "@/constants/ui";
import { CANCELLATION_PLANS_SEARCH_KEYS } from "@/constants/cancellation-plans";
import { CANCELLATION_PLANS_LIST_BASE_PATH } from "@/constants/planBrandScope";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

const SCOPE = "instafarms" as const;
const LIST = CANCELLATION_PLANS_LIST_BASE_PATH[SCOPE];

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const currentPage = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const searchBy = filterParams?.searchKey === "Name" ? "name" : undefined;
  const searchValue = filterParams?.searchValue?.toLowerCase();

  const { data, total } = await getCancellationPlansList(limit, offset, searchValue, searchBy, SCOPE);

  const hasNextPage = offset + data.length < total;
  const emptyMessage = getEmptyListMessage("cancellation plans", Boolean(searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cancellation Plans</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Cancellation Plans</span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBarWrap}>
            <Suspense fallback={null}>
              <Searchbar
                searchKeys={[...CANCELLATION_PLANS_SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Name"}
              />
            </Suspense>
          </div>
          <Link href={`${LIST}/create`} className={styles.createButton}>
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
                <th className={styles.tableHeadCell}>Plan Name</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map(({ id, name, isActive }: any, i: number) => (
                  <tr key={id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{offset + i + 1}</td>
                    <td className={styles.tableCell}>{name}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <Link href={`${LIST}/${id}`} className={styles.actionButton} title="Edit">
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

      <AdminListControls pageSize={limit} currentPage={currentPage} hasNextPage={hasNextPage} />
    </div>
  );
}
