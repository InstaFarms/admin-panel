"use client";

import Searchbar from "@/components/Searchbar";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import styles from "../states/StateListPage.module.css";

const BRAND_COLORS = ["#2f6df6", "#8b5cf6", "#18b981", "#e0a23a", "#06b6d4", "#ef4655"];

function shortCode(name: string) {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "BR";
}

type LocationListClientProps = {
  initialLocations: any[];
  brands: any[];
  role: string;
  searchKeys: string[];
  editHrefPrefix: string;
  showLocationTag?: boolean;
  showParent?: boolean;
  childListHrefPrefix?: string;
  childParamKey?: string;
  nameColumn: string;
  offset: number;
  createHref?: string;
  createLabel?: string;
  initialSearchKey?: string;
  initialSearchValue?: string;
};

export default function LocationListClient({
  initialLocations,
  brands,
  searchKeys,
  editHrefPrefix,
  showLocationTag = true,
  showParent = true,
  childListHrefPrefix,
  childParamKey = "parentId",
  nameColumn,
  offset,
  createHref,
  createLabel,
  initialSearchKey,
  initialSearchValue = "",
}: LocationListClientProps) {
  const searchValue = initialSearchValue;

  const brandMeta = new Map(
    brands.map((brand: any, idx: number) => [
      brand.id,
      { name: brand.name, short: shortCode(brand.name), color: BRAND_COLORS[idx % BRAND_COLORS.length] },
    ]),
  );

  const [brandFilter, setBrandFilter] = useState("all");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const brandFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!brandDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (brandFilterRef.current && !brandFilterRef.current.contains(event.target as Node)) {
        setBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [brandDropdownOpen]);

  const hasSearch = searchValue.trim().length > 0;
  const hasBrandFilter = brandFilter !== "all";
  const displayedLocations = hasBrandFilter
    ? initialLocations.filter((loc: any) => loc.configuredBrandIds?.includes(brandFilter))
    : initialLocations;

  const activeBrandMeta = hasBrandFilter ? brandMeta.get(brandFilter) : undefined;
  const activeBrandLabel = activeBrandMeta?.name ?? "All brands";
  const activeBrandDotColor = activeBrandMeta?.color ?? "var(--dim)";

  const totalColumns = 7 + (showParent ? 1 : 0) + (showLocationTag ? 1 : 0);

  return (
    <>
      <div className={styles.toolbar}>
        {brands.length > 0 ? (
          <div className={styles.brandFilterWrap} ref={brandFilterRef}>
            <div
              className={styles.brandFilterButton}
              onClick={() => setBrandDropdownOpen((open) => !open)}
            >
              <span className={styles.brandFilterDot} style={{ background: activeBrandDotColor }} />
              Brand: {activeBrandLabel}
              <ChevronDown size={14} className={styles.brandFilterChevron} />
            </div>
            {brandDropdownOpen ? (
              <div className={styles.brandFilterMenu}>
                <div
                  className={`${styles.brandFilterOption} ${!hasBrandFilter ? styles.brandFilterOptionActive : ""}`}
                  onClick={() => {
                    setBrandFilter("all");
                    setBrandDropdownOpen(false);
                  }}
                >
                  <span className={styles.brandFilterDot} style={{ background: "var(--dim)" }} />
                  All brands
                </div>
                {brands.map((brand: any) => {
                  const meta = brandMeta.get(brand.id);
                  const isActive = brandFilter === brand.id;
                  return (
                    <div
                      key={brand.id}
                      className={`${styles.brandFilterOption} ${isActive ? styles.brandFilterOptionActive : ""}`}
                      onClick={() => {
                        setBrandFilter(brand.id);
                        setBrandDropdownOpen(false);
                      }}
                    >
                      <span className={styles.brandFilterDot} style={{ background: meta?.color }} />
                      {brand.name}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.searchForm}>
          <Searchbar
            searchKeys={[...searchKeys]}
            defaultSearchKey={initialSearchKey ?? searchKeys[0]}
          />
        </div>

        {createHref && createLabel ? (
          <Link href={createHref} className={styles.createButton}>
            <Plus size={16} />
            {createLabel}
          </Link>
        ) : null}
      </div>

      {hasSearch || hasBrandFilter ? (
        <p style={{ margin: "8px 0", fontSize: 13, color: "var(--muted, #888)" }}>
          {hasSearch ? `Showing results for "${searchValue.trim()}"` : `${displayedLocations.length} of ${initialLocations.length} results`}
          {hasSearch && hasBrandFilter ? ` for brand "${activeBrandLabel}"` : ""}
        </p>
      ) : null}

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeadCell}>S. No.</th>
                <th className={styles.tableHeadCell}>{nameColumn}</th>
                <th className={styles.tableHeadCell}>Slug</th>
                {showParent ? <th className={styles.tableHeadCell}>Parent</th> : null}
                {showLocationTag ? <th className={styles.tableHeadCell}>Tag</th> : null}
                <th className={styles.tableHeadCell}>Market</th>
                <th className={styles.tableHeadCell}>Brands</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedLocations.length > 0 ? (
                displayedLocations.map((loc: any, index: number) => {
                  const visibleBrands = loc.configuredBrandIds
                    .map((id: string) => brandMeta.get(id))
                    .filter(Boolean);
                  const nameHref = childListHrefPrefix
                    ? `${childListHrefPrefix}?${childParamKey}=${loc.id}`
                    : `${editHrefPrefix}/${loc.id}`;

                  return (
                    <tr key={loc.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{offset + index + 1}</td>
                      <td className={styles.tableCell}>
                        <Link href={nameHref} className={styles.stateLink}>
                          {loc.name}
                        </Link>
                      </td>
                      <td className={`${styles.tableCell} ${styles.mono}`}>{loc.slug}</td>
                      {showParent ? <td className={styles.tableCell}>{loc.parentName || "-"}</td> : null}
                      {showLocationTag ? (
                        <td className={`${styles.tableCell} ${styles.mono}`}>{loc.locationTag || "-"}</td>
                      ) : null}
                      <td className={styles.tableCell}>
                        {String(loc.marketType || "-")
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.brandStack}>
                          {visibleBrands.slice(0, 3).map((brand: any) => (
                            <span
                              key={`${loc.id}-${brand.name}`}
                              className={styles.brandChip}
                              style={{ background: brand.color }}
                              title={brand.name}
                            >
                              {brand.short}
                            </span>
                          ))}
                          {visibleBrands.length > 3 ? (
                            <span className={styles.brandOverflow}>+{visibleBrands.length - 3}</span>
                          ) : null}
                          {!visibleBrands.length ? <span className={styles.brandOverflow}>-</span> : null}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <span
                          className={`${styles.statusBadge} ${loc.isActive ? styles.statusActive : styles.statusInactive}`}
                        >
                          {loc.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <Link href={`${editHrefPrefix}/${loc.id}`} className={styles.actionButton} title="Edit">
                          <Pencil size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={totalColumns} className={styles.emptyRow}>
                    {hasSearch || hasBrandFilter ? "No results found." : "No items found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
