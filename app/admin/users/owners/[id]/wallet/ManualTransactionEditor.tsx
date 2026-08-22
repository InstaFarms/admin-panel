"use client";

import { createManualTransaction } from "@/actions/walletActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Label, TextInput, Select, Textarea, FileInput } from "flowbite-react";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";

interface ManualTransactionEditorProps {
  ownerId: string;
}

export default function ManualTransactionEditor({
  ownerId,
}: ManualTransactionEditorProps) {
  const [loading, startTransition] = useTransition();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const handleSubmit = async (formData: FormData) => {
    formData.append("ownerId", ownerId);
    if (attachmentFile) {
      formData.set("attachment", attachmentFile);
    }

    startTransition(() => {
      const promise = parseServerActionResult(createManualTransaction(formData));

      toast.promise(promise, {
        loading: "Processing transaction...",
        success: (data) => {
          // Reset form
          const form = document.getElementById("manual-txn-form") as HTMLFormElement;
          form?.reset();
          setAttachmentFile(null);
          return data;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <div className="w-full">
      <form
        id="manual-txn-form"
        action={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2 block">
              <Label htmlFor="transactionType" className="text-sm font-medium">
                Transaction Type
              </Label>
            </div>
            <Select id="transactionType" name="transactionType" required>
              <option value="admin_credit">Credit (Add Money)</option>
              <option value="admin_debit">Debit (Deduct Money)</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 block">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount (₹)
              </Label>
            </div>
            <TextInput
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter amount"
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="bookingId" className="text-sm font-medium">
              Booking ID (Optional)
            </Label>
          </div>
          <TextInput
            id="bookingId"
            name="bookingId"
            type="text"
            placeholder="Enter booking UUID"
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks
            </Label>
          </div>
          <Textarea
            id="remarks"
            name="remarks"
            placeholder="Enter reason for this transaction"
            required
            rows={3}
          />
        </div>

        <div>
          <div className="mb-2 block">
            <Label htmlFor="attachment" className="text-sm font-medium">
              Attachment (Optional)
            </Label>
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

        <div className="flex justify-end">
          <MyButton type="submit" loading={loading} className="w-full md:w-auto">
            Submit Transaction
          </MyButton>
        </div>
      </form>
    </div>
  );
}