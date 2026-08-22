import {
  Card, Table, TableBody, TableCell,
  TableHead, TableHeadCell, TableRow, Button,
} from "flowbite-react";
import { HiPencil } from "react-icons/hi";
import { DateTime } from "luxon";
import Link from "next/link";

import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { getCustomers } from "@/actions/customerActions";
import { getEmptyListMessage } from "@/constants/ui";
import { SEARCH_KEYS, TABLE_COLUMNS } from "@/constants/customers";
import { CUSTOMER_BRANDS } from "@/constants/customerBrands";
import type { ServerPageProps } from "@/utils/types";

export const dynamic = "force-dynamic";

const MAGO_BREADCRUMBS = {
  list: [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/admin/mago-customers", label: "Mago Customers" },
  ],
};

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const pageNumber = Math.floor(offset / limit) + 1;

  const searchKey = (filterParams?.searchKey ?? "Name") as (typeof SEARCH_KEYS)[number];
  const searchValue = filterParams?.searchValue;

  let data: any[] = [];
  try {
    data = await getCustomers(pageNumber, limit, searchKey, searchValue, {
      brandName: CUSTOMER_BRANDS.MAGO,
    }) ?? [];
  } catch (err) {
    console.error("Error fetching customers:", err);
    throw new Error("Failed to fetch customers");
  }

  const emptyMessage = getEmptyListMessage("customers", Boolean(searchValue));

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Mago Customers
          </h5>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={MAGO_BREADCRUMBS.list} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar searchKeys={[...SEARCH_KEYS]} defaultSearchKey={searchKey} />
              </div>
              <Link href="/admin/mago-customers/create" className="shrink-0">
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
                  {TABLE_COLUMNS.map((col) => (
                    <TableHeadCell key={col} className="whitespace-nowrap">{col}</TableHeadCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {data.length > 0 ? (
                  data.map((user: any, index: number) => (
                    <TableRow key={user.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          <Link
                            href={`/admin/mago-customers/${user.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {user.firstName} {user.lastName}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">{user.email || "—"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                        {user.mobileNumber || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                        {user.gender || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-900 dark:text-white">
                        {user.dob
                          ? `${Math.floor(DateTime.now().diff(DateTime.fromSQL(user.dob), "years").years)} yrs`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/mago-customers/${user.id}`} title="Edit">
                          <div className="rounded-md bg-blue-600 p-1 w-fit transition-colors hover:bg-blue-700">
                            <HiPencil size={20} className="text-white" />
                          </div>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={TABLE_COLUMNS.length}
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

        <Pagination totalItems={data.length} />
      </Card>
    </div>
  );
}

