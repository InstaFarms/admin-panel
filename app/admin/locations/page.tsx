import Link from "next/link";
import { Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { LOCATION_BREADCRUMBS, LOCATION_DISPLAY_MODE_OPTIONS, LOCATION_MARKET_TYPE_OPTIONS, LOCATION_ROLE_OPTIONS, LOCATION_SEARCH_KEYS } from "@/constants/locations";
import { getPaginatedLocations } from "@/actions/locationActions";
import { getEmptyListMessage } from "@/constants/ui";

const SEARCH_BY_MAP: Record<string, "name" | "slug" | "locationTag" | "parentName"> = {
  Name: "name",
  Slug: "slug",
  Tag: "locationTag",
  Parent: "parentName",
};

interface LocationsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LocationsPage({ searchParams }: LocationsPageProps) {
  const params = (await searchParams) ?? {};
  const searchKey = typeof params.searchKey === "string" ? params.searchKey : "Name";
  const searchValue = typeof params.searchValue === "string" ? params.searchValue : "";
  const role = typeof params.role === "string" ? params.role : "";
  const marketType = typeof params.marketType === "string" ? params.marketType : "";
  const displayMode = typeof params.displayMode === "string" ? params.displayMode : "";
  const active = typeof params.active === "string" ? params.active : "";

  const locations = await getPaginatedLocations({
    pageNumber: 1,
    perPage: 100,
    searchKey: searchValue || undefined,
    searchBy: SEARCH_BY_MAP[searchKey] || "name",
    role: role || undefined,
    marketType: marketType || undefined,
    displayMode: displayMode || undefined,
    isActive: active === "" ? undefined : active === "true",
    orderBy: "name",
    sortorder: "asc",
  });

  const emptyMessage = getEmptyListMessage("locations", Boolean(searchValue || role || marketType || displayMode || active));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageBreadcrumb items={LOCATION_BREADCRUMBS.list} className="w-full shrink-0 sm:w-auto" />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/locations/landmarks"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Manage Landmarks
          </Link>
          <Link
            href="/admin/locations/create"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Create Location
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Suspense fallback={null}>
          <Searchbar
            searchKeys={[...LOCATION_SEARCH_KEYS]}
            defaultSearchKey={searchKey}
          />
        </Suspense>
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <input type="hidden" name="searchKey" value={searchKey} />
          <input type="hidden" name="searchValue" value={searchValue} />
          <select
            name="role"
            defaultValue={role}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All roles</option>
            {LOCATION_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            name="marketType"
            defaultValue={marketType}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All market types</option>
            {LOCATION_MARKET_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            name="displayMode"
            defaultValue={displayMode}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All display modes</option>
            {LOCATION_DISPLAY_MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <select
              name="active"
              defaultValue={active}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Table className="min-w-full">
          <TableHead>
            <TableRow>
              <TableHeadCell>Name</TableHeadCell>
              <TableHeadCell>Slug</TableHeadCell>
              <TableHeadCell>Roles</TableHeadCell>
              <TableHeadCell>Parent</TableHeadCell>
              <TableHeadCell>Tag</TableHeadCell>
              <TableHeadCell>Market</TableHeadCell>
              <TableHeadCell>Display</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {locations.length > 0 ? (
              locations.map((location: any) => (
                <TableRow key={location.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {location.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{location.slug}</TableCell>
                  <TableCell>{Array.isArray(location.locationRoles) ? location.locationRoles.join(", ") : "-"}</TableCell>
                  <TableCell>{location.parentName || "-"}</TableCell>
                  <TableCell>{location.locationTag || "-"}</TableCell>
                  <TableCell>{location.marketType}</TableCell>
                  <TableCell>{location.displayMode}</TableCell>
                  <TableCell>{location.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <Link href={`/admin/locations/${location.id}`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
