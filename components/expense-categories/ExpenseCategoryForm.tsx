"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import {
  createExpenseCategory,
  updateExpenseCategory,
} from "@/actions/expenseCategoryActions";
import type { PropertyExpenseCategory } from "@/actions/expenseCategoryActions";
import MyButton from "@/components/MyButton";
import PropertySelector from "@/components/PropertySelector";
import { parseServerActionResult } from "@/utils/utils";
import { Label, Select, Textarea, TextInput } from "flowbite-react";
import DeleteExpenseCategoryButton from "./DeleteExpenseCategoryButton";

type ExpenseCategoryFormProps = {
  data?: PropertyExpenseCategory;
};

export default function ExpenseCategoryForm({
  data,
}: ExpenseCategoryFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState<string | null>(
    data?.propertyId ?? null,
  );
  const [name, setName] = useState(data?.name ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    data?.isActive === false ? "INACTIVE" : "ACTIVE",
  );

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      const promise = parseServerActionResult(
        data?.id
          ? updateExpenseCategory(data.id, formData)
          : createExpenseCategory(formData),
      );

      toast.promise(promise, {
        loading: data?.id
          ? "Updating expense category..."
          : "Creating expense category...",
        success: (message) => {
          router.push("/admin/expense-categories");
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
        <Label htmlFor="propertyId">
          Property <span className="text-red-500">*</span>
        </Label>
        <PropertySelector propertyId={propertyId} update={setPropertyId} />
        <input type="hidden" name="propertyId" value={propertyId ?? ""} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Category Name <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="name"
            name="name"
            placeholder="Housekeeping"
            required
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          placeholder="Optional category description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description.length}/1000 characters
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <MyButton type="submit" loading={loading}>
          {data?.id ? "Update" : "Create"}
        </MyButton>
        {data?.id && <DeleteExpenseCategoryButton id={data.id} />}
      </div>
    </form>
  );
}
