"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";
import ConfirmModal from "@/components/ConfirmModal";
import { deleteBookingSource } from "@/actions/bookingSourceActions";
import { parseServerActionResult } from "@/utils/utils";

export default function DeleteSourceButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleDelete = () => {
    startTransition(() => {
      const action = deleteBookingSource.bind(null, id);
      const promise = parseServerActionResult(action());
      toast.promise(promise, {
        loading: "Deleting source...",
        success: (message) => {
          setShowModal(false);
          router.refresh();
          return message;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-md bg-red-600 p-1 transition-colors hover:bg-red-700"
        title="Delete"
      >
        <HiTrash size={20} className="text-white" />
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this source?"
        acceptCallback={handleDelete}
        closeCallback={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
}

