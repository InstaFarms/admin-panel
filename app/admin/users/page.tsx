/**
 * Users list page: paginated table with role filter, search (Name, Email, Phone).
 * Uses parseLimitOffset / parseFilterParams for URL state; fetches via getAllUsers.
 */
import Pagination from "@/components/Pagination";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Searchbar from "@/components/Searchbar";
import { ADMIN_BASE_PATH, ADMIN_USERS_PATH } from "@/constants/routes";
import { getEmptyListMessage } from "@/constants/ui";
import { getAllUsers } from "@/actions/userManagementActions";
import { USERS_SEARCH_KEYS } from "@/constants/users";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import Link from "next/link";
import { HiPencil, HiInformationCircle } from "react-icons/hi";
import DeleteUserButton from "./DeleteAdminButton";
import PropertiesCountTooltip from "@/components/users/PropertiesCountTooltip";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: ADMIN_BASE_PATH, label: "Admin" },
  { href: "#", label: "Users" },
];

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const roleParam = params?.role;
  const roleFilter = Array.isArray(roleParam) ? roleParam[0] : (roleParam ?? "all");

  let data: { id: string; firstName: string; lastName: string | null; email: string; mobileNumber: string | null; properties?: { id: string; name: string; role: string[] }[] }[];
  try {
    const result = await getAllUsers({
      limit,
      offset,
      role: roleFilter as "all" | "owners" | "managers" | "caretakers",
      searchKey: filterParams?.searchKey as (typeof USERS_SEARCH_KEYS)[number] | undefined,
      searchValue: filterParams?.searchValue,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    data = result.data ?? [];
  } catch (err) {
    console.error("Error fetching users:", err);
    throw new Error("Failed to fetch users");
  }

  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("users", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Users
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row flex-wrap items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...USERS_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Name"}
                />
              </div>
              <Link href={`${ADMIN_USERS_PATH}/create`} className="cursor-pointer shrink-0">
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
                        <div className="max-w-[150px] truncate sm:max-w-none">
                          {user.firstName} {user.lastName}
                        </div>
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
                        <PropertiesCountTooltip properties={user.properties ?? []}>
                          {user.properties?.length ?? 0}
                        </PropertiesCountTooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <Link
                            href={`${ADMIN_USERS_PATH}/${user.id}`}
                            className="w-fit"
                            title="Edit"
                          >
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                          <DeleteUserButton id={user.id} />
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

