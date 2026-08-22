import Link from "next/link";
import {
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { HiPencil } from "react-icons/hi";
import Pagination from "@/components/Pagination";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Searchbar from "@/components/Searchbar";
import { getPaginatedLocations } from "@/actions/locationActions";
import { getEmptyListMessage } from "@/constants/ui";
import type { BreadcrumbItemConfig } from "@/components/PageBreadcrumb";
import type { LocationRole } from "@/types/locations";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import type { ServerPageProps } from "@/utils/types";

const SEARCH_BY_MAP: Record<string, "name" | "slug" | "locationTag" | "parentName"> = {
  Name: "name",
  Slug: "slug",
  Tag: "locationTag",
  Parent: "parentName",
};

interface LocationRoleListPageProps {
  role: LocationRole;
  label: string;
  singularLabel: string;
  createHref: string;
  editHrefPrefix: string;
  breadcrumbs: BreadcrumbItemConfig[];
  searchParams?: ServerPageProps["searchParams"];
  parentParamKey?: string;
  childListHrefPrefix?: string;
  parentListHrefPrefix?: string;
  showLocationTag?: boolean;
}

export default async function LocationRoleListPage({
  role,
  label,
  singularLabel,
  createHref,
  editHrefPrefix,
  breadcrumbs,
  searchParams,
  parentParamKey,
  childListHrefPrefix,
  parentListHrefPrefix,
  showLocationTag = true,
}: LocationRoleListPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const searchKey = filterParams?.searchKey ?? "Name";
  const searchValue = filterParams?.searchValue ?? "";
  const pageNumber = offset > 0 ? Math.floor(offset / limit) + 1 : 1;
  const parentId =
    parentParamKey && params
      ? Array.isArray(params[parentParamKey])
        ? params[parentParamKey]?.[0]
        : params[parentParamKey]
      : undefined;

  const locations = await getPaginatedLocations({
    pageNumber,
    perPage: Math.min(limit, 100),
    searchKey: searchValue || undefined,
    searchBy: SEARCH_BY_MAP[searchKey] || "name",
    role,
    parentId: typeof parentId === "string" && parentId ? parentId : undefined,
    orderBy: "name",
    sortorder: "asc",
  });

  const emptyMessage = getEmptyListMessage(label.toLowerCase(), Boolean(searchValue));

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              {label}
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={breadcrumbs} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={showLocationTag ? ["Name", "Slug", "Tag", "Parent"] : ["Name", "Slug", "Parent"]}
                  defaultSearchKey={searchKey}
                />
              </div>
              <Link href={createHref} className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">{singularLabel}</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Slug</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Parent</TableHeadCell>
                  {showLocationTag ? (
                    <TableHeadCell className="whitespace-nowrap">Tag</TableHeadCell>
                  ) : null}
                  <TableHeadCell className="whitespace-nowrap">Market</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Display</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {locations.length > 0 ? (
                  locations.map((location: any, index: number) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={location.id}
                    >
                      <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[180px] truncate sm:max-w-none">
                          {childListHrefPrefix ? (
                            <Link
                              href={`${childListHrefPrefix}?${parentParamKey ?? "parentId"}=${location.id}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {location.name}
                            </Link>
                          ) : (
                            location.name
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                        <span className="text-xs font-mono">{location.slug || "-"}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {location.parentName ? (
                          parentListHrefPrefix && location.parentId ? (
                            <Link
                              href={`${parentListHrefPrefix}?${parentParamKey ?? "parentId"}=${location.parentId}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {location.parentName}
                            </Link>
                          ) : (
                            location.parentName
                          )
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      {showLocationTag ? (
                        <TableCell className="whitespace-nowrap">{location.locationTag || "-"}</TableCell>
                      ) : null}
                      <TableCell className="whitespace-nowrap">{location.marketType || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{location.displayMode || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {location.isActive ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <Link href={`${editHrefPrefix}/${location.id}`} className="w-fit" title="Edit">
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={showLocationTag ? 9 : 8}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}

