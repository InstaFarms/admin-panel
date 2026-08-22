import Pagination from "@/components/Pagination";
import RoleFilter from "@/components/RoleFilter";
import Searchbar from "@/components/Searchbar";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { USERS_BREADCRUMBS, USERS_SEARCH_KEYS, HiPencil } from "@/constants/users";
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow
} from "flowbite-react";
import Link from "next/link";
import DeleteUserButton from "./DeleteAdminButton";
import { getAllUsers } from "@/actions/userManagementActions";

export default async function Page({ searchParams }: ServerPageProps) {
  const { limit, offset } = parseLimitOffset(await searchParams);
  const filterParams = parseFilterParams(await searchParams);
  const roleFilterParam = (await searchParams)?.role;
  const roleFilter = Array.isArray(roleFilterParam) ? roleFilterParam[0] : (roleFilterParam || "all");

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

  const data = result.data || [];

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full">
        <div className="space-between flex w-full flex-row items-center">
          <div className="flex w-full flex-col gap-2">
            {/* Top row: Title + New Button */}
            <div className="flex w-full flex-row items-center justify-between">
              <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Users
              </h5>
              <Link href="/admin/users/create" className="cursor-pointer">
                <Button>New</Button>
              </Link>
            </div>

            {/* Bottom row: Breadcrumb + RoleFilter + Searchbar */}
            <div className="flex w-full flex-col lg:flex-row justify-between gap-3 pb-3">
              <div className="w-full md:w-1/3 lg:w-2/5">
                <Breadcrumb className="bg-white dark:bg-gray-800">
                  {USERS_BREADCRUMBS.allusers.list.map(({ href, label }) => (
                    <BreadcrumbItem key={label} href={href}>{label}</BreadcrumbItem>
                  ))}
                </Breadcrumb>
              </div>
              <div className="w-auto flex-shrink-0">
                <RoleFilter currentRole={roleFilter} />
              </div>
              <div className="w-auto">
                <Searchbar
                  searchKeys={[...USERS_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey || "Name"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full table-auto overflow-x-auto rounded-xl bg-slate-100 p-5 dark:bg-gray-900">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>S. No.</TableHeadCell>
                <TableHeadCell>Name</TableHeadCell>
                <TableHeadCell>Email</TableHeadCell>
                <TableHeadCell>Phone Number</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {data.map((user, index) => (
                <TableRow
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  key={user.id}
                >
                  <TableCell>{offset + index + 1}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    {user.firstName} {user.lastName}
                  </TableCell>

                  <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    {user.email}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    {user.mobileNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center gap-3">
                      <a href={`/admin/users/${user.id}`} className="w-fit">
                        <div className="rounded-md bg-blue-600 p-1">
                          <HiPencil size={20} className="text-white" />
                        </div>
                      </a>
                      <DeleteUserButton id={user.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination />
      </Card>
    </div>
  );
}