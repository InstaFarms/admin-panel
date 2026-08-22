"use client";

import { unblockSettlement } from "@/actions/walletActions";
import ConfirmModal from "@/components/ConfirmModal";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Spinner } from "flowbite-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiCheck } from "react-icons/hi";

export default function UnblockSettlementButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleUnblock = () => {
    setShowModal(false);
    startTransition(() => {
      const promise = parseServerActionResult(unblockSettlement(bookingId));

      toast.promise(promise, {
        loading: "Unblocking settlement...",
        success: (data) => data,
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
          <HiCheck className="mr-2 h-4 w-4" />
        )}
        Unblock
      </Button>
      <ConfirmModal
        showModal={showModal}
        confirmationText="Are you sure you want to unblock this settlement? It will be processed in the next settlement cycle."
        acceptCallback={handleUnblock}
        closeCallback={() => setShowModal(false)}
      />
    </>
  );
}