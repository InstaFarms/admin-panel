"use client";

import { deleteCms } from "@/actions/instafarm-settingsActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export default function DeleteCmsButton({
  id,
  brandScope = "instafarms",
  showLabel = false,
}: {
  id: string;
  brandScope?: BrandAdminScope;
  showLabel?: boolean;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteCms(id, brandScope));

      toast.promise(promise, {
        loading: "Deleting CMS content...",
        success: (data) => {
          router.push(BRAND_CONTENT_ROUTES[brandScope].cms);
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
        className={`inline-flex items-center justify-center gap-2 rounded-md bg-red-600 text-white transition-colors hover:bg-red-700 ${
          showLabel ? "px-3 py-2 text-sm font-medium" : "p-1"
        }`}
      >
        {loading ? (
          <Spinner size="sm" className={showLabel ? "me-1" : "me-0"} light />
        ) : (
          <HiTrash size={20} className="text-white" />
        )}
        {showLabel ? <span>Delete CMS</span> : null}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this CMS content?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
