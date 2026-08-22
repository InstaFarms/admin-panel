"use client";

import MyButton from "@/components/MyButton";
import DeleteSafetyHygieneButton from "../DeleteSafetyHygieneButton";
import { SafetyHygiene } from "@/utils/types";
import { Label, TextInput } from "flowbite-react";
import { useSafetyHygieneEditorForm } from "@/hooks/useSafetyHygieneEditorForm";

interface SafetyHygieneEditorProps {
  data?: SafetyHygiene;
}

export default function SafetyHygieneEditor({ data }: SafetyHygieneEditorProps) {
  const { name, setName, icon, setIcon, loading, handleSubmit } = useSafetyHygieneEditorForm(data);

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Safety & Hygiene Name <span className="text-red-500">*</span>
        </Label>
        <TextInput
          id="name"
          name="name"
          placeholder="Enter safety & hygiene name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="icon">Icon (Optional)</Label>
        <TextInput
          id="icon"
          name="icon"
          placeholder="Enter icon name"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
      </div>
      <div className="flex justify-center items-center gap-3">
        <MyButton type="submit" loading={loading}>
          Submit
        </MyButton>
        {data?.id && (
          <div onClick={(e) => e.preventDefault()}>
            <DeleteSafetyHygieneButton id={data.id} />
          </div>
        )}
      </div>
    </form>
  );
}