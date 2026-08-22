"use client";

import { useTransition, useState } from "react";
import { HiPencil, HiTrash, HiX } from "react-icons/hi";
import toast from "react-hot-toast";

import { deleteBooking, cancelBooking } from "@/actions/bookingActions";

import ConfirmModal from "@/components/ConfirmModal";

import { Modal, ModalBody, ModalHeader, Button, Label, Select } from "flowbite-react";

import Link from "next/link";

interface BookingActionsProps {
    bookingId: string;
    paidAmount: number;
}

export default function BookingActions({ bookingId, paidAmount }: BookingActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellationType, setCancellationType] = useState<"Online" | "Offline">("Offline");

    const handleDelete = () => {
        startTransition(() => {
            const runDelete = async () => {
                const result = await deleteBooking(bookingId);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Booking deleted successfully");
                    setShowDeleteModal(false);
                }
            };
            runDelete();
        });
    };

    const handleCancel = () => {
        startTransition(() => {
            const runCancel = async () => {
                const formData = new FormData();
                formData.append("bookingId", bookingId);
                formData.append("refundAmount", paidAmount.toString());
                formData.append("refundStatus", "Pending");
                formData.append("cancellationType", cancellationType);

                const result = await cancelBooking(bookingId, formData);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Booking cancelled successfully");
                    setShowCancelModal(false);
                }
            };
            runCancel();
        });
    };

    return (
        <div className="flex flex-row items-center gap-2">
            <Link href={`/admin/bookings/${bookingId}`} className="cursor-pointer rounded-md bg-blue-600 p-1 hover:bg-blue-700 transition-colors" title="Edit Booking">
                <HiPencil size={20} className="text-white" />
            </Link>

            <div
                className="cursor-pointer rounded-md bg-red-600 p-1 hover:bg-red-700 transition-colors"
                onClick={() => setShowCancelModal(true)}
                title="Cancel Booking"
            >
                <HiX size={20} className="text-white" />
            </div>

            <div
                className="cursor-pointer rounded-md bg-red-800 p-1 hover:bg-red-900 transition-colors"
                onClick={() => setShowDeleteModal(true)}
                title="Delete Booking"
            >
                <HiTrash size={20} className="text-white" />
            </div>

            <ConfirmModal
                showModal={showDeleteModal}
                confirmationText="Are you sure you want to PERMANENTLY delete this booking? This action cannot be undone."
                acceptCallback={handleDelete}
                closeCallback={() => setShowDeleteModal(false)}
            />

            <Modal show={showCancelModal} size="md" onClose={() => setShowCancelModal(false)} popup>
                <ModalHeader>Cancel Booking</ModalHeader>
                <ModalBody>
                    <div className="space-y-6">
                        <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                            Are you sure you want to cancel this booking? A refund of <strong>₹{paidAmount.toLocaleString()}</strong> will be initiated.
                        </p>

                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="cancellationType">Cancellation Type</Label>
                            </div>
                            <Select
                                id="cancellationType"
                                required
                                value={cancellationType}
                                onChange={(e) => setCancellationType(e.target.value as "Online" | "Offline")}
                            >
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                            </Select>
                        </div>

                        <div className="flex justify-between gap-4">
                            <Button color="failure" onClick={handleCancel} disabled={isPending}>
                                Yes, Cancel Booking
                            </Button>
                            <Button color="gray" onClick={() => setShowCancelModal(false)}>
                                No, close
                            </Button>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </div>
    );
}
