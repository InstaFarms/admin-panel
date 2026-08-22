"use client";

import { deleteAdmin } from "@/actions/adminActions";
import ConfirmModal from "@/components/ConfirmModal";
import { ADMIN_ADMINS_PATH } from "@/constants/routes";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteAdminButton({
  id,
  label,
}: {
  id: string;
  label?: string;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const deleteAdminWithId = deleteAdmin.bind(null, id);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteAdminWithId());

      toast.promise(promise, {
        loading: "Removing Admin...",
        success: (data) => {
          router.push(ADMIN_ADMINS_PATH);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      {label ? (
        <Button color="red" onClick={() => setShowModal(true)} disabled={loading}>
          <span className="inline-flex items-center gap-2">
            {loading ? <Spinner size="sm" light /> : <HiTrash size={16} className="text-white" />}
            {label}
          </span>
        </Button>
      ) : (
        <button onClick={() => setShowModal(true)} className="w-fit" disabled={loading}>
          <div className="rounded-md bg-red-600 p-1">
            {loading ? (
              <Spinner size="sm" className="me-3" light />
            ) : (
              <HiTrash size={20} className="text-white" />
            )}
          </div>
        </button>
      )}
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to remove this admin?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
