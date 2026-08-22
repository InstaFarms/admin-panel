"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Label, TextInput } from "flowbite-react";

import { createPropertyType, editPropertyType } from "@/actions/propertyTypeActions";
import { usePropertyTypeForm } from "@/hooks/usePropertyTypeForm";
import { parseServerActionResult } from "@/utils/utils";
import MyButton from "@/components/MyButton";
import DeletePropertyTypeButton from "../DeletePropertyTypeButton";

interface PropertyTypeEditorProps {
  data?: { id: string; name: string };
}

export default function PropertyTypeEditor({ data }: PropertyTypeEditorProps) {
  const [loading, startTransition] = useTransition();
  const router = useRouter();
  const { errors, validateAll, clearFieldError } = usePropertyTypeForm();

  const [name, setName] = useState(data?.name ?? "");

  const handleSubmit = (formData: FormData) => {
    if (!validateAll({ name })) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    startTransition(() => {
      const promise: Promise<string> = data
        ? parseServerActionResult(editPropertyType.bind(null, data.id)(formData))
        : parseServerActionResult(createPropertyType(formData));

      toast.promise(promise, {
        loading: data ? "Updating property type…" : "Creating property type…",
        success: (msg) => {
          router.push("/admin/propertyTypes");
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return (
    <form action={handleSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="propertyType">
            Property Type Name <span className="text-red-500">*</span>
          </Label>
        </div>
        <TextInput
          id="propertyType"
          name="propertyType"
          type="text"
          placeholder="Enter Property Type"
          value={name}
          onChange={e => { setName(e.target.value); clearFieldError("name"); }}
          color={errors.name ? "failure" : undefined}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="flex justify-center items-center gap-3">
        <MyButton type="submit" loading={loading}>Submit</MyButton>
        {data && (
          <div onClick={e => e.preventDefault()}>
            <DeletePropertyTypeButton id={data.id} />
          </div>
        )}
      </div>
    </form>
  );
}