"use client";

import { HiOutlineExclamationCircle } from "react-icons/hi";
import React from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { AnimatedModalContent } from "@/components/ui/AnimatedModalContent";

/**
 * Flowbite's default Modal in dark mode is a `bg-gray-700` panel with only a
 * `shadow` — on this app's near-black page that reads as a barely-visible blob
 * with no edge. Override the panel to an elevated surface (crisp ring + strong
 * shadow) and darken the backdrop so the card clearly separates from the page.
 */
export const elevatedModalTheme = {
  root: {
    show: {
      on: "flex bg-gray-900/60 backdrop-blur-[2px] dark:bg-gray-950/80",
    },
  },
  content: {
    base: "relative h-full w-full p-4 md:h-auto",
    inner:
      "relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-2xl " +
      "ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-1 dark:ring-white/10",
  },
} as const;

const confirmModalTheme = elevatedModalTheme;

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
        "bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/20 dark:text-blue-200 dark:ring-blue-400/30",
      button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300",
    },
    danger: {
      iconWrap:
        "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-400/30",
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-300",
    },
    warning: {
      iconWrap:
        "bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/30",
      button: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-300",
    },
  } as const;

  const activeTone = toneClasses[tone];

  return (
    <Modal
      show={showModal}
      size="md"
      onClose={closeCallback}
      popup
      theme={confirmModalTheme}
    >
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
            <div className="mx-auto mb-6 max-w-sm text-[15px] leading-6 text-gray-700 dark:text-gray-100">
              {confirmationText}
            </div>
            <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeCallback}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
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
