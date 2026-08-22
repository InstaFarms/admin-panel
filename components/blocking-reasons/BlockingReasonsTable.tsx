import Link from "next/link";
import { HiPencil } from "react-icons/hi";

import { BlockingReason } from "@/actions/blockingReasonActions";
import DeleteBlockingReasonButton from "@/components/blocking-reasons/DeleteBlockingReasonButton";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type BlockingReasonsTableProps = {
  rows: BlockingReason[];
  offset: number;
  emptyMessage: string;
};

function formatTimestamp(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BlockingReasonsTable({
  rows,
  offset,
  emptyMessage,
}: BlockingReasonsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHead>
            <TableRow>
              <TableHeadCell className="whitespace-nowrap">
                S. No.
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Reason
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Description
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Status
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Created
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Actions
              </TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="bg-white transition-colors duration-150 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <TableCell className="whitespace-nowrap">
                    {offset + index + 1}
                  </TableCell>
                  <TableCell className="min-w-[180px] font-medium text-gray-900 dark:text-white">
                    {row.reason}
                  </TableCell>
                  <TableCell className="min-w-[260px] text-gray-600 dark:text-gray-300">
                    <div className="max-w-[420px] truncate">
                      {row.description || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={row.status === "ACTIVE" ? "success" : "gray"}
                      className="w-fit"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatTimestamp(row.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/blocking-reasons/${row.id}`}
                        className="rounded-md bg-blue-600 p-1 text-white transition-colors hover:bg-blue-700"
                        title="Edit"
                      >
                        <HiPencil size={20} />
                      </Link>
                      {row.status === "ACTIVE" && (
                        <DeleteBlockingReasonButton id={row.id} />
                      )}
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
  );
}
