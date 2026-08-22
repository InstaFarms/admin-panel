"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "flowbite-react";

interface ConfirmModalProps {
  showModal: boolean;
  confirmationText: string;
  acceptCallback: () => void;
  closeCallback: () => void;
}

export default function ConfirmModal({
  showModal,
  confirmationText,
  acceptCallback,
  closeCallback,
}: ConfirmModalProps) {
  return (
    <Modal show={showModal} onClose={closeCallback}>
      <ModalHeader>Confirm Action</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            {confirmationText}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="red" onClick={acceptCallback}>
          Yes, Delete
        </Button>
        <Button color="gray" onClick={closeCallback}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}