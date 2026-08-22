"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

import {
  AgreementModel,
  createAgreementModel,
  updateAgreementModel,
} from "@/actions/agreementModelActions";
import MyButton from "@/components/MyButton";
import { parseServerActionResult } from "@/utils/utils";
import { Checkbox, Label, Select, Textarea, TextInput } from "flowbite-react";

import DeleteAgreementModelButton from "./DeleteAgreementModelButton";

type AgreementModelFormProps = {
  data?: AgreementModel;
};

function deriveCode(name: string) {
  return name.trim().replace(/\s+/g, "_").toUpperCase();
}

export default function AgreementModelForm({ data }: AgreementModelFormProps) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const [name, setName] = useState(data?.name ?? "");
  const [code, setCode] = useState(data?.code ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [isRentBasisModel, setIsRentBasisModel] = useState(
    Boolean(data?.isRentBasisModel),
  );
  const [isExpensesBasisModel, setIsExpensesBasisModel] = useState(
    Boolean(data?.isExpensesBasisModel),
  );
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    data?.isActive === false ? "INACTIVE" : "ACTIVE",
  );

  function handleNameChange(value: string) {
    setName(value);
    if (!data?.id && !code.trim()) {
      setCode(deriveCode(value));
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      const promise = parseServerActionResult(
        data?.id
          ? updateAgreementModel(data.id, formData)
          : createAgreementModel(formData),
      );

      toast.promise(promise, {
        loading: data?.id
          ? "Updating agreement model..."
          : "Creating agreement model...",
        success: (message) => {
          router.push("/admin/agreement-models");
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
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="name"
            name="name"
            placeholder="Fixed Lease"
            required
            maxLength={160}
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">
            Code <span className="text-red-500">*</span>
          </Label>
          <TextInput
            id="code"
            name="code"
            placeholder="FIXED_LEASE"
            required
            maxLength={120}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
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
          placeholder="Optional model description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description.length}/1000 characters
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
          <Checkbox
            id="isRentBasisModel"
            name="isRentBasisModel"
            checked={isRentBasisModel}
            onChange={(event) => setIsRentBasisModel(event.target.checked)}
          />
          <span>
            <span className="block font-medium text-slate-900 dark:text-white">
              Rent basis model
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Shows rent in property agreement config and disables milestone
              setup for this model.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
          <Checkbox
            id="isExpensesBasisModel"
            name="isExpensesBasisModel"
            checked={isExpensesBasisModel}
            onChange={(event) =>
              setIsExpensesBasisModel(event.target.checked)
            }
          />
          <span>
            <span className="block font-medium text-slate-900 dark:text-white">
              Expenses basis model
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Shows the property expenses tabs under commercial settings for
              this model.
            </span>
          </span>
        </label>
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
        {data?.id && <DeleteAgreementModelButton id={data.id} />}
      </div>
    </form>
  );
}
