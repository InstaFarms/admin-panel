"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

import { deleteExpenseCategory } from "@/actions/expenseCategoryActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";

export default function DeleteExpenseCategoryButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleDelete() {
    startTransition(() => {
      const promise = parseServerActionResult(deleteExpenseCategory(id));

      toast.promise(promise, {
        loading: "Deleting expense category...",
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
        className="rounded-md bg-red-500 p-1 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
        title="Delete"
        disabled={loading}
      >
        {loading ? <Spinner size="sm" /> : <HiTrash size={20} />}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="This will mark the expense category inactive. It cannot be deleted if any expense entry uses it. Continue?"
        acceptCallback={handleDelete}
        closeCallback={() => setShowModal(false)}
        loading={loading}
      />
    </>
  );
}
