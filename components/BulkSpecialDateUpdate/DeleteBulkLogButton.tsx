"use client";

import { deleteBulkLog } from "@/actions/bulkActions";

import ConfirmModal from "@/components/ConfirmModal";

import { parseServerActionResult } from "@/utils/utils";

import { Spinner } from "flowbite-react";

import { useRouter } from "next/navigation";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteBulkLogButton({ id }: { id: string }) {
    const [loading, startTransition] = useTransition();
    const [showModal, setShowModal] = useState<boolean>(false);

    const router = useRouter();

    const deleteLogWithId = deleteBulkLog.bind(null, id);

    const handleSubmit = () => {
        startTransition(() => {
            const promise = parseServerActionResult(deleteLogWithId());

            toast.promise(promise, {
                loading: "Deleting log...",
                success: (data) => {
                    router.refresh();
                    return "Log deleted successfully";
                },
                error: (err) => (err as Error).message,
            });
        });
    };

    return (
        <>
            <button onClick={() => setShowModal(true)} className="w-fit">
                <div className="rounded-md bg-red-600 p-1 hover:bg-red-700 transition-colors">
                    {loading ? (
                        <Spinner size="sm" className="me-3" light />
                    ) : (
                        <HiTrash size={20} className="text-white" />
                    )}
                </div>
            </button>
            <ConfirmModal
                showModal={showModal}
                confirmationText="Are you sure you want to delete this log? WARNING: This will permanently remove all associated price overrides for this special date, and prices will revert to their default weekday rates."
                acceptCallback={handleSubmit}
                closeCallback={() => {
                    setShowModal(false);
                }}
                loading={loading}
            />
        </>
    );
}
