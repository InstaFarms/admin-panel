import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import Searchbar from "@/components/Searchbar";
import AdminListControls from "@/app/admin/components/AdminListControls";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { getSafetyHygiene } from "@/actions/safety-hygieneActions";
import { getEmptyListMessage } from "@/constants/ui";
import { SAFETY_HYGIENE_SEARCH_KEYS } from "@/constants/safetyHygiene";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const pageNumber = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const searchBy = filterParams?.searchKey === "Name" ? "name" : undefined;
  const searchValue = filterParams?.searchValue?.trim().toLowerCase();

  let data: any[] = [];
  try {
    const result = await getSafetyHygiene(pageNumber, limit, searchValue, searchBy);
    data = Array.isArray(result) ? result : [];
  } catch {
    throw new Error("Failed to fetch safety & hygiene items. Please try again.");
  }

  const hasNextPage = data.length >= limit;
  const emptyMessage = getEmptyListMessage("safety & hygiene items", Boolean(filterParams?.searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Safety &amp; Hygiene</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Safety &amp; Hygiene</span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBarWrap}>
            <Suspense fallback={null}>
              <Searchbar
                searchKeys={[...SAFETY_HYGIENE_SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Name"}
              />
            </Suspense>
          </div>
          <Link href="/admin/safety-hygiene/create" className={styles.createButton}>
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
                <th className={styles.tableHeadCell}>Safety &amp; Hygiene</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map(({ id, name }: any, i: number) => (
                  <tr key={id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{offset + i + 1}</td>
                    <td className={styles.tableCell}>{name}</td>
                    <td className={styles.tableCell}>
                      <Link href={`/admin/safety-hygiene/${id}`} className={styles.actionButton} title="Edit">
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className={styles.emptyRow}>{emptyMessage}</td>
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
