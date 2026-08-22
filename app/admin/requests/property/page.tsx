import Pagination from "@/components/Pagination";
import Searchbar from "@/components/Searchbar";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { formatAdminDate } from "@/lib/dateUtils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
import {
  Card, Table, TableBody, TableCell,
  TableHead, TableHeadCell, TableRow,
} from "flowbite-react";
import Link from "next/link";
import DeleteEnquiryButton from "../enquiries/DeleteEnquiryButton";
import ViewEnquiryButton from "../enquiries/ViewEnquiryButton";
import { getPropertyEnquiries } from "@/actions/requestActions";

const TITLE = "Property Enquiries";
const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "#", label: "Property" },
];
const SEARCH_KEYS = ["Name", "Email", "Subject"];

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: ServerPageProps) {
  const params = await searchParams;
  const { limit, offset } = parseLimitOffset(params);
  const filterParams = parseFilterParams(params);

  let data = [];
  let error: string | null = null;

  try {
    data = await getPropertyEnquiries(searchParams);
  } catch (err) {
    console.error("Error fetching property enquiries:", err);
    error = err instanceof Error ? err.message : "Failed to load property enquiries.";
  }

  return (
    <div className="flex w-full flex-col">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex w-full flex-col gap-2">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {TITLE}
          </h5>
          <div className="flex w-full flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <PageBreadcrumb items={BREADCRUMBS} className="w-full shrink-0 sm:w-auto" />
            <div className="min-w-0 flex-1 sm:w-[460px]">
              <Searchbar
                searchKeys={SEARCH_KEYS}
                defaultSearchKey={filterParams?.searchKey ?? "Name"}
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">S. No.</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Name</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Email</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Subject</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Check-in</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Check-out</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Status</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Created At</TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {!error && data.length > 0 ? (
                  data.map((enquiry, index) => (
                    <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800" key={enquiry.id}>
                      <TableCell className="whitespace-nowrap">{offset + index + 1}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {enquiry.customerId ? (
                          <Link href={`/admin/customers/${enquiry.customerId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-200 dark:hover:text-blue-400">
                            {enquiry.firstName} {enquiry.lastName}
                          </Link>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {enquiry.firstName} {enquiry.lastName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{enquiry.email}</TableCell>
                      <TableCell>{enquiry.subject}</TableCell>
                      <TableCell>{enquiry.property?.slug || '-'}</TableCell>
                      <TableCell>
                        {formatAdminDate(enquiry.checkinDate, "-")}
                      </TableCell>
                      <TableCell>
                        {formatAdminDate(enquiry.checkoutDate, "-")}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          enquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          enquiry.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          enquiry.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          enquiry.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {enquiry.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatAdminDate(enquiry.createdAt, "-")}</TableCell>
                      <TableCell>
                        <div className="flex flex-row items-center gap-3">
                          <ViewEnquiryButton enquiry={enquiry} />
                          <DeleteEnquiryButton id={enquiry.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="py-4 text-center text-gray-500 dark:text-gray-400">
                      {error ?? "No property enquiries found."}
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

