"use client";

import { deleteCarousel } from "@/actions/instafarm-settingsActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";
import { BRAND_CONTENT_ROUTES, type BrandAdminScope } from "@/constants/brandAdminScope";

export default function DeleteCarouselButton({
  id,
  brandScope = "instafarms",
  carouselType = "WEB",
  fullWidth = false,
  showLabel = false,
}: {
  id: string;
  brandScope?: BrandAdminScope;
  carouselType?: "WEB" | "APP";
  fullWidth?: boolean;
  showLabel?: boolean;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteCarousel(id, brandScope));

      toast.promise(promise, {
        loading: "Deleting carousel item...",
        success: (data) => {
          router.push(
            carouselType === "APP"
              ? BRAND_CONTENT_ROUTES[brandScope].appCarousel
              : BRAND_CONTENT_ROUTES[brandScope].webCarousel
          );
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
        {showLabel ? "Delete Carousel" : null}
      </button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to delete this carousel item?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
