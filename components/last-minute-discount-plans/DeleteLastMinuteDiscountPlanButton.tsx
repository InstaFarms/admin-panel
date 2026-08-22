"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { HiTrash } from "react-icons/hi";

import { deleteLastMinuteDiscountPlan } from "@/actions/lastMinuteDiscountPlanActions";
import ConfirmModal from "@/components/ConfirmModal";
import {
  LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH,
  type PlanBrandScope,
} from "@/constants/planBrandScope";
import { parseServerActionResult } from "@/utils/utils";

export default function DeleteLastMinuteDiscountPlanButton({
  id,
  adminScope = "instafarms",
}: {
  id: string;
  adminScope?: PlanBrandScope;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(
        deleteLastMinuteDiscountPlan(id, adminScope)
      );

      toast.promise(promise, {
        loading: "Deleting Last Minute Discount Plan...",
        success: (message) => {
          router.push(LAST_MINUTE_DISCOUNT_PLANS_LIST_BASE_PATH[adminScope]);
          return message;
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
        confirmationText="Are you sure you want to delete this last minute discount plan?"
        acceptCallback={handleSubmit}
        closeCallback={() => setShowModal(false)}
      />
    </>
  );
}
