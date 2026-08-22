"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import {
  CommissionBookingSource,
  createCommissionBookingSource,
  updateCommissionBookingSource,
} from "@/actions/sourceCommissionActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Label, Select, Textarea, TextInput } from "flowbite-react";
import DeleteSourceCommissionButton from "./DeleteSourceCommissionButton";

type SourceCommissionFormProps = {
  data?: CommissionBookingSource;
};

function deriveCode(name: string) {
  return name.trim().replace(/\s+/g, "_").toUpperCase();
}

export default function SourceCommissionForm({
  data,
}: SourceCommissionFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [sourceName, setSourceName] = useState(data?.sourceName ?? "");
  const [sourceCode, setSourceCode] = useState(data?.sourceCode ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    data?.isActive === false ? "INACTIVE" : "ACTIVE",
  );

  function handleNameChange(value: string) {
    setSourceName(value);
    if (!data?.id && !sourceCode.trim()) {
      setSourceCode(deriveCode(value));
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      const promise = parseServerActionResult(
        data?.id
          ? updateCommissionBookingSource(data.id, formData)
          : createCommissionBookingSource(formData),
      );

      toast.promise(promise, {
        loading: data?.id
          ? "Updating commission source..."
          : "Creating commission source...",
        success: (message) => {
          router.push("/admin/source-commissions");
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sourceName">
            Source Name <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="sourceName"
            name="sourceName"
            placeholder="Airbnb"
            required
            maxLength={160}
            value={sourceName}
            onChange={(event) => handleNameChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceCode">
            Source Code <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="sourceCode"
            name="sourceCode"
            placeholder="AIRBNB"
            required
            maxLength={120}
            value={sourceCode}
            onChange={(event) =>
              setSourceCode(event.target.value.toUpperCase())
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          placeholder="Optional source description"
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
        {data?.id && <DeleteSourceCommissionButton id={data.id} />}
      </div>
    </form>
  );
}
