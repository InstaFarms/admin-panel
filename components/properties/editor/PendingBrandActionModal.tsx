"use client";

import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import { AnimatedModalContent } from "@/components/ui/AnimatedModalContent";

interface PendingBrandActionModalProps {
  open: boolean;
  currentBrandName: string;
  targetBrandName: string;
  loading?: boolean;
  onSaveAndContinue: () => void | Promise<void>;
  onDiscardAndContinue: () => void | Promise<void>;
  onCancel: () => void;
}

export default function PendingBrandActionModal({
  open,
  currentBrandName,
  targetBrandName,
  loading = false,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
}: PendingBrandActionModalProps) {
  return (
    <Modal show={open} onClose={loading ? undefined : onCancel} size="md" popup>
      <AnimatedModalContent>
        <ModalHeader>Unsaved Changes</ModalHeader>
        <ModalBody>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              You have unsaved changes in{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{currentBrandName}</span>.
            </p>
            <p>
              Before switching to{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{targetBrandName}</span>, choose
              whether you want to save the current brand or discard those changes.
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="flex flex-wrap justify-end gap-2">
          <Button color="gray" onClick={onCancel} disabled={loading}>
            Stay Here
          </Button>
          <Button color="failure" onClick={() => void onDiscardAndContinue()} disabled={loading}>
            Discard & Continue
          </Button>
          <Button color="success" onClick={() => void onSaveAndContinue()} disabled={loading}>
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </ModalFooter>
      </AnimatedModalContent>
    </Modal>
  );
}
