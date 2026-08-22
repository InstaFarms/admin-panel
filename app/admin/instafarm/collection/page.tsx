import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import Searchbar from "@/components/Searchbar";
import AdminListControls from "@/app/admin/components/AdminListControls";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { getCollectionsList } from "@/actions/collectionActions";
import { getEmptyListMessage } from "@/constants/ui";
import { SEARCH_KEYS, SEARCH_KEY_MAP } from "@/constants/collections";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const pageNumber = Math.floor(offset / limit) + 1;

  const searchKeyLabel = filterParams?.searchKey;
  const searchValue = filterParams?.searchValue;
  const searchBy = searchKeyLabel
    ? SEARCH_KEY_MAP[searchKeyLabel as keyof typeof SEARCH_KEY_MAP]
    : undefined;

  const result = await getCollectionsList(limit, pageNumber, searchValue, searchBy, "instafarms");
  const data = Array.isArray(result) ? result : [];

  const hasNextPage = data.length >= limit;
  const emptyMessage = getEmptyListMessage("collections", Boolean(searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Collections</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Collections</span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBarWrap}>
            <Suspense fallback={null}>
              <Searchbar
                searchKeys={[...SEARCH_KEYS]}
                defaultSearchKey={filterParams?.searchKey ?? "Name"}
              />
            </Suspense>
          </div>
          <Link href="/admin/instafarm/collection/create" className={styles.createButton}>
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
                <th className={styles.tableHeadCell}>Logo</th>
                <th className={styles.tableHeadCell}>Name</th>
                <th className={styles.tableHeadCell}>Slug</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Weight</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map(({ id, name, slug, isActive, weight, logo }: any, i: number) => (
                  <tr key={id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{offset + i + 1}</td>
                    <td className={styles.tableCell}>
                      {logo ? (
                        <img src={logo} alt={`${name} logo`} loading="lazy"
                          style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--inset)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>No img</span>
                        </div>
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      <Link href={`/admin/instafarm/collection/${id}`} className={styles.stateLink}>
                        {name}
                      </Link>
                    </td>
                    <td className={`${styles.tableCell} ${styles.mono}`}>{slug || "—"}</td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.tableCell}>{weight}</td>
                    <td className={styles.tableCell}>
                      <Link href={`/admin/instafarm/collection/${id}`} className={styles.actionButton} title="Edit">
                        <Pencil size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>{emptyMessage}</td>
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
