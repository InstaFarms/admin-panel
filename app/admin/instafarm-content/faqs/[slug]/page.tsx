/**
 * Instafarm Content FAQs list by category: paginated table with search (Question, Answer).
 * Search is case-insensitive and matches intermediate letters.
 */
import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import { getFaqs } from "@/actions/faqActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getEmptyListMessage } from "@/constants/ui";
import { getFAQListBreadcrumbs, FAQ_SEARCH_KEYS, HiPencil, FAQ_ERRORS } from "@/constants/faqs";
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
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams, params }: ServerPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const category = Array.isArray(slug) ? slug[0] : slug;
  if (!category) {
    notFound();
  }

  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  const breadcrumbs = getFAQListBreadcrumbs(category);

  const resolvedSearchParams = await searchParams;
  const { limit, offset } = parseLimitOffset(resolvedSearchParams);
  const filterParams = parseFilterParams(resolvedSearchParams);
  const searchValue = filterParams?.searchValue?.trim().toLowerCase();

  let data: Awaited<ReturnType<typeof getFaqs>>["data"] = [];
  try {
    const result = await getFaqs(limit, offset, category, searchValue);
    data = result?.data ?? [];
  } catch (err) {
    console.error("Error fetching FAQs:", err);
    throw new Error(FAQ_ERRORS.fetchFailed);
  }
  const list = Array.isArray(data) ? data : [];
  const hasSearch = Boolean(filterParams?.searchValue);
  const emptyMessage = getEmptyListMessage("FAQs", hasSearch);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-auto flex-col">
            <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Manage FAQs
            </h5>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            FAQs for {categoryTitle}
          </p>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={breadcrumbs} className="w-full shrink-0 sm:w-auto" />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[460px]">
                <Searchbar
                  searchKeys={[...FAQ_SEARCH_KEYS]}
                  defaultSearchKey={filterParams?.searchKey ?? "Question"}
                />
              </div>
              <Link
                href={`/admin/instafarm-content/faqs/${category}/create`}
                className="cursor-pointer shrink-0"
              >
                <Button>Add</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">#</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Category</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Question</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Answer</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {list.length > 0 ? (
                  list.map((row: { id: string; question: string; answer: string; category: string }, index: number) => (
                    <TableRow
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      key={row.id}
                    >
                      <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {row.category || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate" title={row.question}>
                          {row.question}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-md">
                        <div className="truncate text-sm text-gray-600 dark:text-gray-400" title={row.answer}>
                          {row.answer}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/instafarm-content/faqs/${category}/${row.id}`}
                          className="w-fit"
                          title="Edit"
                        >
                          <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                            <HiPencil size={20} className="text-white" />
                          </div>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
