"use client";

import { deleteCustomer } from "@/actions/customerActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";
import type { CustomerBrandName } from "@/constants/customerBrands";

export default function DeleteCustomerButton({
  id,
  brandName,
}: {
  id: string;
  brandName: CustomerBrandName;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const deleteCustomerWithId = deleteCustomer.bind(null, id, { brandName });

  const handleSubmit = () => {
    startTransition(() => {
      const rawPromise = parseServerActionResult(deleteCustomerWithId());

      // Normalize rejections to Error so react-hot-toast never sees a plain object
      // (avoids "chunk.reason.error is not a function" when reason is { error: "..." })
      const promise = rawPromise.catch((err: unknown) => {
        if (err instanceof Error) throw err;
        const message =
          typeof (err as { message?: string })?.message === "string"
            ? (err as { message: string }).message
            : typeof (err as { error?: string })?.error === "string"
              ? (err as { error: string }).error
              : "Something went wrong";
        throw new Error(message);
      });

      toast.promise(promise, {
        loading: "Removing Customer...",
        success: (data) => {
          router.push("/admin/mago-customers");
          return data;
        },
        error: (err: unknown) =>
          err instanceof Error
            ? err.message
            : typeof (err as { error?: string })?.error === "string"
              ? (err as { error: string }).error
              : "Failed to delete customer",
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
        confirmationText="Are you sure you want to remove this customer?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
