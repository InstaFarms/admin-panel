"use client";

import { manualSettlement } from "@/actions/walletActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiCash } from "react-icons/hi";

export default function ManualSettleButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleSettle = () => {
    setShowModal(false);
    startTransition(() => {
      const promise = parseServerActionResult(manualSettlement(bookingId));

      toast.promise(promise, {
        loading: "Processing settlement...",
        success: (data) => {
          router.refresh();
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <Button
        size="xs"
        color="success"
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        {loading ? (
          <Spinner size="sm" className="mr-2" />
        ) : (
          <HiCash className="mr-2 h-4 w-4" />
        )}
        Settle Now
      </Button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to settle this booking now? The owner's wallet will be credited immediately."
        acceptCallback={handleSettle}
        closeCallback={() => setShowModal(false)}
      />
    </>
  );
}