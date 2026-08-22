"use client";

import { deleteFAQ } from "@/actions/faqActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "@/constants/faqs";
import { FAQ_CONTENT_BASE, type BrandAdminScope } from "@/constants/brandAdminScope";

export default function DeleteFAQButton({
  id,
  category,
  brandScope = "instafarms",
}: {
  id: string;
  category: string;
  brandScope?: BrandAdminScope;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();
  const faqBase = FAQ_CONTENT_BASE[brandScope];

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteFAQ(id, brandScope));

      toast.promise(promise, {
        loading: "Deleting FAQ...",
        success: (data) => {
          router.push(`${faqBase}/${category}`);
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
        confirmationText="Are you sure you want to delete this FAQ?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
