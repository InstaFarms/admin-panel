import Link from "next/link";
import { HiPencil } from "react-icons/hi";

import type { PropertyExpenseCategory } from "@/actions/expenseCategoryActions";
import DeleteExpenseCategoryButton from "@/components/expense-categories/DeleteExpenseCategoryButton";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type ExpenseCategoriesTableProps = {
  rows: PropertyExpenseCategory[];
  offset: number;
  emptyMessage: string;
};

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatProperty(row: PropertyExpenseCategory) {
  if (row.propertyName) {
    return row.propertyCode
      ? `${row.propertyCode} - ${row.propertyName}`
      : row.propertyName;
  }
  return row.propertyCode || row.propertyId;
}

export default function ExpenseCategoriesTable({
  rows,
  offset,
  emptyMessage,
}: ExpenseCategoriesTableProps) {
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
                Property
              </TableHeadCell>
              <TableHeadCell className="whitespace-nowrap">
                Category
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
                  <TableCell className="min-w-[220px] text-gray-700 dark:text-gray-300">
                    {formatProperty(row)}
                  </TableCell>
                  <TableCell className="min-w-[180px] font-medium text-gray-900 dark:text-white">
                    {row.name}
                  </TableCell>
                  <TableCell className="min-w-[260px] text-gray-600 dark:text-gray-300">
                    <div className="max-w-[420px] truncate">
                      {row.description || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={row.isActive ? "success" : "gray"}
                      className="w-fit"
                    >
                      {row.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/expense-categories/${row.id}`}
                        className="rounded-md bg-blue-600 p-1 text-white transition-colors hover:bg-blue-700"
                        title="Edit"
                      >
                        <HiPencil size={20} />
                      </Link>
                      {row.isActive && (
                        <DeleteExpenseCategoryButton id={row.id} />
                      )}
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
  );
}
