import Link from "next/link";

import { getBlockingReasons } from "@/actions/blockingReasonActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import BlockingReasonsTable from "@/components/blocking-reasons/BlockingReasonsTable";
import {
  BLOCKING_REASON_BREADCRUMBS,
  BLOCKING_REASON_SEARCH_KEYS,
} from "@/constants/blockingReasons";
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
    ? "/admin/blocking-reasons"
    : `/admin/blocking-reasons?status=${status}`;
}

export default async function BlockingReasonsPage({
  searchParams,
}: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);
  const page = Math.floor(offset / limit) + 1;
  const searchValue = filterParams?.searchValue?.trim() || "";
  const searchBy =
    filterParams?.searchKey === "Description" ? "description" : "reason";
  const status = getStatusFilter(params.status);

  const result = await getBlockingReasons({
    page,
    limit,
    search: searchValue || undefined,
    searchBy,
    status,
  });
  const hasSearch = Boolean(searchValue);
  const emptyMessage = getEmptyListMessage("blocking reasons", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Blocking Reasons
            </h5>
          </div>
          <div className="flex w-full flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <PageBreadcrumb
              items={BLOCKING_REASON_BREADCRUMBS.list}
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
                  searchKeys={[...BLOCKING_REASON_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Reason"}
                />
              </div>
              <Link
                href="/admin/blocking-reasons/create"
                className="shrink-0 cursor-pointer"
              >
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        <BlockingReasonsTable
          rows={result.data}
          offset={offset}
          emptyMessage={emptyMessage}
        />

        <div className="flex flex-col gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {result.data.length} of {result.pagination.total} blocking
            reasons.
          </span>
          <Pagination totalItems={result.pagination.total} />
        </div>
      </Card>
    </div>
  );
}
