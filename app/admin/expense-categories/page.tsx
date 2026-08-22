import Link from "next/link";

import { getExpenseCategories } from "@/actions/expenseCategoryActions";
import ExpenseCategoriesTable from "@/components/expense-categories/ExpenseCategoriesTable";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import {
  EXPENSE_CATEGORY_BREADCRUMBS,
  EXPENSE_CATEGORY_SEARCH_KEYS,
} from "@/constants/expenseCategories";
import { getEmptyListMessage } from "@/constants/ui";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { Button, Card } from "flowbite-react";

export const dynamic = "force-dynamic";

function getStatusFilter(status?: string | string[]) {
  const value = Array.isArray(status) ? status[0] : status;
  return value === "ACTIVE" || value === "INACTIVE" ? value : "ALL";
}

function getStatusHref(status: "ALL" | "ACTIVE" | "INACTIVE") {
  return status === "ALL"
    ? "/admin/expense-categories"
    : `/admin/expense-categories?status=${status}`;
}

function getSearchBy(searchKey?: string) {
  if (searchKey === "Property") return "property";
  if (searchKey === "Description") return "description";
  return "name";
}

export default async function ExpenseCategoriesPage({
  searchParams,
}: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const page = Math.floor(offset / limit) + 1;
  const searchValue = filterParams?.searchValue?.trim() || "";
  const searchBy = getSearchBy(filterParams?.searchKey);
  const status = getStatusFilter(params.status);

  const result = await getExpenseCategories({
    page,
    limit,
    search: searchValue || undefined,
    searchBy,
    status,
  });
  const emptyMessage = getEmptyListMessage(
    "expense categories",
    Boolean(searchValue),
  );

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              ExpensesCategories
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <PageBreadcrumb
              items={EXPENSE_CATEGORY_BREADCRUMBS.list}
              className="w-full shrink-0 lg:w-auto"
            />
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              <div className="flex gap-2">
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map((item) => (
                  <Link key={item} href={getStatusHref(item)}>
                    <Button
                      size="xs"
                      color={status === item ? "blue" : "light"}
                      className="transition-colors"
                    >
                      {item === "ALL" ? "All" : item}
                    </Button>
                  </Link>
                ))}
              </div>
              <div className="min-w-0 flex-1 sm:w-[420px]">
                <Searchbar
                  searchKeys={[...EXPENSE_CATEGORY_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Category Name"}
                />
              </div>
              <Link
                href="/admin/expense-categories/create"
                className="shrink-0 cursor-pointer"
              >
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        <ExpenseCategoriesTable
          rows={result.data}
          offset={offset}
          emptyMessage={emptyMessage}
        />

        <div className="flex flex-col gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {result.data.length} of {result.pagination.total} expense
            categories.
          </span>
          <Pagination totalItems={result.pagination.total} />
        </div>
      </Card>
    </div>
  );
}
