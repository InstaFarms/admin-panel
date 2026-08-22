"use client";

import { deleteProperty } from "@/actions/propertyActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Spinner } from "flowbite-react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

export default function DeletePropertyButton({ id }: { id: string }) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);

  const router = useRouter();

  const deletePropertyWithId = deleteProperty.bind(null, id);

  const handleSubmit = () => {
    startTransition(() => {
      const promise = parseServerActionResult(deletePropertyWithId());

      toast.promise(promise, {
        loading: "Disabling property...",
        success: (data) => {
          router.push("/admin/properties")
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700"
      >
        {loading ? (
          <Spinner size="sm" light />
        ) : (
          <Trash2 size={20} className="text-white" />
        )}
      </button>
      <ConfirmModal
        showModal={showModal}
        title="Disable this property?"
        confirmationText={
          <div className="space-y-3">
            <p>
              This property will be hidden from the website and app. Users will not be able to make new bookings for it.
            </p>
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm text-red-700 shadow-sm dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
              All property details, images, pricing, past bookings, and records will remain saved in the system.
            </div>
          </div>
        }
        acceptCallback={handleSubmit}
        loading={loading}
        tone="danger"
        confirmLabel="Disable Property"
        cancelLabel="Keep Active"
        loadingLabel="Disabling..."
        icon={<AlertTriangle className="h-8 w-8" />}
        closeCallback={() => {
          setShowModal(false);
        }}
      />
    </>
  );
}
