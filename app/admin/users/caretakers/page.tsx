/**
 * Caretakers list page: paginated table with search (Name, Email).
 * Uses parseLimitOffset / parseFilterParams for URL state; always fetches fresh data.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BrandFilterSelect from "@/components/BrandFilterSelect";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getCaretakers } from "@/actions/userManagementActions";
import { getAllBrands } from "@/actions/brandActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getEmptyListMessage } from "@/constants/ui";
import { USERS_BREADCRUMBS, USERS_SEARCH_KEYS, HiPencil } from "@/constants/users";
import { HiInformationCircle } from "react-icons/hi";
import PropertiesCountTooltip from "@/components/users/PropertiesCountTooltip";
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
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const selectedBrandId =
    typeof params?.brandId === "string" && params.brandId.length > 0
      ? params.brandId
      : undefined;
  const brands = await getAllBrands(["id", "name"]);

  const result = await getCaretakers({
    limit,
    offset,
    searchKey: filterParams?.searchKey as (typeof USERS_SEARCH_KEYS)[number] | undefined,
    searchValue: filterParams?.searchValue,
    brandId: selectedBrandId,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  const data = result.data || [];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("caretakers", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        {/* Header: title, breadcrumb, primary action, search */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Caretakers
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={USERS_BREADCRUMBS.caretakers.list as any} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <BrandFilterSelect brands={brands} selectedBrandId={selectedBrandId} />
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...USERS_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Name"}
                />
              </div>
              <Link href="/admin/users/caretakers/create" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Table: responsive container + rows */}
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">
                    S. No.
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Name
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Email
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Phone Number
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      No. of Properties
                      <HiInformationCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" title="Hover over a number to see property names" />
                    </span>
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Actions
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length > 0 ? (
                  data.map((user, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={user.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <Link
                          href={`/admin/users/caretakers/${user.id}`}
                          className="block w-fit max-w-[150px] truncate text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 sm:max-w-none"
                          title={`Open ${user.firstName} ${user.lastName}`.trim()}
                        >
                          {user.firstName} {user.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {user.mobileNumber}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="flex justify-center">
                          <PropertiesCountTooltip properties={user.properties ?? []}>
                            {user.properties?.length ?? 0}
                          </PropertiesCountTooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <Link
                            href={`/admin/users/caretakers/${user.id}`}
                            className="w-fit"
                            title="Edit"
                          >
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
                      colSpan={6}
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

