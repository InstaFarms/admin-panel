"use client";

import { deleteCollection } from "@/actions/collectionActions";
import ConfirmModal from "@/components/ConfirmModal";
import type { CollectionAdminScope } from "@/constants/collections";
import { COLLECTION_LIST_BASE_PATH } from "@/constants/collections";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiTrash } from "react-icons/hi";

export default function DeleteCollectionButton({
  id,
  adminScope = "instafarms",
}: {
  id: string;
  adminScope?: CollectionAdminScope;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  const deleteCollectionWithId = deleteCollection.bind(null, id, adminScope);
  const listPath = COLLECTION_LIST_BASE_PATH[adminScope];

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deleteCollectionWithId());

      toast.promise(promise, {
        loading: "Deleting Collection...",
        success: (data) => {
          router.push(listPath);
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
        confirmationText="Are you sure you want to delete this collection?"
        acceptCallback={handleSubmit}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
