"use client";

import { deleteCancellationPlan } from "@/actions/cancellationPlanActions";
import ConfirmModal from "@/components/ConfirmModal";
import { CANCELLATION_PLANS_LIST_BASE_PATH, type PlanBrandScope } from "@/constants/planBrandScope";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteCancellationPlanButton({
  id,
  adminScope = "instafarms",
}: {
  id: string;
  adminScope?: PlanBrandScope;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const deleteCancellationPlanWithId = deleteCancellationPlan.bind(null, id, adminScope);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteCancellationPlanWithId());

      toast.promise(promise, {
        loading: "Deleting Cancellation Plan...",
        success: (data) => {
          router.push(CANCELLATION_PLANS_LIST_BASE_PATH[adminScope]);
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
        confirmationText="Are you sure you want to delete this cancellation plan?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
