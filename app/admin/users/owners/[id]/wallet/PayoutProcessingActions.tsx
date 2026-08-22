"use client";

import { completeHostPayout, failHostPayout } from "@/actions/walletActions";
import { Button, TextInput } from "flowbite-react";
import { useState, useTransition } from "react";

type Props = {
  ownerId: string;
  payoutId: string;
  status: string;
  canEdit: boolean;
};

/** Finance can resolve an existing host request, never originate a payout. */
export default function PayoutProcessingActions({
  ownerId,
  payoutId,
  status,
  canEdit,
}: Props) {
  const [reference, setReference] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit || (status !== "INITIATED" && status !== "PROCESSING")) {
    return null;
  }

  const complete = () => {
    startTransition(async () => {
      const result = await completeHostPayout(ownerId, payoutId, reference);
      setMessage(result.error ?? result.success ?? null);
    });
  };

  const fail = () => {
    startTransition(async () => {
      const result = await failHostPayout(ownerId, payoutId, failureReason);
      setMessage(result.error ?? result.success ?? null);
    });
  };

  return (
    <div className="flex min-w-72 flex-col gap-2">
      <TextInput
        aria-label="Bank transfer reference or UTR"
        placeholder="Bank transfer reference / UTR"
        value={reference}
        onChange={(event) => setReference(event.target.value)}
      />
      <Button size="xs" color="success" disabled={pending} onClick={complete}>
        Mark paid
      </Button>
      <TextInput
        aria-label="Withdrawal failure reason"
        placeholder="Failure reason if transfer was not sent"
        value={failureReason}
        onChange={(event) => setFailureReason(event.target.value)}
      />
      <Button size="xs" color="failure" disabled={pending} onClick={fail}>
        Fail and restore funds
      </Button>
      {message ? (
        <p className="text-xs text-gray-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
