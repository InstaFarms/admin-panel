"use client";

import { approveBookingConfirmation, rejectBookingConfirmation } from "@/actions/bookingConfirmationActions";

import { Button, Modal, Table, Textarea, Label, TableHead, TableBody, TableHeadCell, TableRow, TableCell, ModalHeader, ModalBody, ModalFooter } from "flowbite-react";

import { useState, useTransition } from "react";
import { HiCheck, HiX } from "react-icons/hi";

type BookingRequest = {
    id: string;
    requestedAt: string;
    guestName: string;
    propertyName: string;
    checkinDate: string;
    checkoutDate: string;
    guestCount: number;
};

export default function ApprovalQueueTable({
    initialData,
}: {
    initialData: BookingRequest[];
}) {
    const [isPending, startTransition] = useTransition();
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleApprove = (id: string) => {
        if (confirm("Are you sure you want to approve this booking?")) {
            startTransition(async () => {
                await approveBookingConfirmation(id);
            });
        }
    };

    const openRejectModal = (id: string) => {
        setSelectedId(id);
        setRejectionReason("");
        setRejectModalOpen(true);
    };

    const handleReject = () => {
        if (!selectedId || !rejectionReason) return;

        startTransition(async () => {
            await rejectBookingConfirmation(selectedId, rejectionReason);
            setRejectModalOpen(false);
            setSelectedId(null);
        });
    };

    const getTimeElapsed = (dateString: string) => {
        const requested = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - requested.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHrs}h ${diffMins}m`;
    };

    if (initialData.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No pending approval requests.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <Table hoverable className="min-w-full">
                    <TableHead>
                      <TableRow>
                          <TableHeadCell className="whitespace-nowrap">Property</TableHeadCell>
                          <TableHeadCell className="whitespace-nowrap">Guest</TableHeadCell>
                          <TableHeadCell className="whitespace-nowrap">Dates</TableHeadCell>
                          <TableHeadCell className="whitespace-nowrap">Guests</TableHeadCell>
                          <TableHeadCell className="whitespace-nowrap">Time Elapsed</TableHeadCell>
                          <TableHeadCell className="whitespace-nowrap">Actions</TableHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y">
                        {initialData.map((item) => (
                            <TableRow
                                key={item.id}
                                className="bg-white dark:border-gray-700 dark:bg-gray-800"
                            >
                                <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                    {item.propertyName || "N/A"}
                                </TableCell>
                                <TableCell>{item.guestName}</TableCell>
                                <TableCell>
                                    {item.checkinDate} to {item.checkoutDate}
                                </TableCell>
                                <TableCell>{item.guestCount}</TableCell>
                                <TableCell>{getTimeElapsed(item.requestedAt)}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button
                                            size="xs"
                                            color="success"
                                            onClick={() => handleApprove(item.id)}
                                            disabled={isPending}
                                        >
                                            <HiCheck className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="xs"
                                            color="failure"
                                            onClick={() => openRejectModal(item.id)}
                                            disabled={isPending}
                                        >
                                            <HiX className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal
                show={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                size="md"
            >
                <ModalHeader>Reject Booking Request</ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="reason" >Reason for Rejection</Label>
                            </div>
                            <Textarea
                                id="reason"
                                placeholder="Please explain why this booking is being rejected..."
                                required
                                rows={4}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        color="failure"
                        onClick={handleReject}
                        disabled={!rejectionReason.trim() || isPending}
                    >
                        Reject
                    </Button>
                    <Button color="gray" onClick={() => setRejectModalOpen(false)}>
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}
