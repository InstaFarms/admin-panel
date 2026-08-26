import {
  getPropertyLocationLines,
  getPropertyDisplayName,
  type PropertiesListItem,
} from "@/lib/propertiesListUtils";
import { resolveBrandSlugFromName } from "@/lib/properties/brandSlug";
import PropertyBrandStatusToggle from "@/components/properties/PropertyBrandStatusToggle";
import PropertyAuditConfigLockToggle from "@/components/properties/PropertyAuditConfigLockToggle";
import RecoverPropertyButton from "@/components/properties/RecoverPropertyButton";
import Link from "next/link";
import styles from "./PropertiesListPage.module.css";

interface PropertiesTableProps {
  data: PropertiesListItem[];
  offset: number;
  emptyMessage: string;
  detailBasePath?: string;
  mode?: "active" | "deleted";
}

const BRAND_COLUMNS = [
  { slug: "instafarms", label: "Instafarms" },
  { slug: "mago", label: "Mago" },
] as const;

export default function PropertiesTable({
  data,
  offset,
  emptyMessage,
  detailBasePath = "/admin/properties",
  mode = "active",
}: PropertiesTableProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeadCell}>Sr No</th>
              <th className={styles.tableHeadCell}>Property Name</th>
              {mode === "active" ? (
                <th className={styles.tableHeadCell}>Property Code Name</th>
              ) : null}
              <th className={styles.tableHeadCell}>Property Code</th>
              <th className={styles.tableHeadCell}>Location</th>
              {mode === "active"
                ? BRAND_COLUMNS.map((brand) => (
                    <th
                      key={brand.slug}
                      className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}
                    >
                      {brand.label}
                    </th>
                  ))
                : null}
              {mode === "active" ? (
                <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Audit Edit Lock</th>
              ) : null}
              {mode === "deleted" ? (
                <th className={styles.tableHeadCell}>Recover</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((property, index) => {
                const location = getPropertyLocationLines(property);

                return (
                  <tr className={styles.tableRow} key={property.id}>
                    <td className={styles.tableCell}>
                      {offset + index + 1}
                    </td>
                    <td className={styles.tableCell}>
                      <div className="max-w-[200px] truncate text-wrap sm:max-w-none">
                        <Link
                          href={`${detailBasePath}/${property.id}`}
                          className={styles.link}
                        >
                          {getPropertyDisplayName(property)}
                        </Link>
                      </div>
                    </td>
                    {mode === "active" ? (
                      <td className={styles.tableCell}>
                        <div className="max-w-[200px] truncate text-wrap sm:max-w-none">
                          <Link
                            href={`${detailBasePath}/${property.id}`}
                            className={styles.link}
                          >
                            {property.propertyCodeName ?? "-"}
                          </Link>
                        </div>
                      </td>
                    ) : null}
                    <td className={styles.tableCell}>
                      <Link
                        href={`${detailBasePath}/${property.id}`}
                        className={styles.linkMuted}
                      >
                        {property.propertyCode ?? "N/A"}
                      </Link>
                    </td>
                    <td className={styles.tableCell}>
                      <div className="whitespace-normal leading-snug">
                        <div>{location.primary}</div>
                        {location.secondary ? (
                          <div className={styles.subtleText}>
                            {location.secondary}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    {mode === "active"
                      ? BRAND_COLUMNS.map((brand) => {
                          const brandStatus =
                            property.brandStatuses?.find(
                              (status) =>
                                resolveBrandSlugFromName(status.brandName ?? "") ===
                                brand.slug
                            ) ?? null;

                          return (
                            <td
                              key={`${property.id}-${brand.slug}`}
                              className={`${styles.tableCell} ${styles.tableCellCenter}`}
                            >
                              <div className="flex justify-center">
                                {brandStatus?.brandId ? (
                                  <PropertyBrandStatusToggle
                                    propertyId={property.id}
                                    brandId={brandStatus.brandId}
                                    brandName={brand.label}
                                    initialIsActive={Boolean(brandStatus.isActive)}
                                  />
                                ) : (
                                  <span className={styles.toggleFallback}>-</span>
                                )}
                              </div>
                            </td>
                          );
                        })
                      : null}
                    {mode === "active" ? (
                      <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                        <PropertyAuditConfigLockToggle
                          propertyId={property.id}
                          initialIsLocked={Boolean(property.isAuditConfigLocked)}
                        />
                      </td>
                    ) : null}
                    {mode === "deleted" ? (
                      <td className={styles.tableCell}>
                        <RecoverPropertyButton propertyId={property.id} />
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={mode === "deleted" ? 5 : 10}
                  className={styles.emptyRow}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
