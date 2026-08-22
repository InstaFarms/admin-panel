"use client";

import { deleteEnquiry } from "@/actions/enquiryActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteEnquiryButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);

  const deleteEnquiryWithId = deleteEnquiry.bind(null, id);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteEnquiryWithId());

      toast.promise(promise, {
        loading: "Deleting Enquiry...",
        success: (data) => {
          setShowModal(false);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="w-fit">
        <div className="rounded-md bg-red-600 p-1">
          {loading ? (
            <Spinner size="sm" className="me-3" light />
          ) : (
            <HiTrash size={20} className="text-white" />
          )}
        </div>
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this enquiry?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}