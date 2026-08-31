import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getAdmins, type AdminStatusFilter } from "@/actions/adminActions";
import { getMyAdminPermissions } from "@/actions/adminRolePermissionsActions";
import { isAdmin } from "@/utils/admin-only";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import AdminStatusButton from "./AdminStatusButton";
import { ADMIN_SEARCH_KEYS, type AdminSearchKey } from "@/constants/list";
import { getBreadcrumbs} from "@/constants/admin";
import { getEmptyListMessage } from "@/constants/ui";
import Link from "next/link";
import { HiPencil } from "react-icons/hi";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["ALL", "ACTIVE", "DEACTIVATED"] as const;

function getStatusFilter(value?: string | string[]): AdminStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "DEACTIVATED" || raw === "ALL" ? raw : "ACTIVE";
}

function getStatusHref(status: AdminStatusFilter) {
  return status === "ACTIVE" ? "/admin/admins" : `/admin/admins?status=${status}`;
}

export default async function AdminsPage({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const pageNumber = Math.floor(offset / limit) + 1;
  const status = getStatusFilter(params.status);

  const result = await getAdmins(
    pageNumber,
    limit,
    filterParams?.searchValue ?? undefined,
    filterParams?.searchKey as AdminSearchKey | undefined,
    status,
  );

  const data = "success" in result ? result.success : [];
  const total = "success" in result ? result.total : 0;
  const listError = "error" in result ? result.error : null;
  const permissions = await getMyAdminPermissions().catch(() => []);
  const canEditAdmins = permissions.some(
    (permission) => permission.permissionKey === "ADMINS" && permission.canEdit
  );
  const currentAdmin = await isAdmin().catch(() => null);
  const canManageRole = currentAdmin?.panelRole === "SUPER_ADMIN";
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = listError || getEmptyListMessage("admins", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        {/* Header: title, breadcrumb, primary action, search */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col w-auto">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Admins
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <PageBreadcrumb items={getBreadcrumbs("list")} className="w-full shrink-0 lg:w-auto" />
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              <div className="flex gap-2">
                {STATUS_TABS.map((item) => (
                  <Link key={item} href={getStatusHref(item)}>
                    <Button
                      size="xs"
                      color={status === item ? "blue" : "light"}
                      className="transition-colors"
                    >
                      {item === "ALL" ? "All" : item === "ACTIVE" ? "Active" : "Deactivated"}
                    </Button>
                  </Link>
                ))}
              </div>
              <div className="min-w-0 flex-1 sm:w-[420px]">
                <Searchbar
                  searchKeys={[...ADMIN_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Name"}
                />
              </div>
              {canManageRole ? (
                <Link href="/admin/admins/create" className="cursor-pointer shrink-0">
                  <Button>New</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {listError && (
          <div className="py-4 text-center text-red-500 dark:text-red-400">
            {listError}
          </div>
        )}

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
                    Panel Role
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Status
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Actions
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {!listError && data.length > 0 ? (
                  data.map((admin, index) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={admin.id}
                    >
                      <TableCell className="whitespace-nowrap">
                        {offset + index + 1}
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <Link
                          href={`/admin/admins/${admin.id}`}
                          className="block max-w-[150px] truncate text-blue-600 hover:underline dark:text-blue-400 sm:max-w-none"
                          title={`View ${admin.firstName} ${admin.lastName}`.trim()}
                        >
                          {admin.firstName} {admin.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="max-w-[200px] truncate sm:max-w-none">
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {admin.phoneNumber}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {admin.panelRole ? admin.panelRole.replaceAll("_", " ") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={admin.isActive === false ? "gray" : "success"}
                          className="w-fit"
                        >
                          {admin.isActive === false ? "DEACTIVATED" : "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          {canEditAdmins ? (
                            <Link
                              href={`/admin/admins/${admin.id}`}
                              className="w-fit"
                              title="Edit"
                            >
                              <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                                <HiPencil size={20} className="text-white" />
                              </div>
                            </Link>
                          ) : null}
                          {canManageRole ? (
                            <AdminStatusButton
                              id={admin.id}
                              isActive={admin.isActive !== false}
                              compact
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
        <div className="flex flex-col gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {data.length} of {total} admins.
          </span>
          <Pagination totalItems={total} />
        </div>
      </Card>
    </div>
  );
}

