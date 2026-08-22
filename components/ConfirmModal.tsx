"use client";

import { HiOutlineExclamationCircle } from "react-icons/hi";
import React from "react";
import { Button, Modal, ModalBody, ModalHeader } from "flowbite-react";
import { AnimatedModalContent } from "@/components/ui/AnimatedModalContent";

interface ConfirmModalProps {
  showModal: boolean;
  title?: React.ReactNode;
  confirmationText: React.ReactNode;
  acceptCallback: () => void;
  closeCallback: () => void;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  tone?: "primary" | "danger" | "warning";
  icon?: React.ReactNode;
}

export default function ConfirmModal({
  showModal,
  title,
  confirmationText,
  acceptCallback,
  closeCallback,
  loading = false,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  loadingLabel = "Processing...",
  tone = "primary",
  icon,
}: ConfirmModalProps) {
  const toneClasses = {
    primary: {
      iconWrap:
        "bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
      button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300",
    },
    danger: {
      iconWrap:
        "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-300",
    },
    warning: {
      iconWrap:
        "bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
      button: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-300",
    },
  } as const;

  const activeTone = toneClasses[tone];

  return (
    <Modal show={showModal} size="md" onClose={closeCallback} popup>
      <AnimatedModalContent>
        <ModalHeader className="border-b-0 pb-0" />
        <ModalBody className="px-6 pb-6 pt-2">
          <div className="text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${activeTone.iconWrap}`}
            >
              {icon ?? <HiOutlineExclamationCircle className="h-9 w-9" />}
            </div>
            {title ? (
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            ) : null}
            <div className="mx-auto mb-6 max-w-sm text-sm leading-6 text-gray-600 dark:text-slate-300">
              {confirmationText}
            </div>
            <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Button color="gray" onClick={closeCallback} disabled={loading}>
                {cancelLabel}
              </Button>
              <button
                onClick={acceptCallback}
                disabled={loading}
                className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-4 ${
                  loading
                    ? "cursor-not-allowed bg-gray-400 opacity-60"
                    : activeTone.button
                }`}
              >
                {loading ? loadingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </ModalBody>
      </AnimatedModalContent>
    </Modal>
  );
}
