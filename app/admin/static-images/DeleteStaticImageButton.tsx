"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import { deleteStaticImage } from "@/actions/staticImageActions";
import type { BrandAdminScope } from "@/constants/brandAdminScope";

export default function DeleteStaticImageButton({
  id,
  adminScope = "instafarms",
  showLabel = false,
}: {
  id: string;
  adminScope?: BrandAdminScope;
  showLabel?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteStaticImage(id, adminScope);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success || "Image deleted successfully");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete image");
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-500"
        disabled={loading}
      >
        <HiTrash size={16} className="text-white sm:text-[20px]" />
        {showLabel ? "Delete" : null}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this static image?"
        acceptCallback={handleDelete}
        closeCallback={() => setShowModal(false)}
      />
    </>
  );
}
