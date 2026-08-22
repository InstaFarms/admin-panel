"use client";

import { deleteSafetyHygiene } from "@/actions/safety-hygieneActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteSafetyHygieneButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const deleteSafetyHygieneWithId = deleteSafetyHygiene.bind(null, id);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteSafetyHygieneWithId());

      toast.promise(promise, {
        loading: "Deleting Safety & Hygiene...",
        success: (data) => {
          router.push("/admin/safety-hygiene")
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-fit"
      >
        <div className="flex items-center gap-2 rounded bg-red-500 p-2 text-white hover:bg-red-600">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <HiTrash />
          )}
        </div>
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this safety-hygiene?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}