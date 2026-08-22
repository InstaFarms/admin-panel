import { createSafetyHygiene, editSafetyHygiene } from "@/actions/safety-hygieneActions";
import { SafetyHygiene } from "@/utils/types";
import { parseServerActionResult } from "@/utils/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

export function useSafetyHygieneEditorForm(data?: SafetyHygiene) {
  const [loading, startTransition] = useTransition();
  const [name, setName] = useState(data?.name ?? "");
  const [icon, setIcon] = useState(data?.icon ?? "");
  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    formData.set("name", name);
    formData.set("icon", icon);

    startTransition(() => {
      let promise: Promise<string>;

      if (data) {
        promise = parseServerActionResult(editSafetyHygiene.bind(null, data.id)(formData));
      } else {
        promise = parseServerActionResult(createSafetyHygiene(formData));
      }

      toast.promise(promise, {
        loading: "Saving Safety & Hygiene...",
        success: (msg) => {
          if (!data) router.push("/admin/safety-hygiene");
          return msg;
        },
        error: (err) => (err as Error).message,
      });
    });
  };

  return { name, setName, icon, setIcon, loading, handleSubmit };
}