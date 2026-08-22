"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

import { deleteAgreementModel } from "@/actions/agreementModelActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";

export default function DeleteAgreementModelButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(() => {
      const promise = parseServerActionResult(deleteAgreementModel(id));

      toast.promise(promise, {
        loading: "Deleting agreement model...",
        success: (message) => {
          setShowModal(false);
          router.refresh();
          return message;
        },
        error: (err) => (err as Error).message,
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-md bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
        title="Delete"
      >
        {loading ? <Spinner size="sm" /> : <HiTrash size={20} />}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="This will mark the agreement model inactive. Continue?"
        acceptCallback={handleDelete}
        closeCallback={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
}
