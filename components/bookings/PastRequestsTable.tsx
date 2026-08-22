"use client";

import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Badge, Button } from "flowbite-react";

import { HiEye } from "react-icons/hi";

import { useRouter } from "next/navigation";
import BookingAge from "@/components/bookings/BookingAge";

type PastRequest = {
    id: string;
    bookingId: string;
    requestedAt: string;
    guestName: string;
    propertyName: string;
    status: "CONFIRMED" | "REJECTED" | "AUTO_REJECTED" | "CANCELLED" | "PENDING";
    actionTakenBy: string;
    [key: string]: any;
};

export default function PastRequestsTable({ data }: { data: PastRequest[] }) {
    const router = useRouter();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CONFIRMED":
                return <Badge color="success">ACCEPTED</Badge>;
            case "REJECTED":
                return <Badge color="failure">REJECTED</Badge>;
            case "AUTO_REJECTED":
                return <Badge color="warning">AUTO REJECTED</Badge>;
            case "CANCELLED":
                return <Badge color="gray">CANCELLED</Badge>;
            case "PENDING":
                return <Badge color="warning">EXPIRED</Badge>;
            default:
                return <Badge color="gray">{status}</Badge>;
        }
    };

    if (data.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                No past requests found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table hoverable className="min-w-full">
                <TableHead>
                  <TableRow>
                      <TableHeadCell>Request ID</TableHeadCell>
                      <TableHeadCell>Created At</TableHeadCell>
                      <TableHeadCell>Entity Name</TableHeadCell>
                      <TableHeadCell>Customer</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell>Action By</TableHeadCell>
                      <TableHeadCell>Details</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                    {data.map((item) => (
                        <TableRow
                            key={item.id}
                            className="bg-white dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => router.push(`/admin/bookings/approval-queue/${item.id}`)}
                        >
                            <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                #{item.id}
                            </TableCell>
                            <TableCell><BookingAge createdAt={item.requestedAt} /></TableCell>
                            <TableCell>{item.propertyName}</TableCell>
                            <TableCell>{item.guestName}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{item.actionTakenBy}</TableCell>
                            <TableCell>
                                <Button size="xs" color="light" onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/bookings/approval-queue/${item.id}`);
                                }}>
                                    <HiEye className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
