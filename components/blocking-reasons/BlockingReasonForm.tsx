"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import {
  BlockingReason,
  createBlockingReason,
  updateBlockingReason,
} from "@/actions/blockingReasonActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Label, Select, Textarea, TextInput } from "flowbite-react";

import DeleteBlockingReasonButton from "./DeleteBlockingReasonButton";

type BlockingReasonFormProps = {
  data?: BlockingReason;
};

export default function BlockingReasonForm({ data }: BlockingReasonFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [reason, setReason] = useState(data?.reason ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    data?.status ?? "ACTIVE",
  );

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      const promise = parseServerActionResult(
        data?.id
          ? updateBlockingReason(data.id, formData)
          : createBlockingReason(formData),
      );

      toast.promise(promise, {
        loading: data?.id
          ? "Updating blocking reason..."
          : "Creating blocking reason...",
        success: (message) => {
          router.push("/admin/blocking-reasons");
          router.refresh();
          return message;
        },
        error: (err) => (err as Error).message,
      });
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-5 transition-all duration-200 ease-out"
    >
      <div className="space-y-2">
        <Label htmlFor="reason">
          Reason <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="reason"
          name="reason"
          placeholder="Maintenance, owner stay, deep cleaning..."
          required
          maxLength={160}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          placeholder="Optional operational note for admins"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description.length}/1000 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "ACTIVE" | "INACTIVE")
          }
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      <div className="flex items-center justify-center gap-3">
        <MyButton type="submit" loading={loading}>
          {data?.id ? "Update" : "Create"}
        </MyButton>
        {data?.id && <DeleteBlockingReasonButton id={data.id} />}
      </div>
    </form>
  );
}
