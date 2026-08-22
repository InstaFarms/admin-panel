"use client";

import { deleteCoupon } from "@/actions/couponActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteCouponButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const deleteCouponWithId = deleteCoupon.bind(null, id);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteCouponWithId());

      toast.promise(promise, {
        loading: "Deleting Coupon...",
        success: (data) => {
          router.push("/admin/coupons")
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
        confirmationText="Are you sure you want to delete this coupon?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}