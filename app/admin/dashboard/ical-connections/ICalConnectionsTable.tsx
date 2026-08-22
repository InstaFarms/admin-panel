"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { HiCheckCircle, HiSearch, HiXCircle } from "react-icons/hi";
import type { ICalConnectionStatusRow } from "@/actions/icalActions";

const StatusIcon = ({ ok }: { ok: boolean }) =>
  ok ? (
    <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
  ) : (
    <HiXCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
  );

export default function ICalConnectionsTable({ rows }: { rows: ICalConnectionStatusRow[] }) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const providerText = `${row.airbnbConnected ? "airbnb " : ""}${row.bookingConnected ? "booking " : ""}`;
      return `${row.propertyName} ${providerText}`.toLowerCase().includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <TextInput
          icon={HiSearch}
          placeholder="Search property or provider..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <Table hoverable>
          <TableHead>
            <TableRow>
              <TableHeadCell>Property</TableHeadCell>
              <TableHeadCell>Airbnb</TableHeadCell>
              <TableHeadCell>Booking</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y">
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <TableRow key={row.propertyId} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    <Link href={`/admin/properties/${row.propertyId}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {row.propertyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusIcon ok={row.airbnbConnected} />
                  </TableCell>
                  <TableCell>
                    <StatusIcon ok={row.bookingConnected} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500 dark:text-gray-400">
                  No matching properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
