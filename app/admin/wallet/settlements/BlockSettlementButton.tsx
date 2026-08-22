"use client";

import { blockSettlement } from "@/actions/walletActions";
import { parseServerActionResult } from "@/utils/utils";
import { Button, Label, Modal, Textarea, FileInput } from "flowbite-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { HiX } from "react-icons/hi";

export default function BlockSettlementButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("bookingId", bookingId);

    // Handle file upload if present
    if (attachmentFile) {
      formData.append("attachmentFilename", attachmentFile.name);
      formData.append("attachmentSize", attachmentFile.size.toString());
      formData.append("attachmentMimeType", attachmentFile.type);
      // TODO: Upload file and get URL, then add to formData
      // formData.append("attachmentUrl", uploadedUrl);
    }

    setShowModal(false);
    startTransition(() => {
      const promise = parseServerActionResult(blockSettlement(formData));

      toast.promise(promise, {
        loading: "Blocking settlement...",
        success: (data) => {
          setAttachmentFile(null);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <>
      <Button size="xs" color="failure" onClick={() => setShowModal(true)}>
        <HiX className="mr-2 h-4 w-4" />
        Block
      </Button>

      <Modal show={showModal} onClose={() => setShowModal(false)}>
        {/* Modal Header */}
        <div className="flex items-center justify-between rounded-t border-b p-4 md:p-5 dark:border-gray-600">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Block Settlement
          </h3>
          <button
            type="button"
            className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={() => setShowModal(false)}
          >
            <HiX className="h-5 w-5" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-4 md:p-5">
          <form id="block-settlement-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="reason" />
              </div>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Enter reason for blocking this settlement"
                required
                rows={4}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="attachment" />
              </div>
              <FileInput
                id="attachment"
                name="attachment"
                accept="image/*,.pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload supporting document or image (optional)
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center space-x-2 rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-600">
          <Button
            type="submit"
            form="block-settlement-form"
            color="failure"
            disabled={loading}
          >
            Block Settlement
          </Button>
          <Button color="gray" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}