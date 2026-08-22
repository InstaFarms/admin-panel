import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AdminListControls from "@/app/admin/components/AdminListControls";
import { parseLimitOffset } from "@/utils/server-utils";
import {
  getAllOccasions,
  getOccasionCities,
  getTopPropertiesForOccasion,
} from "@/actions/occasionActions";
import type { ServerPageProps } from "@/utils/types";
import styles from "@/app/admin/components/AdminListPage.module.css";
import OccasionTabs from "./OccasionTabs";
import AddOccasionButton from "./AddOccasionButton";
import CitiesPanel from "./CitiesPanel";

export const dynamic = "force-dynamic";

// Colour-coded score badge
function ScoreBadge({ score }: { score: number }) {
  const bg    = score >= 70 ? "rgba(24,185,129,0.14)" : score >= 40 ? "rgba(251,191,36,0.14)" : "rgba(148,163,184,0.12)";
  const color = score >= 70 ? "#18b981" : score >= 40 ? "#d97706" : "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, height: 26, borderRadius: 6, padding: "0 10px", fontSize: 13, fontWeight: 700, background: bg, color }}>
      {score}
    </span>
  );
}

// Occasion category chip
function OccasionChip({ name }: { name: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "rgba(47,109,246,0.12)", color: "#4f8bff", whiteSpace: "nowrap" }}>
      {name}
    </span>
  );
}

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const pageNumber = offset > 0 ? Math.floor(offset / limit) + 1 : 1;

  const selectedOccasion = typeof params?.occasion === "string" ? params.occasion : null;
  const selectedCity     = typeof params?.city === "string" ? params.city : null;
  const search           = typeof params?.search === "string" ? params.search : "";

  const [occasions, cities, properties] = await Promise.all([
    getAllOccasions(),
    getOccasionCities(selectedOccasion),
    getTopPropertiesForOccasion(selectedOccasion, selectedCity, search, pageNumber, limit),
  ]);

  const hasNextPage = properties.length >= limit;
  const selectedOccasionLabel = selectedOccasion
    ? (occasions.find((o) => o.slug === selectedOccasion)?.name ?? selectedOccasion)
    : "All Occasions";

  // URL helpers
  const tableHref = (extra: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { occasion: selectedOccasion, city: selectedCity, search, ...extra };
    if (merged.occasion) p.set("occasion", merged.occasion);
    if (merged.city)     p.set("city",     merged.city);
    if (merged.search)   p.set("search",   merged.search);
    const q = p.toString();
    return q ? `/admin/occasions?${q}` : "/admin/occasions";
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Occasions</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>
              Top Properties — {selectedOccasionLabel}
              {selectedCity ? ` · ${selectedCity}` : ""}
            </span>
          </div>
        </div>
        <AddOccasionButton />
      </div>

      {/* ── Occasion search + tabs ── */}
      <OccasionTabs
        occasions={occasions}
        selected={selectedOccasion}
        city={selectedCity}
        search={search}
      />

      {/* ── Two-column body ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* Cities panel — client component with search */}
        <CitiesPanel
          cities={cities}
          selectedCity={selectedCity}
          occasionSlug={selectedOccasion}
        />

        {/* Table area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Search row */}
          <form method="GET" style={{ marginBottom: 12, display: "flex", gap: 10 }}>
            {selectedOccasion && <input type="hidden" name="occasion" value={selectedOccasion} />}
            {selectedCity     && <input type="hidden" name="city"     value={selectedCity} />}
            <input
              name="search"
              defaultValue={search}
              placeholder="Search property name…"
              className={styles.searchInput}
              style={{ flex: 1, height: 40, borderRadius: 8, border: "1px solid var(--line-strong, #d3dce8)", padding: "0 14px", fontSize: 14, background: "var(--field, #fff)", color: "var(--ink, #172033)" }}
            />
            <button type="submit" className={styles.createButton} style={{ height: 40, padding: "0 18px", boxShadow: "none" }}>
              Search
            </button>
            {search && (
              <Link href={tableHref({ search: null })} style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid var(--line-strong, #d3dce8)", fontSize: 13, color: "var(--muted, #64748b)", textDecoration: "none" }}>
                Clear
              </Link>
            )}
          </form>

          {/* Table */}
          <div className={styles.panel}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeadCell} style={{ width: 56 }}>Rank</th>
                    <th className={styles.tableHeadCell}>Property Name</th>
                    <th className={styles.tableHeadCell}>Occasion</th>
                    <th className={styles.tableHeadCell}>City</th>
                    <th className={styles.tableHeadCell} style={{ textAlign: "center", width: 90 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.length > 0 ? (
                    properties.map((p: any, i: number) => {
                      const id    = p.id ?? null;
                      const name  = p.propertyName ?? p.propertyCode ?? "Unnamed";
                      const score: number | null = p.occasionScore ?? null;

                      return (
                        <tr key={`${id ?? 'null'}-${p.occasionSlug ?? String(i)}`} className={styles.tableRow}>
                          <td className={styles.tableCell} style={{ color: "var(--dim, #94a3b8)", fontWeight: 700, fontSize: 13 }}>
                            #{offset + i + 1}
                          </td>
                          <td className={styles.tableCell}>
                            {id ? (
                              <Link href={`/admin/properties/${id}`} className={styles.stateLink} title="Open property editor → Occasion Scores tab">
                                {name}
                              </Link>
                            ) : (
                              <span>{name}</span>
                            )}
                          </td>
                          <td className={styles.tableCell}>
                            {p.occasionName ? <OccasionChip name={p.occasionName} /> : <span style={{ color: "var(--dim, #94a3b8)" }}>—</span>}
                          </td>
                          <td className={styles.tableCell} style={{ color: "var(--ink-2, #334155)" }}>
                            {p.cityName ?? "—"}
                          </td>
                          <td className={styles.tableCell} style={{ textAlign: "center" }}>
                            {score !== null ? <ScoreBadge score={score} /> : <span style={{ color: "var(--dim, #94a3b8)" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.emptyRow}>
                        {selectedOccasion
                          ? `No properties scored for "${selectedOccasionLabel}"${selectedCity ? ` in ${selectedCity}` : ""}. Open a property and set scores from the Occasion Scores tab.`
                          : "No occasion scores found. Open a property and set scores from the Occasion Scores tab."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AdminListControls pageSize={limit} currentPage={pageNumber} hasNextPage={hasNextPage} />
        </div>
      </div>
    </div>
  );
}
