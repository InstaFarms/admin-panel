"use client";

import { Table, Badge, Button, TableHeadCell, TableHead, TableBody, TableRow, TableCell } from "flowbite-react";

import Link from "next/link";

import { HiPlus } from "react-icons/hi";

interface BulkLog {
    id: string;
    date: string;
    operationType: string;
    operationMode: string | null;
    operationValue: number;
    isAppliedToAll: boolean;
    affectedCount: number | null;
    createdAt: Date | null;
    adminCreatedBy: string;
}

export default function BulkLogDashboard({
    logs,
    createPath = "/admin/properties/bulk-update/create"
}: {
    logs: BulkLog[];
    createPath?: string
}) {
    if (!logs || logs.length === 0) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-gray-500 mb-4">No bulk update logs found.</p>
                <Link href={createPath}>
                    <Button color="blue">
                        <HiPlus className="mr-2 h-5 w-5" />
                        New Bulk Update
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-end mb-4">
                <Link href={createPath}>
                    <Button color="blue">
                        <HiPlus className="mr-2 h-5 w-5" />
                        New Bulk Update
                    </Button>
                </Link>
            </div>
            <Table hoverable>
                <TableHead>
                  <TableRow>
                      <TableHeadCell>Date</TableHeadCell>
                      <TableHeadCell>Operation</TableHeadCell>
                      <TableHeadCell>Applied To</TableHeadCell>
                      <TableHeadCell>Value</TableHeadCell>
                      <TableHeadCell>Affected</TableHeadCell>
                      <TableHeadCell>Created At</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                    {logs.map((log) => (
                        <TableRow key={log.id} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                {new Date(log.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <Badge color={
                                    log.operationType === 'increase' ? 'success' :
                                        log.operationType === 'decrease' ? 'warning' : 'info'
                                }>
                                    {log.operationType.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {log.isAppliedToAll ? "All Properties" : "Selected Properties"}
                            </TableCell>
                            <TableCell>
                                {log.operationValue}
                                {log.operationMode === 'percentage' ? '%' : ''}
                            </TableCell>
                            <TableCell>
                                {log.affectedCount}
                            </TableCell>
                            <TableCell>
                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
