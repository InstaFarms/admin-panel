"use client";

import { deleteTag } from "@/actions/instafarm-settingsActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export default function DeleteTagButton({
  id,
  brandScope = "instafarms",
  fullWidth = false,
  showLabel = false,
}: {
  id: string;
  brandScope?: BrandAdminScope;
  fullWidth?: boolean;
  showLabel?: boolean;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteTag(id, brandScope));

      toast.promise(promise, {
        loading: "Deleting tag...",
        success: (data) => {
          router.push(BRAND_CONTENT_ROUTES[brandScope].tags);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 ${
          fullWidth ? "w-full" : "w-fit"
        }`}
      >
        {loading ? <Spinner size="sm" light /> : <HiTrash size={18} className="text-white" />}
        {showLabel ? "Delete Tag" : null}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this tag?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
