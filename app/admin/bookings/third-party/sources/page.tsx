import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { parseFilterParams } from "@/utils/server-utils";
import { getThirdPartyBookingSources } from "@/actions/bookingSourceActions";
import { HiPencil } from "react-icons/hi";
import DeleteSourceButton from "./DeleteSourceButton";

export const dynamic = "force-dynamic";

export default async function ThirdPartySourceConfigPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; searchKey?: string; searchValue?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const filterParams = parseFilterParams(params);
  const searchValue = filterParams?.searchValue?.trim();
  const sources = await getThirdPartyBookingSources(searchValue);

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white">
        <div className="flex flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Third Party Sources</h5>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb
              items={[
                { label: "Home", href: "/admin/dashboard" },
                { label: "Bookings", href: "/admin/bookings" },
                { label: "Third Party Bookings", href: "/admin/bookings/third-party" },
                { label: "Sources", href: "#" },
              ]}
              className="w-full shrink-0 sm:w-auto"
            />
            <div className="flex w-full shrink-0 flex-row items-center justify-end gap-3 sm:w-auto sm:justify-end">
              <div className="min-w-0 flex-1 sm:w-[420px]">
                <Searchbar searchKeys={["Source Name"]} defaultSearchKey={filterParams?.searchKey ?? "Source Name"} />
              </div>
              <Link href="/admin/bookings/third-party/sources/create" className="cursor-pointer shrink-0">
                <Button>New</Button>
              </Link>
            </div>
          </div>
        </div>

        {params.success ? <Alert color="success">{params.success}</Alert> : null}
        {params.error ? <Alert color="failure">{params.error}</Alert> : null}

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell>S. No.</TableHeadCell>
                  <TableHeadCell>Source Name</TableHeadCell>
                  <TableHeadCell>Commission %</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {sources.length > 0 ? (
                  sources.map((source, index) => (
                    <TableRow key={source.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{source.name}</TableCell>
                      <TableCell>{source.commissionPercentage}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/bookings/third-party/sources/${source.id}`}
                            className="w-fit"
                            title="Edit"
                          >
                            <div className="rounded-md bg-blue-600 p-1 transition-colors hover:bg-blue-700">
                              <HiPencil size={20} className="text-white" />
                            </div>
                          </Link>
                          <DeleteSourceButton id={source.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      No third-party sources found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}

