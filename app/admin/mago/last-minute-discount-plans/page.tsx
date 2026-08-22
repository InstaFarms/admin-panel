import Link from "next/link";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { Suspense } from "react";
import Searchbar from "@/components/Searchbar";
import AdminListControls from "@/app/admin/components/AdminListControls";
import LastMinuteDiscountPlanPropertiesTooltip from "@/components/last-minute-discount-plans/LastMinuteDiscountPlanPropertiesTooltip";
import LastMinuteDiscountPlanStatusToggle from "@/components/last-minute-discount-plans/LastMinuteDiscountPlanStatusToggle";
import { getLastMinuteDiscountPlans } from "@/actions/lastMinuteDiscountPlanActions";
import { getEmptyListMessage } from "@/constants/ui";
import { LAST_MINUTE_DISCOUNT_PLANS_SEARCH_KEYS } from "@/constants/last-minute-discount-plans";
import { LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH } from "@/constants/planBrandScope";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";

export const dynamic = "force-dynamic";

const SCOPE = "mago" as const;
const LIST = LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[SCOPE];

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTierSummary(values: any[] = []) {
  if (values.length === 0) return "No tiers";
  const thresholds = values
    .map((v) => Number(v.thresholdDays))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (thresholds.length === 0) return `${values.length} tier${values.length > 1 ? "s" : ""}`;
  const range = thresholds.length === 1
    ? `${thresholds[0]} day`
    : `${thresholds[0]}-${thresholds[thresholds.length - 1]} days`;
  return `${values.length} tier${values.length > 1 ? "s" : ""} | ${range}`;
}

function formatPropertyScope(propertyIds: string[] = []) {
  if (propertyIds.length === 0) return "All properties";
  return `${propertyIds.length} propert${propertyIds.length === 1 ? "y" : "ies"}`;
}

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const currentPage = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const searchValue = filterParams?.searchValue?.toLowerCase();

  const { data, total } = await getLastMinuteDiscountPlans(limit, offset, searchValue, SCOPE);

  const hasNextPage = offset + data.length < total;
  const emptyMessage = getEmptyListMessage("last minute discount plans", Boolean(searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Last Minute Discount Plans</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Last Minute Discount Plans</span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBarWrap}>
            <Suspense fallback={null}>
              <Searchbar
                searchKeys={[...LAST_MINUTE_DISCOUNT_PLANS_SEARCH_KEYS]}
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
                <th className={styles.tableHeadCell}>Tiers</th>
                <th className={styles.tableHeadCell}>Properties</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Updated</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map(({ id, name, isActive, values, propertyIds, properties, updatedAt }: any, i: number) => (
                  <tr key={id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{offset + i + 1}</td>
                    <td className={styles.tableCell}>{name}</td>
                    <td className={styles.tableCell}>{formatTierSummary(values)}</td>
                    <td className={styles.tableCell}>
                      <LastMinuteDiscountPlanPropertiesTooltip properties={properties}>
                        {formatPropertyScope(propertyIds)}
                      </LastMinuteDiscountPlanPropertiesTooltip>
                    </td>
                    <td className={styles.tableCell}>
                      <LastMinuteDiscountPlanStatusToggle
                        planId={id}
                        initialStatus={isActive}
                        adminScope={SCOPE}
                      />
                    </td>
                    <td className={styles.tableCell}>{formatDate(updatedAt)}</td>
                    <td className={styles.tableCell}>
                      <Link href={`${LIST}/${id}`} className={styles.actionButton} title="Edit">
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

      <AdminListControls pageSize={limit} currentPage={currentPage} hasNextPage={hasNextPage} />
    </div>
  );
}
