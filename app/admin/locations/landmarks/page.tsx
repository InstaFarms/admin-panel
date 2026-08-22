import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { getPaginatedLocationLandmarks } from "@/actions/locationActions";
import { getEmptyListMessage } from "@/constants/ui";
import styles from "./LandmarksListPage.module.css";

const SEARCH_BY_MAP: Record<string, "landmark" | "locationName" | "locationSlug"> = {
  Name: "landmark",
  Location: "locationName",
  Slug: "locationSlug",
};

const ROLE_COLORS: Record<string, string> = {
  state: "#2f6df6",
  city: "#18b981",
  region: "#8b5cf6",
  area: "#e0a23a",
  locality: "#06b6d4",
  destination: "#ef4655",
};

interface LocationLandmarksPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LocationLandmarksPage({
  searchParams,
}: LocationLandmarksPageProps) {
  const params = (await searchParams) ?? {};
  const searchKey =
    typeof params.searchKey === "string" ? params.searchKey : "Name";
  const searchValue =
    typeof params.searchValue === "string" ? params.searchValue : "";

  const landmarks = await getPaginatedLocationLandmarks({
    pageNumber: 1,
    perPage: 100,
    searchKey: searchValue || undefined,
    searchBy: SEARCH_BY_MAP[searchKey] || "landmark",
    orderBy: "landmark",
    sortorder: "asc",
  });

  const uniqueLocations = new Set(
    landmarks.map((landmark: any) => landmark.locationId).filter(Boolean)
  ).size;
  const visibleRoleCount = new Set(
    landmarks.flatMap((landmark: any) =>
      Array.isArray(landmark.locationRoles) ? landmark.locationRoles : []
    )
  ).size;
  const emptyMessage = getEmptyListMessage("landmarks", Boolean(searchValue));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Landmarks</h1>
          <div className={styles.breadcrumbs}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span>Locations</span>
            <ChevronRight size={13} />
            <span className={styles.breadcrumbsCurrent}>Landmarks</span>
          </div>
          <p className={styles.pageDescription}>
            Manage reusable landmark entries and connect them to the right location pages.
          </p>
        </div>

        <div className={styles.toolbar}>
          <form className={styles.searchForm} method="get">
            <label className={styles.searchSelectWrap}>
              <select
                className={styles.searchSelect}
                name="searchKey"
                defaultValue={searchKey}
                aria-label="Search by"
              >
                <option value="Name">Name</option>
                <option value="Location">Location</option>
                <option value="Slug">Slug</option>
              </select>
              <ChevronDown size={14} className={styles.searchSelectIcon} />
            </label>
            <input
              className={styles.searchInput}
              type="search"
              name="searchValue"
              defaultValue={searchValue}
              placeholder="Search landmarks..."
            />
            <button type="submit" className={styles.searchButton} aria-label="Search">
              <Search size={18} />
            </button>
          </form>

          <Link href="/admin/locations/landmarks/create" className={styles.createButton}>
            <Plus size={16} />
            New landmark
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>
            <MapPin size={18} />
          </span>
          <div>
            <div className={styles.statLabel}>Landmarks</div>
            <div className={styles.statValue}>{landmarks.length}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>
            <Sparkles size={18} />
          </span>
          <div>
            <div className={styles.statLabel}>Attached Locations</div>
            <div className={styles.statValue}>{uniqueLocations}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>
            <ChevronRight size={18} />
          </span>
          <div>
            <div className={styles.statLabel}>Role Types</div>
            <div className={styles.statValue}>{visibleRoleCount}</div>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>All Landmarks</h2>
            <p className={styles.panelSub}>
              Showing up to the latest 100 results{searchValue ? ` for "${searchValue}"` : ""}.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableHeadCell}>S. No.</th>
                <th className={styles.tableHeadCell}>Landmark</th>
                <th className={styles.tableHeadCell}>Location</th>
                <th className={styles.tableHeadCell}>Roles</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {landmarks.length ? (
                landmarks.map((landmark: any, index: number) => {
                  const roles = Array.isArray(landmark.locationRoles)
                    ? landmark.locationRoles
                    : [];

                  return (
                    <tr key={landmark.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{index + 1}</td>
                      <td className={styles.tableCell}>
                        <div className={styles.landmarkCell}>
                          <span className={styles.landmarkAvatar}>
                            <MapPin size={16} />
                          </span>
                          <div>
                            <div className={styles.landmarkName}>{landmark.landmark}</div>
                            <div className={styles.landmarkSlug}>/{landmark.slug || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.locationCell}>
                          <div className={styles.locationName}>{landmark.locationName || "-"}</div>
                          <div className={styles.locationSlug}>
                            {landmark.locationSlug ? `/${landmark.locationSlug}` : "No linked slug"}
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.roleStack}>
                          {roles.length ? (
                            roles.map((role: string) => (
                              <span
                                key={`${landmark.id}-${role}`}
                                className={styles.roleBadge}
                                style={{
                                  background:
                                    `${ROLE_COLORS[role] ?? "#3b4658"}22`,
                                  color: ROLE_COLORS[role] ?? "#b7c0d0",
                                }}
                              >
                                {titleCase(role)}
                              </span>
                            ))
                          ) : (
                            <span className={styles.emptyValue}>-</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <Link
                          href={`/admin/locations/landmarks/${landmark.id}`}
                          className={styles.actionButton}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
